import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { FaSave, FaUndo } from "react-icons/fa";
import { usePlan } from "../contexts/PlanContext";
import { useMonth } from "../contexts/MonthContext";
import type { PlanData } from "../services/planService";

import "./Plan.css";

const PLAN_META: { key: keyof PlanData; label: string; color: string }[] = [
  { key: "necesidades", label: "Necesidades", color: "#4caf50" },
  { key: "estiloVida", label: "Estilo de vida", color: "#ff9800" },
  { key: "ahorro", label: "Ahorro", color: "#2196f3" },
];

function Plan() {
  const { meses, selectedMonth } = useMonth();
  const {
    globalPlan,
    effectivePlan,
    monthPlan,
    loading,
    savePlan,
    saveGlobalPlan,
    resetPlan,
  } = usePlan();
  const [mode, setMode] = useState<"month" | "global">("month");

  if (loading) {
    return (
      <div className="pl-container">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p className="loading-text">Cargando...</p>
        </div>
      </div>
    );
  }

  const selectedMes = meses.find((m) => m.id === selectedMonth) ?? null;

  return (
    <div className="pl-container">
      <header className="pl-header">
        <h1 className="pl-title">Plan 50/30/20</h1>
        <p className="pl-subtitle">
          Define cómo quieres distribuir tus ingresos entre categorías
        </p>
      </header>

      <div className="pl-mode-toggle">
        <button
          type="button"
          className={`pl-mode-btn ${mode === "month" ? "pl-mode-btn--active" : ""}`}
          onClick={() => setMode("month")}
        >
          {selectedMes ? `Este mes (${selectedMes.label})` : "Este mes"}
        </button>
        <button
          type="button"
          className={`pl-mode-btn ${mode === "global" ? "pl-mode-btn--active" : ""}`}
          onClick={() => setMode("global")}
        >
          Default global
        </button>
      </div>

      <PlanForm
        key={mode}
        target={mode === "month" ? effectivePlan : globalPlan}
        isOverride={mode === "month" ? monthPlan != null : false}
        hasMonth={mode === "month" ? selectedMes != null : true}
        monthLabel={selectedMes?.label ?? null}
        onSave={mode === "month" ? savePlan : saveGlobalPlan}
        onReset={mode === "month" ? resetPlan : undefined}
      />
    </div>
  );
}

function PlanForm({
  target,
  isOverride,
  hasMonth,
  monthLabel,
  onSave,
  onReset,
}: {
  target: PlanData;
  isOverride: boolean;
  hasMonth: boolean;
  monthLabel: string | null;
  onSave: (plan: PlanData) => Promise<void>;
  onReset?: () => Promise<void>;
}) {
  const [values, setValues] = useState<PlanData>(target);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValues(target);
  }, [target]);

  const total = Math.round((values.necesidades + values.estiloVida + values.ahorro) * 10) / 10;
  const isValid = total === 100;

  const pieData = PLAN_META.map((m) => ({
    name: m.label,
    value: values[m.key],
    color: m.color,
  }));

  function setValue(key: keyof PlanData, raw: string | number) {
    const num = Number(raw);
    const clamped = Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : 0;
    setValues((prev) => ({ ...prev, [key]: clamped }));
    setSaved(false);
  }

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await onSave(values);
      setSaved(true);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!onReset || saving) return;
    setSaving(true);
    try {
      await onReset();
      setSaved(false);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="pl-layout">
      <div className="pl-chart-card">
        <h2 className="pl-section-title">Así quedaría tu plan</h2>
        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={140}
              paddingAngle={3}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: unknown) =>
                value != null ? `${Number(value)}%` : ""
              }
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                color: "var(--color-text)",
              }}
            />
            <Legend
              formatter={(value: string) => (
                <span style={{ color: "var(--color-text)" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className={`pl-total ${isValid ? "pl-total--ok" : "pl-total--bad"}`}>
          Total: {total}%
          {!isValid && <span className="pl-total-hint">Debe sumar 100%</span>}
        </div>
      </div>

      <div className="pl-controls-card">
        <h2 className="pl-section-title">Porcentajes</h2>
        {!hasMonth && (
          <p className="pl-hint">
            No hay mes seleccionado. Guardar aplicará al default global.
          </p>
        )}
        {hasMonth && !isOverride && (
          <p className="pl-hint">
            {monthLabel} no tiene plan propio: usa el default global. Guardar creará su plan.
          </p>
        )}
        {hasMonth && isOverride && (
          <p className="pl-hint">
            {monthLabel} tiene su propio plan. Restablecer volverá al default global.
          </p>
        )}
        <div className="pl-controls">
          {PLAN_META.map((meta) => (
            <div key={meta.key} className="pl-row">
              <label className="pl-label" htmlFor={`pl-${meta.key}`}>
                <span
                  className="pl-dot"
                  style={{ background: meta.color }}
                />
                {meta.label}
              </label>
              <input
                id={`pl-${meta.key}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={values[meta.key]}
                onChange={(e) => setValue(meta.key, e.target.value)}
                style={{ accentColor: meta.color }}
              />
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={values[meta.key]}
                onChange={(e) => setValue(meta.key, e.target.value)}
                className="pl-number"
                aria-label={`${meta.label} %`}
              />
              <span className="pl-pct">%</span>
            </div>
          ))}
        </div>

        <div className="pl-actions">
          {onReset && (
            <button
              type="button"
              className="pl-reset-btn"
              onClick={handleReset}
              disabled={saving}
            >
              <FaUndo />
              Restablecer al default
            </button>
          )}
          <button
            type="button"
            className="pl-save-btn"
            onClick={handleSave}
            disabled={!isValid || saving}
          >
            <FaSave />
            {saving ? "Guardando..." : "Guardar plan"}
          </button>
        </div>
        {saved && (
          <p className="pl-saved-msg">Plan guardado correctamente</p>
        )}
      </div>
    </section>
  );
}

export default Plan;
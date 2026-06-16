import { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { FaPlus, FaTrash } from "react-icons/fa";
import { useMonth } from "../contexts/MonthContext";
import {
  CATEGORY_META,
  MESES,
  formatMonto,
} from "../data/constants";
import type { MonthData } from "../data/constants";
import { crearMes, eliminarMes, obtenerResumen } from "../services/mesesService";

import "./Dashboard.css";

interface Resumen {
  totalMeses: number;
  totalIngresos: number;
  totalGastos: number;
  balance: number;
}

function Dashboard() {
  const { meses, selectedMonth, setSelectedMonth, refreshMeses } = useMonth();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nuevoMes, setNuevoMes] = useState(new Date().getMonth() + 1);
  const [nuevoAnio, setNuevoAnio] = useState(new Date().getFullYear());
  const [creando, setCreando] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function cargarResumen() {
    setLoading(true);
    obtenerResumen()
      .then((res) => setResumen(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargarResumen();
  }, []);

  const { month, totalIngresos, totalGastos, balance, ahorroInversion, porCategoria } = useMemo(() => {
    if (!selectedMonth || meses.length === 0) {
      return {
        month: null as MonthData | null,
        totalIngresos: 0,
        totalGastos: 0,
        balance: 0,
        ahorroInversion: 0,
        porCategoria: [] as { categoria: string; monto: number; color: string; label: string }[],
      };
    }
    const month = meses.find((m) => m.id === selectedMonth)!;
    const gastosMes = month.gastos;
    const totalIngresos = month.ingresos.reduce((s, i) => s + i.monto, 0);
    const totalGastos = gastosMes.reduce((s, g) => s + g.monto, 0);
    const balance = totalIngresos - totalGastos;
    const ahorroInversion = 5000;

    const acc: Record<string, number> = {};
    for (const g of gastosMes) {
      acc[g.categoria] = (acc[g.categoria] || 0) + g.monto;
    }
    const porCategoria = Object.entries(acc).map(([k, v]) => ({
      categoria: k,
      monto: v,
      color: CATEGORY_META[k]?.color ?? "#a0a6c0",
      label: CATEGORY_META[k]?.label ?? k,
    }));

    return { month, totalIngresos, totalGastos, balance, ahorroInversion, porCategoria };
  }, [selectedMonth, meses]);

  const mesesConTotales = useMemo(() => {
    return meses.map((m) => {
      const ingresos = m.ingresos.reduce((s, i) => s + i.monto, 0);
      const gastos = m.gastos.reduce((s, g) => s + g.monto, 0);
      return { ...m, totalIngresos: ingresos, totalGastos: gastos, balance: ingresos - gastos };
    });
  }, [meses]);



  async function refreshAll() {
    await refreshMeses();
    cargarResumen();
  }

  async function handleCrearMes(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    try {
      await crearMes({
        label: `${MESES[nuevoMes - 1]} ${nuevoAnio}`,
        year: nuevoAnio,
        month: nuevoMes,
        autoPopulate: true,
      });
      setShowCreateModal(false);
      refreshAll();
    } catch {
    } finally {
      setCreando(false);
    }
  }

  async function confirmarEliminar() {
    if (!deleteTarget) return;
    try {
      await eliminarMes(deleteTarget);
      setDeleteTarget(null);
      refreshAll();
    } catch {
    }
  }

  if (loading) return <div className="db-container"><div className="loading-screen"><div className="loading-spinner" /><p className="loading-text">Cargando...</p></div></div>;
  if (error) return <div className="db-container"><p>Error: {error}</p></div>;
  if (!resumen) return <div className="db-container"><p>No hay datos disponibles</p></div>;

  return (
    <div className="db-container">
      <header className="db-header">
        <h1 className="db-title">Bienvenido Adrian</h1>
        <p className="db-subtitle">{new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </header>

      {month && (
        <>
          <section className="db-month-overview">
            <div className="db-month-cards">
              <div className="db-card" style={{ borderTopColor: "#0ea5e9" }}>
                <span className="db-card-label">Ingresos</span>
                <span className="db-card-value" style={{ color: "#0ea5e9" }}>
                  {formatMonto(totalIngresos)}
                </span>
              </div>
              <div className="db-card" style={{ borderTopColor: "#ff4fd8" }}>
                <span className="db-card-label">Gastos</span>
                <span className="db-card-value" style={{ color: "#ff4fd8" }}>
                  {formatMonto(totalGastos)}
                </span>
              </div>
              <div className="db-card" style={{ borderTopColor: balance >= 0 ? "#22c55e" : "#ef4444" }}>
                <span className="db-card-label">Balance</span>
                <span className="db-card-value" style={{ color: balance >= 0 ? "#22c55e" : "#ef4444" }}>
                  {balance >= 0 ? "+" : ""}{formatMonto(balance)}
                </span>
              </div>
              <div className="db-card" style={{ borderTopColor: "#2196f3" }}>
                <span className="db-card-label">Ahorro e Inversión</span>
                <span className="db-card-value" style={{ color: "#2196f3" }}>
                  {formatMonto(ahorroInversion)}
                </span>
              </div>
            </div>

            <div className="db-month-chart">
              <section className="db-chart-card db-chart-card--comparison">
                <h2 className="db-section-title">Comparativa mensual</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={[{ name: "", Ingresos: totalIngresos, Gastos: totalGastos, "Ahorro e Inversión": 5000 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis
                      stroke="var(--color-text-muted)"
                      fontSize={12}
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: unknown) =>
                        value != null ? formatMonto(Number(value)) : ""
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
                    <Bar dataKey="Ingresos" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={80} />
                    <Bar dataKey="Gastos" fill="#ff4fd8" radius={[6, 6, 0, 0]} maxBarSize={80} />
                    <Bar dataKey="Ahorro e Inversión" fill="#2196f3" radius={[6, 6, 0, 0]} maxBarSize={80} />
                  </BarChart>
                </ResponsiveContainer>
              </section>
            </div>
          </section>

          <section className="db-table-section">
            <h2 className="db-section-title">Resumen de gastos</h2>
            <div className="db-table-wrapper">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Monto</th>
                    <th>% de ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {porCategoria.map((cat) => (
                    <tr key={cat.categoria}>
                      <td data-label="Categoría">
                        <span style={{ color: cat.color, fontWeight: 600 }}>{cat.label}</span>
                      </td>
                      <td data-label="Monto" className="db-monto">
                        {formatMonto(cat.monto)}
                      </td>
                      <td data-label="% Ingresos" className="db-monto">
                        {totalIngresos > 0 ? ((cat.monto / totalIngresos) * 100).toFixed(1) : "0.0"}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Total gastos</td>
                    <td className="db-monto" style={{ fontWeight: 700 }}>{formatMonto(totalGastos)}</td>
                    <td className="db-monto" style={{ fontWeight: 700 }}>
                      {totalIngresos > 0 ? ((totalGastos / totalIngresos) * 100).toFixed(1) : "0.0"}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}

      {resumen.totalMeses > 0 && (
        <>
          <section className="db-global-cards">
            <div className="db-card" style={{ borderTopColor: "#b04cff" }}>
              <span className="db-card-label">Meses registrados</span>
              <span className="db-card-value" style={{ color: "#b04cff" }}>
                {resumen.totalMeses}
              </span>
            </div>
            <div className="db-card" style={{ borderTopColor: "#0ea5e9" }}>
              <span className="db-card-label">Ingresos totales</span>
              <span className="db-card-value" style={{ color: "#0ea5e9" }}>
                {formatMonto(resumen.totalIngresos)}
              </span>
            </div>
            <div className="db-card" style={{ borderTopColor: "#ff4fd8" }}>
              <span className="db-card-label">Gastos totales</span>
              <span className="db-card-value" style={{ color: "#ff4fd8" }}>
                {formatMonto(resumen.totalGastos)}
              </span>
            </div>
            <div className="db-card" style={{ borderTopColor: resumen.balance >= 0 ? "#22c55e" : "#ef4444" }}>
              <span className="db-card-label">Balance global</span>
              <span className="db-card-value" style={{ color: resumen.balance >= 0 ? "#22c55e" : "#ef4444" }}>
                {resumen.balance >= 0 ? "+" : ""}{formatMonto(resumen.balance)}
              </span>
            </div>
          </section>

          {mesesConTotales.length > 1 && (
            <section className="db-chart-card">
              <h2 className="db-section-title">Tendencia mensual</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mesesConTotales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" stroke="var(--color-text-muted)" fontSize={13} />
                  <YAxis
                    stroke="var(--color-text-muted)"
                    fontSize={12}
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: unknown) =>
                      value != null ? formatMonto(Number(value)) : ""
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
                  <Line type="monotone" dataKey="totalIngresos" name="Ingresos" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: "#0ea5e9", r: 4 }} />
                  <Line type="monotone" dataKey="totalGastos" name="Gastos" stroke="#ff4fd8" strokeWidth={2} dot={{ fill: "#ff4fd8", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </section>
          )}

          <section className="db-table-section">
            <div className="db-table-header">
              <h2 className="db-section-title">Vista global por mes</h2>
              <button className="db-add-btn" onClick={() => setShowCreateModal(true)}>
                <FaPlus />
                Agregar mes
              </button>
            </div>
            <div className="db-table-wrapper">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Ingresos</th>
                    <th>Gastos</th>
                    <th>Balance</th>
                    <th>% Utilizado</th>
                    <th className="db-th-acciones">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {mesesConTotales.map((m) => (
                    <tr key={m.id}>
                      <td data-label="Mes" className="db-month-name">{m.label}</td>
                      <td data-label="Ingresos" className="db-monto db-pos">
                        {formatMonto(m.totalIngresos)}
                      </td>
                      <td data-label="Gastos" className="db-monto db-neg">
                        {formatMonto(m.totalGastos)}
                      </td>
                      <td data-label="Balance" className="db-monto" style={{ color: m.balance >= 0 ? "#22c55e" : "#ef4444" }}>
                        {m.balance >= 0 ? "+" : ""}{formatMonto(m.balance)}
                      </td>
                      <td data-label="% Utilizado" className="db-monto">
                        {m.totalIngresos > 0
                          ? `${((m.totalGastos / m.totalIngresos) * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                      <td data-label="Acciones" className="db-acciones-cell">
                        <button
                          className="db-action-btn db-action-btn--delete"
                          title="Eliminar mes"
                          onClick={() => setDeleteTarget(m.id)}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}



      {showCreateModal && (
        <div className="db-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="db-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="db-modal-title">Agregar nuevo mes</h2>
            <form onSubmit={handleCrearMes}>
              <div className="db-modal-row">
                <div className="db-modal-field">
                  <label htmlFor="db-mes">Mes</label>
                  <select
                    id="db-mes"
                    className="db-select"
                    value={nuevoMes}
                    onChange={(e) => setNuevoMes(Number(e.target.value))}
                  >
                    {MESES.map((nombre, i) => (
                      <option key={i + 1} value={i + 1}>{nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="db-modal-field">
                  <label htmlFor="db-anio">Año</label>
                  <select
                    id="db-anio"
                    className="db-select"
                    value={nuevoAnio}
                    onChange={(e) => setNuevoAnio(Number(e.target.value))}
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const anio = new Date().getFullYear() - 5 + i;
                      return <option key={anio} value={anio}>{anio}</option>;
                    })}
                  </select>
                </div>
              </div>
              <p className="db-modal-preview">
                Se creará: <strong>{MESES[nuevoMes - 1]} {nuevoAnio}</strong>
              </p>
              <div className="db-modal-actions">
                <button
                  type="button"
                  className="db-modal-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="db-modal-submit"
                  disabled={creando}
                >
                  {creando ? "Creando..." : "Crear mes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="db-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="db-modal db-modal--confirm" onClick={(e) => e.stopPropagation()}>
            <h2 className="db-modal-title">Eliminar mes</h2>
            <p className="db-confirm-text">
              ¿Estás seguro de que deseas eliminar este mes? Todos sus ingresos y gastos asociados también se eliminarán. Esta acción no se puede deshacer.
            </p>
            <div className="db-modal-actions">
              <button
                type="button"
                className="db-modal-cancel"
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="db-modal-submit db-modal-submit--danger"
                onClick={confirmarEliminar}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

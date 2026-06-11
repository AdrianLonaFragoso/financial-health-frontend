import { useState, useMemo, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  CATEGORY_META,
  IDEAL_SPLIT,
  formatMonto,
} from "../data/constants";
import type { Gasto, MonthData } from "../data/constants";
import { obtenerMeses } from "../services/mesesService";
import "./GastosMensuales.css";

type SortKey = keyof Gasto | "restantes";
type SortDir = "asc" | "desc";

const MONTH_MAP: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

function parseFinDate(fin: string): Date | null {
  if (fin === "indefinido") return null;
  const parts = fin.split("-");
  if (parts.length !== 3) return null;
  const [, monthStr, yearStr] = parts;
  const month = MONTH_MAP[monthStr];
  const year = 2000 + parseInt(yearStr);
  if (month === undefined || isNaN(year)) return null;
  return new Date(year, month, 1);
}

function monthsRemaining(fin: string): number | null {
  const date = parseFinDate(fin);
  if (!date) return null;
  const now = new Date();
  const diff =
    (date.getFullYear() - now.getFullYear()) * 12 +
    (date.getMonth() - now.getMonth());
  return Math.max(0, diff);
}

function GastosMensuales() {
  const [meses, setMeses] = useState<MonthData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    obtenerMeses()
      .then((res) => {
        setMeses(res.data);
        if (res.data.length > 0) setSelectedMonth(res.data[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const { month, total, totalIngresos, porCategoria, pieData, totalIdeal } = useMemo(() => {
    if (!selectedMonth || meses.length === 0) {
      return {
        month: null as MonthData | null,
        total: 0,
        totalIngresos: 0,
        porCategoria: [] as { categoria: string; monto: number; pct: number; color: string; label: string }[],
        pieData: [] as { name: string; value: number; color: string }[],
        totalIdeal: { necesidades: 0, estiloVida: 0, ahorro: 0 },
      };
    }
    const month = meses.find((m) => m.id === selectedMonth)!;
    const totalIngresos = month.ingresos.reduce((s, i) => s + i.monto, 0);
    const acc: Record<string, number> = {};
    for (const g of month.gastos) {
      acc[g.categoria] = (acc[g.categoria] || 0) + g.monto;
    }
    const total = Object.values(acc).reduce((a, b) => a + b, 0);
    const porCategoria = Object.entries(acc).map(([k, v]) => ({
      categoria: k,
      monto: v,
      pct: totalIngresos > 0 ? (v / totalIngresos) * 100 : 0,
      color: CATEGORY_META[k]?.color ?? "#a0a6c0",
      label: CATEGORY_META[k]?.label ?? k,
    }));
    const pieData = porCategoria.map((c) => ({
      name: c.label,
      value: Math.round(c.monto * 100) / 100,
      color: c.color,
    }));
    const totalIdeal = {
      necesidades: totalIngresos * 0.5,
      estiloVida: totalIngresos * 0.3,
      ahorro: totalIngresos * 0.2,
    };
    return { month, total, totalIngresos, porCategoria, pieData, totalIdeal };
  }, [selectedMonth, meses]);

  const actualNeeds = porCategoria.find((c) => c.categoria === "Necesidades");
  const actualLifestyle = porCategoria.find((c) => c.categoria === "Estilo de vida");
  const actualSavings = porCategoria.find((c) => c.categoria === "Ahorro");

  const filteredGastos = useMemo(() => {
    if (!month) return [];
    const q = search.toLowerCase().trim();
    let list = month.gastos;
    if (q) {
      list = list.filter(
        (g) =>
          g.concepto.toLowerCase().includes(q) ||
          g.categoria.toLowerCase().includes(q) ||
          g.fin.toLowerCase().includes(q) ||
          g.monto.toString().includes(q)
      );
    }
    if (sortKey) {
      list = [...list].sort((a, b) => {
        if (sortKey === "restantes") {
          const aVal = monthsRemaining(a.fin);
          const bVal = monthsRemaining(b.fin);
          const aNum = aVal ?? Infinity;
          const bNum = bVal ?? Infinity;
          return sortDir === "asc" ? aNum - bNum : bNum - aNum;
        }
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        let cmp = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [month?.gastos, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  function renderRestantes(fin: string) {
    const remain = monthsRemaining(fin);
    if (remain === null) return <span className="gm-rest-indef">∞</span>;
    if (remain === 0) return <span className="gm-rest-done">✓</span>;
    return <span className="gm-rest-num">{remain}</span>;
  }

  if (loading) return <div className="gm-container"><p>Cargando...</p></div>;
  if (error) return <div className="gm-container"><p>Error: {error}</p></div>;
  if (!month) return <div className="gm-container"><p>No hay datos disponibles</p></div>;

  return (
    <div className="gm-container">
      <header className="gm-header">
        <h1 className="gm-title">Gastos Mensuales</h1>
        <div className="gm-month-selector">
          {meses.map((m) => (
            <button
              key={m.id}
              className={`gm-month-btn ${m.id === selectedMonth ? "gm-month-btn--active" : ""}`}
              onClick={() => setSelectedMonth(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="gm-subtitle">
          Total: {formatMonto(total)}
        </p>
      </header>

      <section className="gm-summary-cards">
        {porCategoria.map((cat) => (
          <div
            key={cat.categoria}
            className="gm-card"
            style={{ borderTopColor: cat.color }}
          >
            <span className="gm-card-label">{cat.label}</span>
            <span className="gm-card-value" style={{ color: cat.color }}>
              {formatMonto(cat.monto)}
            </span>
            <span className="gm-card-pct">{cat.pct.toFixed(1)}%</span>
          </div>
        ))}
      </section>

      <section className="gm-chart-section">
        <div className="gm-chart-card">
          <h2 className="gm-section-title">Distribución actual</h2>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={130}
                paddingAngle={3}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
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
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="gm-chart-card">
          <h2 className="gm-section-title">Meta ideal 50/30/20</h2>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={IDEAL_SPLIT}
                dataKey="percentage"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={130}
                paddingAngle={3}
              >
                {IDEAL_SPLIT.map((entry, i) => (
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
        </div>
      </section>

      <section className="gm-compare-section">
        <h2 className="gm-section-title">Comparativa: Actual vs Ideal</h2>
        <div className="gm-compare-bars">
          {[
            {
              label: "Necesidades (50%)",
              ideal: totalIdeal.necesidades,
              actual: actualNeeds?.monto ?? 0,
              color: "#4caf50",
            },
            {
              label: "Estilo de vida (30%)",
              ideal: totalIdeal.estiloVida,
              actual: actualLifestyle?.monto ?? 0,
              color: "#ff9800",
            },
            {
              label: "Ahorro (20%)",
              ideal: totalIdeal.ahorro,
              actual: actualSavings?.monto ?? 0,
              color: "#2196f3",
            },
          ].map((item) => {
            const pctActual = totalIngresos > 0 ? (item.actual / totalIngresos) * 100 : 0;
            const pctIdeal = totalIngresos > 0 ? (item.ideal / totalIngresos) * 100 : 0;
            const maxVal = Math.max(item.actual, item.ideal, 1);
            return (
              <div key={item.label} className="gm-compare-row">
                <span className="gm-compare-label">{item.label}</span>
                <div className="gm-compare-bars-wrapper">
                  <div className="gm-bar-track">
                    <div
                      className="gm-bar-fill gm-bar-actual"
                      style={{
                        width: `${(item.actual / maxVal) * 100}%`,
                        background: item.color,
                      }}
                      title={`Actual: ${formatMonto(item.actual)} (${pctActual.toFixed(1)}%)`}
                    />
                  </div>
                  <div className="gm-bar-track">
                    <div
                      className="gm-bar-fill gm-bar-ideal"
                      style={{
                        width: `${(item.ideal / maxVal) * 100}%`,
                        background: item.color,
                      }}
                      title={`Ideal: ${formatMonto(item.ideal)} (${pctIdeal.toFixed(1)}%)`}
                    />
                  </div>
                </div>
                <div className="gm-compare-values">
                  <span style={{ color: item.color }}>
                    {formatMonto(item.actual)}
                  </span>
                  <span style={{ color: item.color, opacity: 0.6 }}>
                    {formatMonto(item.ideal)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="gm-table-section">
        <div className="gm-table-header">
          <h2 className="gm-section-title">Detalle de gastos</h2>
          <input
            className="gm-search"
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="gm-table-wrapper">
          <table className="gm-table">
            <thead>
              <tr>
                <th className="gm-th-sort" onClick={() => toggleSort("concepto")}>
                  Concepto{sortArrow("concepto")}
                </th>
                <th className="gm-th-sort" onClick={() => toggleSort("monto")}>
                  Mensualidad{sortArrow("monto")}
                </th>
                <th className="gm-th-sort" onClick={() => toggleSort("categoria")}>
                  Categoría{sortArrow("categoria")}
                </th>
                <th className="gm-th-sort" onClick={() => toggleSort("fin")}>
                  Vence{sortArrow("fin")}
                </th>
                <th className="gm-th-sort" onClick={() => toggleSort("restantes")}>
                  P/Restantes{sortArrow("restantes")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredGastos.map((g, i) => {
                const meta = CATEGORY_META[g.categoria];
                return (
                  <tr key={i}>
                    <td data-label="Concepto">{g.concepto}</td>
                    <td data-label="Mensualidad" className="gm-monto">
                      {formatMonto(g.monto)}
                    </td>
                    <td data-label="Categoría">
                      <span
                        className="gm-badge"
                        style={{
                          background: meta ? `${meta.color}22` : "#a0a6c022",
                          color: meta?.color ?? "#a0a6c0",
                          borderColor: meta?.color ?? "#a0a6c0",
                        }}
                      >
                        {g.categoria}
                      </span>
                    </td>
                    <td data-label="Vence" className="gm-fin">
                      {g.fin}
                    </td>
                    <td data-label="P/Restantes">
                      {renderRestantes(g.fin)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default GastosMensuales;

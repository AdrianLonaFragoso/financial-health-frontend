import { useState, useMemo, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { CATEGORY_META, formatMonto } from "../data/constants";
import type { MonthData } from "../data/constants";
import { obtenerMeses } from "../services/mesesService";
import "./Dashboard.css";

function Dashboard() {
  const [meses, setMeses] = useState<MonthData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerMeses()
      .then((res) => {
        setMeses(res.data);
        if (res.data.length > 0) setSelectedMonth(res.data[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const { month, totalIngresos, totalGastos, balance, porCategoria, pieIngresos, pieGastos } = useMemo(() => {
    if (!selectedMonth || meses.length === 0) {
      return {
        month: null as MonthData | null,
        totalIngresos: 0,
        totalGastos: 0,
        balance: 0,
        porCategoria: [] as { categoria: string; monto: number; color: string; label: string }[],
        pieIngresos: [] as { name: string; value: number; color: string }[],
        pieGastos: [] as { name: string; value: number; color: string }[],
      };
    }
    const month = meses.find((m) => m.id === selectedMonth)!;
    const totalIngresos = month.ingresos.reduce((s, i) => s + i.monto, 0);
    const totalGastos = month.gastos.reduce((s, g) => s + g.monto, 0);
    const balance = totalIngresos - totalGastos;

    const acc: Record<string, number> = {};
    for (const g of month.gastos) {
      acc[g.categoria] = (acc[g.categoria] || 0) + g.monto;
    }
    const porCategoria = Object.entries(acc).map(([k, v]) => ({
      categoria: k,
      monto: v,
      color: CATEGORY_META[k]?.color ?? "#a0a6c0",
      label: CATEGORY_META[k]?.label ?? k,
    }));

    const pieIngresos = month.ingresos.map((i) => ({
      name: i.concepto,
      value: i.monto,
      color: INGRESO_COLOR_MAP[i.concepto] ?? "#a0a6c0",
    }));

    const pieGastos = porCategoria.map((c) => ({
      name: c.label,
      value: Math.round(c.monto * 100) / 100,
      color: c.color,
    }));

    return { month, totalIngresos, totalGastos, balance, porCategoria, pieIngresos, pieGastos };
  }, [selectedMonth, meses]);

  if (loading) return <div className="db-container"><p>Cargando...</p></div>;
  if (error) return <div className="db-container"><p>Error: {error}</p></div>;
  if (!month) return <div className="db-container"><p>No hay datos disponibles</p></div>;

  return (
    <div className="db-container">
      <header className="db-header">
        <h1 className="db-title">Dashboard</h1>
        <div className="db-month-selector">
          {meses.map((m) => (
            <button
              key={m.id}
              className={`db-month-btn ${m.id === selectedMonth ? "db-month-btn--active" : ""}`}
              onClick={() => setSelectedMonth(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="db-subtitle">
          {month.label}
        </p>
      </header>

      <section className="db-summary-cards">
        <div className="db-card" style={{ borderTopColor: "#4caf50" }}>
          <span className="db-card-label">Ingresos</span>
          <span className="db-card-value" style={{ color: "#4caf50" }}>
            {formatMonto(totalIngresos)}
          </span>
        </div>
        <div className="db-card" style={{ borderTopColor: "#ff4fd8" }}>
          <span className="db-card-label">Gastos</span>
          <span className="db-card-value" style={{ color: "#ff4fd8" }}>
            {formatMonto(totalGastos)}
          </span>
        </div>
        <div className="db-card" style={{ borderTopColor: balance >= 0 ? "#4caf50" : "#ff4fd8" }}>
          <span className="db-card-label">Balance</span>
          <span className="db-card-value" style={{ color: balance >= 0 ? "#4caf50" : "#ff4fd8" }}>
            {balance >= 0 ? "+" : ""}{formatMonto(balance)}
          </span>
        </div>
      </section>

      <section className="db-chart-section">
        <div className="db-chart-card">
          <h2 className="db-section-title">Ingresos</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieIngresos}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={3}
              >
                {pieIngresos.map((entry, i) => (
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

        <div className="db-chart-card">
          <h2 className="db-section-title">Gastos por categoría</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieGastos}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={3}
              >
                {pieGastos.map((entry, i) => (
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
    </div>
  );
}

const INGRESO_COLOR_MAP: Record<string, string> = {
  Sueldo: "#f59e0b",
  Vales: "#00d8ff",
  Intereses: "#b04cff",
  "Fondo de ahorro": "#2196f3",
};

export default Dashboard;

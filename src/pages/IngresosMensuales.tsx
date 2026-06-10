import { useState, useMemo, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  INGRESO_COLORS,
  formatMonto,
} from "../data/constants";
import type { MonthData } from "../data/constants";
import { obtenerMeses } from "../services/mesesService";
import "./IngresosMensuales.css";

function IngresosMensuales() {
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

  const { month, totalIngresos, totalGastos, pieData, balance } = useMemo(() => {
    if (!selectedMonth || meses.length === 0) {
      return {
        month: null as MonthData | null,
        totalIngresos: 0,
        totalGastos: 0,
        pieData: [] as { name: string; value: number; color: string }[],
        balance: 0,
      };
    }
    const month = meses.find((m) => m.id === selectedMonth)!;
    const totalIngresos = month.ingresos.reduce((s, i) => s + i.monto, 0);
    const totalGastos = month.gastos.reduce((s, g) => s + g.monto, 0);
    const pieData = month.ingresos.map((i) => ({
      name: i.concepto,
      value: i.monto,
      color: INGRESO_COLORS[i.concepto] ?? "#a0a6c0",
    }));
    const balance = totalIngresos - totalGastos;
    return { month, totalIngresos, totalGastos, pieData, balance };
  }, [selectedMonth, meses]);

  if (loading) return <div className="im-container"><p>Cargando...</p></div>;
  if (error) return <div className="im-container"><p>Error: {error}</p></div>;
  if (!month) return <div className="im-container"><p>No hay datos disponibles</p></div>;

  return (
    <div className="im-container">
      <header className="im-header">
        <h1 className="im-title">Ingresos Mensuales</h1>
        <div className="im-month-selector">
          {meses.map((m) => (
            <button
              key={m.id}
              className={`im-month-btn ${m.id === selectedMonth ? "im-month-btn--active" : ""}`}
              onClick={() => setSelectedMonth(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="im-subtitle">
          Total ingresos: {formatMonto(totalIngresos)}
        </p>
      </header>

      <section className="im-summary-cards">
        {month.ingresos.map((i) => (
          <div
            key={i.concepto}
            className="im-card"
            style={{ borderTopColor: INGRESO_COLORS[i.concepto] ?? "#a0a6c0" }}
          >
            <span className="im-card-label">{i.concepto}</span>
            <span
              className="im-card-value"
              style={{ color: INGRESO_COLORS[i.concepto] ?? "#a0a6c0" }}
            >
              {formatMonto(i.monto)}
            </span>
          </div>
        ))}
        <div className="im-card im-card-total">
          <span className="im-card-label">Total Ingresos</span>
          <span className="im-card-value im-card-value-total">
            {formatMonto(totalIngresos)}
          </span>
        </div>
      </section>

      <section className="im-chart-section">
        <div className="im-chart-card">
          <h2 className="im-section-title">Distribución de ingresos</h2>
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
                  background: "#1a1d3a",
                  border: "1px solid #2a2d5a",
                  borderRadius: 8,
                  color: "#f4f6ff",
                }}
              />
              <Legend
                formatter={(value: string) => (
                  <span style={{ color: "#f4f6ff" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="im-chart-card">
          <h2 className="im-section-title">Balance financiero</h2>
          <div className="im-balance-content">
            <div className="im-balance-ring">
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle
                  cx="90"
                  cy="90"
                  r="78"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="14"
                />
                <circle
                  cx="90"
                  cy="90"
                  r="78"
                  fill="none"
                  stroke={balance >= 0 ? "#4caf50" : "#ff4fd8"}
                  strokeWidth="14"
                  strokeDasharray={`${(totalIngresos / Math.max(totalIngresos, totalGastos)) * 490} 490`}
                  strokeLinecap="round"
                  transform="rotate(-90 90 90)"
                  opacity={0.8}
                />
                <text
                  x="90"
                  y="80"
                  textAnchor="middle"
                  fill="#f4f6ff"
                  fontSize="14"
                  fontWeight="600"
                >
                  Balance Neto
                </text>
                <text
                  x="90"
                  y="110"
                  textAnchor="middle"
                  fill={balance >= 0 ? "#4caf50" : "#ff4fd8"}
                  fontSize="18"
                  fontWeight="700"
                >
                  {formatMonto(balance)}
                </text>
              </svg>
            </div>
            <div className="im-balance-legend">
              <div className="im-balance-item">
                <span
                  className="im-balance-dot"
                  style={{ background: "#4caf50" }}
                />
                <span>Ingresos</span>
                <span className="im-balance-amount">
                  {formatMonto(totalIngresos)}
                </span>
              </div>
              <div className="im-balance-item">
                <span
                  className="im-balance-dot"
                  style={{ background: "#ff4fd8" }}
                />
                <span>Gastos</span>
                <span className="im-balance-amount">
                  {formatMonto(totalGastos)}
                </span>
              </div>
              <div
                className="im-balance-item im-balance-item-result"
                style={{
                  borderTopColor: balance >= 0 ? "#4caf50" : "#ff4fd8",
                }}
              >
                <span>Resultado</span>
                <span
                  className="im-balance-amount"
                  style={{ color: balance >= 0 ? "#4caf50" : "#ff4fd8" }}
                >
                  {balance >= 0 ? "+" : ""}
                  {formatMonto(balance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="im-compare-section">
        <h2 className="im-section-title">Comparativa Ingresos vs Gastos</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={[
              {
                name: month.label,
                Ingresos: totalIngresos,
                Gastos: totalGastos,
              },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" stroke="#a0a6c0" fontSize={13} />
            <YAxis
              stroke="#a0a6c0"
              fontSize={12}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: unknown) =>
                value != null ? formatMonto(Number(value)) : ""
              }
              contentStyle={{
                background: "#1a1d3a",
                border: "1px solid #2a2d5a",
                borderRadius: 8,
                color: "#f4f6ff",
              }}
            />
            <Legend
              formatter={(value: string) => (
                <span style={{ color: "#f4f6ff" }}>{value}</span>
              )}
            />
            <Bar dataKey="Ingresos" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Gastos" fill="#ff4fd8" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="im-compare-result">
          <span className="im-compare-label-result">Balance neto</span>
          <span
            className="im-compare-value-result"
            style={{ color: balance >= 0 ? "#4caf50" : "#ff4fd8" }}
          >
            {balance >= 0 ? "+" : ""}
            {formatMonto(balance)}
          </span>
        </div>
      </section>

      <section className="im-table-section">
        <h2 className="im-section-title">Detalle de ingresos</h2>
        <div className="im-table-wrapper">
          <table className="im-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {month.ingresos.map((i) => (
                <tr key={i.concepto}>
                  <td data-label="Concepto">{i.concepto}</td>
                  <td
                    data-label="Monto"
                    className="im-monto"
                    style={{ color: INGRESO_COLORS[i.concepto] }}
                  >
                    {formatMonto(i.monto)}
                  </td>
                  <td data-label="Porcentaje" className="im-pct">
                    {((i.monto / totalIngresos) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="im-row-total">
                <td data-label="Concepto">Total</td>
                <td data-label="Monto" className="im-monto">
                  {formatMonto(totalIngresos)}
                </td>
                <td data-label="Porcentaje" className="im-pct">
                  100%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default IngresosMensuales;

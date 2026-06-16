import { useState, useMemo, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
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
import {
  CATEGORY_META,
  MESES,
  formatMonto,
} from "../data/constants";
import type { MonthData } from "../data/constants";
import { obtenerMeses, crearMes, eliminarMes, obtenerResumen } from "../services/mesesService";
import "./Dashboard.css";

interface Resumen {
  totalMeses: number;
  totalIngresos: number;
  totalGastos: number;
  balance: number;
}

const INGRESO_COLOR_MAP: Record<string, string> = {
  Sueldo: "#f59e0b",
  Vales: "#00d8ff",
  Intereses: "#b04cff",
  "Fondo de ahorro": "#2196f3",
};

const MONTH_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const ALL_MONTHS = [2025, 2026, 2027, 2028].flatMap(y => MONTH_NAMES.map(m => `${m} ${y}`));

const HISTORICO_ITEMS: { item: string; monto: number; ranges: [number, number][] }[] = [
  { item: "Raize + GNP", monto: 8054, ranges: [[0, 29]] },
  { item: "YTP", monto: 8560.84, ranges: [[19, 47]] },
  { item: "Retroid Pocket 5", monto: 452, ranges: [[22, 30]] },
  { item: "Casa Verde", monto: 6165.15, ranges: [[27, 29]] },
  { item: "ByeByeBelly", monto: 1902, ranges: [[26, 31]] },
  { item: "iPad", monto: 889, ranges: [[23, 44]] },
  { item: "Apple Pencil", monto: 215, ranges: [[23, 37]] },
  { item: "Relojes Cubot", monto: 462, ranges: [[28, 30]] },
  { item: "Medica sur", monto: 1267, ranges: [[29, 31]] },
  { item: "Juegos Steam", monto: 902.48, ranges: [[28, 30]] },
  { item: "Banamex Diferido", monto: 470.79, ranges: [[28, 45]] },
  { item: "Tenencias", monto: 127, ranges: [[27, 32]] },
  { item: "Diferido Rappi", monto: 475, ranges: [[29, 30]] },
];

const CURRENT_MONTH_INDEX = (() => {
  const now = new Date();
  return (now.getFullYear() - 2025) * 12 + now.getMonth();
})();

function buildHistoricoRows() {
  return HISTORICO_ITEMS.map(({ item, monto, ranges }) => {
    const payments: (number | null)[] = new Array(48).fill(null);
    for (const [start, end] of ranges) {
      for (let i = start; i <= end; i++) {
        payments[i] = monto;
      }
    }
    return { item, payments };
  });
}

const HISTORICO_ROWS = buildHistoricoRows();

const HISTORICO_TOTALS = (() => {
  return ALL_MONTHS.map((_, monthIdx) => {
    let total = 0;
    for (const row of HISTORICO_ROWS) {
      total += row.payments[monthIdx] ?? 0;
    }
    return total;
  });
})();

function Dashboard() {
  const [meses, setMeses] = useState<MonthData[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nuevoMes, setNuevoMes] = useState(new Date().getMonth() + 1);
  const [nuevoAnio, setNuevoAnio] = useState(new Date().getFullYear());
  const [creando, setCreando] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function cargarDatos() {
    setLoading(true);
    Promise.all([
      obtenerMeses(),
      obtenerResumen(),
    ])
      .then(([mesRes, resumenRes]) => {
        setMeses(mesRes.data);
        setResumen(resumenRes.data);
        if (mesRes.data.length > 0 && !selectedMonth) setSelectedMonth(mesRes.data[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargarDatos();
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

  const mesesConTotales = useMemo(() => {
    return meses.map((m) => {
      const ingresos = m.ingresos.reduce((s, i) => s + i.monto, 0);
      const gastos = m.gastos.reduce((s, g) => s + g.monto, 0);
      return { ...m, totalIngresos: ingresos, totalGastos: gastos, balance: ingresos - gastos };
    });
  }, [meses]);

  async function handleCrearMes(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    try {
      await crearMes({
        label: `${MESES[nuevoMes - 1]} ${nuevoAnio}`,
        year: nuevoAnio,
        month: nuevoMes,
      });
      setShowCreateModal(false);
      cargarDatos();
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
      if (selectedMonth === deleteTarget) setSelectedMonth("");
      cargarDatos();
    } catch {
    }
  }

  if (loading) return <div className="db-container"><p>Cargando...</p></div>;
  if (error) return <div className="db-container"><p>Error: {error}</p></div>;
  if (!resumen) return <div className="db-container"><p>No hay datos disponibles</p></div>;

  return (
    <div className="db-container">
      <header className="db-header">
        <h1 className="db-title">Dashboard</h1>
        <p className="db-subtitle">Control financiero mensual</p>
      </header>

      {resumen.totalMeses > 0 && (
        <>
          <section className="db-global-cards">
            <div className="db-card" style={{ borderTopColor: "#b04cff" }}>
              <span className="db-card-label">Meses registrados</span>
              <span className="db-card-value" style={{ color: "#b04cff" }}>
                {resumen.totalMeses}
              </span>
            </div>
            <div className="db-card" style={{ borderTopColor: "#4caf50" }}>
              <span className="db-card-label">Ingresos totales</span>
              <span className="db-card-value" style={{ color: "#4caf50" }}>
                {formatMonto(resumen.totalIngresos)}
              </span>
            </div>
            <div className="db-card" style={{ borderTopColor: "#ff4fd8" }}>
              <span className="db-card-label">Gastos totales</span>
              <span className="db-card-value" style={{ color: "#ff4fd8" }}>
                {formatMonto(resumen.totalGastos)}
              </span>
            </div>
            <div className="db-card" style={{ borderTopColor: resumen.balance >= 0 ? "#4caf50" : "#ff4fd8" }}>
              <span className="db-card-label">Balance global</span>
              <span className="db-card-value" style={{ color: resumen.balance >= 0 ? "#4caf50" : "#ff4fd8" }}>
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
                  <Line type="monotone" dataKey="totalIngresos" name="Ingresos" stroke="#4caf50" strokeWidth={2} dot={{ fill: "#4caf50", r: 4 }} />
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
                      <td data-label="Balance" className="db-monto" style={{ color: m.balance >= 0 ? "#4caf50" : "#ff4fd8" }}>
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

      {month && (
        <>
          <div className="db-month-bar">
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
            {meses.length === 0 && (
              <button className="db-add-btn" onClick={() => setShowCreateModal(true)}>
                <FaPlus />
                Agregar mes
              </button>
            )}
          </div>

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
        </>
      )}

      <section className="db-table-section">
        <h2 className="db-section-title">Pagos mensuales personales</h2>
        <div className="db-table-wrapper">
          <table className="db-table db-table--wide">
            <thead>
              <tr className="db-tr-year">
                <th colSpan={2}></th>
                {[2025, 2026, 2027, 2028].map(y => (
                  <th key={y} colSpan={12} className="db-th-year">{y}</th>
                ))}
              </tr>
              <tr>
                <th>Item</th>
                <th>Monto</th>
                {ALL_MONTHS.map((m, i) => (
                  <th key={m} className={`db-th-month${i === CURRENT_MONTH_INDEX ? " db-th-current" : ""}`}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HISTORICO_ROWS.map(row => {
                const monto = row.payments.find(p => p != null) ?? 0;
                return (
                  <tr key={row.item}>
                    <td className="db-month-name">{row.item}</td>
                    <td className="db-monto">{monto > 0 ? formatMonto(monto) : "—"}</td>
                    {row.payments.map((p, i) => (
                      <td key={i} className={`db-monto${i === CURRENT_MONTH_INDEX ? " db-monto-current" : ""}`}>{p != null ? formatMonto(p) : ""}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td></td>
                {HISTORICO_TOTALS.map((t, i) => (
                  <td key={i} className={`db-monto${i === CURRENT_MONTH_INDEX ? " db-monto-current" : ""}`} style={{ fontWeight: 700 }}>
                    {t > 0 ? formatMonto(t) : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

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

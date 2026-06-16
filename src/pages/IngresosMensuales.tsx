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
import { FaPlus, FaTrash, FaPen, FaFileCsv } from "react-icons/fa";
import CsvImportModal from "../components/CsvImportModal";
import { useMonth } from "../contexts/MonthContext";
import {
  INGRESO_COLORS,
  MESES,
  formatMonto,
} from "../data/constants";
import type { Ingreso, MonthData } from "../data/constants";
import { crearIngreso, actualizarIngreso, eliminarIngreso } from "../services/ingresosService";
import "./IngresosMensuales.css";

function ingresoId(i: Ingreso, idx: number) {
  return i.id ?? `tmp-${idx}`;
}

function IngresosMensuales() {
  const { meses, selectedMonth, setSelectedMonth, loading: mesesLoading, refreshMeses } = useMonth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [nuevoConcepto, setNuevoConcepto] = useState("");
  const [nuevoMonto, setNuevoMonto] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<Ingreso | null>(null);
  const [editConcepto, setEditConcepto] = useState("");
  const [editMonto, setEditMonto] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (meses.length > 0) setLoading(false);
  }, [meses]);

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

  function openEdit(i: Ingreso) {
    setEditTarget(i);
    setEditConcepto(i.concepto);
    setEditMonto(String(i.monto));
  }

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoConcepto.trim() || !nuevoMonto.trim()) return;
    setSubmitting(true);
    try {
      await crearIngreso(selectedMonth, {
        concepto: nuevoConcepto.trim(),
        monto: parseFloat(nuevoMonto),
      });
      setNuevoConcepto("");
      setNuevoMonto("");
      setShowModal(false);
      refreshMeses();
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editConcepto.trim() || !editMonto.trim()) return;
    const ingresoId = editTarget.id;
    if (!ingresoId) return;
    setSubmitting(true);
    try {
      await actualizarIngreso(selectedMonth, ingresoId, {
        concepto: editConcepto.trim(),
        monto: parseFloat(editMonto),
      });
      setEditTarget(null);
      refreshMeses();
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmarEliminar() {
    if (!deleteTarget) return;
    try {
      await eliminarIngreso(selectedMonth, deleteTarget);
      setDeleteTarget(null);
      refreshMeses();
    } catch {
    }
  }

  if (loading) return <div className="im-container"><div className="loading-screen"><div className="loading-spinner" /><p className="loading-text">Cargando...</p></div></div>;
  if (error) return <div className="im-container"><p>Error: {error}</p></div>;
  if (!month) return <div className="im-container"><p>No hay datos disponibles</p></div>;

  return (
    <div className="im-container">
      <header className="im-header">
        <h1 className="im-title">Ingresos Mensuales</h1>
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
                  stroke="var(--color-border)"
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
                  fill="var(--color-text)"
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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={13} />
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
        <div className="im-table-header">
          <h2 className="im-section-title">Detalle de ingresos</h2>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button className="im-add-btn" onClick={() => setShowModal(true)}>
              <FaPlus />
              Agregar ingreso
            </button>
            <button className="im-add-btn" onClick={() => setShowImport(true)}>
              <FaFileCsv />
              Importar CSV
            </button>
          </div>
        </div>
        <div className="im-table-wrapper">
          <table className="im-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Porcentaje</th>
                <th className="im-th-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {month.ingresos.map((i, idx) => (
                <tr key={ingresoId(i, idx)}>
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
                  <td data-label="Acciones" className="im-acciones-cell">
                    <button
                      className="im-action-btn"
                      title="Editar ingreso"
                      onClick={() => openEdit(i)}
                    >
                      <FaPen />
                    </button>
                    <button
                      className="im-action-btn im-action-btn--delete"
                      title="Eliminar ingreso"
                      onClick={() => setDeleteTarget(ingresoId(i, idx))}
                    >
                      <FaTrash />
                    </button>
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
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="im-overlay" onClick={() => setShowModal(false)}>
          <div className="im-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="im-modal-title">Nuevo ingreso</h2>
            <form onSubmit={handleAgregar}>
              <div className="im-modal-field">
                <label htmlFor="im-concepto">Concepto</label>
                <input
                  id="im-concepto"
                  type="text"
                  placeholder="Ej. Sueldo, Vales, ..."
                  value={nuevoConcepto}
                  onChange={(e) => setNuevoConcepto(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="im-modal-field">
                <label htmlFor="im-monto">Monto</label>
                <input
                  id="im-monto"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={nuevoMonto}
                  onChange={(e) => setNuevoMonto(e.target.value)}
                />
              </div>
              <div className="im-modal-actions">
                <button
                  type="button"
                  className="im-modal-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="im-modal-submit"
                  disabled={submitting || !nuevoConcepto.trim() || !nuevoMonto.trim()}
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="im-overlay" onClick={() => setEditTarget(null)}>
          <div className="im-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="im-modal-title">Editar ingreso</h2>
            <form onSubmit={handleEditar}>
              <div className="im-modal-field">
                <label htmlFor="im-edit-concepto">Concepto</label>
                <input
                  id="im-edit-concepto"
                  type="text"
                  value={editConcepto}
                  onChange={(e) => setEditConcepto(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="im-modal-field">
                <label htmlFor="im-edit-monto">Monto</label>
                <input
                  id="im-edit-monto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editMonto}
                  onChange={(e) => setEditMonto(e.target.value)}
                />
              </div>
              <div className="im-modal-actions">
                <button
                  type="button"
                  className="im-modal-cancel"
                  onClick={() => setEditTarget(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="im-modal-submit"
                  disabled={submitting || !editConcepto.trim() || !editMonto.trim()}
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="im-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="im-modal im-modal--confirm" onClick={(e) => e.stopPropagation()}>
            <h2 className="im-modal-title">Eliminar ingreso</h2>
            <p className="im-confirm-text">
              ¿Estás seguro de que deseas eliminar este ingreso? Esta acción no se puede deshacer.
            </p>
            <div className="im-modal-actions">
              <button
                type="button"
                className="im-modal-cancel"
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="im-modal-submit im-modal-submit--danger"
                onClick={confirmarEliminar}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <CsvImportModal
          type="ingreso"
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); refreshMeses(); }}
        />
      )}
    </div>
  );
}

export default IngresosMensuales;

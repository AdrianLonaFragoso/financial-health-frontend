import { useState, useMemo, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { FaPlus, FaTrash, FaPen, FaFileCsv, FaTable, FaChartPie } from "react-icons/fa";
import CsvImportModal from "../components/CsvImportModal";
import { useMonth } from "../contexts/MonthContext";
import {
  CATEGORY_META,
  IDEAL_SPLIT,
  MESES,
  formatMonto,
} from "../data/constants";
import type { Gasto, MonthData } from "../data/constants";
import { crearGasto, actualizarGasto, eliminarGasto } from "../services/gastosService";

import "./GastosMensuales.css";

type SortKey = keyof Gasto | "restantes";
type SortDir = "asc" | "desc";

const MONTH_MAP: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

const REVERSE_MONTH_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

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

function finToDateValue(fin: string): string {
  if (fin === "indefinido") return "";
  const date = parseFinDate(fin);
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateValueToFin(value: string): string {
  if (!value) return "indefinido";
  const date = new Date(value + "T12:00:00");
  if (isNaN(date.getTime())) return "indefinido";
  const day = String(date.getDate()).padStart(2, "0");
  const month = REVERSE_MONTH_SHORT[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function GastosMensuales() {
  const { meses, selectedMonth, setSelectedMonth, loading: mesesLoading, refreshMeses } = useMonth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [showModal, setShowModal] = useState(false);
  const [nuevoConcepto, setNuevoConcepto] = useState("");
  const [nuevoMonto, setNuevoMonto] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("Necesidades");
  const [nuevoFin, setNuevoFin] = useState("indefinido");
  const [nuevoFinIndefinido, setNuevoFinIndefinido] = useState(true);
  const [nuevoFinDate, setNuevoFinDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<Gasto | null>(null);
  const [editConcepto, setEditConcepto] = useState("");
  const [editMonto, setEditMonto] = useState("");
  const [editCategoria, setEditCategoria] = useState("");
  const [editFin, setEditFin] = useState("");
  const [editFinIndefinido, setEditFinIndefinido] = useState(true);
  const [editFinDate, setEditFinDate] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const [viewMode, setViewMode] = useState<"normal" | "table">("normal");
  const [hideFutureMonths, setHideFutureMonths] = useState(false);

  useEffect(() => {
    if (meses.length > 0) setLoading(false);
  }, [meses]);

  const { month, gastosParaMes, total, totalIngresos, porCategoria, pieData, totalIdeal } = useMemo(() => {
    if (!selectedMonth || meses.length === 0) {
      return {
        month: null as MonthData | null,
        gastosParaMes: [] as Gasto[],
        total: 0,
        totalIngresos: 0,
        porCategoria: [] as { categoria: string; monto: number; pct: number; color: string; label: string }[],
        pieData: [] as { name: string; value: number; color: string }[],
        totalIdeal: { necesidades: 0, estiloVida: 0, ahorro: 0 },
      };
    }
    const month = meses.find((m) => m.id === selectedMonth)!;
    const gastosParaMes = month.gastos;
    const totalIngresos = month.ingresos.reduce((s, i) => s + i.monto, 0);
    const acc: Record<string, number> = {};
    for (const g of gastosParaMes) {
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
    return { month, gastosParaMes, total, totalIngresos, porCategoria, pieData, totalIdeal };
  }, [selectedMonth, meses]);

  const actualNeeds = porCategoria.find((c) => c.categoria === "Necesidades");
  const actualLifestyle = porCategoria.find((c) => c.categoria === "Estilo de vida");
  const actualSavings = porCategoria.find((c) => c.categoria === "Ahorro");

  const filteredGastos = useMemo(() => {
    if (!month) return [];
    const q = search.toLowerCase().trim();
    let list = gastosParaMes;
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
  }, [gastosParaMes, search, sortKey, sortDir]);

  const pagosData = useMemo(() => {
    if (meses.length === 0) return { months: [], rows: [], totals: [] };

    const conceptMap = new Map<string, { concepto: string; monto: number; categoria: string; fin: string }>();
    const conceptMonths = new Map<string, Map<string, number>>();

    for (const m of meses) {
      for (const g of m.gastos) {
        if (!conceptMap.has(g.concepto)) {
          conceptMap.set(g.concepto, { concepto: g.concepto, monto: g.monto, categoria: g.categoria, fin: g.fin });
        }
        if (!conceptMonths.has(g.concepto)) {
          conceptMonths.set(g.concepto, new Map());
        }
        conceptMonths.get(g.concepto)!.set(m.id, g.monto);
      }
    }

    let rows = Array.from(conceptMap.values()).map((info) => {
      const monthMap = conceptMonths.get(info.concepto)!;
      return {
        ...info,
        payments: meses.map((m) => monthMap.get(m.id) ?? null),
      };
    });

    if (hideFutureMonths) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      rows = rows.filter((r) => {
        if (r.fin === "indefinido") return true;
        const parts = r.fin.split("-");
        if (parts.length !== 3) return true;
        const monthStr = parts[1]?.toLowerCase();
        const yearStr = parts[2];
        const endMonth = ({ ene:1, feb:2, mar:3, abr:4, may:5, jun:6, jul:7, ago:8, sep:9, oct:10, nov:11, dic:12 })[monthStr ?? ""];
        const endYear = 2000 + parseInt(yearStr ?? "0", 10);
        if (!endMonth || isNaN(endYear)) return true;
        return endYear > currentYear || (endYear === currentYear && endMonth >= currentMonth);
      });
    }

    rows.sort((a, b) => b.monto - a.monto);

    const totals = meses.map((_, i) => rows.reduce((s, r) => s + (r.payments[i] ?? 0), 0));

    return { months: meses, rows, totals };
  }, [meses, hideFutureMonths]);

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

  function openEdit(g: Gasto) {
    setEditTarget(g);
    setEditConcepto(g.concepto);
    setEditMonto(String(g.monto));
    setEditCategoria(g.categoria);
    setEditFin(g.fin);
    setEditFinIndefinido(g.fin === "indefinido");
    setEditFinDate(finToDateValue(g.fin));
  }

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoConcepto.trim() || !nuevoMonto.trim()) return;
    setSubmitting(true);
    try {
      const finValue = nuevoFinIndefinido ? "indefinido" : dateValueToFin(nuevoFinDate);
      await crearGasto(selectedMonth, {
        concepto: nuevoConcepto.trim(),
        monto: parseFloat(nuevoMonto),
        categoria: nuevaCategoria,
        fin: finValue,
      });
      setNuevoConcepto("");
      setNuevoMonto("");
      setNuevaCategoria("Necesidades");
      setNuevoFin("indefinido");
      setNuevoFinIndefinido(true);
      setNuevoFinDate("");
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
    const gastoId = editTarget.id;
    if (!gastoId) return;
    setSubmitting(true);
    try {
      const finValue = editFinIndefinido ? "indefinido" : dateValueToFin(editFinDate);
      await actualizarGasto(selectedMonth, gastoId, {
        concepto: editConcepto.trim(),
        monto: parseFloat(editMonto),
        categoria: editCategoria,
        fin: finValue,
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
      await eliminarGasto(selectedMonth, deleteTarget);
      setDeleteTarget(null);
      refreshMeses();
    } catch {
    }
  }

  if (loading) return <div className="gm-container"><div className="loading-screen"><div className="loading-spinner" /><p className="loading-text">Cargando...</p></div></div>;
  if (error) return <div className="gm-container"><p>Error: {error}</p></div>;
  if (!month) return <div className="gm-container"><p>No hay datos disponibles</p></div>;

  return (
    <div className="gm-container">
      <header className="gm-header">
        <h1 className="gm-title">Gastos Mensuales</h1>
        <p className="gm-subtitle">
          {viewMode === "normal" ? `Total: ${formatMonto(total)}` : "Vista general de pagos"}
        </p>
        <div className="gm-view-toggle">
          <button
            className={`gm-view-btn ${viewMode === "normal" ? "gm-view-btn--active" : ""}`}
            onClick={() => setViewMode("normal")}
          >
            <FaChartPie /> Vista normal
          </button>
          <button
            className={`gm-view-btn ${viewMode === "table" ? "gm-view-btn--active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            <FaTable /> Vista tabla
          </button>
        </div>
      </header>

      {viewMode === "normal" ? (
        <>
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
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  className="gm-search"
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="gm-add-btn" onClick={() => setShowModal(true)}>
                  <FaPlus />
                  Agregar gasto
                </button>
                <button className="gm-add-btn" onClick={() => setShowImport(true)}>
                  <FaFileCsv />
                  Importar CSV
                </button>
              </div>
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
                    <th className="gm-th-acciones">Acciones</th>
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
                        <td data-label="Acciones" className="gm-acciones-cell">
                          <button
                            className="gm-action-btn"
                            title="Editar gasto"
                            onClick={() => openEdit(g)}
                          >
                            <FaPen />
                          </button>
                          <button
                            className="gm-action-btn gm-action-btn--delete"
                            title="Eliminar gasto"
                            onClick={() => setDeleteTarget(g.id ?? `tmp-${i}`)}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="gm-table-section">
          <div className="gm-table-header">
            <h2 className="gm-section-title">Pagos mensuales personales</h2>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <label className="gm-filter-checkbox">
                <input
                  type="checkbox"
                  checked={hideFutureMonths}
                  onChange={(e) => setHideFutureMonths(e.target.checked)}
                />
                Ocultar finalizados
              </label>
              <button className="gm-add-btn" onClick={() => setShowImport(true)}>
                <FaFileCsv />
                Importar CSV
              </button>
            </div>
          </div>
          <div className="gm-table-wrapper">
            <table className="gm-table gm-table--wide">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Monto</th>
                  {pagosData.months.map((m) => (
                    <th key={m.id} className="gm-th-month">{m.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagosData.rows.map((row) => (
                  <tr key={row.concepto}>
                    <td className="gm-month-name">{row.concepto}</td>
                    <td className="gm-monto">{formatMonto(row.monto)}</td>
                    {row.payments.map((p, i) => (
                      <td key={i} className="gm-monto">{p != null ? formatMonto(p) : ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ fontWeight: 700 }}>Total</td>
                  <td></td>
                  {pagosData.totals.map((t, i) => (
                    <td key={i} className="gm-monto" style={{ fontWeight: 700 }}>
                      {t > 0 ? formatMonto(t) : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
      {showModal && (
        <div className="gm-overlay" onClick={() => setShowModal(false)}>
          <div className="gm-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="gm-modal-title">Nuevo gasto</h2>
            <form onSubmit={handleAgregar}>
              <div className="gm-modal-field">
                <label htmlFor="gm-concepto">Concepto</label>
                <input
                  id="gm-concepto"
                  type="text"
                  placeholder="Ej. Renta, Netflix, ..."
                  value={nuevoConcepto}
                  onChange={(e) => setNuevoConcepto(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="gm-modal-field">
                <label htmlFor="gm-monto">Monto</label>
                <input
                  id="gm-monto"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={nuevoMonto}
                  onChange={(e) => setNuevoMonto(e.target.value)}
                />
              </div>
              <div className="gm-modal-field">
                <label htmlFor="gm-categoria">Categoria</label>
                <select
                  id="gm-categoria"
                  className="gm-select"
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                >
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="gm-modal-field">
                <label htmlFor="gm-fin">Vencimiento</label>
                <div className="gm-fin-row">
                  <label className="gm-fin-indef-label">
                    <input
                      type="checkbox"
                      checked={nuevoFinIndefinido}
                      onChange={(e) => setNuevoFinIndefinido(e.target.checked)}
                    />
                    Indefinido
                  </label>
                  <input
                    id="gm-fin"
                    type="date"
                    value={nuevoFinDate}
                    onChange={(e) => {
                      setNuevoFinDate(e.target.value);
                      setNuevoFinIndefinido(false);
                    }}
                    disabled={nuevoFinIndefinido}
                  />
                </div>
              </div>
              <div className="gm-modal-actions">
                <button
                  type="button"
                  className="gm-modal-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="gm-modal-submit"
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
        <div className="gm-overlay" onClick={() => setEditTarget(null)}>
          <div className="gm-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="gm-modal-title">Editar gasto</h2>
            <form onSubmit={handleEditar}>
              <div className="gm-modal-field">
                <label htmlFor="gm-edit-concepto">Concepto</label>
                <input
                  id="gm-edit-concepto"
                  type="text"
                  value={editConcepto}
                  onChange={(e) => setEditConcepto(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="gm-modal-field">
                <label htmlFor="gm-edit-monto">Monto</label>
                <input
                  id="gm-edit-monto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editMonto}
                  onChange={(e) => setEditMonto(e.target.value)}
                />
              </div>
              <div className="gm-modal-field">
                <label htmlFor="gm-edit-categoria">Categoria</label>
                <select
                  id="gm-edit-categoria"
                  className="gm-select"
                  value={editCategoria}
                  onChange={(e) => setEditCategoria(e.target.value)}
                >
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="gm-modal-field">
                <label htmlFor="gm-edit-fin">Vencimiento</label>
                <div className="gm-fin-row">
                  <label className="gm-fin-indef-label">
                    <input
                      type="checkbox"
                      checked={editFinIndefinido}
                      onChange={(e) => setEditFinIndefinido(e.target.checked)}
                    />
                    Indefinido
                  </label>
                  <input
                    id="gm-edit-fin"
                    type="date"
                    value={editFinDate}
                    onChange={(e) => {
                      setEditFinDate(e.target.value);
                      setEditFinIndefinido(false);
                    }}
                    disabled={editFinIndefinido}
                  />
                </div>
              </div>
              <div className="gm-modal-actions">
                <button
                  type="button"
                  className="gm-modal-cancel"
                  onClick={() => setEditTarget(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="gm-modal-submit"
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
        <div className="gm-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="gm-modal gm-modal--confirm" onClick={(e) => e.stopPropagation()}>
            <h2 className="gm-modal-title">Eliminar gasto</h2>
            <p className="gm-confirm-text">
              ¿Estas seguro de que deseas eliminar este gasto? Esta accion no se puede deshacer.
            </p>
            <div className="gm-modal-actions">
              <button
                type="button"
                className="gm-modal-cancel"
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="gm-modal-submit gm-modal-submit--danger"
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
          type="gasto"
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); refreshMeses(); }}
        />
      )}
    </div>
  );
}

export default GastosMensuales;

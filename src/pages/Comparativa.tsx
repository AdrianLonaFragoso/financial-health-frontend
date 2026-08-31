import { useMemo, useState } from "react";
import {
  FaBalanceScale,
  FaCheck,
  FaTimes,
  FaSearch,
  FaEyeSlash,
  FaUndo,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";
import { useMonth } from "../contexts/MonthContext";
import { CATEGORY_META, INGRESO_COLORS, formatMonto } from "../data/constants";
import type { Gasto, Ingreso } from "../data/constants";
import "./Comparativa.css";

type CategoriaFiltro = "todas" | string;

function getIngresoColor(concepto: string) {
  if (INGRESO_COLORS[concepto]) return INGRESO_COLORS[concepto];
  // hash fallback
  let h = 0;
  for (let i = 0; i < concepto.length; i++) h = concepto.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 70% 50%)`;
}

function Comparativa() {
  const { meses, selectedMonth } = useMonth();

  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());
  const [searchIngresos, setSearchIngresos] = useState("");
  const [searchEgresos, setSearchEgresos] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaFiltro>("todas");
  const [sortEgresos, setSortEgresos] = useState<"montoDesc" | "montoAsc" | "concepto">("montoDesc");

  const month = useMemo(() => {
    if (!selectedMonth || meses.length === 0) return null;
    return meses.find((m) => m.id === selectedMonth) ?? null;
  }, [meses, selectedMonth]);

  const {
    totalIngresos,
    totalGastos,
    totalGastosFiltrados,
    totalGastosSimulado,
    balance,
    balanceSimulado,
    ahorroLiberado,
    pctUtilizado,
    ingresosFiltrados,
    egresosOrdenados,
    porCategoria,
  } = useMemo(() => {
    if (!month) {
      return {
        totalIngresos: 0,
        totalGastos: 0,
        totalGastosFiltrados: 0,
        totalGastosSimulado: 0,
        balance: 0,
        balanceSimulado: 0,
        ahorroLiberado: 0,
        pctUtilizado: 0,
        ingresosFiltrados: [] as (Ingreso & { _id: string })[],
        egresosFiltrados: [] as (Gasto & { _id: string })[],
        egresosOrdenados: [] as (Gasto & { _id: string })[],
        porCategoria: [] as { categoria: string; monto: number; color: string; label: string }[],
      };
    }

    const ingresosConId = month.ingresos.map((ing, idx) => ({
      ...ing,
      _id: ing.id ?? `ing-${idx}-${ing.concepto}`,
    }));
    const gastosConId = month.gastos.map((g, idx) => ({
      ...g,
      _id: g.id ?? `gas-${idx}-${g.concepto}`,
    }));

    const qIng = searchIngresos.toLowerCase().trim();
    const qEgr = searchEgresos.toLowerCase().trim();

    const ingresosFiltrados = qIng
      ? ingresosConId.filter((i) => i.concepto.toLowerCase().includes(qIng) || String(i.monto).includes(qIng))
      : ingresosConId;

    let egresosFiltrados = gastosConId;
    if (qEgr) {
      egresosFiltrados = egresosFiltrados.filter(
        (g) =>
          g.concepto.toLowerCase().includes(qEgr) ||
          g.categoria.toLowerCase().includes(qEgr) ||
          String(g.monto).includes(qEgr)
      );
    }
    if (categoriaFiltro !== "todas") {
      egresosFiltrados = egresosFiltrados.filter((g) => g.categoria === categoriaFiltro);
    }

    const egresosOrdenados = [...egresosFiltrados].sort((a, b) => {
      if (sortEgresos === "montoDesc") return b.monto - a.monto;
      if (sortEgresos === "montoAsc") return a.monto - b.monto;
      return a.concepto.localeCompare(b.concepto);
    });

    const totalIngresos = month.ingresos.reduce((s, i) => s + i.monto, 0);
    const totalGastos = month.gastos.reduce((s, g) => s + g.monto, 0);
    const totalGastosFiltrados = egresosFiltrados.reduce((s, g) => s + g.monto, 0);
    const totalGastosSimulado = gastosConId
      .filter((g) => !excluidos.has(g._id))
      .reduce((s, g) => s + g.monto, 0);
    const balance = totalIngresos - totalGastos;
    const balanceSimulado = totalIngresos - totalGastosSimulado;
    const ahorroLiberado = totalGastos - totalGastosSimulado;
    const pctUtilizado = totalIngresos > 0 ? (totalGastos / totalIngresos) * 100 : 0;

    const acc: Record<string, number> = {};
    for (const g of month.gastos) acc[g.categoria] = (acc[g.categoria] || 0) + g.monto;
    const porCategoria = Object.entries(acc).map(([k, v]) => ({
      categoria: k,
      monto: v,
      color: CATEGORY_META[k]?.color ?? "#a0a6c0",
      label: CATEGORY_META[k]?.label ?? k,
    }));

    return {
      totalIngresos,
      totalGastos,
      totalGastosFiltrados,
      totalGastosSimulado,
      balance,
      balanceSimulado,
      ahorroLiberado,
      pctUtilizado,
      ingresosFiltrados,
      egresosFiltrados,
      egresosOrdenados,
      porCategoria,
    };
  }, [month, searchIngresos, searchEgresos, categoriaFiltro, sortEgresos, excluidos]);

  function toggleExcluido(id: string) {
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!month) {
    return (
      <div className="cmp-container">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p className="loading-text">Cargando...</p>
        </div>
      </div>
    );
  }

  const categoriasDisponibles = Object.keys(CATEGORY_META);
  const haySimulacion = excluidos.size > 0;

  return (
    <div className="cmp-container">
      <header className="cmp-header">
        <div className="cmp-header-top">
          <div>
            <h1 className="cmp-title">
              <FaBalanceScale /> Comparativa Mensual
            </h1>
            <p className="cmp-subtitle">
              {month.label} · Visión global ingresos vs egresos para decidir qué mantener, recortar o potenciar
            </p>
          </div>
          {haySimulacion && (
            <button className="cmp-reset-btn" onClick={() => setExcluidos(new Set())}>
              <FaUndo /> Limpiar simulación ({excluidos.size})
            </button>
          )}
        </div>

        <div className="cmp-kpis">
          <div className="cmp-kpi" style={{ borderTopColor: "#0ea5e9" }}>
            <span className="cmp-kpi-label">Ingresos totales</span>
            <span className="cmp-kpi-value" style={{ color: "#0ea5e9" }}>
              {formatMonto(totalIngresos)}
            </span>
            <span className="cmp-kpi-sub">{month.ingresos.length} fuentes</span>
          </div>
          <div className="cmp-kpi" style={{ borderTopColor: "#ff4fd8" }}>
            <span className="cmp-kpi-label">Egresos totales</span>
            <span className="cmp-kpi-value" style={{ color: "#ff4fd8" }}>
              {formatMonto(haySimulacion ? totalGastosSimulado : totalGastos)}
            </span>
            <span className="cmp-kpi-sub">
              {haySimulacion ? (
                <>
                  <span style={{ textDecoration: "line-through", opacity: 0.6 }}>{formatMonto(totalGastos)}</span>{" "}
                  · {month.gastos.length - excluidos.size} conceptos
                </>
              ) : (
                <>{month.gastos.length} conceptos</>
              )}
            </span>
          </div>
          <div
            className="cmp-kpi cmp-kpi--balance"
            style={{ borderTopColor: (haySimulacion ? balanceSimulado : balance) >= 0 ? "#22c55e" : "#ef4444" }}
          >
            <span className="cmp-kpi-label">{haySimulacion ? "Balance simulado" : "Balance real"}</span>
            <span
              className="cmp-kpi-value"
              style={{ color: (haySimulacion ? balanceSimulado : balance) >= 0 ? "#22c55e" : "#ef4444" }}
            >
              {(haySimulacion ? balanceSimulado : balance) >= 0 ? "+" : ""}
              {formatMonto(haySimulacion ? balanceSimulado : balance)}
            </span>
            <span className="cmp-kpi-sub">
              {(haySimulacion ? balanceSimulado : balance) >= 0 ? (
                <span style={{ color: "#22c55e" }}>
                  <FaArrowUp style={{ fontSize: "0.7rem" }} /> Queda disponible
                </span>
              ) : (
                <span style={{ color: "#ef4444" }}>
                  <FaArrowDown style={{ fontSize: "0.7rem" }} /> Falta para cerrar
                </span>
              )}
            </span>
          </div>
          <div className="cmp-kpi" style={{ borderTopColor: pctUtilizado > 100 ? "#ef4444" : pctUtilizado > 85 ? "#f59e0b" : "#22c55e" }}>
            <span className="cmp-kpi-label">% Utilizado</span>
            <span
              className="cmp-kpi-value"
              style={{ color: pctUtilizado > 100 ? "#ef4444" : pctUtilizado > 85 ? "#f59e0b" : "#22c55e" }}
            >
              {pctUtilizado.toFixed(1)}%
            </span>
            <span className="cmp-kpi-sub">
              {haySimulacion
                ? `${((totalGastosSimulado / totalIngresos) * 100).toFixed(1)}% simulado`
                : totalIngresos > 0
                ? `${formatMonto(totalGastos)} de ${formatMonto(totalIngresos)}`
                : "Sin ingresos"}
            </span>
          </div>
        </div>

        <div className={`cmp-balance-banner ${balance >= 0 ? "cmp-balance-banner--positive" : "cmp-balance-banner--negative"} ${haySimulacion ? "cmp-balance-banner--sim" : ""}`}>
          <div className="cmp-balance-main">
            {haySimulacion ? (
              <>
                <span className="cmp-balance-icon">{balanceSimulado >= 0 ? <FaCheck /> : <FaTimes />}</span>
                <div>
                  <strong>
                    {balanceSimulado >= 0
                      ? `Con esta simulación te quedan ${formatMonto(balanceSimulado)}`
                      : `Aún te faltan ${formatMonto(Math.abs(balanceSimulado))} para equilibrar`}
                  </strong>
                  <p>
                    Liberaste {formatMonto(ahorroLiberado)} al excluir {excluidos.size} concepto{excluidos.size !== 1 ? "s" : ""}. Balance real era{" "}
                    {balance >= 0 ? "+" : ""}
                    {formatMonto(balance)}.
                  </p>
                </div>
              </>
            ) : balance >= 0 ? (
              <>
                <span className="cmp-balance-icon cmp-balance-icon--ok">
                  <FaCheck />
                </span>
                <div>
                  <strong>Te quedan {formatMonto(balance)} disponibles este mes</strong>
                  <p>Equivale al {(100 - pctUtilizado).toFixed(1)}% de tus ingresos. Ideal destinar a colchón o abono a deuda con mayor interés.</p>
                </div>
              </>
            ) : (
              <>
                <span className="cmp-balance-icon cmp-balance-icon--bad">
                  <FaTimes />
                </span>
                <div>
                  <strong>Te faltan {formatMonto(Math.abs(balance))} para cerrar el mes</strong>
                  <p>Necesitas recortar {Math.abs(pctUtilizado - 100).toFixed(1)}% de egresos o aumentar ingresos. Revisa Estilo de vida y Deuda abajo.</p>
                </div>
              </>
            )}
          </div>
          <div className="cmp-balance-bar">
            <div className="cmp-balance-track">
              <div
                className="cmp-balance-fill"
                style={{
                  width: `${Math.min(pctUtilizado, 100)}%`,
                  background: pctUtilizado > 100 ? "#ef4444" : pctUtilizado > 85 ? "#f59e0b" : "#22c55e",
                }}
              />
              {haySimulacion && (
                <div
                  className="cmp-balance-fill cmp-balance-fill--sim"
                  style={{
                    width: `${Math.min((totalGastosSimulado / totalIngresos) * 100, 100)}%`,
                    background: balanceSimulado >= 0 ? "#22c55e" : "#ef4444",
                  }}
                />
              )}
            </div>
            <div className="cmp-balance-labels">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {porCategoria.length > 0 && (
          <div className="cmp-category-summary">
            {porCategoria.map((c) => (
              <div key={c.categoria} className="cmp-cat-chip" style={{ borderColor: c.color, color: c.color }}>
                <span className="cmp-cat-dot" style={{ background: c.color }} />
                {c.label}: {formatMonto(c.monto)}{" "}
                <span style={{ opacity: 0.7 }}>({totalIngresos > 0 ? ((c.monto / totalIngresos) * 100).toFixed(1) : 0}%)</span>
              </div>
            ))}
          </div>
        )}
      </header>

      <div className="cmp-grid">
        {/* Ingresos */}
        <section className="cmp-col cmp-col--ingresos">
          <div className="cmp-col-header" style={{ borderTopColor: "#0ea5e9" }}>
            <div className="cmp-col-title">
              <h2>
                <span className="cmp-col-icon" style={{ background: "#0ea5e9" }}>
                  +
                </span>{" "}
                Ingresos
              </h2>
              <span className="cmp-col-count">{ingresosFiltrados.length}</span>
            </div>
            <div className="cmp-col-total" style={{ color: "#0ea5e9" }}>
              {formatMonto(totalIngresos)}
            </div>
            <div className="cmp-search-wrap">
              <FaSearch className="cmp-search-icon" />
              <input
                className="cmp-search"
                placeholder="Buscar ingreso..."
                value={searchIngresos}
                onChange={(e) => setSearchIngresos(e.target.value)}
              />
            </div>
          </div>

          <div className="cmp-table-wrap">
            <table className="cmp-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                  <th>Origen</th>
                  <th style={{ textAlign: "right" }}>%</th>
                </tr>
              </thead>
              <tbody>
                {ingresosFiltrados
                  .slice()
                  .sort((a, b) => b.monto - a.monto)
                  .map((ing) => {
                    const pct = totalIngresos > 0 ? (ing.monto / totalIngresos) * 100 : 0;
                    const color = getIngresoColor(ing.concepto);
                    return (
                      <tr key={ing._id}>
                        <td className="cmp-concepto">{ing.concepto}</td>
                        <td style={{ textAlign: "right" }} className="cmp-monto cmp-monto--ingreso" data-label="Monto">
                          {formatMonto(ing.monto)}
                        </td>
                        <td data-label="Origen">
                          <span
                            className="cmp-badge"
                            style={{
                              background: `${color}18`,
                              color,
                              borderColor: `${color}55`,
                            }}
                          >
                            {ing.concepto}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }} className="cmp-pct" data-label="%">
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                {ingresosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={4} className="cmp-empty">
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td style={{ textAlign: "right" }} className="cmp-monto">
                    {formatMonto(ingresosFiltrados.reduce((s, i) => s + i.monto, 0))}
                  </td>
                  <td colSpan={2} style={{ textAlign: "right", opacity: 0.7, fontSize: "0.8rem" }}>
                    {ingresosFiltrados.length} de {month.ingresos.length}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="cmp-col-footer">
            <span>Simular ingresos: edita en módulo Ingresos para ver impacto</span>
          </div>
        </section>

        {/* Egresos */}
        <section className="cmp-col cmp-col--egresos">
          <div className="cmp-col-header" style={{ borderTopColor: "#ff4fd8" }}>
            <div className="cmp-col-title">
              <h2>
                <span className="cmp-col-icon" style={{ background: "#ff4fd8" }}>
                  −
                </span>{" "}
                Egresos
              </h2>
              <span className="cmp-col-count">{egresosOrdenados.length}</span>
            </div>
            <div className="cmp-col-total" style={{ color: "#ff4fd8" }}>
              {formatMonto(totalGastosFiltrados)}
              {haySimulacion && <span style={{ fontSize: "0.8rem", opacity: 0.6 }}> · sim {formatMonto(totalGastosSimulado)}</span>}
            </div>

            <div className="cmp-filters">
              <div className="cmp-search-wrap cmp-search-wrap--sm">
                <FaSearch className="cmp-search-icon" />
                <input
                  className="cmp-search"
                  placeholder="Buscar egreso..."
                  value={searchEgresos}
                  onChange={(e) => setSearchEgresos(e.target.value)}
                />
              </div>
              <select
                className="cmp-select"
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
              >
                <option value="todas">Todas las categorías</option>
                {categoriasDisponibles.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
              <select className="cmp-select" value={sortEgresos} onChange={(e) => setSortEgresos(e.target.value as never)}>
                <option value="montoDesc">Mayor monto primero</option>
                <option value="montoAsc">Menor monto primero</option>
                <option value="concepto">A-Z</option>
              </select>
            </div>
            <p className="cmp-hint">
              <FaEyeSlash /> Desmarca conceptos para simular “qué pasa si lo quito” · Liberado:{" "}
              <strong style={{ color: "#22c55e" }}>{formatMonto(ahorroLiberado)}</strong>
            </p>
          </div>

          <div className="cmp-table-wrap">
            <table className="cmp-table">
              <thead>
                <tr>
                  <th style={{ width: 36, textAlign: "center" }} title="Incluir en cálculo">
                    ✓
                  </th>
                  <th>Concepto</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                  <th>Categoría</th>
                  <th style={{ textAlign: "center" }}>% Ing</th>
                </tr>
              </thead>
              <tbody>
                {egresosOrdenados.map((g) => {
                  const meta = CATEGORY_META[g.categoria];
                  const color = meta?.color ?? "#a0a6c0";
                  const label = meta?.label ?? g.categoria;
                  const pct = totalIngresos > 0 ? (g.monto / totalIngresos) * 100 : 0;
                  const excluido = excluidos.has(g._id);
                  return (
                    <tr key={g._id} className={excluido ? "cmp-row--excluido" : ""}>
                      <td style={{ textAlign: "center" }}>
                        <label className="cmp-check">
                          <input type="checkbox" checked={!excluido} onChange={() => toggleExcluido(g._id)} />
                          <span className="cmp-check-box" />
                        </label>
                      </td>
                      <td className="cmp-concepto" title={g.concepto}>
                        {g.concepto}
                        {g.fin !== "indefinido" && <span className="cmp-fin"> · {g.fin}</span>}
                      </td>
                      <td style={{ textAlign: "right" }} className="cmp-monto" data-label="Monto">
                        {formatMonto(g.monto)}
                      </td>
                      <td data-label="Categoría">
                        <span
                          className="cmp-badge"
                          style={{
                            background: `${color}18`,
                            color,
                            borderColor: `${color}55`,
                          }}
                        >
                          {label}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }} className="cmp-pct" data-label="% Ing">
                        {pct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
                {egresosOrdenados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="cmp-empty">
                      Sin resultados con ese filtro
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td></td>
                  <td>Total{haySimulacion ? " simulado" : ""}</td>
                  <td style={{ textAlign: "right" }} className="cmp-monto">
                    {formatMonto(haySimulacion ? totalGastosSimulado : totalGastosFiltrados)}
                  </td>
                  <td colSpan={2} style={{ textAlign: "center", opacity: 0.7, fontSize: "0.8rem" }}>
                    {egresosOrdenados.length} conceptos
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="cmp-col-footer cmp-col-footer--actions">
            <span>
              Tip: empieza por <strong style={{ color: "#7a2eff" }}>Deuda</strong> cara y luego{" "}
              <strong style={{ color: "#ff9800" }}>Estilo de vida</strong> no esencial para sanar liquidez
            </span>
          </div>
        </section>
      </div>

      <section className="cmp-insights">
        <h3 className="cmp-insights-title">Estrategia sugerida para este mes</h3>
        <div className="cmp-insights-grid">
          <div className="cmp-insight">
            <strong>1. Ataque a deuda</strong>
            <p>
              Prioriza abono extra a la deuda con mayor tasa o mayor monto (YTP {formatMonto(8560.84)} vence dic-26). Cada $1,000 extra
              reduce intereses futuros y libera flujo en enero.
            </p>
          </div>
          <div className="cmp-insight">
            <strong>2. Recorte quirúrgico Estilo de vida</strong>
            <p>
              Suscripciones + electrónicos = ~{formatMonto(porCategoria.find((c) => c.categoria === "Estilo de vida")?.monto ?? 0)}. Simula
              excluir 2-3 conceptos arriba y verás cuánto se acerca el balance a positivo sin tocar Necesidades.
            </p>
          </div>
          <div className="cmp-insight">
            <strong>3. Liquidez a largo plazo</strong>
            <p>
              Con balance positivo, destina 50% del sobrante a colchón (3 meses de Necesidades ≈{" "}
              {formatMonto((porCategoria.find((c) => c.categoria === "Necesidades")?.monto ?? 0) * 3)}) y 50% a deuda. Evita nueva deuda
              hasta que % Utilizado &lt; 85%.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Comparativa;

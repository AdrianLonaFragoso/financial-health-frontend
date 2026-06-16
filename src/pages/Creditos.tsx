import { useState, useEffect } from "react";
import { FaPlus, FaTrash, FaPen, FaCreditCard, FaHome, FaCar, FaUser, FaBriefcase } from "react-icons/fa";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatMonto } from "../data/constants";
import { obtenerCreditos, crearCredito, actualizarCredito, eliminarCredito, type CreditoData } from "../services/creditosService";
import "./Creditos.css";

const TIPO_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  tarjeta: { label: "Tarjeta", color: "#0057B8", icon: <FaCreditCard /> },
  hipotecario: { label: "Hipotecario", color: "#2196f3", icon: <FaHome /> },
  automotriz: { label: "Automotriz", color: "#4caf50", icon: <FaCar /> },
  personal: { label: "Personal", color: "#ff9800", icon: <FaUser /> },
  otros: { label: "Otros", color: "#a0a6c0", icon: <FaBriefcase /> },
};

const TIPOS = Object.keys(TIPO_META);

function Creditos() {
  const [creditos, setCreditos] = useState<CreditoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<CreditoData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formTipo, setFormTipo] = useState("tarjeta");
  const [formNombre, setFormNombre] = useState("");
  const [formUsuario, setFormUsuario] = useState("Adrian");
  const [formLogoUrl, setFormLogoUrl] = useState("");
  const [formLinea, setFormLinea] = useState("");
  const [formSaldo, setFormSaldo] = useState("");
  const [formTasa, setFormTasa] = useState("");
  const [formPagoMensual, setFormPagoMensual] = useState("");
  const [formPagosRealizados, setFormPagosRealizados] = useState("");
  const [formPagosCompletados, setFormPagosCompletados] = useState("");
  const [formPagosTotales, setFormPagosTotales] = useState("");

  function cargarCreditos() {
    setLoading(true);
    obtenerCreditos()
      .then((res) => setCreditos(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargarCreditos();
  }, []);

  function abrirModal(credito?: CreditoData) {
    if (credito) {
      setEditTarget(credito);
      setFormTipo(credito.tipo);
      setFormNombre(credito.nombre);
      setFormUsuario(credito.usuario);
      setFormLogoUrl(credito.logoUrl ?? "");
      setFormLinea(String(credito.lineaCredito));
      setFormSaldo(String(credito.saldoUtilizado));
      setFormTasa(String(credito.tasaInteresMensual));
      setFormPagoMensual(credito.pagoMensual != null ? String(credito.pagoMensual) : "");
      setFormPagosRealizados(credito.pagosRealizados != null ? String(credito.pagosRealizados) : "");
      setFormPagosCompletados(credito.pagosCompletados != null ? String(credito.pagosCompletados) : "");
      setFormPagosTotales(credito.pagosTotales != null ? String(credito.pagosTotales) : "");
    } else {
      setEditTarget(null);
      setFormTipo("tarjeta");
      setFormNombre("");
      setFormUsuario("Adrian");
      setFormLogoUrl("");
      setFormLinea("");
      setFormSaldo("");
      setFormTasa("");
      setFormPagoMensual("");
      setFormPagosRealizados("");
      setFormPagosCompletados("");
      setFormPagosTotales("");
    }
    setShowModal(true);
  }

  function cerrarModal() {
    setShowModal(false);
    setEditTarget(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formNombre.trim() || !formLinea.trim() || !formSaldo.trim() || !formTasa.trim()) return;
    setSubmitting(true);
    try {
      const data = {
        tipo: formTipo,
        nombre: formNombre.trim(),
        usuario: formUsuario.trim(),
        logoUrl: formLogoUrl.trim() || null,
        lineaCredito: parseFloat(formLinea),
        saldoUtilizado: parseFloat(formSaldo),
        tasaInteresMensual: parseFloat(formTasa),
        pagoMensual: formPagoMensual ? parseFloat(formPagoMensual) : undefined,
        pagosRealizados: formPagosRealizados ? parseFloat(formPagosRealizados) : undefined,
        pagosCompletados: formPagosCompletados ? parseInt(formPagosCompletados, 10) : undefined,
        pagosTotales: formPagosTotales ? parseInt(formPagosTotales, 10) : undefined,
      };
      if (editTarget) {
        await actualizarCredito(editTarget.id!, data);
      } else {
        await crearCredito(data);
      }
      cerrarModal();
      cargarCreditos();
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmarEliminar() {
    if (!deleteTarget) return;
    try {
      await eliminarCredito(deleteTarget);
      setDeleteTarget(null);
      cargarCreditos();
    } catch {}
  }

  if (loading)
    return (
      <div className="cr-container">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p className="loading-text">Cargando...</p>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="cr-container">
        <p>Error: {error}</p>
      </div>
    );

  const grouped = creditos.reduce<Record<string, CreditoData[]>>((acc, c) => {
    (acc[c.tipo] ??= []).push(c);
    return acc;
  }, {});
  const orderedTipos = ["tarjeta", ...TIPOS.filter((t) => t !== "tarjeta")];

  const totalLinea = creditos.reduce((s, c) => s + c.lineaCredito, 0);
  const totalDeuda = creditos.reduce((s, c) => s + c.saldoUtilizado, 0);
  const pctGeneral = totalLinea > 0 ? (totalDeuda / totalLinea) * 100 : 0;

  const tiposActivos = orderedTipos.filter((t) => grouped[t]?.length);
  const tipoSummary = tiposActivos.map((t) => ({
    tipo: t,
    label: TIPO_META[t]?.label ?? TIPO_META.otros.label,
    color: TIPO_META[t]?.color ?? TIPO_META.otros.color,
    deuda: grouped[t].reduce((s, c) => s + c.saldoUtilizado, 0),
    linea: grouped[t].reduce((s, c) => s + c.lineaCredito, 0),
  }));

  return (
    <div className="cr-container">
      <header className="cr-header">
        <h1 className="cr-title">Créditos</h1>
        <p className="cr-subtitle">Tarjetas de crédito, hipotecas, préstamos y más</p>
      </header>

      <div className="cr-toolbar">
        <span className="cr-count">
          {creditos.length} crédito{creditos.length !== 1 ? "s" : ""}
        </span>
        <button className="cr-add-btn" onClick={() => abrirModal()}>
          <FaPlus />
          Agregar crédito
        </button>
      </div>

      <div className="cr-summary">
        <div className="cr-summary-chart">
          <ResponsiveContainer width={100} height={100}>
            <PieChart>
              <Pie data={tipoSummary.map((t) => ({ name: t.label, value: t.deuda }))} cx="50%" cy="50%" innerRadius={30} outerRadius={44} dataKey="value" stroke="none">
                {tipoSummary.map((t) => (
                  <Cell key={t.tipo} fill={t.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <span className="cr-summary-chart-label">{pctGeneral.toFixed(0)}%</span>
        </div>
        <div className="cr-summary-stats">
          {tipoSummary.map((t) => (
            <div key={t.tipo} className="cr-summary-row">
              <span className="cr-summary-row-dot" style={{ background: t.color }} />
              <span className="cr-summary-row-label">{t.label}</span>
              <span className="cr-summary-row-value">{formatMonto(t.deuda)}</span>
            </div>
          ))}
          <div className="cr-summary-row cr-summary-row--total">
            <span className="cr-summary-row-label">Total</span>
            <span className="cr-summary-row-value cr-summary-deuda">{formatMonto(totalDeuda)}</span>
          </div>
        </div>
      </div>

      {creditos.length === 0 ? (
        <div className="cr-empty">
          <FaCreditCard className="cr-empty-icon" />
          <p>No hay créditos registrados</p>
          <button className="cr-add-btn cr-add-btn--large" onClick={() => abrirModal()}>
            <FaPlus />
            Agregar primer crédito
          </button>
        </div>
      ) : (
        orderedTipos
          .filter((t) => grouped[t]?.length)
          .map((tipo) => (
            <div key={tipo} className="cr-section">
              <h2 className="cr-section-title" style={{ color: TIPO_META[tipo]?.color ?? TIPO_META.otros.color }}>
                <span className="cr-section-icon">{TIPO_META[tipo]?.icon ?? TIPO_META.otros.icon}</span>
                {TIPO_META[tipo]?.label ?? TIPO_META.otros.label}
                <span className="cr-section-count">{grouped[tipo].length}</span>
              </h2>
              <div className="cr-grid">
                {grouped[tipo].map((c) => {
                  const meta = TIPO_META[c.tipo] ?? TIPO_META.otros;
                  const pctUso = c.lineaCredito > 0 ? (c.saldoUtilizado / c.lineaCredito) * 100 : 0;
                  const tasaAnual = c.tasaInteresMensual * 12;
                  return (
                    <div key={c.id} className="cr-card" style={{ borderTopColor: meta.color }}>
                      <div className="cr-card-top">
                        <div className="cr-card-header">
                          {c.logoUrl ? (
                            <img
                              className="cr-logo"
                              src={c.logoUrl}
                              alt=""
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="cr-icon-fallback" style={{ background: meta.color }}>
                              {meta.icon}
                            </span>
                          )}
                          <div className="cr-card-info">
                            <strong className="cr-card-name">{c.nombre}</strong>
                            <span className="cr-card-tipo" style={{ color: meta.color }}>
                              {meta.label}
                            </span>
                            <span className="cr-card-user">
                              <FaUser className="cr-card-user-icon" /> {c.usuario}
                            </span>
                          </div>
                        </div>
                        <div className="cr-card-actions">
                          <button className="cr-action-btn" title="Editar" onClick={() => abrirModal(c)}>
                            <FaPen />
                          </button>
                          <button className="cr-action-btn cr-action-btn--delete" title="Eliminar" onClick={() => setDeleteTarget(c.id!)}>
                            <FaTrash />
                          </button>
                        </div>
                      </div>

                      {c.tipo === "personal" && c.pagosTotales ? (
                        <>
                          <div className="cr-personal-progress">
                            <div className="cr-personal-chart">
                              <ResponsiveContainer width={72} height={72}>
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: "Pagados", value: c.pagosCompletados ?? 0 },
                                      { name: "Restantes", value: Math.max(c.pagosTotales - (c.pagosCompletados ?? 0), 0) },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={24}
                                    outerRadius={34}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                    stroke="none"
                                  >
                                    <Cell fill={meta.color} />
                                    <Cell fill="var(--color-border)" />
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                              <span className="cr-personal-chart-label">
                                {c.pagosCompletados}/{c.pagosTotales}
                              </span>
                            </div>
                            <div className="cr-personal-stats">
                              <div className="cr-personal-stat">
                                <span className="cr-personal-stat-label">Pagado</span>
                                <span className="cr-personal-stat-value">{formatMonto(c.pagosRealizados ?? 0)}</span>
                              </div>
                              <div className="cr-personal-stat">
                                <span className="cr-personal-stat-label">Restante</span>
                                <span className="cr-personal-stat-value">{formatMonto(c.saldoUtilizado)}</span>
                              </div>
                              {c.pagoMensual ? (
                                <div className="cr-personal-stat">
                                  <span className="cr-personal-stat-label">Mensualidad</span>
                                  <span className="cr-personal-stat-value">{formatMonto(c.pagoMensual)}</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="cr-card-footer">
                            <div className="cr-rate">
                              <span className="cr-rate-label">Interés mensual</span>
                              <span className="cr-rate-value">{c.tasaInteresMensual.toFixed(2)}%</span>
                            </div>
                            <div className="cr-rate">
                              <span className="cr-rate-label">Interés anual</span>
                              <span className="cr-rate-value">{tasaAnual.toFixed(2)}%</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="cr-card-amounts">
                            <div className="cr-amount-item">
                              <span className="cr-amount-label">Línea</span>
                              <span className="cr-amount-value">{formatMonto(c.lineaCredito)}</span>
                            </div>
                            <div className="cr-amount-item">
                              <span className="cr-amount-label">Usado</span>
                              <span className="cr-amount-value cr-amount-used">{formatMonto(c.saldoUtilizado)}</span>
                            </div>
                            <div className="cr-amount-item cr-amount-item-porc">
                              <span className="cr-amount-label">Disponible</span>
                              <span className="cr-amount-value">{formatMonto(c.lineaCredito - c.saldoUtilizado)}</span>
                            </div>
                          </div>

                          <div className="cr-progress-track">
                            <div
                              className="cr-progress-fill"
                              style={{
                                width: `${Math.min(pctUso, 100)}%`,
                                background: pctUso > 90 ? "#ff4fd8" : meta.color,
                              }}
                            />
                          </div>
                          <span className="cr-progress-label">{pctUso.toFixed(1)}% utilizado</span>

                          <div className="cr-card-footer">
                            <div className="cr-rate">
                              <span className="cr-rate-label">Interés mensual</span>
                              <span className="cr-rate-value">{c.tasaInteresMensual.toFixed(2)}%</span>
                            </div>
                            <div className="cr-rate">
                              <span className="cr-rate-label">Interés anual</span>
                              <span className="cr-rate-value">{tasaAnual.toFixed(2)}%</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
      )}

      {showModal && (
        <div className="cr-overlay" onClick={cerrarModal}>
          <div className="cr-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="cr-modal-title">{editTarget ? "Editar crédito" : "Nuevo crédito"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="cr-modal-field">
                <label htmlFor="cr-tipo">Tipo</label>
                <select id="cr-tipo" className="cr-select" value={formTipo} onChange={(e) => setFormTipo(e.target.value)}>
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {TIPO_META[t].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cr-modal-field">
                <label htmlFor="cr-nombre">Nombre</label>
                <input id="cr-nombre" type="text" placeholder="Ej. Banamex Oro, Hipoteca BBVA..." value={formNombre} onChange={(e) => setFormNombre(e.target.value)} autoFocus />
              </div>
              <div className="cr-modal-row">
                <div className="cr-modal-field">
                  <label htmlFor="cr-usuario">Usuario</label>
                  <input id="cr-usuario" type="text" placeholder="Adrian, Jimena..." value={formUsuario} onChange={(e) => setFormUsuario(e.target.value)} />
                </div>
                <div className="cr-modal-field">
                  <label htmlFor="cr-tasa">Tasa mensual %</label>
                  <input id="cr-tasa" type="number" step="0.01" min="0" placeholder="2.5" value={formTasa} onChange={(e) => setFormTasa(e.target.value)} />
                </div>
              </div>
              <div className="cr-modal-field">
                <label htmlFor="cr-logo">URL del logo (opcional)</label>
                <input id="cr-logo" type="text" placeholder="https://ejemplo.com/logo.png" value={formLogoUrl} onChange={(e) => setFormLogoUrl(e.target.value)} />
              </div>
              <div className="cr-modal-row">
                <div className="cr-modal-field">
                  <label htmlFor="cr-linea">Línea de crédito / Monto</label>
                  <input id="cr-linea" type="number" step="0.01" min="0" placeholder="50000" value={formLinea} onChange={(e) => setFormLinea(e.target.value)} />
                </div>
                <div className="cr-modal-field">
                  <label htmlFor="cr-saldo">Saldo utilizado</label>
                  <input id="cr-saldo" type="number" step="0.01" min="0" placeholder="20000" value={formSaldo} onChange={(e) => setFormSaldo(e.target.value)} />
                </div>
              </div>
              {formTipo === "personal" && (
                <>
                  <div className="cr-modal-row">
                    <div className="cr-modal-field">
                      <label htmlFor="cr-pago-mensual">Pago mensual</label>
                      <input id="cr-pago-mensual" type="number" step="0.01" min="0" placeholder="8560.84" value={formPagoMensual} onChange={(e) => setFormPagoMensual(e.target.value)} />
                    </div>
                    <div className="cr-modal-field">
                      <label htmlFor="cr-pagos-realizados">Pagado hasta ahora</label>
                      <input id="cr-pagos-realizados" type="number" step="0.01" min="0" placeholder="154095.12" value={formPagosRealizados} onChange={(e) => setFormPagosRealizados(e.target.value)} />
                    </div>
                  </div>
                  <div className="cr-modal-row">
                    <div className="cr-modal-field">
                      <label htmlFor="cr-pagos-completados">Pagos completados</label>
                      <input id="cr-pagos-completados" type="number" step="1" min="0" placeholder="18" value={formPagosCompletados} onChange={(e) => setFormPagosCompletados(e.target.value)} />
                    </div>
                    <div className="cr-modal-field">
                      <label htmlFor="cr-pagos-totales">Pagos totales</label>
                      <input id="cr-pagos-totales" type="number" step="1" min="0" placeholder="36" value={formPagosTotales} onChange={(e) => setFormPagosTotales(e.target.value)} />
                    </div>
                  </div>
                </>
              )}
              <div className="cr-modal-actions">
                <button type="button" className="cr-modal-cancel" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="cr-modal-submit" disabled={submitting || !formNombre.trim() || !formLinea.trim() || !formSaldo.trim() || !formTasa.trim()}>
                  {submitting ? "Guardando..." : editTarget ? "Guardar cambios" : "Crear crédito"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="cr-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="cr-modal cr-modal--confirm" onClick={(e) => e.stopPropagation()}>
            <h2 className="cr-modal-title">Eliminar crédito</h2>
            <p className="cr-confirm-text">¿Estás seguro de que deseas eliminar este crédito? Esta acción no se puede deshacer.</p>
            <div className="cr-modal-actions">
              <button type="button" className="cr-modal-cancel" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button type="button" className="cr-modal-submit cr-modal-submit--danger" onClick={confirmarEliminar}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Creditos;

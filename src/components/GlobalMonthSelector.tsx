import { useState, useEffect } from "react";
import { useMonth } from "../contexts/MonthContext";
import { crearMesesBulk, previewBulk } from "../services/mesesService";
import { FaPlus, FaLayerGroup, FaTimes, FaCheck, FaFileAlt } from "react-icons/fa";
import { downloadGastosMd } from "../utils/exportGastosMd";
import "./GlobalMonthSelector.css";

export default function GlobalMonthSelector() {
  const { meses, selectedMonth, setSelectedMonth, refreshMeses, missingMonths, nextMonths } = useMonth();
  const [showPopover, setShowPopover] = useState(false);
  const [previews, setPreviews] = useState<{ next: { year: number; month: number; label: string; exists: boolean; ingresos: number; gastos: number; fijos: number; vigentes: number; source: string | null }[]; missing: { year: number; month: number; label: string }[] } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [selectedToCreate, setSelectedToCreate] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (showPopover) {
      setLoadingPreview(true);
      previewBulk(3).then((res) => setPreviews(res.data)).catch(() => setPreviews(null)).finally(() => setLoadingPreview(false));
      setSelectedToCreate(new Set());
    }
  }, [showPopover, meses.length]);

  const selectedMonthData = meses.find((m) => m.id === selectedMonth) ?? null;

  if (meses.length === 0) return null;

  const pendingNext = nextMonths.filter((n) => !n.exists);
  const hasMissing = missingMonths.length > 0;
  const anticipatableCount = pendingNext.length + missingMonths.length;

  async function handleCreateSingle(year: number, month: number) {
    const key = `${year}-${month}`;
    setCreating(key);
    try {
      const res = await crearMesesBulk([{ year, month }]);
      await refreshMeses();
      const created = res.data.created[0];
      if (created) setSelectedMonth(created.id);
      // keep popover open to create more, or close if all done
    } catch {
      // ignore, unique handled
    } finally {
      setCreating(null);
    }
  }

  async function handleCreateSelected() {
    const months: { year: number; month: number }[] = [];
    for (const key of selectedToCreate) {
      const [y, m] = key.split("-").map(Number);
      months.push({ year: y, month: m });
    }
    if (months.length === 0) return;
    setCreating("bulk");
    try {
      const res = await crearMesesBulk(months);
      await refreshMeses();
      if (res.data.created.length > 0) {
        const last = res.data.created[res.data.created.length - 1];
        setSelectedMonth(last.id);
      }
      setSelectedToCreate(new Set());
      if (res.data.skipped.length === 0) setShowPopover(false);
    } finally {
      setCreating(null);
    }
  }

  function toggleSelect(year: number, month: number) {
    const key = `${year}-${month}`;
    setSelectedToCreate((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="global-month-selector">
      <label className="global-month-label">Mes:</label>
      <select
        className="global-month-select"
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
      >
        {meses.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <button
        className="global-month-export-btn"
        onClick={() => selectedMonthData && downloadGastosMd(selectedMonthData)}
        disabled={!selectedMonthData}
        title={selectedMonthData ? `Exportar ${selectedMonthData.label} como gastos-${selectedMonthData.label.toLowerCase().replace(/\s+/g,'-')}.md` : "Selecciona un mes"}
      >
        <FaFileAlt /> Exportar balance MD
      </button>
      <div className="global-month-anticipate">
        <button
          className="global-month-anticipate-btn"
          onClick={() => setShowPopover((v) => !v)}
          title={anticipatableCount > 0 ? `Anticipar hasta 3 meses (${anticipatableCount} pendientes)` : "Todo al día"}
        >
          <FaLayerGroup /> Anticipar
          {anticipatableCount > 0 && <span className="global-month-badge">{anticipatableCount}</span>}
        </button>
        {showPopover && (
          <div className="global-month-popover" onClick={(e) => e.stopPropagation()}>
            <div className="global-month-popover-header">
              <strong>Anticipar meses</strong>
              <button className="global-month-popover-close" onClick={() => setShowPopover(false)}><FaTimes /></button>
            </div>
            <p className="global-month-popover-sub">
              Plan trimestral · ingresos se copian, gastos fijos + vigentes se copian. Al crear se autoselecciona el nuevo mes.
            </p>
            {loadingPreview ? (
              <div className="global-month-loading"><div className="loading-spinner" style={{ width: 20, height: 20 }} />Cargando preview...</div>
            ) : (
              <>
                {hasMissing && (
                  <div className="global-month-section">
                    <h4 className="global-month-section-title">Meses faltantes (retro)</h4>
                    {missingMonths.map((mm) => {
                      const key = `${mm.year}-${mm.month}`;
                      const isSelected = selectedToCreate.has(key);
                      const isCreating = creating === key;
                      return (
                        <div key={key} className="global-month-row">
                          <label className="global-month-check">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(mm.year, mm.month)} />
                            <span>{mm.label}</span>
                          </label>
                          <span className="global-month-preview">faltante</span>
                          <button className="global-month-create-btn" disabled={!!isCreating} onClick={() => handleCreateSingle(mm.year, mm.month)}>
                            {isCreating ? "..." : <><FaPlus /> Crear</>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="global-month-section">
                  <h4 className="global-month-section-title">Próximos 3 meses</h4>
                  {previews ? previews.next.map((n) => {
                    const key = `${n.year}-${n.month}`;
                    const isSelected = selectedToCreate.has(key);
                    const isCreating = creating === key;
                    return (
                      <div key={key} className={`global-month-row ${n.exists ? "global-month-row--exists" : ""}`}>
                        <label className="global-month-check">
                          <input type="checkbox" checked={isSelected} disabled={n.exists} onChange={() => toggleSelect(n.year, n.month)} />
                          <span>{n.label}</span>
                          {n.exists && <span className="global-month-exists"><FaCheck /> ya existe</span>}
                        </label>
                        {!n.exists && (
                          <span className="global-month-preview">
                            {n.ingresos} ing · {n.gastos} gas ({n.fijos} fijos + {n.vigentes} vig) {n.source ? `← ${n.source}` : ""}
                          </span>
                        )}
                        {!n.exists && (
                          <button className="global-month-create-btn" disabled={!!isCreating} onClick={() => handleCreateSingle(n.year, n.month)}>
                            {isCreating ? "..." : <><FaPlus /> Crear</>}
                          </button>
                        )}
                      </div>
                    );
                  }) : nextMonths.map((n) => (
                    <div key={`${n.year}-${n.month}`} className={`global-month-row ${n.exists ? "global-month-row--exists" : ""}`}>
                      <label className="global-month-check">
                        <input type="checkbox" checked={selectedToCreate.has(`${n.year}-${n.month}`)} disabled={n.exists} onChange={() => toggleSelect(n.year, n.month)} />
                        <span>{n.label}</span>
                        {n.exists && <span className="global-month-exists">ya existe</span>}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="global-month-popover-actions">
                  <button className="global-month-cancel" onClick={() => setShowPopover(false)}>Cerrar</button>
                  <button className="global-month-bulk" disabled={selectedToCreate.size === 0 || creating === "bulk"} onClick={handleCreateSelected}>
                    {creating === "bulk" ? "Creando..." : `Crear seleccionados (${selectedToCreate.size})`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {showPopover && <div className="global-month-backdrop" onClick={() => setShowPopover(false)} />}
    </div>
  );
}

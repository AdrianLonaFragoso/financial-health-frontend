import { useState, useRef, useCallback } from "react";
import { FaUpload, FaFileCsv, FaDownload } from "react-icons/fa";
import { MESES, formatMonto } from "../data/constants";
import { importCsv } from "../services/importService";
import "./CsvImportModal.css";

interface Props {
  type: "gasto" | "ingreso";
  onClose: () => void;
  onSuccess: () => void;
}

interface PreviewRow {
  concepto: string;
  values: (number | null)[];
  meta?: Record<string, string>;
}

const META_COLUMNS = new Set(["concepto", "categoria", "categoría", "fin", "vencimiento"]);

function normalizeMeta(h: string) {
  const lower = h.toLowerCase().trim();
  if (lower === "categoría") return "categoria";
  if (lower === "vencimiento") return "fin";
  return lower;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((l) => {
    const vals: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of l) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { vals.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    vals.push(current.trim());
    return vals;
  });

  return { headers, rows };
}

function CsvImportModal({ type, onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: PreviewRow; monthNames: string[]; metaKeys?: string[] } | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, string | number>[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = parseCSV(text);

      if (parsed.headers.length < 2) {
        setError("El CSV debe tener al menos 2 columnas (concepto + al menos un mes)");
        return;
      }

      const conceptoIdx = parsed.headers.findIndex((h) => h.toLowerCase() === "concepto");
      if (conceptoIdx === -1) {
        setError("El CSV debe tener una columna llamada 'concepto'");
        return;
      }

      const monthNames: string[] = [];
      const metaMap = new Map<string, number>();

      for (let i = 0; i < parsed.headers.length; i++) {
        const h = parsed.headers[i];
        const norm = normalizeMeta(h);
        if (norm === "concepto") continue;
        if (META_COLUMNS.has(norm) || META_COLUMNS.has(h.toLowerCase())) {
          metaMap.set(norm, i);
        } else {
          monthNames.push(h);
        }
      }

      const records: Record<string, string | number>[] = [];
      const previewRows: PreviewRow[] = [];
      const metaKeys = Array.from(metaMap.keys());

      for (const row of parsed.rows) {
        const concepto = row[conceptoIdx]?.trim();
        if (!concepto) continue;

        const record: Record<string, string | number> = { concepto };
        const meta: Record<string, string> = {};

        for (const [key, idx] of metaMap) {
          const val = row[idx]?.trim() || "";
          record[key] = val;
          meta[key] = val;
        }

        const values: (number | null)[] = [];

        for (const monthName of monthNames) {
          const headerIdx = parsed.headers.indexOf(monthName);
          const raw = row[headerIdx]?.trim();
          const num = raw ? parseFloat(raw.replace(/,/g, "")) : NaN;
          record[monthName] = isNaN(num) ? 0 : num;
          values.push(isNaN(num) ? null : num);
        }

        records.push(record);
        previewRows.push({ concepto, values, meta: metaKeys.length > 0 ? meta : undefined });
      }

      setRawRows(records);
      setPreview({ headers: parsed.headers, rows: previewRows, monthNames, metaKeys: metaKeys.length > 0 ? metaKeys : undefined });
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rawRows.length === 0) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await importCsv({ type, rows: rawRows });
      const data = res.data as { created: number; months: number };
      setResult(`Importación completada: ${data.created} registros creados en ${data.months} meses`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al importar";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (result) {
      onSuccess();
    }
    onClose();
  }

  const typeLabel = type === "gasto" ? "Gastos" : "Ingresos";
  const typeLabelLC = type === "gasto" ? "gasto" : "ingreso";

  const downloadSample = useCallback(() => {
    const now = new Date();
    const mesActual = MESES[now.getMonth()].toLowerCase();
    const mesSiguiente = MESES[(now.getMonth() + 1) % 12].toLowerCase();

    let sample = `concepto,${mesActual},${mesSiguiente}`;
    if (type === "gasto") {
      sample += ",categoria,vencimiento\n";
      sample += `Renta,15000,15000,Necesidades,indefinido\n`;
      sample += `Netflix,348,348,Estilo de vida,indefinido\n`;
      sample += `Seguro auto,1200,0,Necesidades,01-${mesActual}-26\n`;
    } else {
      sample += "\n";
      sample += `Sueldo,50000,50000\n`;
      sample += `Vales,3000,3000\n`;
    }

    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ejemplo-${typeLabelLC}s.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [type, typeLabelLC]);

  return (
    <div className="csv-overlay" onClick={handleClose}>
      <div className="csv-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="csv-modal-title">
          <FaFileCsv /> Importar CSV de {typeLabel}
        </h2>

        {!preview && !result && (
          <>
            <div
              className="csv-dropzone"
              onClick={() => fileRef.current?.click()}
            >
              <FaUpload className="csv-dropzone-icon" />
              <p className="csv-dropzone-text">
                Haz clic para seleccionar un archivo CSV
              </p>
              <p className="csv-dropzone-hint">
                Columnas requeridas: <strong>concepto</strong> + nombres de mes (ej. abril, mayo, ...)
              </p>
              {type === "gasto" && (
                <p className="csv-dropzone-hint">
                  Opcionales: <strong>categoria</strong>, <strong>vencimiento</strong>
                </p>
              )}
            </div>
            <button className="csv-sample-btn" onClick={downloadSample}>
              <FaDownload /> Descargar ejemplo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={handleFile}
            />
          </>
        )}

        {error && <p className="csv-error">{error}</p>}

        {preview && !result && (
          <div className="csv-preview">
            <p className="csv-preview-info">
              Se importarán <strong>{preview.rows.length}</strong> {typeLabelLC === "gasto" ? "gastos" : "ingresos"} en <strong>{preview.monthNames.length}</strong> meses
            </p>
            <div className="csv-preview-table-wrapper">
              <table className="csv-preview-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    {preview.metaKeys?.map((k) => (
                      <th key={k}>{k}</th>
                    ))}
                    {preview.monthNames.map((m) => (
                      <th key={m}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td className="csv-preview-concepto">{row.concepto}</td>
                      {preview.metaKeys?.map((k) => (
                        <td key={k} className="csv-preview-meta">{row.meta?.[k] || "—"}</td>
                      ))}
                      {row.values.map((v, j) => (
                        <td key={j} className="csv-preview-value">
                          {v != null ? formatMonto(v) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.rows.length > 10 && (
              <p className="csv-preview-more">
                ... y {preview.rows.length - 10} {typeLabelLC === "gasto" ? "gastos" : "ingresos"} más
              </p>
            )}
          </div>
        )}

        {result && (
          <div className="csv-success">
            <p>{result}</p>
          </div>
        )}

        <div className="csv-modal-actions">
          <button className="csv-modal-cancel" onClick={handleClose}>
            {result ? "Cerrar" : "Cancelar"}
          </button>
          {preview && !result && (
            <button
              className="csv-modal-submit"
              onClick={handleImport}
              disabled={submitting || rawRows.length === 0}
            >
              {submitting ? "Importando..." : `Importar ${typeLabel}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CsvImportModal;

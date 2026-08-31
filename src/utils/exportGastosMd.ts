import type { MonthData } from "../data/constants";
import { MESES, CATEGORY_META } from "../data/constants";

function getMxDateStr(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function slugMes(mesNombre: string): string {
  return mesNombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
}

function monthsRemaining(fin: string): number | null {
  if (fin === "indefinido") return null;
  const MONTH_MAP: Record<string, number> = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };
  const parts = fin.split("-");
  if (parts.length !== 3) return null;
  const month = MONTH_MAP[parts[1]?.toLowerCase() ?? ""];
  const year = 2000 + parseInt(parts[2] ?? "0", 10);
  if (month === undefined || isNaN(year)) return null;
  const date = new Date(year, month, 1);
  const now = new Date();
  const diff = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
  return Math.max(0, diff);
}

export function buildGastosMd(month: MonthData): string {
  const label = month.label;
  const parts = label.split(" ");
  const mesNombre = parts[0] ?? "";
  const yearStr = parts[1] ?? "";
  // Try to parse year/month from label and gastos for robustness
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const monthIdx = MESES.indexOf(mesNombre) + 1;
  const isoMonth = monthIdx ? String(monthIdx).padStart(2, "0") : "01";
  const totalIngresos = month.ingresos.reduce((s, i) => s + i.monto, 0);
  const totalGastos = month.gastos.reduce((s, g) => s + g.monto, 0);
  const balance = totalIngresos - totalGastos;
  const pctUsado = totalIngresos > 0 ? (totalGastos / totalIngresos) * 100 : 0;
  const mxDate = getMxDateStr();

  // Por categoría
  const acc: Record<string, number> = {};
  for (const g of month.gastos) acc[g.categoria] = (acc[g.categoria] || 0) + g.monto;
  const porCategoria = Object.entries(acc).map(([k, v]) => ({
    categoria: k,
    monto: v,
    pct: totalIngresos > 0 ? (v / totalIngresos) * 100 : 0,
    label: CATEGORY_META[k]?.label ?? k,
  }));

  // Por pago
  const porPago: Record<string, { count: number; total: number }> = {};
  for (const g of month.gastos) {
    const key = (g.metodoPago ?? "efectivo") === "credito" && g.credito?.nombre ? g.credito.nombre : "Efectivo";
    if (!porPago[key]) porPago[key] = { count: 0, total: 0 };
    porPago[key].count += 1;
    porPago[key].total += g.monto;
  }

  const ingresosRows = month.ingresos
    .slice()
    .sort((a, b) => b.monto - a.monto)
    .map((i) => {
      const pct = totalIngresos > 0 ? (i.monto / totalIngresos) * 100 : 0;
      return `| ${i.concepto} | ${i.monto.toFixed(2)} | ${pct.toFixed(1)}% |`;
    })
    .join("\n");

  const gastosSorted = [...month.gastos].sort((a, b) => b.monto - a.monto);
  const gastosRows = gastosSorted
    .map((g) => {
      const pct = totalIngresos > 0 ? (g.monto / totalIngresos) * 100 : 0;
      const pago = (g.metodoPago ?? "efectivo") === "credito" && g.credito?.nombre ? g.credito.nombre : "Efectivo";
      const restantes = monthsRemaining(g.fin);
      const restStr = restantes === null ? "∞" : String(restantes);
      const montoFmt = g.monto.toFixed(2);
      return `| ${g.concepto} | ${montoFmt} | ${g.categoria} | ${pago} | ${g.fin} | ${restStr} | ${pct.toFixed(1)}% |`;
    })
    .join("\n");

  const catRows = porCategoria.map((c) => `| ${c.label} | ${c.monto.toFixed(2)} | ${c.pct.toFixed(1)}% |`).join("\n");
  const pagoRows = Object.entries(porPago)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([k, v]) => `| ${k} | ${v.count} | ${v.total.toFixed(2)} |`)
    .join("\n");

  return `# Gastos — ${label} (${year}-${isoMonth})
> Generado ${mxDate} America/Mexico_City | Origen: Financial Health | Mes: ${label}
> Para análisis con otro agente. Detalle completo por concepto.

## Resumen
- Mes: ${label} (${year}-${isoMonth})
- Ingresos: ${totalIngresos.toFixed(2)} (${month.ingresos.length} conceptos) | Gastos: ${totalGastos.toFixed(2)} (${month.gastos.length} conceptos) | Balance: ${balance.toFixed(2)} | % Usado: ${pctUsado.toFixed(1)}%
- Por categoría:
${porCategoria.map((c) => `  - ${c.label}: ${c.monto.toFixed(2)} (${c.pct.toFixed(1)}%)`).join("\n")}
- Por pago:
${Object.entries(porPago)
  .map(([k, v]) => `  - ${k}: ${v.total.toFixed(2)} (${v.count} gastos)`)
  .join("\n")}

## Ingresos — detalle por concepto
| Concepto | Monto | % Ingresos |
|---|---|---|
${ingresosRows || "| (sin ingresos) | 0.00 | 0.0% |"}
| **Total** | **${totalIngresos.toFixed(2)}** | **100.0%** |

## Gastos — detalle concepto por concepto
| Concepto | Monto | Categoría | Pago | Vence | Restantes | % Ing |
|---|---|---|---|---|---|---|
${gastosRows || "| (sin gastos) | 0.00 | — | Efectivo | — | — | 0.0% |"}
| **Total** | **${totalGastos.toFixed(2)}** | — | — | — | — | **${pctUsado.toFixed(1)}%** |

## Por categoría
| Categoría | Monto | % Ing |
|---|---|---|
${catRows || "| — | 0.00 | 0.0% |"}

## Por método de pago
| Pago | Gastos | Total |
|---|---|---|
${pagoRows || "| Efectivo | 0 | 0.00 |"}

## Notas para agente
- Montos en MXN con 2 decimales (crudo para cálculo, sin símbolo).
- Categorías: Necesidades, Estilo de vida, Deuda, Ahorro.
- Pago: Efectivo o nombre de tarjeta/crédito (metodoPago + credito.nombre).
- Vence: fin del gasto (indefinido o DD-mmm-YY), Restantes: meses restantes (∞ si indefinido).
- Corte día 1 00:00 America/Mexico_City; gastos fijos indefinido siempre vigentes, con fin solo si vigente para el mes.
`;
}

export function downloadGastosMd(month: MonthData) {
  const md = buildGastosMd(month);
  const parts = month.label.split(" ");
  const mesSlug = slugMes(parts[0] ?? "mes");
  const year = parts[1] ?? String(new Date().getFullYear());
  const filename = `gastos-${mesSlug}-${year}.md`;
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

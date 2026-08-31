import api from "./api";
import type { MonthData } from "../data/constants";

export function obtenerMeses() {
  return api.get<MonthData[]>("/meses");
}

export function obtenerMes(id: string) {
  return api.get<MonthData>(`/meses/${id}`);
}

export function crearMes(data: { label: string; year: number; month: number; autoPopulate?: boolean }) {
  return api.post<MonthData>("/meses", data);
}

export function crearMesesBulk(months: { year: number; month: number }[]) {
  return api.post<{ created: MonthData[]; skipped: { year: number; month: number; reason: string }[] }>("/meses/bulk", { months });
}

export function previewMes(year: number, month: number) {
  return api.get<{
    year: number; month: number; label: string; exists: boolean;
    source: string | null;
    ingresos: number; gastos: number; fijos: number; vigentes: number;
  }>("/meses/preview", { params: { year, month } });
}

export function previewBulk(count = 3) {
  return api.get<{
    next: { year: number; month: number; label: string; exists: boolean; source: string | null; ingresos: number; gastos: number; fijos: number; vigentes: number }[];
    missing: { year: number; month: number; label: string }[];
  }>("/meses/preview-bulk", { params: { count } });
}

export function eliminarMes(id: string) {
  return api.delete(`/meses/${id}`);
}

export function obtenerResumen() {
  return api.get<{
    totalMeses: number;
    totalIngresos: number;
    totalGastos: number;
    balance: number;
  }>("/resumen");
}

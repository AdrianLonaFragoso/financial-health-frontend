import api from "./api";
import type { MonthData } from "../data/constants";

export function obtenerMeses() {
  return api.get<MonthData[]>("/meses");
}

export function obtenerMes(id: string) {
  return api.get<MonthData>(`/meses/${id}`);
}

export function crearMes(data: { label: string; year: number; month: number }) {
  return api.post<MonthData>("/meses", data);
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

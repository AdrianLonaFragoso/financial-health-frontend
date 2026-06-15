import api from "./api";

export interface CreditoData {
  id?: string;
  tipo: string;
  nombre: string;
  logoUrl?: string | null;
  lineaCredito: number;
  saldoUtilizado: number;
  tasaInteresMensual: number;
  usuario: string;
  pagoMensual?: number;
  pagosRealizados?: number;
  pagosCompletados?: number;
  pagosTotales?: number;
}

export function obtenerCreditos() {
  return api.get<CreditoData[]>("/creditos");
}

export function crearCredito(data: Omit<CreditoData, "id">) {
  return api.post<CreditoData>("/creditos", data);
}

export function actualizarCredito(id: string, data: Partial<Omit<CreditoData, "id">>) {
  return api.put<CreditoData>(`/creditos/${id}`, data);
}

export function eliminarCredito(id: string) {
  return api.delete(`/creditos/${id}`);
}

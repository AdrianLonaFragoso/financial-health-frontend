import api from "./api";
import type { Gasto } from "../data/constants";

export function obtenerGastos(monthId: string) {
  return api.get<Gasto[]>(`/meses/${monthId}/gastos`);
}

export function crearGasto(
  monthId: string,
  data: { concepto: string; monto: number; categoria: string; fin: string }
) {
  return api.post<Gasto>(`/meses/${monthId}/gastos`, data);
}

export function actualizarGasto(
  monthId: string,
  gastoId: string,
  data: { concepto?: string; monto?: number; categoria?: string; fin?: string }
) {
  return api.put<Gasto>(`/meses/${monthId}/gastos/${gastoId}`, data);
}

export function eliminarGasto(monthId: string, gastoId: string) {
  return api.delete(`/meses/${monthId}/gastos/${gastoId}`);
}

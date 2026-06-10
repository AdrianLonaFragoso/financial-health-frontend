import api from "./api";
import type { Ingreso } from "../data/constants";

export function obtenerIngresos(monthId: string) {
  return api.get<Ingreso[]>(`/meses/${monthId}/ingresos`);
}

export function crearIngreso(
  monthId: string,
  data: { concepto: string; monto: number }
) {
  return api.post<Ingreso>(`/meses/${monthId}/ingresos`, data);
}

export function actualizarIngreso(
  monthId: string,
  ingresoId: string,
  data: { concepto?: string; monto?: number }
) {
  return api.put<Ingreso>(`/meses/${monthId}/ingresos/${ingresoId}`, data);
}

export function eliminarIngreso(monthId: string, ingresoId: string) {
  return api.delete(`/meses/${monthId}/ingresos/${ingresoId}`);
}

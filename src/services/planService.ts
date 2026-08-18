import api from "./api";
import type { MonthData } from "../data/constants";

export interface PlanData {
  necesidades: number;
  estiloVida: number;
  ahorro: number;
}

export function obtenerPlan() {
  return api.get<PlanData>("/plan");
}

export function actualizarPlan(data: PlanData) {
  return api.put<PlanData>("/plan", data);
}

export function guardarPlanMes(monthId: string, data: PlanData) {
  return api.put<MonthData>(`/meses/${monthId}/plan`, data);
}

export function borrarPlanMes(monthId: string) {
  return api.delete<MonthData>(`/meses/${monthId}/plan`);
}
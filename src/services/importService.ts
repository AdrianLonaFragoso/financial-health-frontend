import api from "./api";

export function importCsv(data: {
  type: "gasto" | "ingreso";
  rows: Record<string, string | number>[];
}) {
  return api.post("/meses/import", data);
}

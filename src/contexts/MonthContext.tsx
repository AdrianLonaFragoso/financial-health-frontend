import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { MonthData } from "../data/constants";
import { MESES } from "../data/constants";
import { obtenerMeses } from "../services/mesesService";

interface MonthContextType {
  meses: MonthData[];
  selectedMonth: string;
  setSelectedMonth: (id: string) => void;
  loading: boolean;
  refreshMeses: () => Promise<void>;
  mxNow: { year: number; month: number };
  missingMonths: { year: number; month: number; label: string }[];
  nextMonths: { year: number; month: number; label: string; exists: boolean }[];
}

const MonthContext = createContext<MonthContextType | null>(null);

function getMxNow(): { year: number; month: number } {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function MonthProvider({ children }: { children: ReactNode }) {
  const [meses, setMeses] = useState<MonthData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [mxNow] = useState(() => getMxNow());

  const { missingMonths, nextMonths } = (() => {
    if (meses.length === 0) return { missingMonths: [] as { year: number; month: number; label: string }[], nextMonths: [] as { year: number; month: number; label: string; exists: boolean }[] };
    const existsSet = new Set(meses.map((m) => {
      // Infer year/month from label if not present
      const parts = m.label.split(" ");
      const monthIdx = MESES.indexOf(parts[0]) + 1;
      const y = parseInt(parts[1], 10);
      return `${y}-${monthIdx}`;
    }));
    // Try to use year/month if backend provides via label parsing, fallback to label
    const sorted = [...meses].sort((a, b) => {
      const [am, ay] = [MESES.indexOf(a.label.split(" ")[0]), parseInt(a.label.split(" ")[1], 10)];
      const [bm, by] = [MESES.indexOf(b.label.split(" ")[0]), parseInt(b.label.split(" ")[1], 10)];
      return ay - by || am - bm;
    });
    const first = sorted[0];
    const firstYear = parseInt(first.label.split(" ")[1], 10);
    const firstMonth = MESES.indexOf(first.label.split(" ")[0]) + 1;
    const missing: { year: number; month: number; label: string }[] = [];
    let y = firstYear, m = firstMonth;
    while (y < mxNow.year || (y === mxNow.year && m < mxNow.month)) {
      if (!existsSet.has(`${y}-${m}`)) missing.push({ year: y, month: m, label: `${MESES[m - 1]} ${y}` });
      m += 1; if (m > 12) { m = 1; y += 1; }
    }
    const next: { year: number; month: number; label: string; exists: boolean }[] = [];
    for (let i = 1; i <= 3; i++) {
      let ny = mxNow.year, nm = mxNow.month + i;
      while (nm > 12) { nm -= 12; ny += 1; }
      const label = `${MESES[nm - 1]} ${ny}`;
      next.push({ year: ny, month: nm, label, exists: existsSet.has(`${ny}-${nm}`) });
    }
    return { missingMonths: missing, nextMonths: next };
  })();

  const refreshMeses = useCallback(async () => {
    try {
      const res = await obtenerMeses();
      setMeses(res.data);
      setSelectedMonth((prev) => {
        if (prev && res.data.some((m) => m.id === prev)) return prev;
        const cur = getMxNow();
        const currentLabel = `${MESES[cur.month - 1]} ${cur.year}`;
        const current = res.data.find((m) => m.label === currentLabel);
        return current?.id ?? res.data[0]?.id ?? "";
      });
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMeses();
  }, [refreshMeses]);

  return (
    <MonthContext.Provider value={{ meses, selectedMonth, setSelectedMonth, loading, refreshMeses, mxNow, missingMonths, nextMonths }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error("useMonth must be used within a MonthProvider");
  return ctx;
}

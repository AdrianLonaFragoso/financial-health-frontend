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
}

const MonthContext = createContext<MonthContextType | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [meses, setMeses] = useState<MonthData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);

  const refreshMeses = useCallback(async () => {
    try {
      const res = await obtenerMeses();
      setMeses(res.data);
      setSelectedMonth((prev) => {
        if (prev && res.data.some((m) => m.id === prev)) return prev;
        const now = new Date();
        const currentLabel = `${MESES[now.getMonth()]} ${now.getFullYear()}`;
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
    <MonthContext.Provider value={{ meses, selectedMonth, setSelectedMonth, loading, refreshMeses }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error("useMonth must be used within a MonthProvider");
  return ctx;
}

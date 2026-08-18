import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { obtenerPlan, actualizarPlan, guardarPlanMes, borrarPlanMes, type PlanData } from "../services/planService";
import { DEFAULT_PLAN } from "../data/constants";
import { useMonth } from "./MonthContext";

interface PlanContextType {
  globalPlan: PlanData;
  monthPlan: PlanData | null;
  effectivePlan: PlanData;
  loading: boolean;
  savePlan: (plan: PlanData) => Promise<void>;
  saveGlobalPlan: (plan: PlanData) => Promise<void>;
  resetPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType | null>(null);

function planFromMonth(month: {
  necesidades?: number | null;
  estiloVida?: number | null;
  ahorro?: number | null;
}): PlanData | null {
  if (month.necesidades == null || month.estiloVida == null || month.ahorro == null) {
    return null;
  }
  return {
    necesidades: month.necesidades,
    estiloVida: month.estiloVida,
    ahorro: month.ahorro,
  };
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const { meses, selectedMonth, refreshMeses } = useMonth();
  const [globalPlan, setGlobalPlan] = useState<PlanData>(DEFAULT_PLAN);
  const [loading, setLoading] = useState(true);

  const refreshPlan = useCallback(async () => {
    try {
      const res = await obtenerPlan();
      setGlobalPlan(res.data);
    } catch {
      setGlobalPlan(DEFAULT_PLAN);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPlan();
  }, [refreshPlan]);

  const selectedMes = meses.find((m) => m.id === selectedMonth) ?? null;
  const monthPlan = selectedMes ? planFromMonth(selectedMes) : null;
  const effectivePlan = monthPlan ?? globalPlan;

  const saveGlobalPlan = useCallback(async (data: PlanData) => {
    const res = await actualizarPlan(data);
    setGlobalPlan(res.data);
  }, []);

  const savePlan = useCallback(
    async (data: PlanData) => {
      if (selectedMonth) {
        await guardarPlanMes(selectedMonth, data);
        await refreshMeses();
      } else {
        await saveGlobalPlan(data);
      }
    },
    [selectedMonth, refreshMeses, saveGlobalPlan]
  );

  const resetPlan = useCallback(async () => {
    if (!selectedMonth) return;
    await borrarPlanMes(selectedMonth);
    await refreshMeses();
  }, [selectedMonth, refreshMeses]);

  return (
    <PlanContext.Provider
      value={{ globalPlan, monthPlan, effectivePlan, loading, savePlan, saveGlobalPlan, resetPlan }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within a PlanProvider");
  return ctx;
}
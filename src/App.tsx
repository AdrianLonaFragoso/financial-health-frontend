import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import GlobalMonthSelector from "./components/GlobalMonthSelector";
import { MonthProvider } from "./contexts/MonthContext";
import { PlanProvider } from "./contexts/PlanContext";
import Dashboard from "./pages/Dashboard";
import GastosMensuales from "./pages/GastosMensuales";
import IngresosMensuales from "./pages/IngresosMensuales";
import AhorroInversion from "./pages/AhorroInversion";
import Creditos from "./pages/Creditos";
import Plan from "./pages/Plan";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <MonthProvider>
        <PlanProvider>
          <div className="app-layout">
            <Sidebar />
            <div className="app-content">
              <div className="app-topbar">
                <GlobalMonthSelector />
              </div>
              <main>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/ingresos" element={<IngresosMensuales />} />
                  <Route path="/gastos" element={<GastosMensuales />} />
                  <Route path="/ahorro-inversion" element={<AhorroInversion />} />
                  <Route path="/creditos" element={<Creditos />} />
                  <Route path="/plan" element={<Plan />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </div>
        </PlanProvider>
      </MonthProvider>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import GlobalMonthSelector from "./components/GlobalMonthSelector";
import { MonthProvider } from "./contexts/MonthContext";
import { PlanProvider } from "./contexts/PlanContext";
import { SidebarProvider, useSidebar } from "./contexts/SidebarContext";
import { FaBars } from "react-icons/fa";
import Dashboard from "./pages/Dashboard";
import GastosMensuales from "./pages/GastosMensuales";
import IngresosMensuales from "./pages/IngresosMensuales";
import AhorroInversion from "./pages/AhorroInversion";
import Creditos from "./pages/Creditos";
import Plan from "./pages/Plan";
import Comparativa from "./pages/Comparativa";
import "./App.css";

function AppShell() {
  const { isOpen, isMobile, toggle } = useSidebar();
  return (
    <div className={`app-layout ${!isOpen ? "app-layout--sidebar-collapsed" : ""} ${isMobile ? "app-layout--mobile" : ""}`}>
      <Sidebar />
      {isMobile && isOpen && <div className="sidebar-backdrop" onClick={toggle} aria-hidden="true" />}
      <div className="app-content">
        <div className="app-topbar">
          <button
            className="app-sidebar-toggle"
            onClick={toggle}
            aria-label={isOpen ? "Ocultar barra lateral" : "Mostrar barra lateral"}
            aria-expanded={isOpen}
          >
            <FaBars />
          </button>
          <div className="app-topbar-spacer" />
          <GlobalMonthSelector />
        </div>
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ingresos" element={<IngresosMensuales />} />
            <Route path="/gastos" element={<GastosMensuales />} />
            <Route path="/ahorro-inversion" element={<AhorroInversion />} />
            <Route path="/comparativa" element={<Comparativa />} />
            <Route path="/creditos" element={<Creditos />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SidebarProvider>
        <MonthProvider>
          <PlanProvider>
            <AppShell />
          </PlanProvider>
        </MonthProvider>
      </SidebarProvider>
    </BrowserRouter>
  );
}

export default App;

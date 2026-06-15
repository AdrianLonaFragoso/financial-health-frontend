import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import GastosMensuales from "./pages/GastosMensuales";
import IngresosMensuales from "./pages/IngresosMensuales";
import Creditos from "./pages/Creditos";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ingresos" element={<IngresosMensuales />} />
            <Route path="/gastos" element={<GastosMensuales />} />
            <Route path="/creditos" element={<Creditos />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

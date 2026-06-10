import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import GastosMensuales from "./pages/GastosMensuales";
import IngresosMensuales from "./pages/IngresosMensuales";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="app-content">
          <Routes>
            <Route path="/ingresos" element={<IngresosMensuales />} />
            <Route path="/gastos" element={<GastosMensuales />} />
            <Route path="*" element={<Navigate to="/ingresos" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

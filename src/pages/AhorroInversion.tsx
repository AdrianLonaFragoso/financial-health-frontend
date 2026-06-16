import { useMonth } from "../contexts/MonthContext";
import "./AhorroInversion.css";

function AhorroInversion() {
  const { meses, selectedMonth, setSelectedMonth } = useMonth();

  return (
    <div className="ai-container">
      <header className="ai-header">
        <h1 className="ai-title">Ahorro e Inversión</h1>
        <p className="ai-subtitle">Control de ahorro e inversión mensual</p>
      </header>
    </div>
  );
}

export default AhorroInversion;

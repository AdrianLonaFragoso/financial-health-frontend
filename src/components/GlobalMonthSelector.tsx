import { useMonth } from "../contexts/MonthContext";
import "./GlobalMonthSelector.css";

export default function GlobalMonthSelector() {
  const { meses, selectedMonth, setSelectedMonth } = useMonth();

  if (meses.length === 0) return null;

  return (
    <div className="global-month-selector">
      <label className="global-month-label">Mes:</label>
      <select
        className="global-month-select"
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
      >
        {meses.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}

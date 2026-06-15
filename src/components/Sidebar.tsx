import { useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { FaChartPie, FaArrowRight, FaArrowLeft, FaCreditCard } from "react-icons/fa";
import "./Sidebar.css";

const links = [
  { path: "/", label: "Dashboard", icon: FaChartPie },
  { path: "/ingresos", label: "Ingresos", icon: FaArrowRight },
  { path: "/gastos", label: "Gastos", icon: FaArrowLeft },
  { path: "/creditos", label: "Créditos", icon: FaCreditCard },
];

function Sidebar() {
  const location = useLocation();
  const { theme, toggle } = useTheme();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-f">F</span>
        <span className="sidebar-logo-rest">INANCIAL HEALTH</span>
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <a
              key={link.path}
              href={link.path}
              className={`sidebar-link ${location.pathname === link.path ? "sidebar-link--active" : ""}`}
            >
              <Icon className="sidebar-link-icon" />
              {link.label}
            </a>
          );
        })}
      </nav>
      <button className="sidebar-theme-btn" onClick={toggle}>
        {theme === "light" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </button>
    </aside>
  );
}

export default Sidebar;

import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useSidebar } from "../contexts/SidebarContext";
import { FaChartPie, FaArrowRight, FaArrowLeft, FaPiggyBank, FaCreditCard, FaPercent, FaBalanceScale, FaChevronLeft, FaTimes } from "react-icons/fa";
import "./Sidebar.css";

const links = [
  { path: "/", label: "Dashboard", icon: FaChartPie },
  { path: "/ingresos", label: "Ingresos", icon: FaArrowRight },
  { path: "/gastos", label: "Gastos", icon: FaArrowLeft },
  { path: "/comparativa", label: "Comparativa", icon: FaBalanceScale },
  { path: "/ahorro-inversion", label: "Ahorro", icon: FaPiggyBank },
  { path: "/creditos", label: "Créditos", icon: FaCreditCard },
  { path: "/plan", label: "Plan", icon: FaPercent },
];

function Sidebar() {
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const { isOpen, isMobile, toggle: toggleSidebar, close } = useSidebar();

  return (
    <aside
      className={`sidebar ${isOpen ? "sidebar--open" : "sidebar--collapsed"} ${isMobile ? "sidebar--mobile" : "sidebar--desktop"}`}
      aria-hidden={!isOpen}
    >
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/msc-logo-mobile.svg" alt="MSC" className="sidebar-logo-img" />
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={toggleSidebar}
          aria-label={isOpen ? "Ocultar barra lateral" : "Mostrar barra lateral"}
          title={isOpen ? "Ocultar" : "Mostrar"}
        >
          {isMobile ? <FaTimes /> : <FaChevronLeft />}
        </button>
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => {
                if (isMobile) close();
              }}
              className={`sidebar-link ${location.pathname === link.path ? "sidebar-link--active" : ""}`}
            >
              <Icon className="sidebar-link-icon" />
              {link.label}
            </Link>
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

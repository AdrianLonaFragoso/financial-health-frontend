import { useLocation } from "react-router-dom";
import "./Sidebar.css";

const links = [
  { path: "/ingresos", label: "Ingresos" },
  { path: "/gastos", label: "Gastos" },
];

function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-f">F</span>
        <span className="sidebar-logo-rest">INANCIAL HEALTH</span>
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => (
          <a
            key={link.path}
            href={link.path}
            className={`sidebar-link ${location.pathname === link.path ? "sidebar-link--active" : ""}`}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;

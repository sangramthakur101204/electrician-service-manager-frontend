// src/App.jsx
import { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import CustomerList from "./components/CustomerList";
import AddCustomer from "./components/AddCustomer";
import Reminders from "./components/Reminders";
import Analytics from "./components/Analytics";
import { getAllCustomers, getExpiringWarranty } from "./services/api";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [customers, setCustomers] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [cData, eData] = await Promise.all([
        getAllCustomers(),
        getExpiringWarranty(),
      ]);
      setCustomers(cData);
      setExpiring(eData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const nav = [
    { id: "dashboard",  label: "Dashboard",    icon: "⚡" },
    { id: "customers",  label: "Customers",     icon: "👥" },
    { id: "add",        label: "Add Customer",  icon: "➕" },
    { id: "analytics",  label: "Analytics",     icon: "📊" },
    { id: "reminders",  label: "Reminders",     icon: "🔔" },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            {sidebarOpen && <span className="logo-text">ElectroServe</span>}
          </div>
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {nav.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
              {item.id === "reminders" && expiring.length > 0 && (
                <span className="badge">{expiring.length}</span>
              )}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="sidebar-footer">
            <div className="electrician-card">
              <div className="elec-avatar">🔧</div>
              <div>
                <div className="elec-name">Electrician Pro</div>
                <div className="elec-status">● Online</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="main-content">
        <header className="topbar">
          <h1 className="page-title">
            {nav.find(n => n.id === activeTab)?.icon}{" "}
            {nav.find(n => n.id === activeTab)?.label}
          </h1>
          <div className="topbar-right">
            {expiring.length > 0 && (
              <button className="alert-chip" onClick={() => setActiveTab("reminders")}>
                🔔 {expiring.length} Warranty Alert{expiring.length > 1 ? "s" : ""}
              </button>
            )}
            <button className="refresh-btn" onClick={fetchAll}>🔄 Refresh</button>
          </div>
        </header>

        <div className="content-area">
          {loading ? (
            <div className="loader-wrap">
              <div className="pulse-loader">⚡</div>
              <p>Loading data...</p>
            </div>
          ) : (
            <>
              {activeTab === "dashboard"  && <Dashboard  customers={customers} expiring={expiring} onNavigate={setActiveTab} />}
              {activeTab === "customers"  && <CustomerList customers={customers} onRefresh={fetchAll} />}
              {activeTab === "add"        && <AddCustomer onSuccess={() => { fetchAll(); setActiveTab("customers"); }} />}
              {activeTab === "analytics"  && <Analytics customers={customers} />}
              {activeTab === "reminders"  && <Reminders  expiring={expiring} customers={customers} onRefresh={fetchAll} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
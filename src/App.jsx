// src/App.jsx
import { useState, useEffect } from "react";
import {
  Zap, LayoutDashboard, Briefcase, Users, UserPlus,
  HardHat, BarChart2, Bell, FileText, LogOut, RefreshCw, Menu, X, MapPin
} from "lucide-react";
import Login          from "./components/Login";
import OwnerDashboard from "./components/owner/OwnerDashboard";
import CustomerList   from "./components/CustomerList";
import Reminders      from "./components/Reminders";
import Analytics      from "./components/Analytics";
import AddTechnician  from "./components/owner/AddTechnician";
import JobAssign      from "./components/owner/JobAssign";
import AllInvoices    from "./components/owner/AllInvoices";
import LiveTracking   from "./components/owner/LiveTracking";
import TechApp        from "./components/technician/TechApp";
import { getAllCustomers, getExpiringWarranty } from "./services/api";
import "./App.css";

const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { id: "jobs",        label: "Jobs",         icon: Briefcase       },
  { id: "customers",   label: "Customers",    icon: Users           },
  { id: "tracking",    label: "Live Track",   icon: MapPin          },
  { id: "technicians", label: "Technicians",  icon: HardHat         },
  { id: "invoices",    label: "Invoices",     icon: FileText        },
  { id: "analytics",   label: "Analytics",    icon: BarChart2       },
  { id: "reminders",   label: "Reminders",    icon: Bell            },
];

export default function App() {
  const [user,        setUser]        = useState(null);
  const [activeTab,   setActiveTab]   = useState("dashboard");
  const [customers,   setCustomers]   = useState([]);
  const [expiring,    setExpiring]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const saved = localStorage.getItem("user");
    if (token && saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.role === "OWNER") fetchAll();
  }, [user]);

  const fetchAll = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [cData, eData] = await Promise.all([getAllCustomers(), getExpiringWarranty()]);
      setCustomers(cData);
      setExpiring(eData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleLogin  = (data) => setUser(data);
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null); setCustomers([]); setExpiring([]);
  };

  const navigate = (tab) => { setActiveTab(tab); setMobileOpen(false); };

  if (!user) return <Login onLogin={handleLogin} />;
  if (user.role === "TECHNICIAN") return <TechApp user={user} onLogout={handleLogout} />;

  return (
    <div className="app-shell">

      {/* ── TOP NAVBAR ── */}
      <header className="topbar">
        {/* Logo */}
        <div className="topbar-logo">
          <div className="topbar-logo-icon"><Zap size={20} strokeWidth={2.5} /></div>
          <span className="topbar-logo-text">Electro<span>Serve</span></span>
        </div>

        {/* Desktop Nav */}
        <nav className="topbar-nav">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id}
              className={`topbar-nav-btn ${activeTab === id ? "active" : ""}`}
              onClick={() => navigate(id)}>
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
              {id === "reminders" && expiring.length > 0 && (
                <span className="nav-badge">{expiring.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="topbar-right">
          {expiring.length > 0 && (
            <button className="topbar-alert-btn" onClick={() => navigate("reminders")}>
              <Bell size={14} /> {expiring.length} Alert
            </button>
          )}

          <button className="topbar-refresh-btn" onClick={() => fetchAll(true)} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            <span>{refreshing ? "..." : "Refresh"}</span>
          </button>

          {/* User */}
          <div className="topbar-user">
            <div className="topbar-user-avatar">{user.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="topbar-user-name">{user.name}</div>
              <div className="topbar-user-role">Owner</div>
            </div>
            <button className="topbar-logout-btn" onClick={handleLogout} title="Logout">
              <LogOut size={15} />
            </button>
          </div>

          {/* Mobile menu */}
          <button className="topbar-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile dropdown nav */}
      {mobileOpen && (
        <div className="mobile-nav-dropdown">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id}
              className={`mobile-nav-item ${activeTab === id ? "active" : ""}`}
              onClick={() => navigate(id)}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {id === "reminders" && expiring.length > 0 && (
                <span className="nav-badge">{expiring.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="main-content">
        <div className="content-area">
          {loading ? (
            <div className="loader-wrap">
              <div className="pulse-loader"><Zap size={28} /></div>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Loading...</p>
            </div>
          ) : (
            <>
              {activeTab === "dashboard"   && <OwnerDashboard customers={customers} expiring={expiring} onNavigate={navigate} />}
              {activeTab === "jobs"        && <JobAssign />}
              {activeTab === "customers"   && <CustomerList  customers={customers} onRefresh={fetchAll} />}
              {activeTab === "tracking"    && <LiveTracking />}
              {activeTab === "technicians" && <AddTechnician />}
              {activeTab === "invoices"    && <AllInvoices />}
              {activeTab === "analytics"   && <Analytics     customers={customers} />}
              {activeTab === "reminders"   && <Reminders     expiring={expiring} customers={customers} onRefresh={fetchAll} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

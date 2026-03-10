// src/App.jsx
import { useState, useEffect } from "react";
import {
  Zap, LayoutDashboard, Briefcase, Users,
  HardDrive, BarChart2, Bell, FileText, LogOut,
  RefreshCw, MapPin, Settings as SettingsIcon, X
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
import Settings       from "./components/owner/Settings";
import { getAllCustomers, getExpiringWarranty } from "./services/api";
import "./App.css";

// Bottom nav tabs shown on mobile (most used 5)
const BOTTOM_TABS = [
  { id:"dashboard",   label:"Home",       icon:LayoutDashboard },
  { id:"jobs",        label:"Jobs",        icon:Briefcase       },
  { id:"customers",   label:"Customers",   icon:Users           },
  { id:"invoices",    label:"Invoices",    icon:FileText        },
  { id:"more",        label:"More",        icon:SettingsIcon    },
];

// Full nav for "More" drawer and desktop
const ALL_TABS = [
  { id:"dashboard",   label:"Dashboard",   icon:LayoutDashboard },
  { id:"jobs",        label:"Jobs",        icon:Briefcase       },
  { id:"customers",   label:"Customers",   icon:Users           },
  { id:"invoices",    label:"Invoices",    icon:FileText        },
  { id:"tracking",    label:"Live Track",  icon:MapPin          },
  { id:"technicians", label:"Technicians", icon:HardDrive       },
  { id:"analytics",   label:"Analytics",  icon:BarChart2       },
  { id:"reminders",   label:"Reminders",  icon:Bell            },
  { id:"settings",    label:"Settings",   icon:SettingsIcon    },
];

export default function App() {
  const [user,       setUser]       = useState(null);
  const [activeTab,  setActiveTab]  = useState("dashboard");
  const [customers,  setCustomers]  = useState([]);
  const [expiring,   setExpiring]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMore,   setShowMore]   = useState(false); // mobile "More" drawer
  const [isMobile,   setIsMobile]   = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

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

  const navigate = (tab) => {
    setActiveTab(tab);
    setShowMore(false);
  };

  if (!user) return <Login onLogin={handleLogin} />;
  if (user.role === "TECHNICIAN") return <TechApp user={user} onLogout={handleLogout} />;

  // ── CONTENT (same for desktop + mobile) ──────────────────────────────────
  const content = loading ? (
    <div className="loader-wrap">
      <div className="pulse-loader"><Zap size={28} /></div>
      <p style={{ color:"var(--text-secondary)", fontSize:14 }}>Loading...</p>
    </div>
  ) : (
    <>
      {activeTab === "dashboard"   && <OwnerDashboard customers={customers} expiring={expiring} onNavigate={navigate} />}
      {activeTab === "jobs"        && <JobAssign />}
      {activeTab === "customers"   && <CustomerList  customers={customers} onRefresh={fetchAll} />}
      {activeTab === "tracking"    && <LiveTracking onNavigate={navigate} />}
      {activeTab === "technicians" && <AddTechnician />}
      {activeTab === "invoices"    && <AllInvoices />}
      {activeTab === "analytics"   && <Analytics customers={customers} />}
      {activeTab === "reminders"   && <Reminders expiring={expiring} customers={customers} onRefresh={fetchAll} />}
      {activeTab === "settings"    && <Settings onLogout={handleLogout} />}
    </>
  );

  // ══════════════════════════════════════════════════════
  // MOBILE LAYOUT
  // ══════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div style={{ minHeight:"100vh", width:"100vw", maxWidth:"100vw", overflowX:"hidden", background:"var(--bg-primary)", paddingBottom:65, fontFamily:"var(--font-body)" }}>

        {/* Mobile top bar — slim */}
        <header style={{
          position:"sticky", top:0, zIndex:100,
          background:"#fff", borderBottom:"1px solid var(--border)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 16px", height:52, boxShadow:"var(--shadow-sm)"
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#f59e0b,#d97706)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>
              <Zap size={16} strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:800 }}>
              Electro<span style={{ color:"var(--accent-yellow)" }}>Serve</span>
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {expiring.length > 0 && (
              <button onClick={() => navigate("reminders")}
                style={{ background:"rgba(239,68,68,0.1)", color:"#ef4444", border:"none", borderRadius:8, padding:"5px 10px", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                <Bell size={12} /> {expiring.length}
              </button>
            )}
            <button onClick={() => fetchAll(true)} disabled={refreshing}
              style={{ background:"none", border:"1px solid var(--border)", borderRadius:8, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--text-secondary)" }}>
              <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            </button>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", color:"#fff", fontWeight:800, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ padding:"12px 12px 0", width:"100%", maxWidth:"100vw", overflowX:"hidden", boxSizing:"border-box" }}>
          {content}
        </div>

        {/* ── BOTTOM NAVIGATION BAR ── */}
        <nav style={{
          position:"fixed", bottom:0, left:0, right:0, zIndex:100,
          background:"#fff", borderTop:"1px solid var(--border)",
          display:"flex", boxShadow:"0 -4px 20px rgba(0,0,0,0.08)",
          height:62
        }}>
          {BOTTOM_TABS.map(({ id, label, icon: Icon }) => {
            const isActive = id === "more"
              ? showMore || !BOTTOM_TABS.find(t => t.id === activeTab)
              : activeTab === id && !showMore;
            const badge = id === "reminders" && expiring.length > 0;
            return (
              <button key={id}
                onClick={() => id === "more" ? setShowMore(v => !v) : navigate(id)}
                style={{
                  flex:1, border:"none", background:"none", cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3,
                  color: isActive ? "var(--accent-blue)" : "var(--text-muted)",
                  position:"relative"
                }}>
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                <span style={{ fontSize:10, fontWeight: isActive ? 700 : 500 }}>{label}</span>
                {badge && <span style={{ position:"absolute", top:4, right:"25%", width:8, height:8, background:"#ef4444", borderRadius:"50%", border:"2px solid #fff" }} />}
              </button>
            );
          })}
        </nav>

        {/* ── MORE DRAWER (remaining tabs) ── */}
        {showMore && (
          <>
            {/* Backdrop */}
            <div onClick={() => setShowMore(false)}
              style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.3)", zIndex:150 }} />
            {/* Drawer */}
            <div style={{
              position:"fixed", bottom:62, left:0, right:0, zIndex:200,
              background:"#fff", borderRadius:"20px 20px 0 0",
              boxShadow:"0 -8px 32px rgba(0,0,0,0.15)",
              padding:"16px 16px 8px"
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <span style={{ fontWeight:700, fontSize:15 }}>Sab Pages</span>
                <button onClick={() => setShowMore(false)} style={{ background:"rgba(239,68,68,0.1)", color:"#ef4444", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={16} /></button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10 }}>
                {ALL_TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => navigate(id)}
                    style={{
                      padding:"14px 8px", borderRadius:12, border:"none", cursor:"pointer", display:"flex",
                      flexDirection:"column", alignItems:"center", gap:6,
                      background: activeTab === id ? "var(--accent-blue-dim)" : "var(--bg-primary)",
                      color: activeTab === id ? "var(--accent-blue)" : "var(--text-secondary)"
                    }}>
                    <Icon size={22} strokeWidth={1.8} />
                    <span style={{ fontSize:11, fontWeight: activeTab===id ? 700 : 500, textAlign:"center", lineHeight:1.2 }}>{label}</span>
                    {id === "reminders" && expiring.length > 0 && (
                      <span style={{ background:"#ef4444", color:"#fff", borderRadius:10, fontSize:9, padding:"1px 5px", fontWeight:800 }}>{expiring.length}</span>
                    )}
                  </button>
                ))}
              </div>
              {/* Logout */}
              <button onClick={handleLogout}
                style={{ width:"100%", marginTop:12, padding:"12px", border:"none", borderRadius:12, background:"rgba(239,68,68,0.08)", color:"#ef4444", fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // DESKTOP LAYOUT (unchanged)
  // ══════════════════════════════════════════════════════
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-logo">
          <div className="topbar-logo-icon"><Zap size={20} strokeWidth={2.5} /></div>
          <span className="topbar-logo-text">Electro<span>Serve</span></span>
        </div>
        <nav className="topbar-nav">
          {ALL_TABS.map(({ id, label, icon: Icon }) => (
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
        </div>
      </header>

      <main className="main-content">
        <div className="content-area">
          {content}
        </div>
      </main>
    </div>
  );
}

// src/components/owner/OwnerDashboard.jsx
import { useState, useEffect } from "react";
import { authHeader } from "../../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const fmt = n => "₹" + Number(n||0).toLocaleString("en-IN");

export default function OwnerDashboard({ customers, expiring, onNavigate }) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/stats/dashboard`, { headers: authHeader() });
      const data = await res.json();
      setStats(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="loader-wrap">
      <div className="pulse-loader">⚡</div>
      <p>Dashboard load ho raha hai...</p>
    </div>
  );

  const maxRev = Math.max(...(stats?.revenueGraph||[]).map(d=>d.revenue), 1);

  return (
    <div className="owner-dash">

      {/* ── Top Stats — 3 day revenue ── */}
      <div className="odash-stats-grid">
        {[
          { icon:"💰", val:fmt(stats?.todayRevenue),    label:"Aaj Ki Earning",    cls:"odash-card-yellow" },
          { icon:"📅", val:fmt(stats?.yesterdayRevenue),label:"Kal Ki Earning",    cls:"odash-card-green"  },
          { icon:"📆", val:fmt(stats?.dayBeforeRevenue),label:"Parso Ki Earning",  cls:"odash-card-teal"   },
          { icon:"📊", val:fmt(stats?.monthRevenue),    label:"Is Mahine Ka",      cls:"odash-card-blue"   },
          { icon:"⏳", val:stats?.activeJobs,            label:"Active Jobs",       cls:"odash-card-red", click:()=>onNavigate&&onNavigate("jobs") },
          { icon:"🧾", val:fmt(stats?.pendingAmount),   label:"Pending Payments",  cls:"odash-card-purple" },
        ].map((c,i)=>(
          <div key={i} className={`odash-card ${c.cls}`} style={c.click?{cursor:"pointer"}:{}} onClick={c.click}>
            <div className="odash-card-icon">{c.icon}</div>
            <div className="odash-card-body">
              <div className="odash-card-value">{c.val}</div>
              <div className="odash-card-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="odash-grid">

        {/* ── Revenue Graph ── */}
        <div className="odash-section" style={{gridColumn:"1/-1"}}>
          <div className="odash-section-header">
            <h3>📈 Last 7 Din Ka Revenue</h3>
            <span className="odash-total-badge">Total: {fmt(stats?.totalRevenue)}</span>
          </div>
          <div className="odash-graph">
            {(stats?.revenueGraph||[]).map((d,i)=>(
              <div key={i} className="odash-bar-col">
                <div className="odash-bar-value">{d.revenue>0?fmt(d.revenue):""}</div>
                <div className="odash-bar-wrap">
                  <div className="odash-bar-fill"
                    style={{height:`${Math.max((d.revenue/maxRev)*100,d.revenue>0?4:0)}%`}} />
                </div>
                <div className="odash-bar-label">{d.date}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Technician Collection Table ── */}
        <div className="odash-section" style={{gridColumn:"1/-1"}}>
          <div className="odash-section-header">
            <h3>👷 Technician Ka Collection</h3>
            <button className="text-btn" onClick={()=>onNavigate&&onNavigate("technicians")}>Manage →</button>
          </div>
          {(stats?.technicianStats||[]).length===0 ? (
            <div className="empty-msg">Koi technician nahi — add karo</div>
          ) : (
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:"#f8fafc"}}>
                    {["#","Naam","Aaj","Kal","Is Mahine","Pending","Jobs Done","Active"].map(h=>(
                      <th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",color:"#64748b",borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(stats?.technicianStats||[]).map((t,i)=>(
                    <tr key={t.id} style={{borderBottom:"1px solid #f1f5f9",transition:"background 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <td style={{padding:"12px 14px",color:"#94a3b8",fontWeight:700}}>#{i+1}</td>
                      <td style={{padding:"12px 14px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"#fff",fontWeight:800,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            {t.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{fontWeight:700}}>{t.name}</div>
                            {!t.isActive&&<div style={{fontSize:10,color:"#ef4444",fontWeight:600}}>Inactive</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{padding:"12px 14px"}}>
                        <span style={{fontWeight:800,color:t.todayCollection>0?"#059669":"#94a3b8"}}>{fmt(t.todayCollection)}</span>
                      </td>
                      <td style={{padding:"12px 14px"}}>
                        <span style={{fontWeight:700,color:t.yestCollection>0?"#3b82f6":"#94a3b8"}}>{fmt(t.yestCollection)}</span>
                      </td>
                      <td style={{padding:"12px 14px"}}>
                        <span style={{fontWeight:700,color:"#1e293b"}}>{fmt(t.monthCollection)}</span>
                      </td>
                      <td style={{padding:"12px 14px"}}>
                        <span style={{fontWeight:700,color:t.pendingCollection>0?"#ef4444":"#10b981",padding:"3px 8px",background:t.pendingCollection>0?"rgba(239,68,68,0.08)":"rgba(16,185,129,0.08)",borderRadius:8}}>
                          {fmt(t.pendingCollection)}
                        </span>
                      </td>
                      <td style={{padding:"12px 14px",fontWeight:700,color:"#10b981"}}>{t.doneJobs}</td>
                      <td style={{padding:"12px 14px",fontWeight:700,color:"#f59e0b"}}>{t.activeJobs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Unpaid ── */}
        <div className="odash-section">
          <div className="odash-section-header">
            <h3>🧾 Pending Payments</h3>
            {stats?.pendingAmount>0 && <span className="odash-pending-badge">{fmt(stats?.pendingAmount)}</span>}
          </div>
          {(stats?.unpaidInvoices||[]).length===0 ? (
            <div className="empty-msg">✅ Koi pending payment nahi!</div>
          ) : (
            <div className="odash-unpaid-list">
              {(stats?.unpaidInvoices||[]).map(inv=>(
                <div key={inv.id} className="odash-unpaid-row">
                  <div className="odash-unpaid-left">
                    <div className="odash-unpaid-name">{inv.customerName}</div>
                    <div className="odash-unpaid-num">{inv.invoiceNumber} · {inv.date}</div>
                  </div>
                  <div className="odash-unpaid-amt">{fmt(inv.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Top Machines ── */}
        <div className="odash-section">
          <div className="odash-section-header"><h3>🔧 Top Machine Types</h3></div>
          {(stats?.topMachines||[]).length===0 ? <div className="empty-msg">Koi data nahi</div> : (
            <div className="odash-machine-list">
              {(stats?.topMachines||[]).map((m,i)=>{
                const maxC = stats.topMachines[0]?.count||1;
                return (
                  <div key={m.type} className="odash-machine-row">
                    <div className="odash-machine-name">{m.type}</div>
                    <div className="odash-machine-bar-wrap">
                      <div className="odash-machine-bar" style={{width:`${(m.count/maxC)*100}%`}}/>
                    </div>
                    <div className="odash-machine-count">{m.count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Warranty Alerts ── */}
        {(expiring?.length||0)>0 && (
          <div className="odash-section odash-alert-section">
            <div className="odash-section-header">
              <h3>⚠️ Warranty Expiring</h3>
              <button className="text-btn" onClick={()=>onNavigate&&onNavigate("reminders")}>Sab Dekho →</button>
            </div>
            <div className="odash-alert-list">
              {expiring.slice(0,4).map(c=>(
                <div key={c.id} className="odash-alert-row">
                  <span className="odash-alert-dot">⚠️</span>
                  <div>
                    <div className="odash-alert-name">{c.name}</div>
                    <div className="odash-alert-meta">{c.machineBrand} {c.model} · Expires: {c.warrantyEnd}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick Actions — no Add Customer ── */}
        <div className="odash-section">
          <div className="odash-section-header"><h3>⚡ Quick Actions</h3></div>
          <div className="quick-actions">
            <button className="qa-btn qa-yellow" onClick={()=>onNavigate&&onNavigate("jobs")}>
              <span>🔧</span> New Job
            </button>
            <button className="qa-btn qa-green" onClick={()=>onNavigate&&onNavigate("customers")}>
              <span>👥</span> Customers
            </button>
            <button className="qa-btn qa-blue" onClick={()=>onNavigate&&onNavigate("invoices")}>
              <span>🧾</span> Invoices
            </button>
            <button className="qa-btn qa-orange" onClick={()=>onNavigate&&onNavigate("reminders")}>
              <span>🔔</span> Reminders
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

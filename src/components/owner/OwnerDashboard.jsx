// src/components/owner/OwnerDashboard.jsx
import { useState, useEffect } from "react";
import { authHeader, apiFetch } from "../../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const fmt  = n => "₹" + Number(n||0).toLocaleString("en-IN");

// IST-safe local date string: "YYYY-MM-DD"
const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const localDateOffset = (offsetDays) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays); return localDate(d);
};

const PERIODS = [
  { key:"today",     label:"Aaj"    },
  { key:"yesterday", label:"Kal"    },
  { key:"week",      label:"7 Din"  },
  { key:"month",     label:"Month"  },
  { key:"overall",   label:"Overall"},
];
const STATUS_COLORS = { NEW:"#6366f1", ASSIGNED:"#f59e0b", ON_THE_WAY:"#3b82f6", IN_PROGRESS:"#8b5cf6", DONE:"#10b981", CANCELLED:"#ef4444" };
const STATUS_LABELS = { NEW:"New", ASSIGNED:"Assigned", ON_THE_WAY:"On The Way", IN_PROGRESS:"In Progress", DONE:"Done ✅", CANCELLED:"Cancelled" };

export default function OwnerDashboard({ customers, expiring, onNavigate }) {
  const [stats,       setStats]       = useState(null);
  const [allInvoices, setAllInvoices] = useState([]);
  const [allJobs,     setAllJobs]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [techPeriod,  setTechPeriod]  = useState("today");
  const [modal,       setModal]       = useState(null);

  useEffect(() => { fetchStats(); fetchInvoices(); fetchAllJobs(); }, []);

  const fetchStats = async () => {
    setLoading(true);
    try { const r = await apiFetch(`${API}/stats/dashboard`, { headers: authHeader() }); setStats(await r.json()); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  };
  const fetchInvoices = async () => {
    try { const r = await apiFetch(`${API}/invoices`, { headers: authHeader() }); const d=await r.json(); setAllInvoices(Array.isArray(d)?d:[]); } catch(e) {}
  };
  const fetchAllJobs = async () => {
    try { const r = await apiFetch(`${API}/jobs`, { headers: authHeader() }); const d=await r.json(); if(Array.isArray(d)) setAllJobs(d); } catch(e) {}
  };

  if (loading) return <div className="loader-wrap"><div className="pulse-loader">⚡</div><p>Dashboard load ho raha hai...</p></div>;

  const now       = new Date();
  const todayStr  = localDate();
  const yestStr   = localDateOffset(-1);
  const monthStart= localDate(new Date(now.getFullYear(), now.getMonth(), 1));

  const paidInvs   = allInvoices.filter(i => i.paymentStatus==="PAID");
  const todayInvs  = paidInvs.filter(i => i.invoiceDate===todayStr);
  const todayJobs  = allJobs.filter(j => j.scheduledDate === todayStr);
  const pendingJobs= allJobs.filter(j => j.status==="NEW");
  // Frontend-computed totals (always correct IST, not dependent on backend timezone)
  const todayEarning = todayInvs.reduce((s,i)=>s+(i.totalAmount||0),0);
  const monthEarning = paidInvs.filter(i=>i.invoiceDate>=monthStart).reduce((s,i)=>s+(i.totalAmount||0),0);

  // Month day-by-day
  const monthDays = () => {
    const year=now.getFullYear(), month=now.getMonth();
    const days=new Date(year,month+1,0).getDate();
    const rows=[];
    for (let d=1; d<=days; d++) {
      const ds=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const dayInvs=paidInvs.filter(i=>i.invoiceDate===ds);
      const rev=dayInvs.reduce((s,i)=>s+(i.totalAmount||0),0);
      if (rev>0||d===now.getDate()) rows.push({ds,day:d,rev,count:dayInvs.length,isToday:d===now.getDate()});
    }
    return rows;
  };

  function getCollection(techName) {
    const paid=allInvoices.filter(i=>i.technicianName===techName&&i.paymentStatus==="PAID");
    switch(techPeriod) {
      case "today":     return paid.filter(i=>i.invoiceDate===todayStr).reduce((s,i)=>s+(i.totalAmount||0),0);
      case "yesterday": return paid.filter(i=>i.invoiceDate===yestStr).reduce((s,i)=>s+(i.totalAmount||0),0);
      case "week":      return paid.filter(i=>i.invoiceDate>=localDateOffset(-7)).reduce((s,i)=>s+(i.totalAmount||0),0);
      case "month":     return paid.filter(i=>i.invoiceDate>=monthStart).reduce((s,i)=>s+(i.totalAmount||0),0);
      default:          return paid.reduce((s,i)=>s+(i.totalAmount||0),0);
    }
  }
  function getPending(n) { return allInvoices.filter(i=>i.technicianName===n&&i.paymentStatus==="UNPAID").reduce((s,i)=>s+(i.totalAmount||0),0); }

  const maxRev=Math.max(...(stats?.revenueGraph||[]).map(d=>d.revenue),1);
  const recentJobs = [...allJobs].sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0)).slice(0,8);

  const CARDS = [
    { icon:"💰", val:fmt(todayEarning),  label:"Aaj Ki Earning",     cls:"odash-card-yellow", modal:"today_earning",  badge:"📊 breakdown" },
    { icon:"📊", val:fmt(monthEarning),  label:"Is Mahine Ka Total",  cls:"odash-card-blue",   modal:"month_earning",  badge:"📅 din-wise"  },
    { icon:"🧾", val:fmt(stats?.pendingAmount), label:"Pending Payments",    cls:"odash-card-purple"  },
    { icon:"⏳", val:stats?.activeJobs,          label:"Active Jobs",         cls:"odash-card-red",    nav:"jobs"             },
    { icon:"📋", val:todayJobs.length,           label:"Aaj Ke Jobs",         cls:"odash-card-teal",   modal:"today_jobs",    badge:"👁 dekho"     },
    { icon:"🔴", val:pendingJobs.length,         label:"Unassigned Jobs",     cls:"odash-card-orange", modal:"pending_jobs",  badge:"👁 dekho"     },
  ];

  return (
    <div className="owner-dash">

      {/* ══ MODALS ══════════════════════════════════════════════ */}
      {modal && (
        <div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(3px)"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:540,maxHeight:"88vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.22)"}}>

            {/* TODAY EARNING */}
            {modal==="today_earning" && <>
              <MHead title="💰 Aaj Ki Earning — Breakdown" sub={new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})} onClose={()=>setModal(null)} />
              <div style={{background:"linear-gradient(135deg,#f59e0b,#d97706)",borderRadius:16,padding:"18px 20px",marginBottom:18,color:"#fff",textAlign:"center"}}>
                <div style={{fontSize:11,opacity:0.85,marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Total Aaj Ka</div>
                <div style={{fontSize:38,fontWeight:900,lineHeight:1}}>{fmt(todayEarning)}</div>
                <div style={{fontSize:13,marginTop:8,opacity:0.8}}>{todayInvs.length} paid invoice{todayInvs.length!==1?"s":""}</div>
              </div>
              {todayInvs.length===0 ? <Empty icon="📭" text="Aaj koi paid invoice nahi" /> : (
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {todayInvs.map(inv=><InvRow key={inv.id} inv={inv} />)}
                  <TechBrk stats={stats} />
                </div>
              )}
            </>}

            {/* MONTH EARNING */}
            {modal==="month_earning" && <>
              <MHead title={`📅 ${new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})} — Din-wise`} sub="Har din ki earning" onClose={()=>setModal(null)} />
              <div style={{background:"linear-gradient(135deg,#3b82f6,#2563eb)",borderRadius:16,padding:"18px 20px",marginBottom:18,color:"#fff",textAlign:"center"}}>
                <div style={{fontSize:11,opacity:0.85,marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Is Mahine Ka Total</div>
                <div style={{fontSize:38,fontWeight:900,lineHeight:1}}>{fmt(monthEarning)}</div>
              </div>
              {monthDays().length===0 ? <Empty icon="📭" text="Is mahine koi paid invoice nahi" /> : (
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {monthDays().map(row=>(
                    <div key={row.ds} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderRadius:12,background:row.isToday?"rgba(59,130,246,0.06)":"#fafafa",border:row.isToday?"1.5px solid #3b82f6":"1px solid #f1f5f9"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:13,color:"#1e293b"}}>
                          {new Date(row.ds+"T12:00:00").toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}
                          {row.isToday&&<span style={{marginLeft:8,fontSize:10,background:"#3b82f6",color:"#fff",padding:"1px 7px",borderRadius:10,fontWeight:700}}>Aaj</span>}
                        </div>
                        <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{row.count} invoice{row.count!==1?"s":""}</div>
                      </div>
                      <div style={{fontWeight:900,fontSize:16,color:row.rev>0?"#059669":"#94a3b8"}}>{fmt(row.rev)}</div>
                    </div>
                  ))}
                </div>
              )}
            </>}

            {/* TODAY JOBS */}
            {modal==="today_jobs" && <>
              <MHead title="📋 Aaj Ke Jobs" sub={`${todayStr} — ${todayJobs.length} total jobs`} onClose={()=>setModal(null)} />
              {todayJobs.length===0 ? <Empty icon="📋" text="Aaj ka koi job nahi" /> : (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {todayJobs.map(j=><JRow key={j.id} job={j} />)}
                </div>
              )}
            </>}

            {/* PENDING/UNASSIGNED */}
            {modal==="pending_jobs" && <>
              <MHead title="🔴 Unassigned Jobs" sub={`${pendingJobs.length} jobs assign hone baaki hain`} onClose={()=>setModal(null)} />
              {pendingJobs.length===0 ? <Empty icon="✅" text="Sab jobs assign ho gaye!" /> : (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {pendingJobs.map(j=><JRow key={j.id} job={j} onAssign={()=>{setModal(null);onNavigate&&onNavigate("jobs");}} />)}
                </div>
              )}
            </>}

          </div>
        </div>
      )}

      {/* ══ STAT CARDS ══ */}
      <div className="odash-stats-grid">
        {CARDS.map((c,i)=>(
          <div key={i} className={`odash-card ${c.cls}`} style={{cursor:(c.modal||c.nav)?"pointer":"default",position:"relative"}}
            onClick={c.modal?()=>setModal(c.modal):c.nav?()=>onNavigate&&onNavigate(c.nav):undefined}>
            {c.badge&&<div style={{position:"absolute",top:8,right:10,fontSize:10,opacity:0.65,fontWeight:600}}>{c.badge}</div>}
            <div className="odash-card-icon">{c.icon}</div>
            <div className="odash-card-body">
              <div className="odash-card-value">{c.val}</div>
              <div className="odash-card-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="odash-grid">

        {/* Revenue Graph */}
        <div className="odash-section" style={{gridColumn:"1/-1"}}>
          <div className="odash-section-header"><h3>📈 Last 7 Din Ka Revenue</h3></div>
          <div className="odash-graph">
            {(stats?.revenueGraph||[]).map((d,i)=>(
              <div key={i} className="odash-bar-col">
                <div className="odash-bar-value">{d.revenue>0?fmt(d.revenue):""}</div>
                <div className="odash-bar-wrap"><div className="odash-bar-fill" style={{height:`${Math.max((d.revenue/maxRev)*100,d.revenue>0?4:0)}%`}}/></div>
                <div className="odash-bar-label">{d.date}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Technician Collection */}
        <div className="odash-section" style={{gridColumn:"1/-1"}}>
          <div className="odash-section-header" style={{flexWrap:"wrap",gap:10}}>
            <h3>👷 Technician Collection</h3>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {PERIODS.map(p=>(
                <button key={p.key} onClick={()=>setTechPeriod(p.key)}
                  style={{padding:"5px 13px",borderRadius:20,fontWeight:600,fontSize:11,cursor:"pointer",border:"1.5px solid",borderColor:techPeriod===p.key?"#3b82f6":"#e2e8f0",background:techPeriod===p.key?"#3b82f6":"#fff",color:techPeriod===p.key?"#fff":"#64748b"}}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {(stats?.technicianStats||[]).length===0 ? (
            <div className="empty-msg">Koi technician nahi — pehle add karo</div>
          ) : (
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:"#f8fafc"}}>
                    {["#","Naam","Collection","Pending","Jobs Done","Active Jobs"].map(h=>(
                      <th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",color:"#64748b",borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(stats?.technicianStats||[]).map((t,i)=>{
                    const col=getCollection(t.name), pend=getPending(t.name);
                    return (
                      <tr key={t.id} style={{borderBottom:"1px solid #f1f5f9"}} onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                        <td style={{padding:"12px 14px",color:"#94a3b8",fontWeight:700}}>#{i+1}</td>
                        <td style={{padding:"12px 14px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"#fff",fontWeight:800,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{t.name?.[0]?.toUpperCase()}</div>
                            <div><div style={{fontWeight:700}}>{t.name}</div>{!t.isActive&&<div style={{fontSize:10,color:"#ef4444",fontWeight:600}}>Inactive</div>}</div>
                          </div>
                        </td>
                        <td style={{padding:"12px 14px"}}><span style={{fontWeight:800,color:col>0?"#059669":"#94a3b8",fontSize:15}}>{fmt(col)}</span></td>
                        <td style={{padding:"12px 14px"}}><span style={{fontWeight:700,color:pend>0?"#ef4444":"#10b981",padding:"3px 10px",background:pend>0?"rgba(239,68,68,0.08)":"rgba(16,185,129,0.08)",borderRadius:8}}>{fmt(pend)}</span></td>
                        <td style={{padding:"12px 14px",fontWeight:700,color:"#10b981"}}>{t.doneJobs||0}</td>
                        <td style={{padding:"12px 14px",fontWeight:700,color:"#f59e0b"}}>{t.activeJobs||0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Payments */}
        <div className="odash-section">
          <div className="odash-section-header">
            <h3>🧾 Pending Payments</h3>
            {(stats?.pendingAmount||0)>0&&<span className="odash-pending-badge">{fmt(stats?.pendingAmount)}</span>}
          </div>
          {(stats?.unpaidInvoices||[]).length===0 ? <div className="empty-msg">✅ Koi pending payment nahi!</div> : (
            <div className="odash-unpaid-list">
              {(stats?.unpaidInvoices||[]).map(inv=>(
                <div key={inv.id} className="odash-unpaid-row">
                  <div className="odash-unpaid-left"><div className="odash-unpaid-name">{inv.customerName}</div><div className="odash-unpaid-num">{inv.invoiceNumber} · {inv.date}</div></div>
                  <div className="odash-unpaid-amt">{fmt(inv.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Machines */}
        <div className="odash-section">
          <div className="odash-section-header"><h3>🔧 Top Machine Types</h3></div>
          {(stats?.topMachines||[]).length===0 ? <div className="empty-msg">Koi data nahi</div> : (
            <div className="odash-machine-list">
              {(stats?.topMachines||[]).map(m=>{
                const maxC=stats.topMachines[0]?.count||1;
                return (<div key={m.type} className="odash-machine-row"><div className="odash-machine-name">{m.type}</div><div className="odash-machine-bar-wrap"><div className="odash-machine-bar" style={{width:`${(m.count/maxC)*100}%`}}/></div><div className="odash-machine-count">{m.count}</div></div>);
              })}
            </div>
          )}
        </div>

        {/* Warranty Alerts */}
        {(expiring?.length||0)>0 && (
          <div className="odash-section odash-alert-section">
            <div className="odash-section-header"><h3>⚠️ Warranty Expiring</h3><button className="text-btn" onClick={()=>onNavigate&&onNavigate("reminders")}>Sab Dekho →</button></div>
            <div className="odash-alert-list">
              {expiring.slice(0,4).map(c=>(<div key={c.id} className="odash-alert-row"><span className="odash-alert-dot">⚠️</span><div><div className="odash-alert-name">{c.name}</div><div className="odash-alert-meta">{c.machineBrand} {c.model} · Expires: {c.warrantyEnd}</div></div></div>))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="odash-section" style={{gridColumn:"1/-1"}}>
          <div className="odash-section-header"><h3>🕐 Recent Activity</h3><button className="text-btn" onClick={()=>onNavigate&&onNavigate("jobs")}>Sab Dekho →</button></div>
          {recentJobs.length===0 ? <div className="empty-msg">Koi recent job nahi</div> : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
              {recentJobs.map(job=>{
                const color=STATUS_COLORS[job.status]||"#64748b";
                return (
                  <div key={job.id} style={{padding:"12px 14px",border:"1px solid #e2e8f0",borderRadius:12,background:"#fff",borderLeft:`3px solid ${color}`,cursor:"pointer"}} onClick={()=>onNavigate&&onNavigate("jobs")}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                      <div style={{fontWeight:700,fontSize:14,color:"#1e293b"}}>{job.customer?.name||job.customerName||"Unknown"}</div>
                      <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:`${color}15`,color,whiteSpace:"nowrap",marginLeft:8}}>{STATUS_LABELS[job.status]||job.status}</span>
                    </div>
                    <div style={{fontSize:12,color:"#64748b",marginBottom:3}}>{job.problemDescription}</div>
                    <div style={{display:"flex",gap:10,fontSize:11,color:"#94a3b8"}}>
                      {job.machineType&&<span>🖥️ {job.machineType} {job.machineBrand}</span>}
                      {job.technician?.name&&<span>👷 {job.technician.name}</span>}
                      {job.priority==="EMERGENCY"&&<span style={{color:"#ef4444",fontWeight:700}}>🚨 Emergency</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="odash-section">
          <div className="odash-section-header"><h3>⚡ Quick Actions</h3></div>
          <div className="quick-actions">
            <button className="qa-btn qa-yellow" onClick={()=>onNavigate&&onNavigate("jobs")}><span>🔧</span>New Job</button>
            <button className="qa-btn qa-green"  onClick={()=>onNavigate&&onNavigate("customers")}><span>👥</span>Customers</button>
            <button className="qa-btn qa-blue"   onClick={()=>onNavigate&&onNavigate("invoices")}><span>🧾</span>Invoices</button>
            <button className="qa-btn qa-orange" onClick={()=>onNavigate&&onNavigate("reminders")}><span>🔔</span>Reminders</button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function MHead({ title, sub, onClose }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
      <div>
        <div style={{fontSize:17,fontWeight:800,color:"#1e293b"}}>{title}</div>
        {sub&&<div style={{fontSize:12,color:"#64748b",marginTop:3}}>{sub}</div>}
      </div>
      <button onClick={onClose} style={{width:34,height:34,borderRadius:"50%",border:"1.5px solid #e2e8f0",background:"#f8fafc",cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
    </div>
  );
}
function Empty({ icon, text }) {
  return <div style={{textAlign:"center",padding:"32px 0",color:"#94a3b8"}}><div style={{fontSize:44,marginBottom:10}}>{icon}</div><div style={{fontWeight:600}}>{text}</div></div>;
}
function InvRow({ inv }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"13px 16px",border:"1px solid #f1f5f9",borderRadius:12,background:"#fafafa"}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:14,color:"#1e293b"}}>{inv.customer?.name||"Unknown"}</div>
        <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{inv.invoiceNumber} · {inv.paymentMethod} · {inv.technicianName||"—"}</div>
        {inv.items?.slice(0,2).map((it,i)=><div key={i} style={{fontSize:11,color:"#94a3b8",marginTop:1}}>• {it.serviceName}</div>)}
      </div>
      <div style={{fontWeight:900,fontSize:17,color:"#059669",flexShrink:0,marginLeft:10}}>{"₹"+Number(inv.totalAmount||0).toLocaleString("en-IN")}</div>
    </div>
  );
}
function TechBrk({ stats }) {
  const techs=(stats?.technicianStats||[]).filter(t=>t.todayCollection>0);
  if (!techs.length) return null;
  return (
    <div style={{marginTop:6,padding:"14px 16px",background:"rgba(59,130,246,0.05)",border:"1px solid rgba(59,130,246,0.15)",borderRadius:12}}>
      <div style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>Technician-wise</div>
      {techs.map(t=>(
        <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid #f1f5f9",fontSize:13}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"#fff",fontWeight:800,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>{t.name?.[0]?.toUpperCase()}</div>
            <span style={{fontWeight:600}}>{t.name}</span>
          </div>
          <span style={{fontWeight:800,color:"#059669"}}>{"₹"+Number(t.todayCollection||0).toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
}
const STATUS_COLORS_L = { NEW:"#6366f1", ASSIGNED:"#f59e0b", ON_THE_WAY:"#3b82f6", IN_PROGRESS:"#8b5cf6", DONE:"#10b981", CANCELLED:"#ef4444" };
const STATUS_LABELS_L = { NEW:"New", ASSIGNED:"Assigned", ON_THE_WAY:"On The Way", IN_PROGRESS:"In Progress", DONE:"Done ✅", CANCELLED:"Cancelled" };
function JRow({ job, onAssign }) {
  const color=STATUS_COLORS_L[job.status]||"#64748b";
  const name=job.customer?.name||job.customerName||"Unknown";
  const mobile=job.customer?.mobile||job.customerMobile;
  return (
    <div style={{padding:"12px 16px",border:"1px solid #e2e8f0",borderRadius:12,background:"#fff",borderLeft:`3px solid ${color}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div style={{fontWeight:700,fontSize:14,color:"#1e293b"}}>{name}</div>
        <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:`${color}18`,color,whiteSpace:"nowrap",marginLeft:8}}>{STATUS_LABELS_L[job.status]||job.status}</span>
      </div>
      <div style={{fontSize:12,color:"#64748b",marginBottom:4}}>{job.problemDescription}</div>
      <div style={{display:"flex",gap:10,fontSize:11,color:"#94a3b8",alignItems:"center",flexWrap:"wrap"}}>
        {job.machineType&&<span>🖥️ {job.machineType}</span>}
        {mobile&&<span>📞 {mobile}</span>}
        {job.scheduledDate&&<span>📅 {job.scheduledDate}</span>}
        {job.priority==="EMERGENCY"&&<span style={{color:"#ef4444",fontWeight:700}}>🚨 Emergency</span>}
        {onAssign&&<button onClick={onAssign} style={{marginLeft:"auto",padding:"4px 12px",background:"#3b82f6",color:"#fff",border:"none",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>Assign Karo →</button>}
      </div>
    </div>
  );
}

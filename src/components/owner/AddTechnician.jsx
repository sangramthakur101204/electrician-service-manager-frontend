// src/components/owner/AddTechnician.jsx
import { useState, useEffect } from "react";
import { addTechnician, getTechnicians, deleteTechnician, toggleTechnician, authHeader, apiFetch } from "../../services/api";
import { useToast, confirm } from "../Toast.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#84cc16","#f97316"];
const techColor = (name) => COLORS[(name?.charCodeAt(0)||0) % COLORS.length];
const fmtMins = m => m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : m > 0 ? `${m}m` : "0m";
const fmt = n => "₹" + Number(n||0).toLocaleString("en-IN");

function fmtTime(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}); }
  catch { return ""; }
}

// ── Activity Modal — Real Sessions ──────────────────────────────────────────
function ActivityModal({ tech, color, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [days,    setDays]    = useState(7);

  useEffect(() => { loadData(days); }, [tech.id, days]);

  async function loadData(d) {
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/tech-sessions?techId=${tech.id}&days=${d}`, { headers: authHeader() });
      const json = res.ok ? await res.json() : null;
      setData(json);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  const summary = data?.summaries?.find(s => s.techId === tech.id);
  const todaySessions = (data?.todaySessions || []).filter(s => s.techId === tech.id);
  const dailyData = summary?.daily || [];
  const maxMins = Math.max(...dailyData.map(d => d.mins), 1);
  const total = dailyData.reduce((s,d) => s+d.mins, 0);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center",
      justifyContent:"center", padding:"20px" }} onClick={onClose}>
      <div style={{ position:"absolute", inset:0, background:"rgba(15,23,42,0.6)", backdropFilter:"blur(5px)" }}/>
      <div style={{ position:"relative", background:"#fff", borderRadius:20,
          width:460, maxWidth:"calc(100vw - 32px)", maxHeight:"85vh",
          display:"flex", flexDirection:"column",
          boxShadow:"0 24px 64px rgba(0,0,0,0.3)", border:`2px solid ${color}40`, overflow:"hidden" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid #f1f5f9", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontWeight:800, fontSize:16, color:"#1e293b" }}>⏱️ Active Time History</div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>{tech.name} · 📞 {tech.mobile}</div>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%",
              border:"1.5px solid #e2e8f0", background:"#f8fafc", cursor:"pointer",
              fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b" }}>✕</button>
          </div>

          {/* Days selector */}
          <div style={{ display:"flex", gap:6, marginTop:12 }}>
            {[7,15,30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                style={{ padding:"5px 14px", borderRadius:20, border:"none", cursor:"pointer",
                  fontSize:12, fontWeight:700,
                  background: days===d ? color : "#f1f5f9",
                  color: days===d ? "#fff" : "#64748b" }}>
                {d} Din
              </button>
            ))}
          </div>

          {/* Summary stats */}
          {!loading && summary && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12 }}>
              {[
                { label:"Aaj Active", val: fmtMins(summary.todayMins), color:"#10b981" },
                { label:`${days} Din Total`, val: fmtMins(total), color:"#3b82f6" },
                { label:"Sessions Today", val: todaySessions.length, color:"#8b5cf6" },
              ].map((s,i) => (
                <div key={i} style={{ textAlign:"center", padding:"9px 6px",
                  background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0" }}>
                  <div style={{ fontWeight:800, fontSize:15, color:s.color }}>{s.val}</div>
                  <div style={{ fontSize:10, color:"#94a3b8", fontWeight:600, textTransform:"uppercase", marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 20px" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:40, color:"#94a3b8" }}>⚡ Load ho raha hai...</div>
          ) : (
            <>
              {/* Today's session timeline */}
              {todaySessions.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase",
                    letterSpacing:".05em", marginBottom:8 }}>📍 Aaj Ki Sessions</div>
                  {todaySessions.map((s,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                      padding:"9px 12px", background: s.isActive?"rgba(16,185,129,0.07)":"#f8fafc",
                      border:`1px solid ${s.isActive?"rgba(16,185,129,0.3)":"#e2e8f0"}`,
                      borderRadius:10, marginBottom:6 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
                        background:s.isActive?"#10b981":"#94a3b8",
                        boxShadow: s.isActive?"0 0 0 3px rgba(16,185,129,0.2)":"none" }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>
                          {fmtTime(s.start)} → {s.end ? fmtTime(s.end) : "Still Active 🟢"}
                        </div>
                        <div style={{ fontSize:11, color:"#64748b", marginTop:1 }}>
                          Duration: <b>{fmtMins(s.durationMins)}</b>
                        </div>
                      </div>
                      {s.isActive && <span style={{ fontSize:10, color:"#10b981", fontWeight:700,
                        background:"rgba(16,185,129,0.1)", padding:"2px 8px", borderRadius:20 }}>LIVE</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Daily bar chart */}
              <div style={{ fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase",
                letterSpacing:".05em", marginBottom:10 }}>📊 Daily Breakdown</div>
              {dailyData.length === 0 ? (
                <div style={{ textAlign:"center", padding:30, color:"#94a3b8" }}>
                  Koi data nahi iss period mein
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {dailyData.map((d,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ fontSize:11, color:"#64748b", width:52, flexShrink:0, fontWeight:600 }}>{d.label}</div>
                      <div style={{ flex:1, height:10, borderRadius:5, background:"#f1f5f9", overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:5,
                          background: i===0 ? color : `${color}88`,
                          width: `${(d.mins / maxMins) * 100}%`,
                          transition:"width 0.4s ease",
                          minWidth: d.mins > 0 ? 8 : 0 }}/>
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, color: d.mins>0?"#1e293b":"#cbd5e1",
                        width:50, textAlign:"right", flexShrink:0 }}>
                        {d.mins > 0 ? fmtMins(d.mins) : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding:"10px 20px", borderTop:"1px solid #f1f5f9", background:"#fafafa",
          textAlign:"center", flexShrink:0 }}>
          <div style={{ fontSize:11, color:"#94a3b8" }}>
            ✅ Real active time — TechApp se track hota hai
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddTechnician() {
  const toast = useToast();
  const [techs,       setTechs]       = useState([]);
  const [showForm,    setShowForm]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [listLoad,    setListLoad]    = useState(true);
  const [form,        setForm]        = useState({ name:"", mobile:"", password:"" });
  const [showPass,    setShowPass]    = useState(false);
  const [error,       setError]       = useState("");
  const [todayActive, setTodayActive] = useState({}); // techId → todayMins
  const [allInvoices, setAllInvoices] = useState([]);
  const [modalTech,   setModalTech]   = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setListLoad(true);
    try {
      const [techData, invData, sessionData] = await Promise.all([
        getTechnicians(),
        apiFetch(`${API}/invoices`, { headers:authHeader() }).then(r=>r.json()),
        apiFetch(`${API}/tech-sessions/today`, { headers:authHeader() }).then(r=>r.ok?r.json():[]),
      ]);
      setTechs(techData);
      setAllInvoices(Array.isArray(invData) ? invData : []);
      // Build todayActive map: techId → { todayMins, lastStatus }
      const activeMap = {};
      if (Array.isArray(sessionData)) {
        sessionData.forEach(s => { activeMap[s.techId] = s; });
      }
      setTodayActive(activeMap);
    } catch(e) { console.error(e); }
    finally { setListLoad(false); }
  }

  async function handleAdd() {
    if (!form.name||!form.mobile||!form.password) { toast("Sab fields bharo ⚠️","warning"); return; }
    if (form.mobile.length!==10) { toast("Mobile 10 digit ka hona chahiye","warning"); return; }
    setLoading(true); setError("");
    try {
      await addTechnician(form);
      toast("Technician add ho gaya! ✅","success");
      setForm({name:"",mobile:"",password:""});
      setShowForm(false);
      fetchAll();
    } catch(e) { toast(e.message,"error"); }
    finally { setLoading(false); }
  }

  async function handleDelete(id, name) {
    const ok = await confirm("Delete Karo?",`${name} ko permanently delete karna hai?`,{confirmLabel:"Haan, Delete Karo",dangerMode:true});
    if (!ok) return;
    try { await deleteTechnician(id); fetchAll(); toast(`${name} delete ho gaya`,"success"); }
    catch(e) { toast(e.message,"error"); }
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {modalTech && (
        <ActivityModal tech={modalTech} color={techColor(modalTech.name)} onClose={()=>setModalTech(null)} />
      )}

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,color:"#1e293b",margin:0}}>👷 Technicians</h2>
          <p style={{fontSize:13,color:"#64748b",margin:"3px 0 0"}}>{techs.length} technicians registered</p>
        </div>
        <button onClick={()=>setShowForm(!showForm)}
          style={{padding:"10px 20px",borderRadius:12,background:showForm?"#f8fafc":"linear-gradient(135deg,#3b82f6,#2563eb)",color:showForm?"#64748b":"#fff",border:showForm?"1.5px solid #e2e8f0":"none",fontWeight:700,fontSize:14,cursor:"pointer"}}>
          {showForm ? "✕ Cancel" : "➕ Naya Technician"}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:24,boxShadow:"0 4px 16px rgba(0,0,0,0.06)"}}>
          <div style={{fontWeight:800,fontSize:16,marginBottom:18,color:"#1e293b"}}>➕ Naya Technician</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            {[{label:"Naam *",key:"name",type:"text",ph:"Raju Sharma"},{label:"Mobile *",key:"mobile",type:"tel",ph:"9876543210"}].map(f=>(
              <div key={f.key}>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:6}}>{f.label}</label>
                <input className="form-input" type={f.type} placeholder={f.ph} maxLength={f.key==="mobile"?10:undefined}
                  value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})}/>
              </div>
            ))}
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:6}}>Password *</label>
              <div style={{position:"relative"}}>
                <input className="form-input" type={showPass?"text":"password"} placeholder="Login password"
                  value={form.password} onChange={e=>setForm({...form,password:e.target.value})} style={{paddingRight:40}}/>
                <button onClick={()=>setShowPass(!showPass)}
                  style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16}}>
                  {showPass?"🙈":"👁️"}
                </button>
              </div>
            </div>
          </div>
          {error && <div style={{padding:"10px 14px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,color:"#ef4444",fontSize:13,marginBottom:14}}>❌ {error}</div>}
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
            <button onClick={()=>{setShowForm(false);setError("");}}
              style={{padding:"10px 20px",borderRadius:10,border:"1.5px solid #e2e8f0",background:"#f8fafc",color:"#64748b",fontWeight:600,cursor:"pointer"}}>Cancel</button>
            <button onClick={handleAdd} disabled={loading}
              style={{padding:"10px 24px",borderRadius:10,background:"#3b82f6",color:"#fff",border:"none",fontWeight:700,cursor:"pointer",opacity:loading?0.7:1}}>
              {loading?"⏳ Adding...":"✅ Add Karo"}
            </button>
          </div>
        </div>
      )}

      {/* Technician Cards */}
      {listLoad ? (
        <div style={{textAlign:"center",padding:40,color:"#64748b"}}>⚡ Load ho raha hai...</div>
      ) : techs.length===0 ? (
        <div style={{textAlign:"center",padding:60,color:"#94a3b8"}}>
          <div style={{fontSize:52,marginBottom:12}}>👷</div>
          <div style={{fontWeight:600}}>Koi technician nahi — add karo!</div>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
          {techs.map(t => {
            const color = techColor(t.name);
            const sessionInfo = todayActive[t.id];
            const todayMins = sessionInfo?.todayMins || 0;
            const lastStatus = sessionInfo?.lastStatus || null;
            const tName = t.name?.trim().toLowerCase();
            const techInvs = allInvoices.filter(i => i.technicianName?.trim().toLowerCase()===tName && i.paymentStatus==="PAID");
            const totalEarned = techInvs.reduce((s,i)=>s+(i.totalAmount||0),0);
            const todayStr = new Date().toLocaleDateString("en-CA");
            const todayEarned = techInvs.filter(i=>i.invoiceDate===todayStr).reduce((s,i)=>s+(i.totalAmount||0),0);
            const lastActiveTime = lastStatus && lastStatus !== "ACTIVE"
              ? `Last active: ${fmtTime(lastStatus)}`
              : lastStatus === "ACTIVE" ? "🟢 Currently Active" : null;

            return (
              <div key={t.id} style={{background:"#fff",border:`1.5px solid ${color}25`,borderTop:`3px solid ${color}`,borderRadius:16,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",opacity:t.isActive?1:0.75}}>

                {/* Top */}
                <div style={{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${color},${color}bb)`,color:"#fff",fontWeight:900,fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 3px 10px ${color}50`}}>
                    {t.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,fontSize:16,color:"#1e293b"}}>{t.name}</div>
                    <div style={{fontSize:12,color:"#64748b",marginTop:2}}>📞 {t.mobile}</div>
                    {lastActiveTime && (
                      <div style={{fontSize:11,color:lastStatus==="ACTIVE"?"#10b981":"#94a3b8",marginTop:2,fontWeight:600}}>{lastActiveTime}</div>
                    )}
                  </div>
                  <span style={{padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700,background:t.isActive?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.08)",color:t.isActive?"#059669":"#ef4444",flexShrink:0}}>
                    {t.isActive?"🟢 Active":"🔴 Inactive"}
                  </span>
                </div>

                {/* Stats */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:"1px solid #f1f5f9",borderBottom:"1px solid #f1f5f9"}}>
                  {[
                    {label:"Aaj Ka",    val:fmt(todayEarned),  color:"#10b981"},
                    {label:"Total",     val:fmt(totalEarned),  color:"#3b82f6"},
                    {label:"Aaj Active",val:fmtMins(todayMins),color:"#8b5cf6"},
                  ].map((s,i)=>(
                    <div key={i} style={{padding:"10px 12px",textAlign:"center",borderRight:i<2?"1px solid #f1f5f9":"none"}}>
                      <div style={{fontWeight:800,fontSize:14,color:s.color}}>{s.val}</div>
                      <div style={{fontSize:10,color:"#94a3b8",marginTop:2,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em"}}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* History button */}
                <div style={{padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:12,color:"#64748b"}}>
                    ⏱️ Aaj ka session: <strong style={{color:"#1e293b"}}>{fmtMins(todayMins)}</strong>
                  </div>
                  <button onClick={()=>setModalTech(t)}
                    style={{fontSize:12,color:color,background:`${color}12`,border:`1px solid ${color}30`,borderRadius:20,padding:"4px 12px",cursor:"pointer",fontWeight:700}}>
                    📅 History
                  </button>
                </div>

                <div style={{display:"flex",gap:8,padding:"10px 16px",borderTop:"1px solid #f1f5f9"}}>
                  <button onClick={()=>handleDelete(t.id,t.name)}
                    style={{flex:1,padding:"8px 12px",borderRadius:8,border:"1.5px solid rgba(239,68,68,0.2)",background:"rgba(239,68,68,0.06)",color:"#ef4444",fontWeight:600,fontSize:12,cursor:"pointer"}}>
                    🗑️ Technician Hatao
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// src/components/owner/AddTechnician.jsx
import { useState, useEffect } from "react";
import { addTechnician, getTechnicians, deleteTechnician, toggleTechnician, authHeader, apiFetch } from "../../services/api";
import { useToast, confirm } from "../Toast.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#84cc16","#f97316"];
const techColor = (name) => COLORS[(name?.charCodeAt(0)||0) % COLORS.length];

// ── 7-Din Activity Modal ────────────────────────────────────────────────────
function ActivityModal({ tech, ah, color, onClose }) {
  if (!ah) return null;
  const fmtMins = m => m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : m > 0 ? `${m}m` : "—";
  const maxJobs = Math.max(...ah.week.map(d => d.jobs), 1);
  const total7  = ah.week.reduce((s,d)=>s+d.jobs,0);
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}
         onClick={onClose}>
      <div style={{ position:"absolute", inset:0, background:"rgba(15,23,42,0.6)", backdropFilter:"blur(5px)" }}/>
      <div style={{
            position:"relative", background:"#fff", borderRadius:20,
            width:440, maxWidth:"calc(100vw - 32px)",
            height:"auto", maxHeight:"80vh",
            display:"flex", flexDirection:"column",
            boxShadow:"0 24px 64px rgba(0,0,0,0.3)",
            border:`2px solid ${color}40`,
            overflow:"hidden",  /* clip children to rounded corners */
          }}
           onClick={e => e.stopPropagation()}>

        {/* Fixed Header */}
        <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid #f1f5f9", flexShrink:0, background:"#fff" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:16, color:"#1e293b" }}>📅 Pichle 7 Din Ki Activity</div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>{tech.name} · 📞 {tech.mobile}</div>
            </div>
            <button onClick={onClose} style={{
              width:30, height:30, borderRadius:"50%", border:"1.5px solid #e2e8f0",
              background:"#f8fafc", cursor:"pointer", fontSize:14, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b",
            }}>✕</button>
          </div>

          {/* Summary cards */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12 }}>
            {[
              { label:"Aaj Jobs",    val: ah.todayJobs,             color:"#f59e0b" },
              { label:"7 Din Total", val: total7 + " jobs",         color:"#3b82f6" },
              { label:"Aaj Active",  val: fmtMins(ah.todayMins)||"0m", color:"#10b981" },
            ].map((s,i) => (
              <div key={i} style={{ textAlign:"center", padding:"10px 6px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0" }}>
                <div style={{ fontWeight:800, fontSize:16, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:10, color:"#94a3b8", fontWeight:600, textTransform:"uppercase", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable bar chart — flex:1 + overflowY:auto is KEY */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 20px" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {ah.week.map((d, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ fontSize:12, color:"#64748b", width:48, flexShrink:0, fontWeight:600 }}>{d.date}</div>
                <div style={{ flex:1, height:10, borderRadius:5, background:"#f1f5f9", overflow:"hidden" }}>
                  <div style={{
                    height:"100%", borderRadius:5,
                    background: i === 0 ? color : `${color}88`,
                    width: `${(d.jobs / maxJobs) * 100}%`,
                    transition:"width 0.4s ease",
                    minWidth: d.jobs > 0 ? 10 : 0,
                  }}/>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:"#1e293b", width:48, textAlign:"right", flexShrink:0 }}>
                  {d.jobs > 0 ? fmtMins(d.mins) : "—"}
                </div>
                <div style={{ fontSize:11, color: d.jobs > 0 ? color : "#cbd5e1", width:38, flexShrink:0, fontWeight:600 }}>
                  {d.jobs > 0 ? `${d.jobs} job` : "0 job"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Footer */}
        <div style={{ padding:"10px 20px", borderTop:"1px solid #f1f5f9", flexShrink:0, background:"#fafafa", textAlign:"center" }}>
          <div style={{ fontSize:11, color:"#94a3b8", fontStyle:"italic" }}>
            * Har job ≈ 45 min estimated &nbsp;·&nbsp; Real tracking future mein aayega
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddTechnician() {
  const toast = useToast();
  const [techs,      setTechs]      = useState([]);
  const [showForm,   setShowForm]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [listLoad,   setListLoad]   = useState(true);
  const [form,       setForm]       = useState({ name:"", mobile:"", password:"" });
  const [showPass,   setShowPass]   = useState(false);
  const [error,      setError]      = useState("");
  const [activeHours,setActiveHours]= useState({});
  const [allInvoices,setAllInvoices]= useState([]);
  const [modalTech,  setModalTech]  = useState(null); // tech whose 7-din modal is open

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setListLoad(true);
    try {
      const [techData, invData] = await Promise.all([
        getTechnicians(),
        apiFetch(`${API}/invoices`, { headers:authHeader() }).then(r=>r.json()),
      ]);
      setTechs(techData);
      const invs = Array.isArray(invData) ? invData : [];
      setAllInvoices(invs);
      buildActiveHours(invs, techData);
    } catch(e) { console.error(e); }
    finally { setListLoad(false); }
  }

  // Match invoices to technician by name (trimmed, lowercase for safety)
  function buildActiveHours(invoices, techList) {
    const result = {};
    techList.forEach(t => {
      const tName = t.name?.trim().toLowerCase();
      const techInvs = invoices.filter(i =>
        i.technicianName?.trim().toLowerCase() === tName
      );
      const byDate = {};
      techInvs.forEach(i => {
        const d = i.invoiceDate;
        if (d) byDate[d] = (byDate[d]||0) + 1;
      });
      const today = new Date().toLocaleDateString("en-CA");
      const week  = [];
      for (let i = 0; i < 7; i++) {
        const d  = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toLocaleDateString("en-CA");
        const label = d.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
        week.push({ date:label, ds, jobs:byDate[ds]||0, mins:(byDate[ds]||0)*45 });
      }
      result[t.id] = {
        todayJobs: byDate[today]||0,
        todayMins: (byDate[today]||0)*45,
        week,
      };
    });
    setActiveHours(result);
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

  async function handleToggle(id) {
    try { await toggleTechnician(id); fetchAll(); }
    catch(e) { toast(e.message,"error"); }
  }

  async function handleDelete(id, name) {
    const ok = await confirm("Delete Karo?",`${name} ko permanently delete karna hai? Yeh undo nahi hoga.`,{confirmLabel:"Haan, Delete Karo",dangerMode:true});
    if (!ok) return;
    try { await deleteTechnician(id); fetchAll(); toast(`${name} delete ho gaya`,"success"); }
    catch(e) { toast(e.message,"error"); }
  }

  const fmtMins = m => m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : m > 0 ? `${m}m` : "0m";
  const fmt = n => "₹" + Number(n||0).toLocaleString("en-IN");

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {/* 7-Din Activity Modal */}
      {modalTech && (
        <ActivityModal
          tech={modalTech}
          ah={activeHours[modalTech.id]}
          color={techColor(modalTech.name)}
          onClose={() => setModalTech(null)}
        />
      )}

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,color:"#1e293b",margin:0}}>👷 Technicians</h2>
          <p style={{fontSize:13,color:"#64748b",margin:"3px 0 0"}}>{techs.length} technicians registered</p>
        </div>
        <button onClick={()=>setShowForm(!showForm)}
          style={{padding:"10px 20px",borderRadius:12,background:showForm?"#f8fafc":"linear-gradient(135deg,#3b82f6,#2563eb)",color:showForm?"#64748b":"#fff",border:showForm?"1.5px solid #e2e8f0":"none",fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
          {showForm ? "✕ Cancel" : "➕ Naya Technician Add Karo"}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:24,boxShadow:"0 4px 16px rgba(0,0,0,0.06)"}}>
          <div style={{fontWeight:800,fontSize:16,marginBottom:18,color:"#1e293b"}}>➕ Naya Technician</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            {[
              {label:"Naam *",   key:"name",   type:"text", ph:"Raju Sharma"},
              {label:"Mobile *", key:"mobile", type:"tel",  ph:"9876543210"},
            ].map(f=>(
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
            const ah    = activeHours[t.id];
            const tName = t.name?.trim().toLowerCase();
            const techInvs = allInvoices.filter(i =>
              i.technicianName?.trim().toLowerCase() === tName && i.paymentStatus==="PAID"
            );
            const totalEarned = techInvs.reduce((s,i)=>s+(i.totalAmount||0),0);
            const todayStr    = new Date().toLocaleDateString("en-CA");
            const todayEarned = techInvs.filter(i=>i.invoiceDate===todayStr).reduce((s,i)=>s+(i.totalAmount||0),0);

            return (
              <div key={t.id} style={{background:"#fff",border:`1.5px solid ${color}25`,borderTop:`3px solid ${color}`,borderRadius:16,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",opacity:t.isActive?1:0.75}}>

                {/* Card top */}
                <div style={{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${color},${color}bb)`,color:"#fff",fontWeight:900,fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 3px 10px ${color}50`}}>
                    {t.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,fontSize:16,color:"#1e293b"}}>{t.name}</div>
                    <div style={{fontSize:12,color:"#64748b",marginTop:2}}>📞 {t.mobile}</div>
                  </div>
                  <span style={{padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700,background:t.isActive?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.08)",color:t.isActive?"#059669":"#ef4444",flexShrink:0}}>
                    {t.isActive?"🟢 Active":"🔴 Inactive"}
                  </span>
                </div>

                {/* Stats row */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:"1px solid #f1f5f9",borderBottom:"1px solid #f1f5f9"}}>
                  {[
                    {label:"Aaj Ka",   val:fmt(todayEarned), color:"#10b981"},
                    {label:"Total",    val:fmt(totalEarned), color:"#3b82f6"},
                    {label:"Aaj Jobs", val:ah?.todayJobs||0, color:"#f59e0b"},
                  ].map((s,i)=>(
                    <div key={i} style={{padding:"10px 12px",textAlign:"center",borderRight:i<2?"1px solid #f1f5f9":"none"}}>
                      <div style={{fontWeight:800,fontSize:14,color:s.color}}>{s.val}</div>
                      <div style={{fontSize:10,color:"#94a3b8",marginTop:2,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em"}}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Active hours + 7 Din button */}
                <div style={{padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:12,color:"#64748b"}}>
                    ⏱️ Aaj active: <strong style={{color:"#1e293b"}}>{ah ? fmtMins(ah.todayMins) : "0m"}</strong>
                  </div>
                  <button onClick={()=>setModalTech(t)}
                    style={{fontSize:12,color:color,background:`${color}12`,border:`1px solid ${color}30`,borderRadius:20,padding:"4px 12px",cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                    📅 7 Din
                  </button>
                </div>

                {/* Actions */}
                <div style={{display:"flex",gap:8,padding:"10px 16px",borderTop:"1px solid #f1f5f9"}}>
                  <button onClick={()=>handleToggle(t.id)}
                    style={{flex:1,padding:"8px",borderRadius:8,border:"1.5px solid",fontWeight:600,fontSize:12,cursor:"pointer",
                      borderColor:t.isActive?"#f59e0b":"#10b981",
                      background:t.isActive?"rgba(245,158,11,0.07)":"rgba(16,185,129,0.07)",
                      color:t.isActive?"#d97706":"#059669"}}>
                    {t.isActive?"⏸️ Inactive Karo":"▶️ Active Karo"}
                  </button>
                  <button onClick={()=>handleDelete(t.id,t.name)}
                    style={{padding:"8px 12px",borderRadius:8,border:"1.5px solid rgba(239,68,68,0.2)",background:"rgba(239,68,68,0.06)",color:"#ef4444",fontWeight:600,fontSize:12,cursor:"pointer"}}>
                    🗑️
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


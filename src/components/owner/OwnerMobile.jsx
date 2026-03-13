// src/components/owner/OwnerMobile.jsx
// Mobile-first owner interface — for owners who are out in the field on their phone
import { useState, useEffect } from "react";
import { authHeader, apiFetch, getAllCustomers } from "../../services/api";
import { useToast, confirm } from "../Toast.jsx";
import LocationPicker from "../LocationPicker.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const MACHINE_TYPES = ["AC","Washing Machine","Water Purifier","Refrigerator","Microwave","Geyser","Fan","Motor Pump","Inverter","Other"];
const MACHINE_BRANDS = {
  "AC":              ["Voltas","Daikin","LG","Samsung","Hitachi","Blue Star","Carrier","Godrej","Haier","Panasonic","O General","Lloyd","Other"],
  "Washing Machine": ["LG","Samsung","Whirlpool","IFB","Bosch","Godrej","Haier","Panasonic","Other"],
  "Water Purifier":  ["Kent","Aquaguard","Pureit","LG","Havells","Livpure","AO Smith","Other"],
  "Refrigerator":    ["LG","Samsung","Whirlpool","Godrej","Haier","Voltas","Panasonic","Other"],
  "Microwave":       ["LG","Samsung","IFB","Panasonic","Morphy Richards","Bajaj","Other"],
  "Geyser":          ["Racold","Havells","AO Smith","Bajaj","Crompton","V-Guard","Other"],
  "Fan":             ["Usha","Bajaj","Crompton","Orient","Havells","V-Guard","Other"],
  "Motor Pump":      ["Kirloskar","Crompton","Grundfos","V-Guard","Texmo","Other"],
  "Inverter":        ["Luminous","Microtek","Exide","Amaron","Su-Kam","Other"],
  "Other":           ["LG","Samsung","Voltas","Godrej","Havells","Bajaj","Other"],
};

const STATUS_COLOR = {
  NEW:         { bg:"#eff6ff", color:"#3b82f6", label:"New" },
  ASSIGNED:    { bg:"#fffbeb", color:"#f59e0b", label:"Assigned" },
  ON_THE_WAY:  { bg:"#eff6ff", color:"#3b82f6", label:"On Way" },
  IN_PROGRESS: { bg:"#f5f3ff", color:"#8b5cf6", label:"In Progress" },
  DONE:        { bg:"#f0fdf4", color:"#10b981", label:"Done ✅" },
  CANCELLED:   { bg:"#fef2f2", color:"#ef4444", label:"Cancelled" },
};

const inp = { padding:"12px 14px", borderRadius:10, border:"1.5px solid #e2e8f0", fontSize:15, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box", background:"#fff" };

function fmt(n) { return "₹" + Number(n||0).toLocaleString("en-IN"); }

// ── BOTTOM NAV TABS ──────────────────────────────────────────────────────────
const TABS = [
  { id:"home",    icon:"🏠", label:"Home"    },
  { id:"jobs",    icon:"💼", label:"Jobs"    },
  { id:"newjob",  icon:"➕", label:"New Job" },
  { id:"customers",icon:"👥", label:"Customers"},
  { id:"track",   icon:"📍", label:"Track"   },
];

export default function OwnerMobile({ user, onLogout }) {
  const toast = useToast();
  const [tab,        setTab]        = useState("home");
  const [jobs,       setJobs]       = useState([]);
  const [customers,  setCustomers]  = useState([]);
  const [technicians,setTechnicians]= useState([]);
  const [loading,    setLoading]    = useState(true);
  const [locations,  setLocations]  = useState([]);
  const [compName,   setCompName]   = useState("Matoshree Enterprises");

  useEffect(() => {
    fetchAll();
    apiFetch(`${API}/settings`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.companyName) setCompName(d.companyName); })
      .catch(() => {});
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [jobRes, cusRes, techRes, locRes] = await Promise.all([
        apiFetch(`${API}/jobs`,             { headers: authHeader() }),
        apiFetch(`${API}/customers`,         { headers: authHeader() }),
        apiFetch(`${API}/users/technicians`, { headers: authHeader() }),
        apiFetch(`${API}/location`,          { headers: authHeader() }),
      ]);
      const [jd, cd, td, ld] = await Promise.all([jobRes.json(), cusRes.json(), techRes.json(), locRes.json()]);
      setJobs(       Array.isArray(jd) ? jd : []);
      setCustomers(  Array.isArray(cd) ? cd : []);
      setTechnicians(Array.isArray(td) ? td : []);
      setLocations(  Array.isArray(ld) ? ld : []);
    } catch(e) {}
    finally { setLoading(false); }
  };

  // Parallel fetch helper
  const refetch = async () => {
    try {
      const [jobRes, cusRes] = await Promise.all([
        apiFetch(`${API}/jobs`,     { headers: authHeader() }),
        apiFetch(`${API}/customers`,{ headers: authHeader() }),
      ]);
      const jd = jobRes.ok  ? await jobRes.json()  : [];
      const cd = cusRes.ok  ? await cusRes.json()  : [];
      setJobs(      Array.isArray(jd) ? jd : []);
      setCustomers( Array.isArray(cd) ? cd : []);
    } catch(e) {}
  };

  const activeJobs   = jobs.filter(j => !["DONE","CANCELLED"].includes(j.status));
  const todayJobs    = jobs.filter(j => j.scheduledDate === new Date().toISOString().split("T")[0]);
  const newJobs      = jobs.filter(j => j.status === "NEW");

  // Stats for home
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", paddingBottom:72, fontFamily:"'Plus Jakarta Sans',Inter,sans-serif" }}>

      {/* ── TOP BAR ── */}
      <div style={{ background:"linear-gradient(135deg,#1e40af,#3b82f6)", padding:"16px 20px 14px", color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:50 }}>
        <div>
          <div style={{ fontSize:11, opacity:0.8, fontWeight:500 }}>⚡ {compName}</div>
          <div style={{ fontSize:17, fontWeight:800, marginTop:2 }}>Namaste, {user?.name?.split(" ")[0]} 👋</div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <button onClick={fetchAll} style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:10, padding:"8px 10px", color:"#fff", cursor:"pointer", fontSize:16 }}>🔄</button>
          <button onClick={onLogout} style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:10, padding:"8px 10px", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700 }}>Exit</button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding:"16px 14px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:"#94a3b8" }}>⚡ Loading...</div>
        ) : (
          <>
            {tab === "home"      && <HomeTab jobs={jobs} customers={customers} technicians={technicians} locations={locations} todayStr={todayStr} onNavigate={setTab} />}
            {tab === "jobs"      && <JobsTab jobs={jobs} technicians={technicians} onRefresh={refetch} toast={toast} compName={compName} />}
            {tab === "newjob"    && <NewJobTab customers={customers} technicians={technicians} jobs={jobs} onDone={() => { refetch(); setTab("jobs"); }} toast={toast} />}
            {tab === "customers" && <CustomersTab customers={customers} onRefresh={refetch} toast={toast} />}
            {tab === "track"     && <TrackTab locations={locations} technicians={technicians} jobs={jobs} />}
          </>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:"1px solid #e2e8f0", display:"flex", zIndex:100, boxShadow:"0 -4px 20px rgba(0,0,0,0.08)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, padding:"10px 4px 8px", border:"none", background:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3,
              color: tab===t.id ? "#3b82f6" : "#94a3b8" }}>
            <span style={{ fontSize: t.id==="newjob" ? 22 : 18 }}>{t.icon}</span>
            <span style={{ fontSize:10, fontWeight: tab===t.id ? 700 : 500 }}>{t.label}</span>
            {t.id==="jobs" && newJobs.length>0 && (
              <span style={{ position:"absolute", top:6, background:"#ef4444", color:"#fff", borderRadius:10, fontSize:9, padding:"1px 5px", fontWeight:800 }}>{newJobs.length}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── HOME TAB ─────────────────────────────────────────────────────────────────
function HomeTab({ jobs, customers, technicians, locations, todayStr, onNavigate }) {
  const activeJobs = jobs.filter(j => !["DONE","CANCELLED"].includes(j.status));
  const todayJobs  = jobs.filter(j => j.scheduledDate === todayStr);
  const newJobs    = jobs.filter(j => j.status === "NEW");
  const onlineT    = locations.length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Quick Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[
          { icon:"💼", val:activeJobs.length, label:"Active Jobs",     bg:"#eff6ff", color:"#3b82f6", tab:"jobs" },
          { icon:"📋", val:todayJobs.length,  label:"Aaj Ke Jobs",     bg:"#f0fdf4", color:"#10b981", tab:"jobs" },
          { icon:"🔴", val:newJobs.length,    label:"Unassigned",      bg:"#fef2f2", color:"#ef4444", tab:"jobs" },
          { icon:"📍", val:onlineT,           label:"Techs Online",    bg:"#f5f3ff", color:"#8b5cf6", tab:"track" },
        ].map((s,i) => (
          <div key={i} onClick={() => onNavigate(s.tab)}
            style={{ background:s.bg, borderRadius:14, padding:"14px 16px", cursor:"pointer", border:`1.5px solid ${s.color}22` }}>
            <div style={{ fontSize:24 }}>{s.icon}</div>
            <div style={{ fontSize:26, fontWeight:900, color:s.color, lineHeight:1.1, marginTop:4 }}>{s.val}</div>
            <div style={{ fontSize:12, color:"#64748b", marginTop:2, fontWeight:500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Action */}
      <button onClick={() => onNavigate("newjob")}
        style={{ width:"100%", padding:16, background:"linear-gradient(135deg,#3b82f6,#2563eb)", color:"#fff", border:"none", borderRadius:14, fontWeight:800, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
        ➕ Naya Job Banao
      </button>

      {/* Recent Jobs */}
      {jobs.slice(0,5).map(j => (
        <MiniJobCard key={j.id} job={j} />
      ))}
    </div>
  );
}

function MiniJobCard({ job }) {
  const st = STATUS_COLOR[job.status] || STATUS_COLOR.NEW;
  const name = job.customer?.name || job.customerName || "Unknown";
  return (
    <div style={{ background:"#fff", borderRadius:12, padding:"12px 14px", border:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ fontWeight:700, fontSize:14 }}>{name}</div>
        <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{job.machineType} {job.machineBrand} · 📅 {job.scheduledDate}</div>
      </div>
      <span style={{ background:st.bg, color:st.color, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, whiteSpace:"nowrap" }}>{st.label}</span>
    </div>
  );
}

// ── JOBS TAB ─────────────────────────────────────────────────────────────────
function JobsTab({ jobs, technicians, onRefresh, toast, compName }) {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = jobs.filter(j => {
    if (filter !== "ALL" && j.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (j.customer?.name || j.customerName || "").toLowerCase();
      const mob  = (j.customer?.mobile || j.customerMobile || "");
      if (!name.includes(q) && !mob.includes(q)) return false;
    }
    return true;
  });

  const assignTech = async (jobId, techId) => {
    try {
      const res = await apiFetch(`${API}/jobs/${jobId}`, {
        method:"PUT", headers: authHeader(),
        body: JSON.stringify({ technicianId: Number(techId) }),
      });
      if (res.ok) {
        const data = await res.json();
        onRefresh();
        toast("✅ Assigned!", "success");
        if (data.whatsappUrl) window.open(data.whatsappUrl, "_blank");
      } else {
        toast("Assign nahi hua, dobara try karo", "error");
      }
    } catch(e) { toast("Error: " + (e?.message||""), "error"); }
  };

  const cancelJob = async (jobId) => {
    const ok = await confirm("Cancel?", "Job cancel ho jaayega", { confirmLabel:"Haan", dangerMode:true });
    if (!ok) return;
    await apiFetch(`${API}/jobs/${jobId}`, { method:"PUT", headers: authHeader(), body: JSON.stringify({ status:"CANCELLED" }) });
    onRefresh();
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Search */}
      <div style={{ position:"relative" }}>
        <input placeholder="Search naam ya mobile..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ ...inp, paddingLeft:36 }} />
        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#94a3b8" }}>🔍</span>
      </div>

      {/* Filter chips */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
        {[["ALL","Sab"],["NEW","New 🔴"],["ASSIGNED","Assigned"],["ON_THE_WAY","On Way"],["IN_PROGRESS","In Progress"],["DONE","Done ✅"],["CANCELLED","Cancelled"]].map(([k,l]) => (
          <button key={k} onClick={()=>setFilter(k)}
            style={{ flexShrink:0, padding:"6px 14px", borderRadius:20, border:"none", fontWeight:600, fontSize:12, cursor:"pointer",
              background: filter===k ? "#3b82f6" : "#f1f5f9",
              color: filter===k ? "#fff" : "#64748b" }}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:40, color:"#94a3b8" }}>Koi job nahi</div>
      ) : filtered.map(job => (
        <JobCardMobile key={job.id} job={job} technicians={technicians} jobs={jobs} onAssign={assignTech} onCancel={cancelJob} compName={compName} />
      ))}
    </div>
  );
}

function JobCardMobile({ job, technicians, jobs, onAssign, onCancel, compName="Matoshree Enterprises" }) {
  const [showAssign, setShowAssign] = useState(false);
  const st = STATUS_COLOR[job.status] || STATUS_COLOR.NEW;
  const name = job.customer?.name || job.customerName || "Unknown";
  const mob  = job.customer?.mobile || job.customerMobile;

  const freeTechs = technicians.filter(t => {
    if (!t.isActive) return false;
    return !jobs.some(j => j.technician?.id === t.id && !["DONE","CANCELLED"].includes(j.status));
  });

  return (
    <div style={{ background:"#fff", borderRadius:14, padding:14, border:"1px solid #e2e8f0", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:15 }}>{name}</div>
          {mob && <a href={`tel:${mob}`} style={{ fontSize:13, color:"#3b82f6", textDecoration:"none" }}>📞 {mob}</a>}
        </div>
        <span style={{ background:st.bg, color:st.color, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20 }}>{st.label}</span>
      </div>

      <div style={{ fontSize:13, color:"#64748b", marginBottom:6 }}>{job.problemDescription}</div>
      <div style={{ fontSize:12, color:"#94a3b8" }}>🔧 {job.machineType} {job.machineBrand} · 📅 {job.scheduledDate}{job.scheduledTime ? " "+job.scheduledTime : ""}</div>
      {job.technician && <div style={{ fontSize:12, color:"#f59e0b", marginTop:4, fontWeight:600 }}>👷 {job.technician.name}</div>}

      {/* Actions */}
      <div style={{ marginTop:10, display:"flex", gap:8, flexWrap:"wrap" }}>
        {mob && (
          <a href={`tel:${mob}`}
            style={{ padding:"7px 14px", background:"rgba(16,185,129,0.1)", color:"#059669", borderRadius:8, fontSize:13, fontWeight:700, textDecoration:"none" }}>
            📞 Call
          </a>
        )}
        {mob && (
          <a href={`https://wa.me/91${mob}?text=${encodeURIComponent("Namaste! "+compName+" se service update — job status: "+STATUS_COLOR[job.status]?.label)}`} target="_blank" rel="noreferrer"
            style={{ padding:"7px 14px", background:"rgba(37,211,102,0.1)", color:"#16a34a", borderRadius:8, fontSize:13, fontWeight:700, textDecoration:"none" }}>
            💬 WA
          </a>
        )}
        {["NEW","ASSIGNED"].includes(job.status) && (
          <button onClick={() => setShowAssign(v=>!v)}
            style={{ padding:"7px 14px", background:"rgba(59,130,246,0.1)", color:"#3b82f6", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            {showAssign ? "✕" : "👷 Assign"}
          </button>
        )}
        {["NEW","ASSIGNED","ON_THE_WAY","IN_PROGRESS"].includes(job.status) && (
          <button onClick={() => onCancel(job.id)}
            style={{ padding:"7px 14px", background:"rgba(239,68,68,0.08)", color:"#ef4444", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            ✕ Cancel
          </button>
        )}
      </div>

      {/* Assign dropdown */}
      {showAssign && (
        <div style={{ marginTop:10, background:"#f8fafc", borderRadius:10, padding:10, border:"1px solid #e2e8f0" }}>
          <div style={{ fontSize:11, color:"#94a3b8", fontWeight:700, marginBottom:8 }}>TECHNICIAN SELECT KARO:</div>
          {freeTechs.map(t => (
            <div key={t.id} onClick={() => { onAssign(job.id, t.id); setShowAssign(false); }}
              style={{ padding:"10px 12px", background:"#fff", borderRadius:8, border:"1px solid #e2e8f0", marginBottom:6, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}
              onTouchStart={e=>e.currentTarget.style.background="#eff6ff"}
              onTouchEnd={e=>e.currentTarget.style.background="#fff"}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", color:"#fff", fontWeight:800, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {t.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:13 }}>{t.name}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>📞 {t.mobile}</div>
              </div>
              <div style={{ marginLeft:"auto", color:"#3b82f6", fontWeight:700, fontSize:12 }}>Assign →</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── NEW JOB TAB ───────────────────────────────────────────────────────────────
function NewJobTab({ customers, technicians, jobs, onDone, toast }) {
  const [cusSearch,  setCusSearch]  = useState("");
  const [selectedCus,setSelectedCus]= useState(null);
  const [showDrop,   setShowDrop]   = useState(false);
  const [isNewCus,   setIsNewCus]   = useState(false);
  const [showMap,    setShowMap]    = useState(false);
  const [loading,    setLoading]    = useState(false);

  const [form, setForm] = useState({
    customerName:"", customerMobile:"", customerAddress:"", latitude:null, longitude:null,
    problemDescription:"", machineType:"", machineBrand:"",
    priority:"NORMAL", technicianId:"", scheduledDate:"", scheduledTime:"", notes:"",
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const filteredCus = customers.filter(c => {
    const q = cusSearch.toLowerCase();
    return q && (c.name?.toLowerCase().includes(q) || c.mobile?.includes(q));
  }).slice(0,6);

  const freeTechs = technicians.filter(t => {
    if (!t.isActive) return false;
    return !jobs.some(j => j.technician?.id===t.id && !["DONE","CANCELLED"].includes(j.status));
  });

  const submit = async () => {
    if (!form.problemDescription.trim()) { toast("Problem likho ⚠️","warning"); return; }
    if (!selectedCus) {
      if (!form.customerName.trim()) { toast("Naam bharo","warning"); return; }
      if (!/^\d{10}$/.test(form.customerMobile)) { toast("10-digit mobile","warning"); return; }
    }
    setLoading(true);
    try {
      const body = selectedCus ? { customerId:selectedCus.id, ...form } : { ...form };
      const res  = await apiFetch(`${API}/jobs`, { method:"POST", headers:authHeader(), body:JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message||"Error");
      toast("✅ Job ban gaya!","success");
      if (data.whatsappUrl) window.open(data.whatsappUrl,"_blank");
      onDone();
    } catch(e) { toast(e.message,"error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ fontSize:18, fontWeight:800, color:"#1e293b" }}>➕ Naya Job</div>

      {/* Customer Search */}
      <div style={{ background:"#fff", borderRadius:14, padding:14, border:"1px solid #e2e8f0" }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#64748b", marginBottom:10 }}>👤 CUSTOMER</div>
        {selectedCus ? (
          <div style={{ padding:"10px 14px", background:"rgba(16,185,129,0.07)", border:"1.5px solid rgba(16,185,129,0.3)", borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontWeight:800 }}>{selectedCus.name}</div>
              <div style={{ fontSize:12, color:"#64748b" }}>📞 {selectedCus.mobile}</div>
            </div>
            <button onClick={() => { setSelectedCus(null); setCusSearch(""); }}
              style={{ background:"none", border:"1px solid #fecaca", color:"#ef4444", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Change</button>
          </div>
        ) : (
          <>
            <div style={{ position:"relative" }}>
              <input placeholder="Naam ya mobile type karo..." value={cusSearch} autoComplete="off"
                onChange={e=>{ const v=e.target.value; setCusSearch(v); setShowDrop(true); }}
                onFocus={()=>setShowDrop(true)}
                style={{ ...inp, paddingLeft:36 }} />
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#94a3b8" }}>🔍</span>
              {cusSearch && <button onClick={()=>{setCusSearch("");setIsNewCus(false);}} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:16 }}>✕</button>}
            </div>

            {/* Inline dropdown */}
            {showDrop && cusSearch.length >= 1 && (
              <div style={{ marginTop:4, border:"1.5px solid #3b82f6", borderRadius:10, overflow:"hidden", background:"#fff" }}>
                {filteredCus.length > 0 && filteredCus.map(c => (
                  <div key={c.id} onClick={() => { setSelectedCus(c); setShowDrop(false); setCusSearch(""); setIsNewCus(false); }}
                    style={{ padding:"11px 14px", borderBottom:"1px solid #f1f5f9", cursor:"pointer" }}
                    onTouchStart={e=>e.currentTarget.style.background="#eff6ff"}
                    onTouchEnd={e=>e.currentTarget.style.background="#fff"}>
                    <div style={{ fontWeight:700 }}>{c.name}</div>
                    <div style={{ fontSize:12, color:"#64748b" }}>📞 {c.mobile}{c.machineType?" · "+c.machineType:""}</div>
                  </div>
                ))}
                <div onClick={() => { setIsNewCus(true); setShowDrop(false); if(!/^\d/.test(cusSearch)) set("customerName",cusSearch); else set("customerMobile",cusSearch); }}
                  style={{ padding:"11px 14px", color:"#3b82f6", fontWeight:700, fontSize:13, cursor:"pointer", background:"rgba(59,130,246,0.04)" }}>
                  ➕ Naya Customer Banao {filteredCus.length===0 && "— koi match nahi"}
                </div>
              </div>
            )}

            {isNewCus && (
              <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:10 }}>
                <input placeholder="Naam *" value={form.customerName} onChange={e=>set("customerName",e.target.value)} style={inp} />
                <input placeholder="Mobile * (10 digits)" maxLength={10} value={form.customerMobile}
                  onChange={e=>set("customerMobile",e.target.value.replace(/\D/g,""))}
                  inputMode="numeric" style={inp} />
                <div onClick={()=>setShowMap(true)}
                  style={{ padding:"12px 14px", borderRadius:10, border:"2px dashed #cbd5e1", background:"#f8fafc", cursor:"pointer", textAlign:"center", color:"#64748b" }}>
                  {form.customerAddress || "📍 Address pin karo (optional)"}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Machine */}
      <div style={{ background:"#fff", borderRadius:14, padding:14, border:"1px solid #e2e8f0" }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#64748b", marginBottom:10 }}>🔧 MACHINE</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <select value={form.machineType} onChange={e=>{set("machineType",e.target.value);set("machineBrand","");}} style={inp}>
            <option value="">-- Machine Type *--</option>
            {MACHINE_TYPES.map(m=><option key={m}>{m}</option>)}
          </select>
          <select value={form.machineBrand} onChange={e=>set("machineBrand",e.target.value)} style={inp}>
            <option value="">-- Brand --</option>
            {(MACHINE_BRANDS[form.machineType]||MACHINE_BRANDS["Other"]).map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* Problem */}
      <div style={{ background:"#fff", borderRadius:14, padding:14, border:"1px solid #e2e8f0" }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#64748b", marginBottom:10 }}>📝 PROBLEM</div>
        <textarea placeholder="Problem kya hai? *" rows={3} value={form.problemDescription}
          onChange={e=>set("problemDescription",e.target.value)}
          style={{ ...inp, resize:"vertical" }} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
          <select value={form.priority} onChange={e=>set("priority",e.target.value)} style={inp}>
            <option value="NORMAL">Normal</option>
            <option value="EMERGENCY">🚨 Emergency</option>
          </select>
          <input type="date" value={form.scheduledDate} onChange={e=>set("scheduledDate",e.target.value)} style={inp} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:10, marginTop:10 }}>
          <select value={form.scheduledTime?form.scheduledTime.split(" ")[0]:""} onChange={e=>{const ampm=form.scheduledTime?.split(" ")[1]||"AM";set("scheduledTime",e.target.value?`${e.target.value} ${ampm}`:"")} } style={inp}>
            <option value="">-- Time --</option>
            {["1","2","3","4","5","6","7","8","9","10","11","12"].map(h=><option key={h}>{h}:00</option>)}
          </select>
          <select value={form.scheduledTime?.split(" ")[1]||"AM"} onChange={e=>{const hr=form.scheduledTime?.split(" ")[0]||"";set("scheduledTime",hr?`${hr} ${e.target.value}`:"")}} style={{ ...inp, width:70 }}>
            <option>AM</option><option>PM</option>
          </select>
        </div>
        <input placeholder="Notes (optional)" value={form.notes} onChange={e=>set("notes",e.target.value)} style={{ ...inp, marginTop:10 }} />
      </div>

      {/* Technician */}
      <div style={{ background:"#fff", borderRadius:14, padding:14, border:"1px solid #e2e8f0" }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#64748b", marginBottom:10 }}>👷 TECHNICIAN (Optional)</div>
        {freeTechs.length===0 ? (
          <div style={{ padding:12, background:"#fffbeb", borderRadius:10, fontSize:13, color:"#92400e" }}>⏳ Abhi koi free technician nahi — baad mein assign kar sakte hain</div>
        ) : (
          <select value={form.technicianId} onChange={e=>set("technicianId",e.target.value)} style={inp}>
            <option value="">-- Baad mein assign karunga --</option>
            {freeTechs.map(t=><option key={t.id} value={t.id}>{t.name} — {t.mobile}</option>)}
          </select>
        )}
      </div>

      {/* Submit */}
      <button onClick={submit} disabled={loading}
        style={{ padding:16, background:"linear-gradient(135deg,#3b82f6,#2563eb)", color:"#fff", border:"none", borderRadius:14, fontWeight:800, fontSize:16, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}>
        {loading ? "⏳ Saving..." : "✅ Job Banao"}
      </button>

      {showMap && (
        <LocationPicker
          address={form.customerAddress} latitude={form.latitude} longitude={form.longitude}
          onConfirm={(addr,lat,lng) => { set("customerAddress",addr); set("latitude",lat); set("longitude",lng); setShowMap(false); }}
          onClose={() => setShowMap(false)} />
      )}
    </div>
  );
}

// ── CUSTOMERS TAB ─────────────────────────────────────────────────────────────
function CustomersTab({ customers, onRefresh, toast }) {
  const [search, setSearch] = useState("");
  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name?.toLowerCase().includes(q) || c.mobile?.includes(q);
  }).slice(0,20);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ position:"relative" }}>
        <input placeholder="Customer search karo..." value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp, paddingLeft:36 }} />
        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#94a3b8" }}>🔍</span>
      </div>
      <div style={{ fontSize:12, color:"#94a3b8", fontWeight:600 }}>{customers.length} total customers</div>
      {filtered.map(c => (
        <div key={c.id} style={{ background:"#fff", borderRadius:12, padding:"12px 14px", border:"1px solid #e2e8f0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div>
              <a href={`tel:${c.mobile}`} style={{ fontSize:13, color:"#3b82f6", textDecoration:"none" }}>📞 {c.mobile}</a>
            </div>
            <span style={{
              fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20,
              background: c.serviceStatus==="DONE"?"#f0fdf4":c.serviceStatus==="CANCELLED"?"#fef2f2":"#fffbeb",
              color:      c.serviceStatus==="DONE"?"#10b981":c.serviceStatus==="CANCELLED"?"#ef4444":"#f59e0b"
            }}>{c.serviceStatus==="DONE"?"✅ Done":c.serviceStatus==="CANCELLED"?"❌ Cancelled":"⏳ Pending"}</span>
          </div>
          <div style={{ fontSize:12, color:"#94a3b8", marginTop:6 }}>🔧 {c.machineType} {c.machineBrand}</div>
          {c.warrantyPeriod && c.warrantyPeriod!=="No Warranty" && <div style={{ fontSize:12, color:"#8b5cf6", marginTop:2 }}>🛡️ {c.warrantyPeriod} · till {c.warrantyEnd}</div>}
          <div style={{ marginTop:8, display:"flex", gap:8 }}>
            <a href={`tel:${c.mobile}`} style={{ padding:"6px 12px", background:"rgba(16,185,129,0.1)", color:"#059669", borderRadius:8, fontSize:12, fontWeight:700, textDecoration:"none" }}>📞 Call</a>
            <a href={`https://wa.me/91${c.mobile}`} target="_blank" rel="noreferrer"
              style={{ padding:"6px 12px", background:"rgba(37,211,102,0.1)", color:"#16a34a", borderRadius:8, fontSize:12, fontWeight:700, textDecoration:"none" }}>💬 WA</a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── TRACK TAB ─────────────────────────────────────────────────────────────────
function TrackTab({ locations, technicians, jobs }) {
  const now = Date.now();
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ fontSize:16, fontWeight:800, color:"#1e293b" }}>📍 Live Technicians ({locations.length} online)</div>
      {technicians.map(t => {
        const loc = locations.find(l => l.technicianId === t.id);
        const activeJob = jobs.find(j => j.technician?.id===t.id && !["DONE","CANCELLED"].includes(j.status));
        const isOnline = !!loc;
        const stale = loc ? (now - new Date(loc.updatedAt).getTime()) > 5*60*1000 : false;
        return (
          <div key={t.id} style={{ background:"#fff", borderRadius:12, padding:"12px 14px", border:"1px solid #e2e8f0" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", color:"#fff", fontWeight:800, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {t.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{t.name}</div>
                  <a href={`tel:${t.mobile}`} style={{ fontSize:12, color:"#3b82f6", textDecoration:"none" }}>📞 {t.mobile}</a>
                </div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20,
                background: isOnline?(stale?"#fffbeb":"#f0fdf4"):"#f1f5f9",
                color: isOnline?(stale?"#f59e0b":"#10b981"):"#94a3b8" }}>
                {isOnline?(stale?"⚠️ Stale":"🟢 Online"):"⚫ Offline"}
              </span>
            </div>
            {activeJob && <div style={{ marginTop:8, fontSize:12, color:"#f59e0b", fontWeight:600 }}>💼 Job: {activeJob.customer?.name||activeJob.customerName} · {activeJob.machineType}</div>}
            {loc && <div style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>📌 Updated: {new Date(loc.updatedAt).toLocaleTimeString("en-IN")}</div>}
          </div>
        );
      })}
      {technicians.length === 0 && <div style={{ textAlign:"center", padding:40, color:"#94a3b8" }}>Koi technician nahi</div>}
    </div>
  );
}
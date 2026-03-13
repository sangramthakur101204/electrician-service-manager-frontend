// src/components/owner/JobAssign.jsx
import { openExternal, downloadBlob } from "../../utils/openExternal";
import { useState, useEffect, useRef } from "react";
import { getTechnicians, getAllCustomers, getLiveLocations, authHeader, apiFetch } from "../../services/api";
import { useToast, confirm } from "../Toast.jsx";
import LocationPicker from "../LocationPicker";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

function distKm(lat1,lng1,lat2,lng2) {
  const R=6371,dL=(lat2-lat1)*Math.PI/180,dG=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dG/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

const TECH_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4"];
const techColor = (name) => TECH_COLORS[(name?.charCodeAt(0)||0) % TECH_COLORS.length];

const MACHINE_TYPES = ["AC","Washing Machine","Water Purifier","Refrigerator","Microwave","Geyser","Fan","Motor Pump","Inverter","Other"];

// Smart brand mapping — machine type ke hisaab se brands
const MACHINE_BRANDS = {
  "AC":              ["Voltas","Daikin","LG","Samsung","Hitachi","Blue Star","Carrier","Godrej","Haier","Panasonic","O General","Lloyd","Whirlpool","IFB","Mitsubishi","Other"],
  "Washing Machine": ["LG","Samsung","Whirlpool","IFB","Bosch","Godrej","Haier","Panasonic","Onida","Videocon","Other"],
  "Water Purifier":  ["Kent","Aquaguard","Pureit","LG","Havells","Livpure","AO Smith","Whirlpool","Other"],
  "Refrigerator":    ["LG","Samsung","Whirlpool","Godrej","Haier","Voltas","Panasonic","Videocon","Bosch","Other"],
  "Microwave":       ["LG","Samsung","IFB","Panasonic","Morphy Richards","Bajaj","Whirlpool","Other"],
  "Geyser":          ["Racold","Havells","AO Smith","Bajaj","Crompton","V-Guard","Jaquar","Other"],
  "Fan":             ["Usha","Bajaj","Crompton","Orient","Havells","V-Guard","Anchor","Khaitan","Other"],
  "Motor Pump":      ["Kirloskar","Crompton","Grundfos","V-Guard","Texmo","CRI","Other"],
  "Inverter":        ["Luminous","Microtek","Exide","Amaron","Su-Kam","APC","Okaya","Other"],
  "Other":           ["LG","Samsung","Voltas","Godrej","Havells","Bajaj","Crompton","Other"],
};

const STATUS_LABEL = {
  NEW:         { label:"New",          color:"#6366f1", bg:"rgba(99,102,241,0.1)"  },
  ASSIGNED:    { label:"Assigned",     color:"#f59e0b", bg:"rgba(245,158,11,0.1)"  },
  ON_THE_WAY:  { label:"On The Way",   color:"#3b82f6", bg:"rgba(59,130,246,0.1)"  },
  IN_PROGRESS: { label:"In Progress",  color:"#8b5cf6", bg:"rgba(139,92,246,0.1)"  },
  DONE:        { label:"Done ✅",      color:"#10b981", bg:"rgba(16,185,129,0.1)"  },
  CANCELLED:   { label:"Cancelled",    color:"#ef4444", bg:"rgba(239,68,68,0.1)"   },
};

export default function JobAssign() {
  const toast = useToast();
  const isMob = window.innerWidth < 768;
  const [jobs,         setJobs]         = useState([]);
  const [technicians,  setTechnicians]  = useState([]);
  const [customers,    setCustomers]    = useState([]);
  const [showForm,     setShowForm]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [listLoading,  setListLoading]  = useState(true);
  const [companySettings, setCompanySettings] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [jobSearch,    setJobSearch]    = useState("");
  const [dateFilter,   setDateFilter]   = useState("");
  const [waUrl,        setWaUrl]        = useState("");
  const [showMap,      setShowMap]      = useState(false);
  const [liveLocs,     setLiveLocs]     = useState([]);
  const [nearestTechs, setNearestTechs] = useState([]); // sorted by distance

  // Customer selection
  const [cusSearch,   setCusSearch]   = useState("");
  const [selectedCus, setSelectedCus] = useState(null);
  const [showCusDrop, setShowCusDrop] = useState(false);
  const [isNewCus,    setIsNewCus]    = useState(false);

  const [form, setForm] = useState({
    customerName:"", customerMobile:"", customerAddress:"",
    latitude: null, longitude: null,
    problemDescription:"", machineType:"", machineBrand:"",
    priority:"NORMAL", technicianId:"", scheduledDate:"", scheduledTime:"", notes:"",
  });
  // Multiple machines support
  const [jobMachines, setJobMachines] = useState([{ machineType:"", machineBrand:"" }]);
  const addMachineRow    = () => setJobMachines(ms => [...ms, { machineType:"", machineBrand:"" }]);
  const removeMachineRow = (i) => setJobMachines(ms => ms.filter((_,idx) => idx !== i));
  const setMachineField  = (i, k, v) => setJobMachines(ms =>
    ms.map((m, idx) => idx === i ? { ...m, [k]: v, ...(k==="machineType"?{machineBrand:""}:{}) } : m)
  );

  useEffect(() => { fetchAll(); }, []);

  // Real-time tech online/offline via SSE
  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    let es;
    function connect() {
      es = new EventSource(`${API}/sse/tech-status?token=${encodeURIComponent(token)}`);
      es.addEventListener("status", (e) => {
        try {
          const list = JSON.parse(e.data);
          setTechnicians(prev => prev.map(t => {
            const found = list.find(s => s.id === t.id);
            return found ? { ...t, isActive: found.isOnline } : t;
          }));
        } catch {}
      });
      es.addEventListener("update", (e) => {
        try {
          const upd = JSON.parse(e.data);
          setTechnicians(prev => prev.map(t =>
            t.id === upd.id ? { ...t, isActive: upd.isOnline } : t
          ));
        } catch {}
      });
      es.onerror = () => { es.close(); setTimeout(connect, 5000); };
    }
    connect();
    return () => es && es.close();
  }, []);

  const fetchAll = async () => {
    setListLoading(true);
    try {
      const [j, t, c, ll, cs] = await Promise.all([
        apiFetch(`${API}/jobs`, { headers: authHeader() }).then(r => r.json()),
        getTechnicians(),
        getAllCustomers(),
        getLiveLocations().catch(()=>[]),
        apiFetch(`${API}/settings`, { headers: authHeader() }).then(r => r.ok ? r.json() : null).catch(()=>null),
      ]);
      setJobs(Array.isArray(j) ? j : []);
      setTechnicians(t);
      setCustomers(c);
      setLiveLocs(Array.isArray(ll) ? ll : []);
      if (cs) setCompanySettings(cs);
    } catch (e) { console.error(e); }
    finally { setListLoading(false); }
  };

  const filteredCustomers = customers.filter(c => {
    const q = cusSearch.toLowerCase();
    return !q || c.name?.toLowerCase().includes(q) || c.mobile?.includes(q);
  }).slice(0, 8);

  const filteredJobs = jobs.filter(j => {
    if (filterStatus !== "ALL" && j.status !== filterStatus) return false;
    if (dateFilter && j.scheduledDate !== dateFilter && j.createdAt?.split("T")[0] !== dateFilter) return false;
    if (jobSearch) {
      const q = jobSearch.toLowerCase();
      return (j.customer?.name||j.customerName||"").toLowerCase().includes(q) ||
             (j.customer?.mobile||j.customerMobile||"").includes(q) ||
             (j.problemDescription||"").toLowerCase().includes(q) ||
             (j.machineType||"").toLowerCase().includes(q) ||
             (j.technician?.name||"").toLowerCase().includes(q);
    }
    return true;
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // When job location is set, compute nearest techs with distance
  const computeNearest = (lat, lng) => {
    if (!lat || !lng) { setNearestTechs([]); return; }
    const withDist = technicians.filter(t=>t.isActive).map(t => {
      const loc = liveLocs.find(l => l.techId === t.id || l.name === t.name);
      if (!loc) return { ...t, dist: null, hasLoc: false };
      return { ...t, dist: distKm(parseFloat(lat), parseFloat(lng), loc.latitude, loc.longitude), hasLoc: true, loc };
    });
    // Sort: techs with location first by distance, then techs without location
    withDist.sort((a,b) => {
      if (a.hasLoc && b.hasLoc) return a.dist - b.dist;
      if (a.hasLoc) return -1;
      return 1;
    });
    setNearestTechs(withDist);
  };

  const resetForm = () => {
    setForm({ customerName:"", customerMobile:"", customerAddress:"", latitude:null, longitude:null,
              problemDescription:"", machineType:"", machineBrand:"",
              priority:"NORMAL", technicianId:"", scheduledDate:"", scheduledTime:"", notes:"" });
    setJobMachines([{ machineType:"", machineBrand:"" }]);
    setSelectedCus(null); setCusSearch(""); setIsNewCus(false);
  };

  const handleSubmit = async () => {
    if (!form.problemDescription.trim()) { toast("Problem describe karo ⚠️", "warning"); return; }
    if (!selectedCus) {
      // New customer
      if (!form.customerName.trim())          { toast("Customer naam bharo", "warning"); return; }
      if (!/^\d{10}$/.test(form.customerMobile)) { toast("10-digit mobile bharo", "warning"); return; }
      if (!jobMachines[0]?.machineType)       { toast("Machine type select karo", "warning"); return; }
    }

    setLoading(true);
    try {
      // Use first machine from jobMachines array
      const primaryMachine = jobMachines[0] || {};
      const allMachinesStr = jobMachines
        .filter(m => m.machineType)
        .map(m => `${m.machineType}${m.machineBrand ? " - " + m.machineBrand : ""}`)
        .join(", ");

      const body = selectedCus
        ? { customerId: selectedCus.id, ...form,
            machineType:  primaryMachine.machineType  || form.machineType,
            machineBrand: primaryMachine.machineBrand || form.machineBrand,
            machinesInfo: allMachinesStr,  // extra info in notes
          }
        : { ...form,
            machineType:  primaryMachine.machineType,
            machineBrand: primaryMachine.machineBrand,
            machinesInfo: allMachinesStr,
          };

      const res  = await apiFetch(`${API}/jobs`, {
        method: "POST", headers: authHeader(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Job create nahi hua");

      if (data.whatsappUrl) {
        setShowForm(false);
        resetForm();
        setWaUrl(data.whatsappUrl);
      } else { setShowForm(false); resetForm(); }
      fetchAll();
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  };

  // Owner only assigns technician — status changes happen via TechApp
  const [assignWaUrl, setAssignWaUrl] = useState("");
  const [mapsRedirectUrl, setMapsRedirectUrl] = useState("");
  const [showMapsPopup, setShowMapsPopup] = useState(false);

  const assignTechnician = async (jobId, technicianId) => {
    try {
      const res  = await apiFetch(`${API}/jobs/${jobId}`, {
        method: "PUT", headers: authHeader(),
        body: JSON.stringify({ technicianId: technicianId ? Number(technicianId) : null }),
      });
      const data = await res.json();
      // Backend returns { job, whatsappUrl } when tech assigned
      const waUrl = data.whatsappUrl || "";
      if (waUrl) setAssignWaUrl(waUrl);
      fetchAll();
      toast("✅ Technician assign ho gaya!", "success");

      // Google Maps redirect — lat/lng ho toh navigate, warna address text se search
      const job = data.job || data;
      const jLat = job?.latitude || job?.customerLatitude;
      const jLng = job?.longitude || job?.customerLongitude;
      const jAddr = job?.customerAddress || job?.customer?.address;
      if (jLat && jLng) {
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${jLat},${jLng}&travelmode=driving`;
        setMapsRedirectUrl(mapsUrl);
        setShowMapsPopup(true);
      } else if (jAddr && jAddr.trim()) {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(jAddr)}`;
        setMapsRedirectUrl(mapsUrl);
        setShowMapsPopup(true);
      }
    } catch(e) { toast("Assign karne mein error", "error"); }
  };

  const deleteJob = async (jobId) => {
    const ok = await confirm("Job Delete Karo?", "Yeh job permanently delete ho jaayega", { confirmLabel: "Delete", dangerMode: true });
    if (!ok) return;
    await apiFetch(`${API}/jobs/${jobId}`, { method: "DELETE", headers: authHeader() });
    fetchAll();
  };

  const cancelJob = async (jobId) => {
    const ok = await confirm("Job Cancel Karo?", "Job ka status CANCELLED ho jaayega. Technician ko WA bhejoge?", { confirmLabel: "Haan, Cancel Karo", dangerMode: true });
    if (!ok) return;
    try {
      await apiFetch(`${API}/jobs/${jobId}`, {
        method: "PUT", headers: authHeader(),
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      toast("Job cancel ho gaya", "success");
      fetchAll();
    } catch(e) { toast("Cancel nahi hua", "error"); }
  };

  const statusCounts = Object.keys(STATUS_LABEL).reduce((acc, k) => {
    acc[k] = jobs.filter(j => j.status === k).length;
    return acc;
  }, {});

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800 }}>Jobs</h2>
          <p style={{ fontSize:13, color:"#64748b", marginTop:2 }}>{jobs.length} total jobs</p>
        </div>
        <button onClick={() => { setShowForm(true); resetForm(); }}
          style={{ padding:"10px 20px", background:"#3b82f6", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
          + Naya Job Banao
        </button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {[["ALL","Sab",jobs.length], ...Object.entries(STATUS_LABEL).map(([k,v]) => [k, v.label, statusCounts[k]])].map(([k, label, cnt]) => (
          <button key={k} onClick={() => setFilterStatus(k)}
            style={{
              padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
              border: filterStatus===k ? "none" : "1px solid #e2e8f0",
              background: filterStatus===k ? "#3b82f6" : "#fff",
              color: filterStatus===k ? "#fff" : "#64748b",
            }}>
            {label}
            <span style={{ marginLeft:6, background: filterStatus===k ? "rgba(255,255,255,0.25)" : "#f1f5f9", padding:"1px 6px", borderRadius:10, fontSize:11 }}>{cnt || 0}</span>
          </button>
        ))}
      </div>

      {/* Search + Date filter */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",flex:1,minWidth:200}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14}}>🔍</span>
          <input placeholder="Customer naam, mobile, problem se dhundo..."
            value={jobSearch} onChange={e=>setJobSearch(e.target.value)}
            style={{width:"100%",padding:"9px 14px 9px 34px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          {jobSearch && <button onClick={()=>setJobSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:15}}>✕</button>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:12,color:"#64748b",fontWeight:600,whiteSpace:"nowrap"}}>📅 Date</span>
          <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}
            style={{padding:"8px 10px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:12,fontFamily:"inherit",color:"#475569"}}/>
          {dateFilter && <button onClick={()=>setDateFilter("")} style={{padding:"7px 12px",borderRadius:10,border:"1.5px solid #fca5a5",background:"rgba(239,68,68,0.06)",color:"#ef4444",fontSize:12,fontWeight:600,cursor:"pointer"}}>✕</button>}
        </div>
        {(jobSearch||dateFilter) && <div style={{fontSize:12,color:"#94a3b8",fontWeight:600,whiteSpace:"nowrap"}}>{filteredJobs.length} result{filteredJobs.length!==1?"s":""}</div>}
      </div>

      {/* Job Cards */}
      {listLoading ? (
        <div style={{ textAlign:"center", padding:"40px", color:"#94a3b8" }}>⚡ Loading...</div>
      ) : filteredJobs.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px", color:"#94a3b8", background:"#fff", borderRadius:16, border:"1px solid #e2e8f0" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <div style={{ fontWeight:700, color:"#64748b" }}>Koi job nahi</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filteredJobs.map(job => <JobCard key={job.id} job={job} jobs={jobs} technicians={technicians} onAssign={assignTechnician} onDelete={deleteJob} onCancel={cancelJob} companySettings={companySettings} />)}
        </div>
      )}

      {/* ── CREATE JOB FORM ── */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", display:"flex", alignItems: isMob ? "flex-end" : "center", justifyContent:"center", zIndex:9999 }}
          onClick={e => { if(e.target===e.currentTarget){setShowForm(false);resetForm();} }}
          /* touch handled by inner div */>
          <div style={{ background:"#fff", borderRadius: isMob ? "20px 20px 0 0" : 16, width:"100%", maxWidth: isMob ? "100%" : 620, height: isMob ? "93vh" : "86vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 -4px 40px rgba(0,0,0,0.2)" }}>

            {/* Modal header — fixed at top */}
            <div style={{ padding:"20px 24px", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#fff", borderRadius:"20px 20px 0 0", flexShrink:0 }}>
              <div style={{ fontSize:18, fontWeight:800 }}>🔧 Naya Job Banao</div>
              <button onClick={() => { setShowForm(false); resetForm(); }}
                style={{ width:32, height:32, borderRadius:8, background:"rgba(239,68,68,0.1)", border:"none", color:"#ef4444", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>

            {/* ── CUSTOMER SECTION — outside scroll div so dropdown is NEVER clipped ── */}
            <div style={{ padding:"0 24px 0", zIndex:50, position:"relative", background:"#fff", flexShrink:0 }}>
              <Section title="👤 Customer">
                {!selectedCus && (
                  <div>
                    {/* Search input */}
                    <div style={{ position:"relative" }}>
                      <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#94a3b8", pointerEvents:"none" }}>🔍</span>
                      <input
                        placeholder="Naam ya mobile type karo..."
                        value={cusSearch}
                        autoComplete="off"
                        onChange={e => {
                          const v = e.target.value;
                          setCusSearch(v);
                          setShowCusDrop(true);
                          if (/^\d/.test(v)) set("customerMobile", v.replace(/\D/g,""));
                          else set("customerName", v);
                        }}
                        onFocus={() => setShowCusDrop(true)}
                        style={{ ...inp, paddingLeft:36, width:"100%", boxSizing:"border-box" }}
                      />
                      {cusSearch && (
                        <button onClick={() => { setCusSearch(""); setIsNewCus(false); set("customerName",""); set("customerMobile",""); }}
                          style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:16 }}>✕</button>
                      )}
                    </div>

                    {/* INLINE dropdown — directly under input, never clipped */}
                    {showCusDrop && cusSearch.length >= 1 && (
                      <div style={{
                        marginTop:4, background:"#fff",
                        border:"1.5px solid #3b82f6", borderRadius:12,
                        boxShadow:"0 8px 24px rgba(59,130,246,0.15)",
                        overflow:"hidden"
                      }}>
                        {filteredCustomers.length > 0 && (
                          <>
                            <div style={{ padding:"7px 14px", fontSize:11, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", background:"#f8fafc", borderBottom:"1px solid #f1f5f9" }}>
                              📋 Existing Customers
                            </div>
                            {filteredCustomers.map(c => (
                              <div key={c.id}
                                onClick={() => { setSelectedCus(c); setShowCusDrop(false); setCusSearch(""); setIsNewCus(false); }}
                                style={{ padding:"11px 16px", cursor:"pointer", borderBottom:"1px solid #f1f5f9", background:"#fff" }}
                                onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
                                onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                                <div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div>
                                <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>📞 {c.mobile}{c.machineType ? " · "+c.machineType : ""}{c.machineBrand ? " "+c.machineBrand : ""}</div>
                              </div>
                            ))}
                          </>
                        )}
                        <div
                          onClick={() => { const v = cusSearch; setIsNewCus(true); setShowCusDrop(false); setCusSearch(""); if (!/^\d/.test(v)) set("customerName", v); else set("customerMobile", v); }}
                          style={{ padding:"12px 16px", cursor:"pointer", background:"rgba(59,130,246,0.04)", borderTop: filteredCustomers.length>0 ? "1.5px dashed #bfdbfe" : "none", color:"#3b82f6", fontWeight:700, fontSize:13 }}
                          onMouseEnter={e=>e.currentTarget.style.background="rgba(59,130,246,0.1)"}
                          onMouseLeave={e=>e.currentTarget.style.background="rgba(59,130,246,0.04)"}>
                          ➕ Naya Customer Banao
                          {filteredCustomers.length === 0 && <span style={{ color:"#64748b", fontWeight:400, marginLeft:6 }}>— koi match nahi mila</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {selectedCus && (
                  <div style={{ padding:"12px 16px", background:"rgba(16,185,129,0.07)", border:"1.5px solid rgba(16,185,129,0.3)", borderRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:15, color:"#065f46" }}>{selectedCus.name}</div>
                      <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>📞 {selectedCus.mobile}{selectedCus.address ? " · 📍 "+selectedCus.address : ""}</div>
                      {selectedCus.machineType && <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>🖥️ {selectedCus.machineType} {selectedCus.machineBrand}</div>}
                    </div>
                    <button onClick={() => { setSelectedCus(null); setCusSearch(""); }}
                      style={{ background:"none", border:"1px solid rgba(239,68,68,0.3)", color:"#ef4444", cursor:"pointer", fontSize:12, padding:"5px 10px", borderRadius:8, fontWeight:600 }}>Change</button>
                  </div>
                )}
              </Section>
            </div>

            {/* Scrollable form body */}
            <div style={{ padding:"16px 20px 24px", display:"flex", flexDirection:"column", gap:16, overflowY:"auto", flex:1, minHeight:0, WebkitOverflowScrolling:"touch" }}
              onTouchMove={e => e.stopPropagation()}>

              {/* ── NEW CUSTOMER FIELDS (inside scroll since no dropdown needed) ── */}
              {isNewCus && !selectedCus && (
                <div style={{ background:"rgba(59,130,246,0.04)", border:"1.5px solid rgba(59,130,246,0.2)", borderRadius:12, padding:14 }}>
                  <div style={{ fontSize:12, color:"#3b82f6", fontWeight:700, marginBottom:12 }}>🆕 Naya Customer Details</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <Field label="Naam *">
                      <input placeholder="Ramesh Kumar" value={form.customerName} onChange={e=>set("customerName",e.target.value)} style={inp} />
                    </Field>
                    <Field label="Mobile *">
                      <input placeholder="9876543210" maxLength={10} value={form.customerMobile}
                        onChange={e=>set("customerMobile",e.target.value.replace(/\D/g,""))} style={inp} />
                    </Field>
                    <div style={{ gridColumn:"1/-1" }}>
                      <Field label="📍 Address">
                        <div onClick={() => setShowMap(true)}
                          style={{ padding:"12px 14px", borderRadius:10, border:"2px dashed #cbd5e1", background:"#f8fafc", cursor:"pointer" }}
                          onMouseEnter={e=>e.currentTarget.style.borderColor="#3b82f6"}
                          onMouseLeave={e=>e.currentTarget.style.borderColor="#cbd5e1"}>
                          {form.customerAddress ? (
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <span>📍</span>
                              <div style={{ flex:1, fontWeight:600, fontSize:14 }}>{form.customerAddress}</div>
                              <span style={{ color:"#3b82f6", fontSize:12 }}>Change ›</span>
                            </div>
                          ) : (
                            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                              <span style={{ fontSize:22 }}>🗺️</span>
                              <div>
                                <div style={{ fontWeight:700, fontSize:13 }}>Map pe Pin Drop Karo</div>
                                <div style={{ fontSize:12, color:"#94a3b8" }}>Address auto-fill hoga</div>
                              </div>
                              <span style={{ marginLeft:"auto", fontSize:18, color:"#94a3b8" }}>›</span>
                            </div>
                          )}
                        </div>
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* ── MACHINE ── */}
              <Section title="🔧 Machine Details">
                {jobMachines.map((m, idx) => (
                  <div key={idx} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10,
                    marginBottom:8, padding:8, background:"#f8fafc", borderRadius:10,
                    border:"1px solid #e2e8f0", position:"relative" }}>
                    {jobMachines.length > 1 && (
                      <button onClick={() => removeMachineRow(idx)}
                        style={{ position:"absolute", top:6, right:6, background:"rgba(239,68,68,0.1)",
                          border:"none", color:"#ef4444", borderRadius:6, padding:"2px 7px",
                          cursor:"pointer", fontSize:11, fontWeight:700 }}>✕</button>
                    )}
                    <Field label={`Machine ${idx+1} Type${idx===0?" *":""}`}>
                      <select value={m.machineType}
                        onChange={e => setMachineField(idx,"machineType",e.target.value)}
                        style={inp}>
                        <option value="">-- Select --</option>
                        {MACHINE_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </Field>
                    <Field label="Brand">
                      <select value={m.machineBrand}
                        onChange={e => setMachineField(idx,"machineBrand",e.target.value)}
                        style={inp}>
                        <option value="">-- Select --</option>
                        {(MACHINE_BRANDS[m.machineType] || MACHINE_BRANDS["Other"]).map(b => <option key={b}>{b}</option>)}
                      </select>
                    </Field>
                  </div>
                ))}
                <button onClick={addMachineRow}
                  style={{ width:"100%", padding:"7px", border:"1.5px dashed #3b82f6",
                    background:"rgba(59,130,246,0.04)", color:"#3b82f6", borderRadius:9,
                    fontWeight:700, fontSize:12, cursor:"pointer" }}>
                  + Aur Ek Machine Add Karo
                </button>
              </Section>


              {/* ── PROBLEM ── */}
              <Section title="📝 Problem Details">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div style={{ gridColumn:"1/-1" }}>
                    <Field label="Problem Kya Hai? *">
                      <textarea placeholder="e.g. AC thanda nahi kar raha, washing machine spin nahi kar rahi..." rows={3}
                        value={form.problemDescription} onChange={e=>set("problemDescription",e.target.value)}
                        style={{ ...inp, resize:"vertical" }} />
                    </Field>
                  </div>
                  <Field label="Priority">
                    <select value={form.priority} onChange={e=>set("priority",e.target.value)} style={inp}>
                      <option value="NORMAL">Normal</option>
                      <option value="EMERGENCY">🚨 Emergency</option>
                    </select>
                  </Field>
                  <Field label="📅 Schedule Date">
                    <input type="date" value={form.scheduledDate} onChange={e=>set("scheduledDate",e.target.value)} style={inp} />
                  </Field>
                  <Field label="⏰ Schedule Time (Optional)">
                    {/* 12-hour AM/PM format — two selects */}
                    <div style={{ display:"flex", gap:6 }}>
                      <select
                        value={form.scheduledTime ? form.scheduledTime.split(" ")[0] : ""}
                        onChange={e => {
                          const hr  = e.target.value;
                          const ampm = form.scheduledTime?.split(" ")[1] || "AM";
                          set("scheduledTime", hr ? `${hr} ${ampm}` : "");
                        }}
                        style={{ ...inp, flex:1 }}>
                        <option value="">-- Time --</option>
                        {["1","2","3","4","5","6","7","8","9","10","11","12"].map(h => (
                          <option key={h} value={h}>{h}:00</option>
                        ))}
                      </select>
                      <select
                        value={form.scheduledTime ? (form.scheduledTime.split(" ")[1] || "AM") : "AM"}
                        onChange={e => {
                          const hr = form.scheduledTime?.split(" ")[0] || "";
                          set("scheduledTime", hr ? `${hr} ${e.target.value}` : "");
                        }}
                        style={{ ...inp, width:72, flexShrink:0 }}>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </Field>
                  <div style={{ gridColumn:"1/-1" }}>
                    <Field label="Notes (Optional)">
                      <input placeholder="Koi extra jaankari..." value={form.notes} onChange={e=>set("notes",e.target.value)} style={inp} />
                    </Field>
                  </div>
                </div>
              </Section>

              {/* ── TECHNICIAN ── */}
              <Section title="👷 Technician Assign Karo">
                {(() => {
                  const activeTechs = technicians.filter(t => t.isActive);
                  const offlineTechs = technicians.filter(t => !t.isActive);
                  if (activeTechs.length === 0) {
                    return (
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <div style={{ padding:"14px", background:"#fef2f2", borderRadius:10, color:"#ef4444", fontSize:13, fontWeight:600 }}>
                          🔴 Koi bhi technician Online nahi hai abhi
                        </div>
                        {offlineTechs.length > 0 && (
                          <div style={{fontSize:12,color:"#94a3b8",padding:"8px 12px",background:"#f8fafc",borderRadius:8,border:"1px solid #e2e8f0"}}>
                            Offline technicians: {offlineTechs.map(t=>t.name).join(", ")}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Free = no active (non-DONE/CANCELLED) job
                  const isTechBusy = (t) => jobs.some(j =>
                    j.technician?.id === t.id && !["DONE","CANCELLED"].includes(j.status)
                  );
                  const getActivJob = (t) => jobs.find(j =>
                    j.technician?.id === t.id && !["DONE","CANCELLED"].includes(j.status)
                  );

                  const freeTechs = activeTechs.filter(t => !isTechBusy(t));
                  const busyTechs = activeTechs.filter(t => isTechBusy(t));

                  // Sort free techs by distance if location set
                  const sortedFree = form.latitude && nearestTechs.length > 0
                    ? nearestTechs.filter(t => freeTechs.some(f => f.id === t.id))
                    : freeTechs.map(t => ({...t, dist:null, hasLoc:false}));

                  const allDisplay = [
                    ...sortedFree,
                    ...busyTechs.map(t => ({...t, dist:null, hasLoc:false}))
                  ];

                  return (
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {/* Summary bar */}
                      <div style={{display:"flex",gap:8,marginBottom:2}}>
                        {freeTechs.length > 0 && (
                          <div style={{padding:"5px 10px",background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:8,fontSize:11,color:"#065f46",fontWeight:700}}>
                            ✅ {freeTechs.length} Free
                          </div>
                        )}
                        {busyTechs.length > 0 && (
                          <div style={{padding:"5px 10px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,fontSize:11,color:"#92400e",fontWeight:700}}>
                            ⏳ {busyTechs.length} Busy
                          </div>
                        )}
                        {offlineTechs.length > 0 && (
                          <div style={{padding:"5px 10px",background:"rgba(100,116,139,0.08)",border:"1px solid rgba(100,116,139,0.2)",borderRadius:8,fontSize:11,color:"#64748b",fontWeight:700}}>
                            🔴 {offlineTechs.length} Offline
                          </div>
                        )}
                        {form.latitude && sortedFree.some(t=>t.hasLoc) && (
                          <div style={{padding:"5px 10px",background:"rgba(59,130,246,0.07)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:8,fontSize:11,color:"#3b82f6",fontWeight:700}}>
                            📍 Distance sorted
                          </div>
                        )}
                      </div>

                      {allDisplay.map((t, idx) => {
                        const busy      = isTechBusy(t);
                        const activeJob = busy ? getActivJob(t) : null;
                        const color     = techColor(t.name);
                        const isSelected = form.technicianId == t.id;
                        const isNearest = !busy && idx===0 && t.hasLoc;
                        const borderColor = isSelected ? "#3b82f6" : busy ? "#f59e0b" : isNearest ? "#10b981" : "#e2e8f0";
                        const bgColor = isSelected ? "rgba(59,130,246,0.06)" : busy ? "rgba(245,158,11,0.03)" : isNearest ? "rgba(16,185,129,0.04)" : "#fff";

                        return (
                          <div key={t.id} onClick={() => set("technicianId", isSelected ? "" : t.id)}
                            style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                              borderRadius:12, cursor:"pointer",
                              border: `2px solid ${borderColor}`,
                              background: bgColor,
                              transition:"all 0.15s", position:"relative",
                              opacity: busy && !isSelected ? 0.85 : 1 }}>

                            {isNearest && !busy && (
                              <div style={{position:"absolute",top:-8,left:12,padding:"2px 8px",background:"#10b981",color:"#fff",borderRadius:6,fontSize:10,fontWeight:700}}>
                                ⭐ Sabse Paas
                              </div>
                            )}
                            {busy && (
                              <div style={{position:"absolute",top:-8,left:12,padding:"2px 8px",background:"#f59e0b",color:"#fff",borderRadius:6,fontSize:10,fontWeight:700}}>
                                ⏳ Busy hai
                              </div>
                            )}

                            <div style={{ width:42,height:42,borderRadius:"50%",
                              background:`linear-gradient(135deg,${busy?"#f59e0b":color},${busy?"#d97706":color}bb)`,
                              color:"#fff",fontWeight:800,fontSize:17,
                              display:"flex",alignItems:"center",justifyContent:"center",
                              flexShrink:0,boxShadow:`0 2px 8px ${busy?"#f59e0b40":color+"40"}` }}>
                              {t.name?.[0]?.toUpperCase()}
                            </div>

                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontWeight:700,fontSize:14,color:"#1e293b"}}>{t.name}</div>
                              {busy && activeJob ? (
                                <div style={{fontSize:11,color:"#92400e",marginTop:1,fontWeight:600}}>
                                  🔧 {activeJob.customer?.name || activeJob.customerName || "Job"} · {{"ASSIGNED":"Assigned","ON_THE_WAY":"Raste Mein","IN_PROGRESS":"Kaam Chal Raha","DONE":"Complete"}[activeJob.status] || activeJob.status}
                                </div>
                              ) : (
                                <div style={{fontSize:11,color:"#10b981",marginTop:1,fontWeight:600}}>🟢 Online · Free hai · 📞 {t.mobile}</div>
                              )}
                              {busy && (
                                <div style={{fontSize:10,color:"#b45309",marginTop:2}}>
                                  ⚠️ Pehle wali job complete hone ke baad assign hoga
                                </div>
                              )}
                            </div>

                            {!busy && t.hasLoc && (
                              <div style={{textAlign:"right",flexShrink:0}}>
                                <div style={{fontWeight:800,fontSize:15,color:isNearest?"#059669":"#3b82f6"}}>{t.dist.toFixed(1)} km</div>
                                <div style={{fontSize:10,color:"#94a3b8",marginTop:1}}>door hai</div>
                              </div>
                            )}
                            {!busy && !t.hasLoc && (
                              <div style={{fontSize:10,color:"#94a3b8",textAlign:"right",flexShrink:0}}>
                                📡 Location<br/>unknown
                              </div>
                            )}

                            <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,
                              background: isSelected ? "#3b82f6" : busy ? "rgba(245,158,11,0.15)" : "#f1f5f9",
                              color: isSelected ? "#fff" : busy ? "#92400e" : "#94a3b8",
                              display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800}}>
                              {isSelected ? "✓" : busy ? "!" : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </Section>

              {/* Footer */}
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10, paddingTop:8, borderTop:"1px solid #e2e8f0" }}>
                <button onClick={() => { setShowForm(false); resetForm(); }}
                  style={{ padding:"10px 20px", borderRadius:10, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontWeight:600, cursor:"pointer" }}>
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  style={{ padding:"10px 24px", borderRadius:10, background:"#3b82f6", color:"#fff", border:"none", fontWeight:700, fontSize:14, cursor:"pointer", opacity:loading?0.7:1 }}>
                  {loading ? "⏳ Ban raha hai..." : "✅ Job Create Karo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp popup — after job create */}
      {waUrl && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10001 }}>
          <div style={{ background:"#fff", borderRadius:20, padding:32, maxWidth:380, width:"90%", textAlign:"center", boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize:56, marginBottom:12 }}>✅</div>
            <h3 style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>Job Create Ho Gaya!</h3>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:24 }}>Technician ko WhatsApp pe bhejo?</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={()=>openExternal(waUrl)} style={{ display:"block", padding:"14px", background:"#25d366", color:"#fff", borderRadius:12, fontWeight:800, fontSize:15, border:"none", cursor:"pointer", width:"100%" }}>
                💬 WhatsApp bhejo
              </button>
              <button onClick={() => { setWaUrl(""); setShowForm(false); resetForm(); }}
                style={{ padding:"12px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, fontWeight:600, color:"#64748b", cursor:"pointer" }}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Maps redirect popup */}
      {showMapsPopup && mapsRedirectUrl && (
        <div style={{ position:"fixed", inset:0, zIndex:99999, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:20, padding:28, maxWidth:340, width:"100%", textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🗺️</div>
            <div style={{ fontWeight:800, fontSize:18, color:"#1e293b", marginBottom:8 }}>Google Maps pe Navigate Karo?</div>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:20, lineHeight:1.5 }}>Technician ko customer ke ghar ka raasta dikhana hai?</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={() => { openExternal(mapsRedirectUrl); setShowMapsPopup(false); }}
                style={{ padding:"13px", borderRadius:12, background:"linear-gradient(135deg,#3b82f6,#2563eb)", color:"#fff", fontWeight:800, fontSize:14, border:"none", cursor:"pointer", display:"block", width:"100%" }}>
                🚗 Google Maps Kholo
              </button>
              <button onClick={() => setShowMapsPopup(false)}
                style={{ padding:"11px", borderRadius:12, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                Baad Mein
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-WA popup — after technician assigned, send to CUSTOMER */}
      {assignWaUrl && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10001 }}>
          <div style={{ background:"#fff", borderRadius:20, padding:28, maxWidth:380, width:"90%", textAlign:"center", boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize:48, marginBottom:10 }}>🎉</div>
            <h3 style={{ fontSize:18, fontWeight:800, marginBottom:6 }}>Technician Assign Ho Gaya!</h3>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>Customer ko confirm message bhejoge? Tech details aur schedule jayega.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={() => { openExternal(assignWaUrl); setAssignWaUrl(""); }}
                style={{ display:"block", padding:"13px", background:"#25d366", color:"#fff", borderRadius:12, fontWeight:800, fontSize:14, border:"none", cursor:"pointer", width:"100%" }}>
                💬 Customer ko WA bhejo
              </button>
              <button onClick={() => setAssignWaUrl("")}
                style={{ padding:"11px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, fontWeight:600, color:"#64748b", cursor:"pointer", fontSize:13 }}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Picker */}
      {showMap && (
        <LocationPicker
          address={form.customerAddress}
          latitude={form.latitude}
          longitude={form.longitude}
          onLocationSelect={({ address, latitude, longitude }) => {
            setForm(f => ({ ...f, customerAddress: address, latitude, longitude }));
            setShowMap(false);
            computeNearest(latitude, longitude);
          }}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job, onDelete, onCancel, technicians = [], jobs = [], onAssign, onAssignTech, companySettings }) {
  // Support both prop names
  const doAssign = onAssign || onAssignTech;
  const st = STATUS_LABEL[job.status] || STATUS_LABEL.NEW;
  const customerName = job.customer?.name || job.customerName || "Unknown";
  const mobile       = job.customer?.mobile || job.customerMobile;
  const address      = job.customer?.address || job.customerAddress;
  const [showAssign, setShowAssign] = useState(false);

  // A technician is "free" if they have no active (non-DONE/CANCELLED) jobs
  const freeTechs = technicians.filter(t => {
    if (!t.isActive) return false;
    const busy = jobs.some(j =>
      j.technician?.id === t.id &&
      !["DONE","CANCELLED"].includes(j.status) &&
      j.id !== job.id
    );
    return !busy;
  });

  const isOwnerActionable = ["NEW","ASSIGNED"].includes(job.status);
  const isNewJob = job.status === "NEW";

  return (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14,
      padding:16, boxShadow:"0 2px 8px rgba(0,0,0,0.05)", transition:"all 0.2s",
      borderLeft: job.priority==="EMERGENCY" ? "4px solid #ef4444" : "1px solid #e2e8f0" }}>
      {job.priority==="EMERGENCY" && (
        <div style={{ display:"inline-block", padding:"2px 10px", background:"rgba(239,68,68,0.1)", color:"#ef4444", borderRadius:20, fontSize:11, fontWeight:700, marginBottom:8 }}>🚨 EMERGENCY</div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", gap:12, marginBottom:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:800, marginBottom:3 }}>{customerName}</div>
          {mobile  && <div style={{ fontSize:12, color:"#64748b" }}>📞 {mobile}</div>}
          {address && <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>📍 {address}</div>}
          <div style={{ fontSize:13, color:"#475569", marginTop:6 }}>{job.problemDescription}</div>
          {(job.machineType||job.machineBrand) && <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>🖥️ {job.machineType} {job.machineBrand}</div>}
        </div>
        <div style={{ flexShrink:0, textAlign:"right", display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
          <div style={{ padding:"4px 12px", borderRadius:20, background:st.bg, color:st.color, fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{st.label}</div>
          {job.technician && <div style={{ fontSize:11, color:"#64748b" }}>👷 {job.technician.name}</div>}
          {job.scheduledDate && <div style={{ fontSize:11, color:"#94a3b8" }}>📅 {job.scheduledDate}</div>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ paddingTop:10, borderTop:"1px solid #f1f5f9" }}>

        {/* ASSIGNED status — show tech info, offer reassign */}
        {job.status === "ASSIGNED" && job.technician && (
          <div style={{ marginBottom:8, padding:"8px 12px", background:"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <div style={{ fontSize:13 }}>
              <span style={{ fontWeight:700, color:"#92400e" }}>👷 {job.technician.name}</span>
              <span style={{ color:"#64748b", marginLeft:8, fontSize:12 }}>assigned</span>
              {(job.scheduledDate||job.scheduledTime) && <span style={{ color:"#94a3b8", marginLeft:6, fontSize:12 }}>· 📅 {job.scheduledDate}{job.scheduledTime ? " "+job.scheduledTime : ""}</span>}
            </div>
            <button onClick={() => setShowAssign(v => !v)}
              style={{ padding:"4px 10px", borderRadius:8, border:"1px solid rgba(245,158,11,0.3)", background:"rgba(245,158,11,0.05)", color:"#d97706", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              {showAssign ? "✕" : "🔄 Re-assign"}
            </button>
          </div>
        )}

        {/* NEW job — show assign button */}
        {isNewJob && (
          <div style={{ marginBottom:showAssign?10:0 }}>
            {freeTechs.length === 0 ? (
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 12px", background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:8, fontSize:12, color:"#b45309", fontWeight:600 }}>
                ⏳ Waiting — koi free technician nahi
              </div>
            ) : (
              <button onClick={() => setShowAssign(v => !v)}
                style={{ padding:"6px 14px", background:showAssign?"#f1f5f9":"rgba(59,130,246,0.08)", border:"1.5px solid",borderColor:showAssign?"#cbd5e1":"rgba(59,130,246,0.3)", borderRadius:8, color:showAssign?"#64748b":"#3b82f6", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                {showAssign ? "✕ Band Karo" : `👷 Assign Karo (${freeTechs.length} free)`}
              </button>
            )}
          </div>
        )}

        {/* Free tech list - shown for NEW assign or ASSIGNED re-assign */}
        {showAssign && freeTechs.length > 0 && (
          <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em" }}>Free technicians:</div>
            {freeTechs.map(t => (
              <div key={t.id}
                onClick={() => { doAssign(job.id, t.id); setShowAssign(false); }}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:10, border:"1.5px solid #e2e8f0", cursor:"pointer", background:"#fff", transition:"all 0.15s" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor="#3b82f6"; e.currentTarget.style.background="rgba(59,130,246,0.04)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.background="#fff"; }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", color:"#fff", fontWeight:800, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {t.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:13 }}>{t.name}</div>
                  <div style={{ fontSize:11, color:"#10b981", fontWeight:600 }}>🟢 Online · Free · 📞 {t.mobile}</div>
                </div>
                <div style={{ marginLeft:"auto", fontSize:12, fontWeight:700, color:"#3b82f6" }}>Assign →</div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom row: WA + Cancel + Delete */}
        <div style={{ display:"flex", gap:8, alignItems:"center", marginTop: isOwnerActionable ? 8 : 0 }}>
          {mobile && (
            <button onClick={()=>openExternal("https://wa.me/91"+mobile+"?text="+encodeURIComponent("Aapki service ki update — "+(companySettings?.companyName||"Matoshree Enterprises")))}
              style={{ padding:"6px 12px", background:"rgba(37,211,102,0.1)", color:"#25d366", borderRadius:8, fontSize:12, fontWeight:600, border:"none", cursor:"pointer" }}>
              💬 WA
            </button>
          )}
          {/* Cancel — only for active jobs (not already done/cancelled) */}
          {!["DONE","CANCELLED"].includes(job.status) && (
            <button onClick={() => onCancel(job.id)}
              style={{ padding:"6px 10px", background:"rgba(245,158,11,0.08)", color:"#d97706", border:"1px solid rgba(245,158,11,0.2)", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600 }}>
              ✕ Cancel
            </button>
          )}
          <button onClick={() => onDelete(job.id)}
            style={{ padding:"6px 10px", background:"rgba(239,68,68,0.08)", color:"#ef4444", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, marginLeft:"auto" }}>
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────
const inp = {
  padding:"10px 14px", borderRadius:10, border:"1.5px solid #e2e8f0",
  background:"#fff", color:"#1e293b", fontSize:14, width:"100%",
  fontFamily:"inherit", outline:"none", boxSizing:"border-box"
};

function Section({ title, children }) {
  return (
    <div style={{ border:"1px solid #f1f5f9", borderRadius:12 }}>
      <div style={{ padding:"10px 16px", background:"#f8fafc", borderBottom:"1px solid #f1f5f9", fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em", borderRadius:"12px 12px 0 0" }}>{title}</div>
      <div style={{ padding:16 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <label style={{ fontSize:12, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</label>
      {children}
    </div>
  );
}
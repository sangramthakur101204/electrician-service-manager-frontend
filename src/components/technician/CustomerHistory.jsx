// src/components/CustomerHistory.jsx
import { useState, useEffect } from "react";
import { useToast } from "./Toast.jsx";
import {
  getCustomerMachines, addCustomerMachine, updateCustomerMachine, deleteCustomerMachine,
  getCustomerJobs, authHeader, apiFetch
} from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const MACHINE_TYPES = ["AC","Washing Machine","Water Purifier","Refrigerator","Microwave","Geyser","Fan","Motor Pump","Inverter","Other"];
const MACHINE_BRANDS = {
  "AC":              ["Voltas","Daikin","LG","Samsung","Hitachi","Blue Star","Carrier","Godrej","Haier","Panasonic","O General","Lloyd","Whirlpool","Other"],
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

const STATUS_META = {
  DONE:        { color:"#10b981", bg:"rgba(16,185,129,0.1)",  label:"Done ✅"       },
  PENDING:     { color:"#f59e0b", bg:"rgba(245,158,11,0.1)",  label:"Pending ⏳"    },
  ASSIGNED:    { color:"#3b82f6", bg:"rgba(59,130,246,0.1)",  label:"Assigned"      },
  ON_THE_WAY:  { color:"#3b82f6", bg:"rgba(59,130,246,0.1)",  label:"On The Way"    },
  IN_PROGRESS: { color:"#8b5cf6", bg:"rgba(139,92,246,0.1)",  label:"In Progress"   },
  CANCELLED:   { color:"#ef4444", bg:"rgba(239,68,68,0.1)",   label:"Cancelled ❌"  },
  NEW:         { color:"#6366f1", bg:"rgba(99,102,241,0.1)",  label:"New"           },
};

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}); }
  catch { return d; }
}

export default function CustomerHistory({ customer, onBack, onRefresh }) {
  const toast = useToast();
  const [machines,  setMachines]  = useState([]);
  const [jobs,      setJobs]      = useState([]);
  const [invoices,  setInvoices]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview | machines | history | invoices

  // Machine edit/add state
  const [editMachineId, setEditMachineId] = useState(null);
  const [machineForm,   setMachineForm]   = useState({machineType:"",machineBrand:"",model:"",serialNumber:"",notes:""});
  const [showAddMachine,setShowAddMachine]= useState(false);
  const [newMachine,    setNewMachine]    = useState({machineType:"",machineBrand:"",model:"",serialNumber:"",notes:""});
  const [savingMachine, setSavingMachine] = useState(false);

  useEffect(() => { if (customer) loadAll(); }, [customer?.id]);

  async function loadAll() {
    setLoading(true);
    try {
      const [mData, jData, invRes] = await Promise.all([
        getCustomerMachines(customer.id),
        getCustomerJobs(customer.id),
        apiFetch(`${API}/invoices/customer/${customer.id}`, { headers: authHeader() }),
      ]);
      setMachines(Array.isArray(mData) ? mData : []);
      setJobs(Array.isArray(jData)  ? jData  : []);
      const invData = invRes.ok ? await invRes.json() : [];
      setInvoices(Array.isArray(invData) ? invData.sort((a,b)=>new Date(b.invoiceDate||0)-new Date(a.invoiceDate||0)) : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function saveMachineEdit(id) {
    setSavingMachine(true);
    try {
      await updateCustomerMachine(customer.id, id, machineForm);
      await loadAll();
      setEditMachineId(null);
      toast("Machine updated ✅", "success");
    } catch(e) { toast(e.message, "error"); }
    finally { setSavingMachine(false); }
  }

  async function handleAddMachine() {
    if (!newMachine.machineType || !newMachine.machineBrand) {
      toast("Machine type aur brand zaroori hai", "warning"); return;
    }
    setSavingMachine(true);
    try {
      await addCustomerMachine(customer.id, newMachine);
      setNewMachine({machineType:"",machineBrand:"",model:"",serialNumber:"",notes:""});
      setShowAddMachine(false);
      await loadAll();
      toast("Machine add ho gaya ✅", "success");
    } catch(e) { toast(e.message, "error"); }
    finally { setSavingMachine(false); }
  }

  async function handleDeleteMachine(mId) {
    if (!window.confirm("Machine delete karna hai?")) return;
    try {
      await deleteCustomerMachine(customer.id, mId);
      await loadAll();
      toast("Machine delete ho gaya", "success");
    } catch(e) { toast(e.message, "error"); }
  }

  const inp = {
    width:"100%", padding:"9px 12px", borderRadius:9, border:"1.5px solid #e2e8f0",
    fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box",
  };

  // All machines: primary (from customer) + from CustomerMachine table
  const primaryMachine = (customer.machineType && customer.machineBrand) ? {
    id: "primary",
    machineType: customer.machineType,
    machineBrand: customer.machineBrand,
    model: customer.model,
    serialNumber: customer.serialNumber,
    isPrimary: true,
  } : null;
  const allMachines = primaryMachine
    ? [primaryMachine, ...machines]
    : machines;

  const doneJobs      = jobs.filter(j => j.status === "DONE");
  const totalRevenue  = invoices.filter(i=>i.paymentStatus==="PAID").reduce((s,i)=>s+(i.totalAmount||0),0);
  const pendingAmount = invoices.filter(i=>i.paymentStatus==="UNPAID").reduce((s,i)=>s+(i.totalAmount||0),0);

  const TABS = [
    { k:"overview",  label:"📊 Overview" },
    { k:"machines",  label:`🔧 Machines (${allMachines.length})` },
    { k:"history",   label:`📋 Service History (${jobs.length})` },
    { k:"invoices",  label:`💰 Invoices (${invoices.length})` },
  ];

  return (
    <div style={{ maxWidth:780, margin:"0 auto" }}>
      <style>{`
        .ch-card { background:#fff; border-radius:16px; border:1.5px solid #e2e8f0; padding:18px; margin-bottom:14px; }
        .ch-label { font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; }
        .ch-value { font-size:14px; font-weight:600; color:#1e293b; }
        .ch-grid { display:grid; gap:12px; }
        @media(min-width:500px){ .ch-grid-2{ grid-template-columns:1fr 1fr; } }
        @media(min-width:700px){ .ch-grid-3{ grid-template-columns:1fr 1fr 1fr; } }
      `}</style>

      {/* Back + Title */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={onBack}
          style={{ padding:"8px 16px", borderRadius:10, border:"1.5px solid #e2e8f0",
            background:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, color:"#374151" }}>
          ← Wapas
        </button>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, margin:0 }}>{customer.name}</h2>
          <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
            📞 {customer.mobile}
            {customer.address && <> · 📍 {customer.address.slice(0,40)}{customer.address.length>40?"...":""}</>}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:16 }}>
        {[
          { label:"Total Services", value: doneJobs.length, color:"#3b82f6", icon:"🔧" },
          { label:"Machines", value: allMachines.length, color:"#8b5cf6", icon:"🖥️" },
          { label:"Total Revenue", value:`₹${Math.round(totalRevenue).toLocaleString("en-IN")}`, color:"#10b981", icon:"💰" },
          { label:"Pending", value:`₹${Math.round(pendingAmount).toLocaleString("en-IN")}`, color: pendingAmount>0?"#ef4444":"#10b981", icon:"⏳" },
        ].map(s => (
          <div key={s.label} style={{ background:"#fff", borderRadius:14, border:"1.5px solid #e2e8f0",
            padding:"14px 16px", textAlign:"center" }}>
            <div style={{ fontSize:24, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontWeight:900, fontSize:18, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#94a3b8", fontWeight:600, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {TABS.map(t => (
          <button key={t.k} onClick={() => setActiveTab(t.k)}
            style={{ padding:"7px 14px", borderRadius:20, fontSize:12, fontWeight:700,
              cursor:"pointer", border:"none", transition:"all 0.15s",
              background: activeTab===t.k ? "#3b82f6" : "#f1f5f9",
              color: activeTab===t.k ? "#fff" : "#64748b",
              boxShadow: activeTab===t.k ? "0 2px 8px rgba(59,130,246,0.3)" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"#94a3b8" }}>⚡ Load ho raha hai...</div>
      ) : (
        <>
          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div>
              {/* Customer profile */}
              <div className="ch-card">
                <div style={{ fontSize:13, fontWeight:800, color:"#64748b", textTransform:"uppercase",
                  letterSpacing:".05em", marginBottom:14 }}>👤 Customer Profile</div>
                <div className="ch-grid ch-grid-3">
                  <div><div className="ch-label">Naam</div><div className="ch-value">{customer.name}</div></div>
                  <div><div className="ch-label">Mobile</div>
                    <a href={`tel:${customer.mobile}`} style={{ color:"#3b82f6", fontWeight:700, fontSize:14, textDecoration:"none" }}>
                      📞 {customer.mobile}
                    </a>
                  </div>
                  {customer.address && <div style={{ gridColumn:"1/-1" }}>
                    <div className="ch-label">Address</div>
                    <a href={customer.latitude&&customer.longitude
                        ? `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`
                        : `https://www.google.com/maps/search/${encodeURIComponent(customer.address)}`}
                      target="_blank" rel="noreferrer"
                      style={{ color:"#3b82f6", fontWeight:600, fontSize:14, textDecoration:"none" }}>
                      📍 {customer.address}
                    </a>
                  </div>}
                </div>
              </div>

              {/* Latest service */}
              {jobs.length > 0 && (() => {
                const latest = jobs[0];
                const sm = STATUS_META[latest.status] || STATUS_META.PENDING;
                return (
                  <div className="ch-card" style={{ borderLeft:`4px solid ${sm.color}` }}>
                    <div style={{ fontSize:13, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em", marginBottom:12 }}>
                      🔧 Last Service
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>
                          {latest.machineType} {latest.machineBrand}
                        </div>
                        <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{latest.problemDescription}</div>
                        <div style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>
                          📅 {fmtDate(latest.scheduledDate || latest.createdAt)}
                          {latest.technician?.name && ` · 👷 ${latest.technician.name}`}
                        </div>
                      </div>
                      <span style={{ padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700,
                        background:sm.bg, color:sm.color, flexShrink:0 }}>{sm.label}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Machines quick view */}
              {allMachines.length > 0 && (
                <div className="ch-card">
                  <div style={{ fontSize:13, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em", marginBottom:12 }}>
                    🖥️ Registered Machines
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {allMachines.map((m,i) => (
                      <div key={m.id} style={{ display:"flex", alignItems:"center", gap:12,
                        padding:"10px 12px", background:"#f8fafc", borderRadius:10,
                        border:"1px solid #e2e8f0" }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:"rgba(59,130,246,0.1)",
                          display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                          {m.machineType==="AC"?"❄️":m.machineType==="Refrigerator"?"🧊":m.machineType==="Washing Machine"?"🫧":
                           m.machineType==="Microwave"?"📡":m.machineType==="Geyser"?"🔥":"🔧"}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:14 }}>{m.machineType} — {m.machineBrand}</div>
                          <div style={{ fontSize:12, color:"#64748b" }}>
                            {m.model && `Model: ${m.model}`}{m.serialNumber && ` · S/N: ${m.serialNumber}`}
                          </div>
                        </div>
                        {m.isPrimary && <span style={{ fontSize:10, color:"#3b82f6", fontWeight:700,
                          background:"rgba(59,130,246,0.1)", padding:"2px 8px", borderRadius:6 }}>Primary</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MACHINES TAB ── */}
          {activeTab === "machines" && (
            <div>
              {allMachines.length === 0 && (
                <div style={{ textAlign:"center", padding:40, color:"#94a3b8", background:"#fff", borderRadius:16, border:"1.5px solid #e2e8f0" }}>
                  <div style={{ fontSize:48, marginBottom:10 }}>🔧</div>
                  <div style={{ fontWeight:700 }}>Koi machine registered nahi hai</div>
                </div>
              )}

              {allMachines.map(m => (
                <div key={m.id} className="ch-card">
                  {editMachineId === m.id ? (
                    // Edit form
                    <div>
                      <div style={{ fontWeight:800, fontSize:14, marginBottom:12 }}>✏️ Machine Edit Karo</div>
                      <div className="ch-grid ch-grid-2">
                        <div>
                          <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>Type</label>
                          <select style={inp} value={machineForm.machineType}
                            onChange={e=>setMachineForm(f=>({...f,machineType:e.target.value,machineBrand:""}))}>
                            {MACHINE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>Brand</label>
                          <select style={inp} value={machineForm.machineBrand}
                            onChange={e=>setMachineForm(f=>({...f,machineBrand:e.target.value}))}>
                            <option value="">-- Select --</option>
                            {(MACHINE_BRANDS[machineForm.machineType]||MACHINE_BRANDS["Other"]).map(b=><option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>Model</label>
                          <input style={inp} value={machineForm.model||""} onChange={e=>setMachineForm(f=>({...f,model:e.target.value}))} />
                        </div>
                        <div>
                          <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>Serial No.</label>
                          <input style={inp} value={machineForm.serialNumber||""} onChange={e=>setMachineForm(f=>({...f,serialNumber:e.target.value}))} />
                        </div>
                        <div style={{ gridColumn:"1/-1" }}>
                          <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>Notes</label>
                          <input style={inp} value={machineForm.notes||""} onChange={e=>setMachineForm(f=>({...f,notes:e.target.value}))} />
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8, marginTop:12 }}>
                        <button onClick={() => setEditMachineId(null)}
                          style={{ padding:"8px 16px", borderRadius:9, border:"1.5px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", fontWeight:600, fontSize:13, color:"#64748b" }}>
                          Cancel
                        </button>
                        <button onClick={() => saveMachineEdit(m.id)} disabled={savingMachine}
                          style={{ padding:"8px 20px", borderRadius:9, background:"#3b82f6", color:"#fff", border:"none", cursor:"pointer", fontWeight:700, fontSize:13 }}>
                          {savingMachine ? "Saving..." : "💾 Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ width:44, height:44, borderRadius:12, background:"rgba(59,130,246,0.1)",
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                        {m.machineType==="AC"?"❄️":m.machineType==="Refrigerator"?"🧊":m.machineType==="Washing Machine"?"🫧":
                         m.machineType==="Microwave"?"📡":m.machineType==="Geyser"?"🔥":"🔧"}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:15, color:"#1e293b" }}>
                          {m.machineType} — {m.machineBrand}
                          {m.isPrimary && <span style={{ marginLeft:8, fontSize:10, color:"#3b82f6", fontWeight:700,
                            background:"rgba(59,130,246,0.1)", padding:"2px 8px", borderRadius:6 }}>Primary</span>}
                        </div>
                        {m.model && <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>Model: {m.model}</div>}
                        {m.serialNumber && <div style={{ fontSize:12, color:"#94a3b8" }}>S/N: {m.serialNumber}</div>}
                        {m.notes && <div style={{ fontSize:12, color:"#94a3b8", fontStyle:"italic" }}>{m.notes}</div>}
                      </div>
                      {!m.isPrimary && (
                        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                          <button onClick={() => { setEditMachineId(m.id); setMachineForm({machineType:m.machineType,machineBrand:m.machineBrand,model:m.model||"",serialNumber:m.serialNumber||"",notes:m.notes||""}); }}
                            style={{ padding:"7px 12px", background:"rgba(59,130,246,0.1)", border:"none", borderRadius:8, cursor:"pointer", color:"#3b82f6", fontWeight:700, fontSize:12 }}>
                            ✏️
                          </button>
                          <button onClick={() => handleDeleteMachine(m.id)}
                            style={{ padding:"7px 12px", background:"rgba(239,68,68,0.1)", border:"none", borderRadius:8, cursor:"pointer", color:"#ef4444", fontWeight:700, fontSize:12 }}>
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add machine form */}
              {showAddMachine && (
                <div className="ch-card" style={{ border:"2px solid #3b82f6" }}>
                  <div style={{ fontWeight:800, fontSize:14, marginBottom:12, color:"#3b82f6" }}>+ Nayi Machine Add Karo</div>
                  <div className="ch-grid ch-grid-2">
                    <div>
                      <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>Type *</label>
                      <select style={inp} value={newMachine.machineType}
                        onChange={e=>setNewMachine(m=>({...m,machineType:e.target.value,machineBrand:""}))}>
                        <option value="">-- Select --</option>
                        {MACHINE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>Brand *</label>
                      <select style={inp} value={newMachine.machineBrand}
                        onChange={e=>setNewMachine(m=>({...m,machineBrand:e.target.value}))}>
                        <option value="">-- Select --</option>
                        {(MACHINE_BRANDS[newMachine.machineType]||MACHINE_BRANDS["Other"]).map(b=><option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>Model</label>
                      <input style={inp} placeholder="e.g. AC-1.5T" value={newMachine.model} onChange={e=>setNewMachine(m=>({...m,model:e.target.value}))} />
                    </div>
                    <div>
                      <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>Serial No.</label>
                      <input style={inp} placeholder="Serial number" value={newMachine.serialNumber} onChange={e=>setNewMachine(m=>({...m,serialNumber:e.target.value}))} />
                    </div>
                    <div style={{ gridColumn:"1/-1" }}>
                      <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>Notes</label>
                      <input style={inp} placeholder="Extra info..." value={newMachine.notes} onChange={e=>setNewMachine(m=>({...m,notes:e.target.value}))} />
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, marginTop:12 }}>
                    <button onClick={() => setShowAddMachine(false)}
                      style={{ padding:"8px 16px", borderRadius:9, border:"1.5px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", fontWeight:600, fontSize:13, color:"#64748b" }}>
                      Cancel
                    </button>
                    <button onClick={handleAddMachine} disabled={savingMachine}
                      style={{ padding:"8px 20px", borderRadius:9, background:"#10b981", color:"#fff", border:"none", cursor:"pointer", fontWeight:700, fontSize:13 }}>
                      {savingMachine ? "Adding..." : "✅ Add Machine"}
                    </button>
                  </div>
                </div>
              )}

              {!showAddMachine && (
                <button onClick={() => setShowAddMachine(true)}
                  style={{ width:"100%", padding:"12px", border:"2px dashed #3b82f6", background:"rgba(59,130,246,0.04)",
                    color:"#3b82f6", borderRadius:12, fontWeight:700, fontSize:14, cursor:"pointer" }}>
                  + Nayi Machine Add Karo
                </button>
              )}
            </div>
          )}

          {/* ── SERVICE HISTORY TAB ── */}
          {activeTab === "history" && (
            <div>
              {jobs.length === 0 ? (
                <div style={{ textAlign:"center", padding:40, color:"#94a3b8", background:"#fff", borderRadius:16, border:"1.5px solid #e2e8f0" }}>
                  <div style={{ fontSize:48, marginBottom:10 }}>📋</div>
                  <div style={{ fontWeight:700 }}>Koi service history nahi hai</div>
                  <div style={{ fontSize:13, marginTop:6 }}>Job create karne ke baad yahan dikhega</div>
                </div>
              ) : (
                <div style={{ position:"relative" }}>
                  {/* Timeline line */}
                  <div style={{ position:"absolute", left:20, top:0, bottom:0, width:2, background:"#e2e8f0", zIndex:0 }}/>

                  {jobs.map((job, idx) => {
                    const sm = STATUS_META[job.status] || STATUS_META.PENDING;
                    return (
                      <div key={job.id} style={{ position:"relative", paddingLeft:52, marginBottom:16 }}>
                        {/* Timeline dot */}
                        <div style={{ position:"absolute", left:12, top:18, width:18, height:18, borderRadius:"50%",
                          background:sm.color, border:"3px solid #fff", boxShadow:`0 0 0 2px ${sm.color}`, zIndex:1 }}/>

                        <div style={{ background:"#fff", borderRadius:14, border:`1.5px solid ${sm.color}30`,
                          borderLeft:`4px solid ${sm.color}`, padding:"14px 16px",
                          boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>

                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8, marginBottom:8 }}>
                            <div>
                              <div style={{ fontWeight:800, fontSize:15, color:"#1e293b" }}>
                                {job.machineType || "—"} {job.machineBrand && `— ${job.machineBrand}`}
                              </div>
                              <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>
                                📅 {fmtDate(job.scheduledDate || job.createdAt)}
                                {job.technician?.name && ` · 👷 ${job.technician.name}`}
                              </div>
                            </div>
                            <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                              background:sm.bg, color:sm.color, flexShrink:0 }}>{sm.label}</span>
                          </div>

                          {job.problemDescription && (
                            <div style={{ fontSize:13, color:"#374151", marginBottom:6,
                              padding:"8px 10px", background:"#f8fafc", borderRadius:8 }}>
                              🔧 {job.problemDescription}
                            </div>
                          )}

                          {job.priority === "EMERGENCY" && (
                            <div style={{ display:"inline-block", padding:"2px 8px", borderRadius:6,
                              background:"rgba(239,68,68,0.1)", color:"#ef4444", fontSize:11, fontWeight:700 }}>
                              🚨 EMERGENCY
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── INVOICES TAB ── */}
          {activeTab === "invoices" && (
            <div>
              {invoices.length === 0 ? (
                <div style={{ textAlign:"center", padding:40, color:"#94a3b8", background:"#fff", borderRadius:16, border:"1.5px solid #e2e8f0" }}>
                  <div style={{ fontSize:48, marginBottom:10 }}>💰</div>
                  <div style={{ fontWeight:700 }}>Koi invoice nahi hai</div>
                </div>
              ) : (
                <>
                  {/* Totals bar */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                    <div style={{ background:"rgba(16,185,129,0.07)", border:"1.5px solid rgba(16,185,129,0.2)",
                      borderRadius:12, padding:"12px 16px", textAlign:"center" }}>
                      <div style={{ fontWeight:900, fontSize:18, color:"#10b981" }}>
                        ₹{Math.round(totalRevenue).toLocaleString("en-IN")}
                      </div>
                      <div style={{ fontSize:12, color:"#065f46", fontWeight:600 }}>✅ Total Paid</div>
                    </div>
                    <div style={{ background: pendingAmount>0?"rgba(239,68,68,0.07)":"rgba(16,185,129,0.07)",
                      border:`1.5px solid ${pendingAmount>0?"rgba(239,68,68,0.2)":"rgba(16,185,129,0.2)"}`,
                      borderRadius:12, padding:"12px 16px", textAlign:"center" }}>
                      <div style={{ fontWeight:900, fontSize:18, color:pendingAmount>0?"#ef4444":"#10b981" }}>
                        ₹{Math.round(pendingAmount).toLocaleString("en-IN")}
                      </div>
                      <div style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>⏳ Pending</div>
                    </div>
                  </div>

                  {invoices.map(inv => (
                    <div key={inv.id} className="ch-card" style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:14, color:"#1e293b" }}>{inv.invoiceNumber}</div>
                        <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>
                          📅 {fmtDate(inv.invoiceDate)}
                          {inv.technicianName && ` · 👷 ${inv.technicianName}`}
                        </div>
                        <div style={{ display:"flex", gap:8, marginTop:6, alignItems:"center" }}>
                          <span style={{ fontWeight:900, fontSize:16, color:"#1e293b" }}>
                            ₹{Number(inv.totalAmount||0).toLocaleString("en-IN")}
                          </span>
                          <span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20,
                            background: inv.paymentStatus==="PAID"?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",
                            color: inv.paymentStatus==="PAID"?"#059669":"#ef4444" }}>
                            {inv.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
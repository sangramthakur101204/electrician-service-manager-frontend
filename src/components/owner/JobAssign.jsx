// src/components/owner/JobAssign.jsx
import { useState, useEffect, useRef } from "react";
import { getTechnicians, getAllCustomers, authHeader } from "../../services/api";
import LocationPicker from "../LocationPicker";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const MACHINE_TYPES = ["AC","Washing Machine","Water Purifier","Refrigerator","Microwave","Geyser","Fan","Motor Pump","Inverter","Other"];
const BRANDS        = ["LG","Samsung","Whirlpool","Voltas","Daikin","Godrej","Haier","Panasonic","Blue Star","Carrier","Other"];

const STATUS_LABEL = {
  NEW:         { label:"New",          color:"#6366f1", bg:"rgba(99,102,241,0.1)"  },
  ASSIGNED:    { label:"Assigned",     color:"#f59e0b", bg:"rgba(245,158,11,0.1)"  },
  ON_THE_WAY:  { label:"On The Way",   color:"#3b82f6", bg:"rgba(59,130,246,0.1)"  },
  IN_PROGRESS: { label:"In Progress",  color:"#8b5cf6", bg:"rgba(139,92,246,0.1)"  },
  DONE:        { label:"Done ✅",      color:"#10b981", bg:"rgba(16,185,129,0.1)"  },
  CANCELLED:   { label:"Cancelled",    color:"#ef4444", bg:"rgba(239,68,68,0.1)"   },
};

export default function JobAssign() {
  const [jobs,         setJobs]         = useState([]);
  const [technicians,  setTechnicians]  = useState([]);
  const [customers,    setCustomers]    = useState([]);
  const [showForm,     setShowForm]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [listLoading,  setListLoading]  = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [waUrl,        setWaUrl]        = useState("");
  const [showMap,      setShowMap]      = useState(false);

  // Customer selection
  const [cusMode,     setCusMode]     = useState("new"); // new | existing
  const [cusSearch,   setCusSearch]   = useState("");
  const [selectedCus, setSelectedCus] = useState(null);
  const [showCusDrop, setShowCusDrop] = useState(false);

  const [form, setForm] = useState({
    customerName:"", customerMobile:"", customerAddress:"",
    latitude: null, longitude: null,
    problemDescription:"", machineType:"", machineBrand:"",
    priority:"NORMAL", technicianId:"", scheduledDate:"", notes:"",
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setListLoading(true);
    try {
      const [j, t, c] = await Promise.all([
        fetch(`${API}/jobs`, { headers: authHeader() }).then(r => r.json()),
        getTechnicians(),
        getAllCustomers(),
      ]);
      setJobs(Array.isArray(j) ? j : []);
      setTechnicians(t);
      setCustomers(c);
    } catch (e) { console.error(e); }
    finally { setListLoading(false); }
  };

  const filteredCustomers = customers.filter(c => {
    const q = cusSearch.toLowerCase();
    return !q || c.name?.toLowerCase().includes(q) || c.mobile?.includes(q);
  }).slice(0, 8);

  const filteredJobs = filterStatus === "ALL" ? jobs : jobs.filter(j => j.status === filterStatus);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const resetForm = () => {
    setForm({ customerName:"", customerMobile:"", customerAddress:"", latitude:null, longitude:null,
              problemDescription:"", machineType:"", machineBrand:"",
              priority:"NORMAL", technicianId:"", scheduledDate:"", notes:"" });
    setSelectedCus(null); setCusSearch(""); setCusMode("new");
  };

  const handleSubmit = async () => {
    if (!form.problemDescription.trim()) { alert("Problem describe karo"); return; }
    if (cusMode === "new") {
      if (!form.customerName.trim())   { alert("Customer naam bharo"); return; }
      if (!/^\d{10}$/.test(form.customerMobile)) { alert("10-digit mobile bharo"); return; }
      if (!form.machineType)           { alert("Machine type select karo"); return; }
    }
    if (cusMode === "existing" && !selectedCus) { alert("Customer select karo"); return; }

    setLoading(true);
    try {
      const body = cusMode === "existing"
        ? { customerId: selectedCus.id, ...form }
        : { ...form };

      const res  = await fetch(`${API}/jobs`, {
        method: "POST", headers: authHeader(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Job create nahi hua");

      if (data.whatsappUrl) setWaUrl(data.whatsappUrl);
      else { setShowForm(false); resetForm(); }
      fetchAll();
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const updateStatus = async (jobId, status) => {
    await fetch(`${API}/jobs/${jobId}`, {
      method: "PUT", headers: authHeader(),
      body: JSON.stringify({ status }),
    });
    fetchAll();
  };

  const deleteJob = async (jobId) => {
    if (!confirm("Job delete karna hai?")) return;
    await fetch(`${API}/jobs/${jobId}`, { method: "DELETE", headers: authHeader() });
    fetchAll();
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
          {filteredJobs.map(job => <JobCard key={job.id} job={job} onStatus={updateStatus} onDelete={deleteJob} />)}
        </div>
      )}

      {/* ── CREATE JOB FORM ── */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:16, backdropFilter:"blur(4px)" }}>
          <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:640, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.18)" }}>

            {/* Modal header */}
            <div style={{ padding:"20px 24px", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:"#fff", zIndex:1 }}>
              <div style={{ fontSize:18, fontWeight:800 }}>🔧 Naya Job Banao</div>
              <button onClick={() => { setShowForm(false); resetForm(); }}
                style={{ width:32, height:32, borderRadius:8, background:"rgba(239,68,68,0.1)", border:"none", color:"#ef4444", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>

            <div style={{ padding:24, display:"flex", flexDirection:"column", gap:20 }}>

              {/* ── CUSTOMER SECTION ── */}
              <Section title="👤 Customer">
                {/* Toggle */}
                <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                  {[["new","Naya Customer"], ["existing","Existing Customer"]].map(([m, label]) => (
                    <button key={m} onClick={() => { setCusMode(m); setSelectedCus(null); setCusSearch(""); }}
                      style={{ flex:1, padding:"9px", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer",
                        border: cusMode===m ? "2px solid #3b82f6" : "2px solid #e2e8f0",
                        background: cusMode===m ? "#eff6ff" : "#f8fafc",
                        color: cusMode===m ? "#3b82f6" : "#64748b" }}>
                      {label}
                    </button>
                  ))}
                </div>

                {cusMode === "new" ? (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <Field label="Naam *">
                      <input placeholder="Ramesh Kumar" value={form.customerName} onChange={e=>set("customerName",e.target.value)} style={inp} />
                    </Field>
                    <Field label="Mobile *">
                      <input placeholder="9876543210" maxLength={10} value={form.customerMobile}
                        onChange={e=>set("customerMobile",e.target.value.replace(/\D/g,""))} style={inp} />
                    </Field>
                    {/* Blinkit-style address */}
                    <div style={{ gridColumn:"1/-1" }}>
                      <Field label="📍 Address">
                        <div onClick={() => setShowMap(true)}
                          style={{ padding:"12px 14px", borderRadius:10, border:"2px dashed #cbd5e1", background:"#f8fafc", cursor:"pointer", transition:"all 0.2s" }}
                          onMouseEnter={e=>e.currentTarget.style.borderColor="#3b82f6"}
                          onMouseLeave={e=>e.currentTarget.style.borderColor="#cbd5e1"}>
                          {form.customerAddress ? (
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <span style={{ fontSize:20 }}>📍</span>
                              <div style={{ flex:1 }}>
                                <div style={{ fontWeight:600, fontSize:14 }}>{form.customerAddress}</div>
                                {form.latitude && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>📌 {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}</div>}
                              </div>
                              <span style={{ color:"#3b82f6", fontSize:12, fontWeight:600 }}>Change ›</span>
                            </div>
                          ) : (
                            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                              <span style={{ fontSize:28 }}>🗺️</span>
                              <div>
                                <div style={{ fontWeight:700, fontSize:14 }}>Map pe Pin Drop Karo</div>
                                <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>Blinkit style — address auto-fill hoga</div>
                              </div>
                              <span style={{ marginLeft:"auto", fontSize:20, color:"#94a3b8" }}>›</span>
                            </div>
                          )}
                        </div>
                      </Field>
                    </div>
                  </div>
                ) : (
                  <div style={{ position:"relative" }}>
                    <input placeholder="🔍 Naam ya mobile se search karo..."
                      value={cusSearch}
                      onChange={e => { setCusSearch(e.target.value); setShowCusDrop(true); }}
                      onFocus={() => setShowCusDrop(true)}
                      style={{ ...inp, width:"100%" }} />
                    {selectedCus && (
                      <div style={{ marginTop:8, padding:"10px 14px", background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:14 }}>
                        <div>
                          <strong>{selectedCus.name}</strong>
                          <span style={{ color:"#64748b", marginLeft:8 }}>📞 {selectedCus.mobile}</span>
                          {selectedCus.machineType && <span style={{ color:"#94a3b8", marginLeft:8, fontSize:12 }}>· {selectedCus.machineType}</span>}
                        </div>
                        <button onClick={() => setSelectedCus(null)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:16 }}>✕</button>
                      </div>
                    )}
                    {showCusDrop && cusSearch && (
                      <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, boxShadow:"0 8px 24px rgba(0,0,0,0.12)", zIndex:50, marginTop:4, maxHeight:200, overflowY:"auto" }}>
                        {filteredCustomers.length === 0 ? (
                          <div style={{ padding:"14px", textAlign:"center", color:"#94a3b8", fontSize:13 }}>Koi customer nahi mila</div>
                        ) : filteredCustomers.map(c => (
                          <div key={c.id} onClick={() => { setSelectedCus(c); setShowCusDrop(false); setCusSearch(""); }}
                            style={{ padding:"12px 16px", cursor:"pointer", borderBottom:"1px solid #f1f5f9", transition:"background 0.15s" }}
                            onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                            onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                            <div style={{ fontWeight:700 }}>{c.name}</div>
                            <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>📞 {c.mobile} · {c.machineType} {c.machineBrand}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Section>

              {/* ── MACHINE ── */}
              <Section title="🔧 Machine Details">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Field label="Machine Type *">
                    <select value={form.machineType} onChange={e=>set("machineType",e.target.value)} style={inp}>
                      <option value="">-- Select --</option>
                      {MACHINE_TYPES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Brand">
                    <select value={form.machineBrand} onChange={e=>set("machineBrand",e.target.value)} style={inp}>
                      <option value="">-- Select --</option>
                      {BRANDS.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </Field>
                </div>
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
                  <Field label="Schedule Date">
                    <input type="date" value={form.scheduledDate} onChange={e=>set("scheduledDate",e.target.value)} style={inp} />
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
                {technicians.filter(t => t.isActive).length === 0 ? (
                  <div style={{ padding:"14px", background:"#fef2f2", borderRadius:10, color:"#ef4444", fontSize:13 }}>Koi active technician nahi hai</div>
                ) : (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                    {technicians.filter(t=>t.isActive).map(t => (
                      <div key={t.id} onClick={() => set("technicianId", form.technicianId==t.id ? "" : t.id)}
                        style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                          padding:"12px 16px", borderRadius:12, cursor:"pointer", minWidth:80,
                          border: form.technicianId==t.id ? "2px solid #3b82f6" : "2px solid #e2e8f0",
                          background: form.technicianId==t.id ? "#eff6ff" : "#f8fafc",
                          transition:"all 0.2s" }}>
                        <div style={{ width:40, height:40, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", color:"#fff", fontWeight:800, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {t.name?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ fontSize:12, fontWeight:700, textAlign:"center" }}>{t.name}</div>
                        <div style={{ fontSize:10, color:"#94a3b8" }}>{t.mobile}</div>
                        {form.technicianId==t.id && <div style={{ fontSize:10, fontWeight:800, color:"#3b82f6" }}>✓ Selected</div>}
                      </div>
                    ))}
                  </div>
                )}
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

      {/* WhatsApp popup */}
      {waUrl && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
          <div style={{ background:"#fff", borderRadius:20, padding:32, maxWidth:380, width:"90%", textAlign:"center", boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize:56, marginBottom:12 }}>✅</div>
            <h3 style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>Job Create Ho Gaya!</h3>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:24 }}>Technician ko WhatsApp pe bhejo?</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <a href={waUrl} target="_blank" rel="noreferrer"
                style={{ display:"block", padding:"14px", background:"#25d366", color:"#fff", borderRadius:12, fontWeight:800, fontSize:15, textDecoration:"none" }}>
                💬 WhatsApp bhejo
              </a>
              <button onClick={() => { setWaUrl(""); setShowForm(false); resetForm(); }}
                style={{ padding:"12px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, fontWeight:600, color:"#64748b", cursor:"pointer" }}>
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
          }}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job, onStatus, onDelete }) {
  const st = STATUS_LABEL[job.status] || STATUS_LABEL.NEW;
  const customerName = job.customer?.name || job.customerName || "Unknown";
  const mobile       = job.customer?.mobile || job.customerMobile;
  const address      = job.customer?.address || job.customerAddress;

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
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", paddingTop:10, borderTop:"1px solid #f1f5f9", alignItems:"center" }}>
        <select defaultValue={job.status} onChange={e => onStatus(job.id, e.target.value)}
          style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#475569", fontSize:12, cursor:"pointer" }}>
          {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {mobile && (
          <a href={`https://wa.me/91${mobile}?text=${encodeURIComponent(`Aapki service ki update dena chahta tha — Matoshree Enterprises`)}`}
            target="_blank" rel="noreferrer"
            style={{ padding:"6px 12px", background:"rgba(37,211,102,0.1)", color:"#25d366", borderRadius:8, fontSize:12, fontWeight:600, textDecoration:"none" }}>
            💬 WA
          </a>
        )}
        <button onClick={() => onDelete(job.id)}
          style={{ padding:"6px 10px", background:"rgba(239,68,68,0.08)", color:"#ef4444", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, marginLeft:"auto" }}>
          🗑️ Delete
        </button>
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
    <div style={{ border:"1px solid #f1f5f9", borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"10px 16px", background:"#f8fafc", borderBottom:"1px solid #f1f5f9", fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em" }}>{title}</div>
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

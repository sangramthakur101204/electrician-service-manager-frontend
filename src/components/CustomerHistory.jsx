import { openExternal } from "../utils/openExternal";
// src/components/CustomerHistory.jsx
import { useState, useEffect } from "react";
import { useToast } from "./Toast.jsx";
import { getCustomerMachines, getCustomerJobs, authHeader, apiFetch } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const STATUS_META = {
  DONE:        { color:"#10b981", bg:"rgba(16,185,129,0.1)",  label:"Done ✅"      },
  PENDING:     { color:"#f59e0b", bg:"rgba(245,158,11,0.1)",  label:"Pending ⏳"   },
  ASSIGNED:    { color:"#3b82f6", bg:"rgba(59,130,246,0.1)",  label:"Assigned"     },
  ON_THE_WAY:  { color:"#3b82f6", bg:"rgba(59,130,246,0.1)",  label:"On The Way"   },
  IN_PROGRESS: { color:"#8b5cf6", bg:"rgba(139,92,246,0.1)",  label:"In Progress"  },
  CANCELLED:   { color:"#ef4444", bg:"rgba(239,68,68,0.1)",   label:"Cancelled ❌" },
  NEW:         { color:"#6366f1", bg:"rgba(99,102,241,0.1)",  label:"New"          },
};

const MACHINE_EMOJI = { "AC":"❄️","Refrigerator":"🧊","Washing Machine":"🫧","Microwave":"📡","Geyser":"🔥" };
function mIcon(type) { return MACHINE_EMOJI[type] || "🔧"; }

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}); }
  catch { return d; }
}

function fmtTime(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}); }
  catch { return ""; }
}

export default function CustomerHistory({ customer, onBack }) {
  const toast = useToast();
  const [machines,  setMachines]  = useState([]);
  const [jobs,      setJobs]      = useState([]);
  const [invoices,  setInvoices]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

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
      setInvoices(Array.isArray(invData)
        ? invData.sort((a,b)=>new Date(b.invoiceDate||0)-new Date(a.invoiceDate||0))
        : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  // Primary machine from customer + extra machines from CustomerMachine table
  const primaryMachine = (customer.machineType && customer.machineBrand) ? {
    id:"primary", machineType:customer.machineType, machineBrand:customer.machineBrand,
    model:customer.model, serialNumber:customer.serialNumber, isPrimary:true,
  } : null;
  const allMachines = primaryMachine ? [primaryMachine, ...machines] : machines;

  const doneJobs      = jobs.filter(j => j.status==="DONE");
  const totalRevenue  = invoices.filter(i=>i.paymentStatus==="PAID").reduce((s,i)=>s+(i.totalAmount||0),0);
  const pendingAmount = invoices.filter(i=>i.paymentStatus==="UNPAID").reduce((s,i)=>s+(i.totalAmount||0),0);

  const TABS = [
    { k:"overview", label:"📊 Overview" },
    { k:"machines", label:`🔧 Machines (${allMachines.length})` },
    { k:"history",  label:`📋 History (${jobs.length})` },
    { k:"invoices", label:`💰 Invoices (${invoices.length})` },
  ];

  const card = {
    background:"#fff", borderRadius:14, border:"1.5px solid #e2e8f0",
    padding:"14px 16px", marginBottom:12,
  };

  return (
    <div style={{ maxWidth:760, margin:"0 auto" }}>
      <style>{`
        .ch-label { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; }
        .ch-value { font-size:14px; font-weight:600; color:#1e293b; }
        .ch-grid2 { display:grid; gap:12px; }
        .ch-grid3 { display:grid; gap:12px; }
        @media(min-width:480px){ .ch-grid2 { grid-template-columns:1fr 1fr; } }
        @media(min-width:600px){ .ch-grid3 { grid-template-columns:1fr 1fr 1fr; } }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
        <button onClick={onBack} style={{ padding:"8px 14px", borderRadius:10,
          border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer",
          fontWeight:700, fontSize:13, color:"#374151", flexShrink:0 }}>← Wapas</button>
        <div style={{ minWidth:0 }}>
          <h2 style={{ fontSize:17, fontWeight:800, margin:0 }}>{customer.name}</h2>
          <div style={{ fontSize:12, color:"#64748b", marginTop:2, overflow:"hidden",
            textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            📞 {customer.mobile}
            {customer.address && ` · 📍 ${customer.address.slice(0,40)}${customer.address.length>40?"...":""}`}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",
        gap:8, marginBottom:14 }}>
        {[
          { label:"Services Done", value:doneJobs.length, color:"#3b82f6", icon:"🔧" },
          { label:"Machines",      value:allMachines.length, color:"#8b5cf6", icon:"🖥️" },
          { label:"Total Paid",    value:`₹${Math.round(totalRevenue).toLocaleString("en-IN")}`, color:"#10b981", icon:"💰" },
          { label:"Pending",       value:`₹${Math.round(pendingAmount).toLocaleString("en-IN")}`, color:pendingAmount>0?"#ef4444":"#10b981", icon:"⏳" },
        ].map(s=>(
          <div key={s.label} style={{ background:"#fff", borderRadius:12,
            border:"1.5px solid #e2e8f0", padding:"12px 14px", textAlign:"center" }}>
            <div style={{ fontSize:22, marginBottom:3 }}>{s.icon}</div>
            <div style={{ fontWeight:900, fontSize:16, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:10, color:"#94a3b8", fontWeight:600, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setActiveTab(t.k)}
            style={{ padding:"6px 13px", borderRadius:20, fontSize:12, fontWeight:700,
              cursor:"pointer", border:"none", transition:"all 0.15s",
              background:activeTab===t.k?"#3b82f6":"#f1f5f9",
              color:activeTab===t.k?"#fff":"#64748b",
              boxShadow:activeTab===t.k?"0 2px 8px rgba(59,130,246,0.3)":"none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"#94a3b8" }}>⚡ Load ho raha hai...</div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {activeTab==="overview" && (
            <>
              <div style={card}>
                <div style={{ fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em", marginBottom:12 }}>👤 Customer Profile</div>
                <div className="ch-grid3">
                  <div><div className="ch-label">Naam</div><div className="ch-value">{customer.name}</div></div>
                  <div><div className="ch-label">Mobile</div>
                    <a href={`tel:${customer.mobile}`} style={{ color:"#3b82f6", fontWeight:700, fontSize:14, textDecoration:"none" }}>📞 {customer.mobile}</a>
                  </div>
                  {customer.address && (
                    <div style={{ gridColumn:"1/-1" }}>
                      <div className="ch-label">Address</div>
                      <button onClick={()=>openExternal(customer.latitude&&customer.longitude
                          ?`https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`
                          :`https://www.google.com/maps/search/${encodeURIComponent(customer.address)}`)}
                        style={{ color:"#3b82f6", fontWeight:600, fontSize:13, textDecoration:"none", background:"none", border:"none", cursor:"pointer" }}>
                        📍 {customer.address}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Machines quick view */}
              {allMachines.length>0 && (
                <div style={card}>
                  <div style={{ fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em", marginBottom:10 }}>🖥️ Machines</div>
                  {allMachines.map((m,i)=>(
                    <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10,
                      padding:"9px 10px", background:"#f8fafc", borderRadius:10,
                      border:"1px solid #e2e8f0", marginBottom:i<allMachines.length-1?6:0 }}>
                      <span style={{ fontSize:20 }}>{mIcon(m.machineType)}</span>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13 }}>{m.machineType} — {m.machineBrand}</div>
                        <div style={{ fontSize:11, color:"#94a3b8" }}>
                          {m.model&&`Model: ${m.model}`}{m.serialNumber&&` · S/N: ${m.serialNumber}`}
                        </div>
                      </div>
                      {m.isPrimary&&<span style={{ marginLeft:"auto", fontSize:10, color:"#3b82f6", fontWeight:700, background:"rgba(59,130,246,0.1)", padding:"2px 7px", borderRadius:5 }}>Primary</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Latest service */}
              {jobs.length>0 && (()=>{
                const j=jobs[0], sm=STATUS_META[j.status]||STATUS_META.PENDING;
                return (
                  <div style={{ ...card, borderLeft:`4px solid ${sm.color}` }}>
                    <div style={{ fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:".05em", marginBottom:10 }}>🔧 Last Service</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14 }}>{j.machineType} {j.machineBrand}</div>
                        <div style={{ fontSize:13, color:"#64748b", marginTop:3 }}>{j.problemDescription}</div>
                        <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>
                          📅 {fmtDate(j.scheduledDate||j.createdAt)}{j.technician?.name&&` · 👷 ${j.technician.name}`}
                        </div>
                      </div>
                      <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:sm.bg, color:sm.color }}>{sm.label}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Warranty info */}
              {customer.warrantyEnd && (
                <div style={{ ...card, background:"rgba(16,185,129,0.05)", border:"1.5px solid rgba(16,185,129,0.2)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:28 }}>🛡️</span>
                    <div>
                      <div style={{ fontWeight:800, fontSize:13, color:"#065f46" }}>Active Warranty</div>
                      <div style={{ fontSize:13, color:"#10b981", fontWeight:700, marginTop:2 }}>
                        Valid till {fmtDate(customer.warrantyEnd)} ({customer.warrantyPeriod})
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── MACHINES (read-only) ── */}
          {activeTab==="machines" && (
            <>
              {allMachines.length===0 ? (
                <div style={{ textAlign:"center", padding:40, color:"#94a3b8", background:"#fff",
                  borderRadius:14, border:"1.5px solid #e2e8f0" }}>
                  <div style={{ fontSize:42, marginBottom:8 }}>🔧</div>
                  <div style={{ fontWeight:700 }}>Koi machine registered nahi hai</div>
                </div>
              ) : allMachines.map(m=>(
                <div key={m.id} style={card}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:"rgba(59,130,246,0.08)",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                      {mIcon(m.machineType)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:14, color:"#1e293b" }}>
                        {m.machineType} — {m.machineBrand}
                        {m.isPrimary&&<span style={{ marginLeft:8, fontSize:10, color:"#3b82f6", fontWeight:700, background:"rgba(59,130,246,0.1)", padding:"2px 7px", borderRadius:5 }}>Primary</span>}
                      </div>
                      {m.model&&<div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>Model: {m.model}</div>}
                      {m.serialNumber&&<div style={{ fontSize:11, color:"#94a3b8" }}>S/N: {m.serialNumber}</div>}
                      {m.notes&&<div style={{ fontSize:11, color:"#94a3b8", fontStyle:"italic", marginTop:2 }}>{m.notes}</div>}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ padding:"10px 14px", background:"rgba(59,130,246,0.04)",
                border:"1.5px dashed rgba(59,130,246,0.2)", borderRadius:10,
                fontSize:12, color:"#64748b", textAlign:"center", marginTop:4 }}>
                💡 Nayi machine add karne ke liye Job create karte waqt machine select karo
              </div>
            </>
          )}

          {/* ── SERVICE HISTORY (timeline) ── */}
          {activeTab==="history" && (
            jobs.length===0 ? (
              <div style={{ textAlign:"center", padding:40, color:"#94a3b8", background:"#fff",
                borderRadius:14, border:"1.5px solid #e2e8f0" }}>
                <div style={{ fontSize:42, marginBottom:8 }}>📋</div>
                <div style={{ fontWeight:700 }}>Koi service history nahi hai</div>
                <div style={{ fontSize:12, marginTop:4 }}>Job create karne ke baad yahan dikhega</div>
              </div>
            ) : (
              <div style={{ position:"relative" }}>
                <div style={{ position:"absolute", left:22, top:0, bottom:0, width:2, background:"#e2e8f0" }}/>
                {jobs.map(job=>{
                  const sm=STATUS_META[job.status]||STATUS_META.PENDING;
                  return (
                    <div key={job.id} style={{ position:"relative", paddingLeft:54, marginBottom:14 }}>
                      <div style={{ position:"absolute", left:14, top:16, width:18, height:18,
                        borderRadius:"50%", background:sm.color, border:"3px solid #fff",
                        boxShadow:`0 0 0 2px ${sm.color}`, zIndex:1 }}/>
                      <div style={{ background:"#fff", borderRadius:12,
                        border:`1.5px solid ${sm.color}30`, borderLeft:`4px solid ${sm.color}`,
                        padding:"12px 14px", boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"flex-start", flexWrap:"wrap", gap:6, marginBottom:6 }}>
                          <div>
                            <div style={{ fontWeight:800, fontSize:14, color:"#1e293b" }}>
                              {job.machineType||"—"}{job.machineBrand&&` — ${job.machineBrand}`}
                            </div>
                            <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>
                              📅 {fmtDate(job.scheduledDate||job.createdAt)}
                              {job.technician?.name&&` · 👷 ${job.technician.name}`}
                            </div>
                          </div>
                          <span style={{ padding:"3px 9px", borderRadius:20, fontSize:10, fontWeight:700,
                            background:sm.bg, color:sm.color, flexShrink:0 }}>{sm.label}</span>
                        </div>
                        {job.problemDescription&&(
                          <div style={{ fontSize:12, color:"#374151",
                            padding:"7px 9px", background:"#f8fafc", borderRadius:8 }}>
                            🔧 {job.problemDescription}
                          </div>
                        )}
                        {job.priority==="EMERGENCY"&&(
                          <div style={{ marginTop:5, display:"inline-block", padding:"2px 8px",
                            borderRadius:6, background:"rgba(239,68,68,0.1)", color:"#ef4444",
                            fontSize:11, fontWeight:700 }}>🚨 EMERGENCY</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── INVOICES ── */}
          {activeTab==="invoices" && (
            invoices.length===0 ? (
              <div style={{ textAlign:"center", padding:40, color:"#94a3b8", background:"#fff",
                borderRadius:14, border:"1.5px solid #e2e8f0" }}>
                <div style={{ fontSize:42, marginBottom:8 }}>💰</div>
                <div style={{ fontWeight:700 }}>Koi invoice nahi hai</div>
              </div>
            ) : (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                  <div style={{ background:"rgba(16,185,129,0.07)", border:"1.5px solid rgba(16,185,129,0.2)",
                    borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
                    <div style={{ fontWeight:900, fontSize:17, color:"#10b981" }}>₹{Math.round(totalRevenue).toLocaleString("en-IN")}</div>
                    <div style={{ fontSize:11, color:"#065f46", fontWeight:600 }}>✅ Total Paid</div>
                  </div>
                  <div style={{ background:pendingAmount>0?"rgba(239,68,68,0.07)":"rgba(16,185,129,0.07)",
                    border:`1.5px solid ${pendingAmount>0?"rgba(239,68,68,0.2)":"rgba(16,185,129,0.2)"}`,
                    borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
                    <div style={{ fontWeight:900, fontSize:17, color:pendingAmount>0?"#ef4444":"#10b981" }}>₹{Math.round(pendingAmount).toLocaleString("en-IN")}</div>
                    <div style={{ fontSize:11, color:"#64748b", fontWeight:600 }}>⏳ Pending</div>
                  </div>
                </div>
                {invoices.map(inv=>(
                  <div key={inv.id} style={{ ...card, display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:13 }}>{inv.invoiceNumber}</div>
                      <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>
                        📅 {fmtDate(inv.invoiceDate)}{inv.technicianName&&` · 👷 ${inv.technicianName}`}
                      </div>
                      <div style={{ display:"flex", gap:8, marginTop:5, alignItems:"center" }}>
                        <span style={{ fontWeight:900, fontSize:15 }}>₹{Number(inv.totalAmount||0).toLocaleString("en-IN")}</span>
                        <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
                          background:inv.paymentStatus==="PAID"?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",
                          color:inv.paymentStatus==="PAID"?"#059669":"#ef4444" }}>
                          {inv.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )
          )}
        </>
      )}
    </div>
  );
}
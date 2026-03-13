// src/components/Reminders.jsx
import { openExternal, downloadBlob } from "../utils/openExternal";
import { useState, useEffect } from "react";
import { authHeader , apiFetch } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function Reminders({ expiring, customers, onRefresh }) {
  const [activeTab,    setActiveTab]    = useState("warranty");
  const [searchTerm,   setSearchTerm]   = useState("");
  const [sending,      setSending]      = useState(null);
  const [autoReminders,setAutoReminders]= useState([]);
  const [loadingAuto,  setLoadingAuto]  = useState(false);

  useEffect(() => { fetchAutoReminders(); }, []);

  const fetchAutoReminders = async () => {
    setLoadingAuto(true);
    try {
      const res  = await apiFetch(`${API}/reminders/warranty`, { headers: authHeader() });
      const data = await res.json();
      setAutoReminders(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoadingAuto(false); }
  };

  const pending  = customers.filter(c => c.serviceStatus === "PENDING");
  const today    = new Date();

  const daysLeft = (dateStr) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - today) / 86400000);
  };

  // Manual send one
  const sendOne = async (waUrl, id) => {
    setSending(id);
    openExternal(waUrl);
    await new Promise(r => setTimeout(r, 400));
    setSending(null);
  };

  // Auto send ALL — open each in sequence
  const sendAll = async (list) => {
    setSending("all");
    for (const item of list) {
      const url = item.waUrl || buildManualUrl(item);
      openExternal(url);
      await new Promise(r => setTimeout(r, 600));
    }
    setSending(null);
  };

  const buildManualUrl = (c) => {
    const msg = `Namaste ${c.name} ji! 🙏\n\nAapki ${c.machineType||""} (${c.machineBrand||""}) ki warranty ${daysLeft(c.warrantyEnd)} din mein expire hogi ⚠️\n\nDate: ${c.warrantyEnd}\n\n- Matoshree Enterprises`;
    return `https://wa.me/91${c.mobile}?text=${encodeURIComponent(msg)}`;
  };

  const buildServiceUrl = (c) => {
    const msg = `Namaste ${c.name} ji! 🙏\n\nAapki ${c.machineType||""} (${c.machineBrand||""}) ki service pending hai.\nJab bhi time mile, humse contact karein.\n\n- Matoshree Enterprises`;
    return `https://wa.me/91${c.mobile}?text=${encodeURIComponent(msg)}`;
  };

  const filteredExpiring = expiring.filter(c =>
    !searchTerm || c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.mobile?.includes(searchTerm)
  );
  const critical = filteredExpiring.filter(c => { const d = daysLeft(c.warrantyEnd); return d !== null && d <= 7; });
  const warning  = filteredExpiring.filter(c => { const d = daysLeft(c.warrantyEnd); return d !== null && d > 7 && d <= 30; });

  const tabs = [
    { id:"warranty", label:"Warranty Alerts",  count: expiring.length  },
    { id:"pending",  label:"Service Pending",   count: pending.length   },
    { id:"auto",     label:"Auto Reminders",    count: autoReminders.length },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        {[
          { label:"Critical (≤7 days)", val:critical.length, color:"#ef4444", bg:"rgba(239,68,68,0.06)", icon:"🚨" },
          { label:"Warning (≤30 days)", val:warning.length,  color:"#f59e0b", bg:"rgba(245,158,11,0.06)", icon:"⚠️" },
          { label:"Pending Service",    val:pending.length,  color:"#3b82f6", bg:"rgba(59,130,246,0.06)", icon:"⏳" },
        ].map((s,i)=>(
          <div key={i} style={{ background:"#fff", borderRadius:14, padding:18, border:`1px solid ${s.color}22`, borderTop:`3px solid ${s.color}`, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize:24, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:30, fontWeight:800, color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{ padding:"8px 18px", borderRadius:20, fontWeight:600, fontSize:13, cursor:"pointer",
              border: activeTab===t.id ? "none" : "1.5px solid #e2e8f0",
              background: activeTab===t.id ? "#3b82f6" : "#fff",
              color: activeTab===t.id ? "#fff" : "#64748b",
              display:"flex", alignItems:"center", gap:8 }}>
            {t.label}
            <span style={{ background: activeTab===t.id?"rgba(255,255,255,0.25)":"#f1f5f9", padding:"1px 7px", borderRadius:12, fontSize:11, fontWeight:700 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── WARRANTY TAB ── */}
      {activeTab==="warranty" && (
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:800 }}>🛡️ Warranty Alerts</div>
              <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>{filteredExpiring.length} customers expiring in 30 days</div>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <input placeholder="🔍 Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                style={{ padding:"8px 14px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#fff", color:"#1e293b", fontSize:13, width:160 }} />
              {filteredExpiring.length>0 && (
                <button onClick={()=>sendAll(filteredExpiring.map(c=>({...c,waUrl:buildManualUrl(c)})))}
                  disabled={sending==="all"}
                  style={{ padding:"9px 16px", background:"#25d366", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}>
                  {sending==="all" ? "⏳ Sending..." : `💬 Send All (${filteredExpiring.length})`}
                </button>
              )}
            </div>
          </div>

          {filteredExpiring.length===0 ? (
            <div style={{ padding:"48px", textAlign:"center", color:"#94a3b8" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
              <div style={{ fontWeight:700, color:"#64748b" }}>Koi warranty expiring nahi next 30 days mein!</div>
            </div>
          ) : (
            <div style={{ padding:16, display:"flex", flexDirection:"column", gap:8 }}>
              {critical.length>0 && <SectionLabel color="#ef4444" label="🚨 CRITICAL — 7 din ya kam" />}
              {critical.map(c=><ReminderCard key={c.id} c={c} days={daysLeft(c.warrantyEnd)} waUrl={buildManualUrl(c)} onSend={sendOne} sending={sending} />)}
              {warning.length>0 && <SectionLabel color="#f59e0b" label="⚠️ WARNING — 8–30 din" />}
              {warning.map(c=><ReminderCard key={c.id} c={c} days={daysLeft(c.warrantyEnd)} waUrl={buildManualUrl(c)} onSend={sendOne} sending={sending} />)}
            </div>
          )}
        </div>
      )}

      {/* ── SERVICE PENDING TAB ── */}
      {activeTab==="pending" && (
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:800 }}>⏳ Service Pending</div>
              <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>{pending.length} customers ka kaam baki hai</div>
            </div>
            {pending.length>0 && (
              <button onClick={()=>sendAll(pending.map(c=>({...c,waUrl:buildServiceUrl(c)})))}
                disabled={sending==="all"}
                style={{ padding:"9px 16px", background:"#25d366", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
                {sending==="all" ? "⏳ Sending..." : `💬 Send All (${pending.length})`}
              </button>
            )}
          </div>
          {pending.length===0 ? (
            <div style={{ padding:"48px", textAlign:"center", color:"#94a3b8" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
              <div style={{ fontWeight:700, color:"#64748b" }}>Koi pending service nahi!</div>
            </div>
          ) : (
            <div style={{ padding:16, display:"flex", flexDirection:"column", gap:8 }}>
              {pending.map(c=>(
                <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", borderRadius:12, border:"1px solid #fde68a", background:"rgba(245,158,11,0.04)", flexWrap:"wrap", gap:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#fff",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div>
                      <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>📞 {c.mobile} · {c.machineType} {c.machineBrand}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <a href={`tel:${c.mobile}`} style={{ padding:"7px 12px", background:"rgba(16,185,129,0.1)", color:"#059669", borderRadius:8, fontSize:12, fontWeight:600, textDecoration:"none" }}>📞 Call</a>
                    <button onClick={()=>sendOne(buildServiceUrl(c), c.id)} disabled={sending===c.id}
                      style={{ padding:"7px 14px", background:"#25d366", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      {sending===c.id ? "..." : "💬 WhatsApp"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AUTO REMINDERS TAB ── */}
      {activeTab==="auto" && (
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:800 }}>🤖 Auto Reminders</div>
              <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>Backend daily 9 AM check karta hai — ready list</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={fetchAutoReminders}
                style={{ padding:"8px 14px", borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", color:"#3b82f6", fontWeight:600, fontSize:13, cursor:"pointer" }}>
                🔄 Refresh
              </button>
              {autoReminders.length>0 && (
                <button onClick={()=>sendAll(autoReminders)} disabled={sending==="all"}
                  style={{ padding:"9px 16px", background:"#25d366", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
                  {sending==="all" ? "⏳ Sending..." : `💬 Send All (${autoReminders.length})`}
                </button>
              )}
            </div>
          </div>

          {/* Info banner */}
          <div style={{ margin:16, padding:"12px 16px", background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.15)", borderRadius:10, fontSize:13, color:"#3b82f6" }}>
            <strong>ℹ️ Kaise kaam karta hai:</strong> Backend har roz subah 9 baje automatically check karta hai. Yahan aakar "Send All" dabao — sab customers ko WhatsApp ek click mein chala jaayega.
          </div>

          {loadingAuto ? (
            <div style={{ padding:"40px", textAlign:"center", color:"#94a3b8" }}>Loading...</div>
          ) : autoReminders.length===0 ? (
            <div style={{ padding:"48px", textAlign:"center", color:"#94a3b8" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
              <div style={{ fontWeight:700, color:"#64748b" }}>Koi pending auto reminder nahi!</div>
            </div>
          ) : (
            <div style={{ padding:16, display:"flex", flexDirection:"column", gap:8 }}>
              {autoReminders.map(r=>(
                <div key={r.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", borderRadius:12, border:"1px solid #e2e8f0", background:"#f8fafc", flexWrap:"wrap", gap:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"#fff",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      {r.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{r.name}</div>
                      <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>📞 {r.mobile} · {r.machineType} · Expires: {r.warrantyEnd}</div>
                    </div>
                  </div>
                  <button onClick={()=>sendOne(r.waUrl, r.id)} disabled={sending===r.id}
                    style={{ padding:"7px 14px", background:"#25d366", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
                    {sending===r.id ? "..." : "💬 Send"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ color, label }) {
  return <div style={{ fontSize:11, fontWeight:700, color, textTransform:"uppercase", letterSpacing:"0.06em", padding:"4px 0" }}>{label}</div>;
}

function ReminderCard({ c, days, waUrl, onSend, sending }) {
  const isUrgent = days !== null && days <= 7;
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", borderRadius:12, border:`1px solid ${isUrgent?"rgba(239,68,68,0.2)":"rgba(245,158,11,0.2)"}`, background:isUrgent?"rgba(239,68,68,0.03)":"rgba(245,158,11,0.03)", flexWrap:"wrap", gap:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
        <div style={{ width:38,height:38,borderRadius:"50%",background:isUrgent?"linear-gradient(135deg,#ef4444,#dc2626)":"linear-gradient(135deg,#f59e0b,#d97706)",color:"#fff",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
          {c.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div>
          <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>📞 {c.mobile}</div>
          <div style={{ fontSize:11, color:"#94a3b8", marginTop:1 }}>{c.machineType} · {c.machineBrand} {c.model?`· ${c.model}`:""}</div>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
        <div style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:isUrgent?"rgba(239,68,68,0.1)":"rgba(245,158,11,0.1)", color:isUrgent?"#ef4444":"#d97706" }}>
          {days !== null ? (days < 0 ? "Expired!" : `${days} days left`) : "—"}
        </div>
        <div style={{ fontSize:11, color:"#94a3b8" }}>{c.warrantyEnd}</div>
        <div style={{ display:"flex", gap:6 }}>
          <a href={`tel:${c.mobile}`} style={{ padding:"6px 10px", background:"rgba(16,185,129,0.1)", color:"#059669", borderRadius:8, fontSize:12, fontWeight:600, textDecoration:"none" }}>📞</a>
          <button onClick={()=>onSend(waUrl, c.id)} disabled={sending===c.id}
            style={{ padding:"6px 12px", background:"#25d366", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
            {sending===c.id ? "..." : "💬 WA"}
          </button>
        </div>
      </div>
    </div>
  );
}
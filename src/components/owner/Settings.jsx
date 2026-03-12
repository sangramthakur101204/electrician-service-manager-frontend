// src/components/owner/Settings.jsx
import { useState, useEffect, useRef } from "react";
import { authHeader, apiFetch } from "../../services/api";
import { useToast } from "../Toast.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const MACHINE_TYPES = ["AC","Washing Machine","Water Purifier","Refrigerator","Microwave","Geyser","Fan","Motor Pump","Inverter","Other"];

const DEFAULT_RATE_CARD = {
  "AC":              ["Gas Filling (1 Ton): ₹1500","Gas Filling (1.5 Ton): ₹2000","PCB Repair: ₹800","Compressor Check: ₹500","Service/Cleaning: ₹400","Capacitor Replace: ₹300"],
  "Washing Machine": ["Motor Repair: ₹700","PCB Repair: ₹600","Belt Replace: ₹200","Pump Replace: ₹500","Drum Bearing: ₹800","Service/Cleaning: ₹400"],
  "Water Purifier":  ["Filter Change: ₹300","UV Lamp: ₹400","Membrane Replace: ₹800","Service: ₹200","Tank Cleaning: ₹250"],
  "Refrigerator":    ["Gas Filling: ₹1800","Compressor Replace: ₹3500","Thermostat: ₹400","PCB Repair: ₹600","Service/Cleaning: ₹350"],
  "Microwave":       ["Magnetron Replace: ₹1500","Door Switch: ₹200","Turntable Motor: ₹300","PCB Repair: ₹500","Service: ₹200"],
  "Geyser":          ["Element Replace: ₹400","Thermostat: ₹300","Safety Valve: ₹150","Tank Descaling: ₹300","Wiring Fix: ₹200"],
  "Fan":             ["Capacitor: ₹80","Motor Rewind: ₹400","Blade Set: ₹200","Regulator: ₹150","Service: ₹100"],
  "Motor Pump":      ["Winding: ₹600","Capacitor: ₹150","Shaft Seal: ₹200","Bearing: ₹250","Service: ₹200"],
  "Inverter":        ["Battery Replacement: ₹3500","PCB Repair: ₹700","Charger Repair: ₹400","Service: ₹200"],
  "Other":           ["Diagnosis: ₹200","Repair (Minor): ₹300","Repair (Major): ₹700","Service: ₹200"],
};

const inp = {
  padding:"10px 14px", borderRadius:10, border:"1.5px solid #e2e8f0",
  fontSize:14, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box",
};

const Section = ({ title, children, icon }) => (
  <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden" }}>
    <div style={{ padding:"14px 20px", borderBottom:"1px solid #f1f5f9", background:"#f8fafc", display:"flex", alignItems:"center", gap:10 }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span style={{ fontWeight:800, fontSize:15, color:"#1e293b" }}>{title}</span>
    </div>
    <div style={{ padding:"20px" }}>{children}</div>
  </div>
);

export default function Settings({ onLogout }) {
  const toast = useToast();
  const [tab,     setTab]     = useState("company");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [machTab, setMachTab] = useState("AC");

  const [s, setS] = useState({
    companyName:"", companyAddress:"", companyPhone:"",
    companyEmail:"", gstNumber:"", tagline:"",
    rateCardJson:"", invoiceMsgTemplate:"",
    assignedMsgTemplate:"", warrantyMsgTemplate:"", thankyouMsgTemplate:"",
    signatureBase64:"", linksJson:"",
  });
  const [rateCard, setRateCard] = useState(DEFAULT_RATE_CARD);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res  = await apiFetch(`${API}/settings`, { headers: authHeader() });
      const data = await res.json();
      setS(data);
      if (data.rateCardJson) {
        try { setRateCard({ ...DEFAULT_RATE_CARD, ...JSON.parse(data.rateCardJson) }); }
        catch(e) {}
      }
    } catch(e) {}
    finally { setLoading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...s, rateCardJson: JSON.stringify(rateCard) };
      const res  = await apiFetch(`${API}/settings`, {
        method:"PUT", headers: authHeader(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      toast("✅ Settings save ho gayi!", "success");
    } catch(e) { toast("Error: " + e.message, "error"); }
    finally { setSaving(false); }
  };

  const set = (k, v) => setS(p => ({ ...p, [k]: v }));

  const updateRateItem = (machine, idx, val) => {
    setRateCard(p => {
      const arr = [...(p[machine] || [])];
      arr[idx] = val;
      return { ...p, [machine]: arr };
    });
  };
  const addRateItem = (machine) => {
    setRateCard(p => ({ ...p, [machine]: [...(p[machine]||[]), "New Service: ₹0"] }));
  };
  const removeRateItem = (machine, idx) => {
    setRateCard(p => ({ ...p, [machine]: p[machine].filter((_,i)=>i!==idx) }));
  };

  const compName = s.companyName || "Matoshree Enterprises";

  if (loading) return <div style={{ textAlign:"center", padding:60, color:"#94a3b8", fontSize:16 }}>⚡ Loading settings...</div>;

  return (
    <div style={{ maxWidth:740, margin:"0 auto", display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, color:"#1e293b" }}>⚙️ Settings</div>
          <div style={{ fontSize:13, color:"#64748b", marginTop:3 }}>Company info, rate card, message templates</div>
        </div>
        <button onClick={save} disabled={saving}
          style={{ padding:"10px 24px", borderRadius:12, background:"linear-gradient(135deg,#3b82f6,#2563eb)", color:"#fff", border:"none", fontWeight:800, fontSize:14, cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1 }}>
          {saving ? "⏳ Saving..." : "💾 Save Karo"}
        </button>
      </div>

      {/* Tab Nav */}
      <div style={{ display:"flex", gap:8, borderBottom:"2px solid #f1f5f9", paddingBottom:0 }}>
        {[["company","🏢 Company"],["links","🔗 Links"],["ratecard","📋 Rate Card"],["messages","💬 Messages"],["signature","✍️ Signature"]].map(([k,label]) => (
          <button key={k} onClick={()=>setTab(k)}
            style={{ padding:"10px 16px", border:"none", cursor:"pointer", fontWeight:700, fontSize:13,
              background:"none", borderBottom: tab===k ? "2px solid #3b82f6" : "2px solid transparent",
              color: tab===k ? "#3b82f6" : "#64748b", marginBottom:-2, transition:"all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── COMPANY TAB ── */}
      {tab === "company" && (
        <Section title="Company Details" icon="🏢">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:6 }}>Company Name *</label>
              <input value={s.companyName} onChange={e=>set("companyName",e.target.value)}
                placeholder="Matoshree Enterprises" style={{ ...inp, fontSize:16, fontWeight:700 }} />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:6 }}>Company Address</label>
              <textarea value={s.companyAddress} onChange={e=>set("companyAddress",e.target.value)}
                placeholder="Shop No. 5, Main Road, Aurangabad - 431001" rows={2}
                style={{ ...inp, resize:"vertical" }} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:6 }}>Phone Number</label>
              <input value={s.companyPhone} onChange={e=>set("companyPhone",e.target.value)}
                placeholder="9876543210" style={inp} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:6 }}>Phone 2 (Optional)</label>
              <input value={s.companyPhone2||""} onChange={e=>set("companyPhone2",e.target.value)}
                placeholder="Dusra number (optional)" style={inp} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:6 }}>Email (Optional)</label>
              <input value={s.companyEmail} onChange={e=>set("companyEmail",e.target.value)}
                placeholder="info@matoshree.com" style={inp} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:6 }}>GST Number (Optional)</label>
              <input value={s.gstNumber} onChange={e=>set("gstNumber",e.target.value.toUpperCase())}
                placeholder="27AABCU9603R1ZX" maxLength={15} style={inp} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:6 }}>Tagline (Optional)</label>
              <input value={s.tagline} onChange={e=>set("tagline",e.target.value)}
                placeholder="Your trusted appliance repair service" style={inp} />
            </div>
          </div>
          <div style={{ marginTop:16, padding:14, background:"rgba(59,130,246,0.05)", borderRadius:10, border:"1px solid rgba(59,130,246,0.15)", fontSize:12, color:"#3b82f6" }}>
            💡 Company name aur address invoice PDF mein, warranty card mein, aur sab WhatsApp messages mein use hoga.
          </div>
        </Section>
      )}

      {/* ── RATE CARD TAB ── */}
      {tab === "ratecard" && (
        <Section title="Rate Card — Machine Type Wise" icon="📋">
          {/* Machine type tabs */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
            {MACHINE_TYPES.map(m => (
              <button key={m} onClick={()=>setMachTab(m)}
                style={{ padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
                  border: machTab===m ? "none" : "1.5px solid #e2e8f0",
                  background: machTab===m ? "#3b82f6" : "#f8fafc",
                  color: machTab===m ? "#fff" : "#64748b" }}>
                {m}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {(rateCard[machTab]||[]).map((item, idx) => (
              <div key={idx} style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input value={item} onChange={e=>updateRateItem(machTab,idx,e.target.value)}
                  style={{ ...inp, flex:1, fontSize:13 }}
                  placeholder="Service Name: ₹Price" />
                <button onClick={()=>removeRateItem(machTab,idx)}
                  style={{ padding:"8px 12px", borderRadius:8, border:"none", background:"rgba(239,68,68,0.1)", color:"#ef4444", cursor:"pointer", fontWeight:700, flexShrink:0 }}>
                  ✕
                </button>
              </div>
            ))}
            <button onClick={()=>addRateItem(machTab)}
              style={{ padding:"10px", borderRadius:10, border:"2px dashed #cbd5e1", background:"#f8fafc", color:"#64748b", cursor:"pointer", fontWeight:600, fontSize:13 }}>
              + Add Service
            </button>
          </div>

          <div style={{ marginTop:16, padding:14, background:"rgba(16,185,129,0.05)", borderRadius:10, border:"1px solid rgba(16,185,129,0.15)", fontSize:12, color:"#059669" }}>
            💡 Jab tech job create karta hai invoice mein, {machTab} select karne pe ye services auto-suggest hongji. Rate card tab bhi yahan manage karo.
          </div>
        </Section>
      )}

      {/* ── MESSAGES TAB ── */}
      {tab === "messages" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ padding:14, background:"rgba(245,158,11,0.07)", borderRadius:10, border:"1px solid rgba(245,158,11,0.2)", fontSize:12, color:"#92400e" }}>
            💡 Ye templates WhatsApp messages mein use honge. Variables: <strong>{"{customerName}"}</strong>, <strong>{"{techName}"}</strong>, <strong>{"{techMobile}"}</strong>, <strong>{"{machineType}"}</strong>, <strong>{"{scheduledDate}"}</strong>, <strong>{"{invoiceNo}"}</strong>, <strong>{"{total}"}</strong>, <strong>{"{warranty}"}</strong>, <strong>{"{companyName}"}</strong>
          </div>

          {[
            { key:"assignedMsgTemplate", label:"📅 Job Assigned → Customer ko msg", icon:"📅",
              placeholder:`🙏 Namaste {customerName} ji!\n\nAapka service request confirm ho gaya hai. ✅\n\n👷 Technician: {techName}\n📞 Tech Mobile: {techMobile}\n📅 Schedule: {scheduledDate}\n🔧 Machine: {machineType}\n\nKoi problem ho toh humse contact karein.\n\n- {companyName}` },
            { key:"invoiceMsgTemplate", label:"🧾 Invoice → Customer ko msg", icon:"🧾",
              placeholder:`🙏 Namaste {customerName} ji!\n\nAapki {machineType} ki service complete ho gayi. ✅\n\n🧾 Invoice No: {invoiceNo}\n💰 Total: {total}\n🛡️ Warranty: {warranty}\n\nDhanyawad aapka! 🙏\n\n- {companyName}` },
            { key:"warrantyMsgTemplate", label:"🛡️ Warranty Card → Customer ko msg", icon:"🛡️",
              placeholder:`🛡️ WARRANTY CARD\n\nCustomer: {customerName}\nMachine: {machineType}\nWarranty: {warranty}\n\nWarranty ke liye humara number save karein.\n\n- {companyName}` },
            { key:"thankyouMsgTemplate", label:"🙏 Thank You → Customer ko msg", icon:"🙏",
              placeholder:`🙏 Namaste {customerName} ji!\n\nAapka bahut bahut dhanyawad! 😊\nHamari service aapko pasand aayi hogi.\n\nKoi bhi problem aaye toh zaroor batao.\n\n- {companyName}` },
          ].map(({ key, label, placeholder }) => (
            <Section key={key} title={label} icon={label.split(" ")[0]}>
              <textarea
                value={s[key] || ""}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                rows={6}
                style={{ ...inp, resize:"vertical", fontFamily:"monospace", fontSize:12, lineHeight:1.6 }}
              />
              <div style={{ marginTop:8, fontSize:11, color:"#94a3b8" }}>
                Khali chhodo toh default message use hoga. Preview ke liye save karo.
              </div>
            </Section>
          ))}
        </div>
      )}

      {/* ── SIGNATURE TAB ── */}
      {/* ── LINKS TAB ── */}
      {tab === "links" && <LinksEditor value={s.linksJson} onChange={v=>set("linksJson",v)} onSave={save} saving={saving} settings={s} />}

      {tab === "signature" && <SignaturePad value={s.signatureBase64} onChange={v=>set("signatureBase64",v)} onSave={save} saving={saving} />}

      {/* ── LOGOUT BUTTON ── */}
      {onLogout && (
        <div style={{ padding:"24px 0 8px", borderTop:"1px solid #f1f5f9", marginTop:8 }}>
          <button onClick={onLogout}
            style={{ width:"100%", padding:"14px", background:"rgba(239,68,68,0.08)", color:"#ef4444", border:"1.5px solid rgba(239,68,68,0.2)", borderRadius:12, fontWeight:700, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SIGNATURE PAD COMPONENT
// ─────────────────────────────────────────────────────────
function SignaturePad({ value, onChange, onSave, saving }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const lastPos   = useRef(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Load existing signature onto canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0); setHasDrawn(true); };
      img.src = value;
    }
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    lastPos.current = pos;
    setHasDrawn(true);
    onChange(canvas.toDataURL("image/png"));
  };

  const stopDraw = (e) => { drawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange("");
  };

  return (
    <Section title="Haath Se Signature" icon="✍️">
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ fontSize:13, color:"#64748b", lineHeight:1.6 }}>
          Neeche apna haath se signature karo — har invoice ke PDF mein <strong>"Authorised Signature"</strong> ke neeche print hoga.
        </div>

        <div style={{ border:"2px solid #e2e8f0", borderRadius:12, overflow:"hidden",
          background:"#fff", position:"relative", touchAction:"none" }}>
          <canvas
            ref={canvasRef}
            width={600} height={180}
            style={{ width:"100%", height:180, display:"block", cursor:"crosshair" }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
          />
          {!hasDrawn && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
              justifyContent:"center", pointerEvents:"none" }}>
              <span style={{ color:"#cbd5e1", fontSize:15, fontWeight:600 }}>✍️ Yahan sign karo...</span>
            </div>
          )}
        </div>

        {value && !hasDrawn && (
          <div style={{ padding:12, background:"#f8fafc", borderRadius:10,
            border:"1px solid #e2e8f0", textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#94a3b8", marginBottom:6, fontWeight:700, textTransform:"uppercase" }}>Saved Signature</div>
            <img src={value} alt="signature" style={{ maxHeight:80, maxWidth:"100%",
              border:"1px solid #e2e8f0", borderRadius:6 }} />
          </div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={clearCanvas}
            style={{ padding:"9px 20px", borderRadius:10, border:"1.5px solid #e2e8f0",
              background:"#fff", color:"#64748b", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            🗑️ Clear
          </button>
          <button onClick={onSave} disabled={saving}
            style={{ flex:1, padding:"10px", borderRadius:10,
              background:"linear-gradient(135deg,#3b82f6,#2563eb)", color:"#fff",
              border:"none", fontWeight:800, fontSize:14,
              cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1 }}>
            {saving ? "⏳ Save ho raha hai..." : "💾 Signature Save Karo"}
          </button>
        </div>

        <div style={{ fontSize:12, color:"#94a3b8", padding:"10px 14px",
          background:"rgba(59,130,246,0.04)", borderRadius:8, border:"1px solid rgba(59,130,246,0.1)" }}>
          💡 <strong>Tip:</strong> Mouse ya touchscreen se sign karo. Save ke baad har nayi invoice PDF ke bottom-right mein dikhega.
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────
// LINKS EDITOR COMPONENT
// ─────────────────────────────────────────────────────────
function LinksEditor({ value, onChange, onSave, saving, settings }) {
  // Parse existing links
  const parse = (v) => {
    try { return JSON.parse(v || "[]"); } catch { return []; }
  };
  const [links, setLinksState] = useState(() => parse(value));

  // Sync to parent as JSON string whenever links change
  const update = (newLinks) => {
    setLinksState(newLinks);
    onChange(JSON.stringify(newLinks));
  };

  const addLink  = () => update([...links, { label:"", url:"" }]);
  const removeLink = (i) => update(links.filter((_,idx)=>idx!==i));
  const setField = (i, k, v) => update(links.map((l,idx)=>idx===i?{...l,[k]:v}:l));

  // Build WhatsApp footer preview
  const buildFooter = () => {
    const parts = [];
    if (settings.companyPhone)  parts.push(`📞 ${settings.companyPhone}`);
    if (settings.companyPhone2) parts.push(`📞 ${settings.companyPhone2}`);
    if (settings.companyEmail)  parts.push(`✉️ ${settings.companyEmail}`);
    if (settings.companyAddress) parts.push(`📍 ${settings.companyAddress}`);
    // Google Maps link for address
    if (settings.companyAddress) {
      const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(settings.companyAddress)}`;
      parts.push(`🗺️ ${mapsUrl}`);
    }
    links.filter(l=>l.url).forEach(l => parts.push(`🔗 ${l.label ? l.label+": " : ""}${l.url}`));
    return parts.join("\n");
  };

  const inp2 = {
    padding:"8px 12px", borderRadius:8, border:"1.5px solid #e2e8f0",
    fontSize:13, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Section title="Company Links" icon="🔗">
        <div style={{ fontSize:13, color:"#64748b", marginBottom:14, lineHeight:1.6 }}>
          Apni website, Google My Business, Instagram, YouTube — jo bhi links customer ko bhejne hain. Yeh WhatsApp messages ke footer mein automatically add honge.
        </div>

        {links.length === 0 && (
          <div style={{ textAlign:"center", padding:"24px 0", color:"#cbd5e1", fontSize:13 }}>
            Koi link nahi — "+ Link Add Karo" dabao
          </div>
        )}

        {links.map((l, i) => (
          <div key={i} style={{ display:"flex", gap:8, marginBottom:10, alignItems:"center" }}>
            <input
              placeholder="Label (e.g. Website, Instagram)"
              value={l.label}
              onChange={e=>setField(i,"label",e.target.value)}
              style={{ ...inp2, width:160, flexShrink:0 }}
            />
            <input
              placeholder="URL (https://...)"
              value={l.url}
              onChange={e=>setField(i,"url",e.target.value)}
              style={{ ...inp2, flex:1 }}
            />
            <button onClick={()=>removeLink(i)}
              style={{ padding:"8px 12px", border:"none", background:"rgba(239,68,68,0.1)",
                color:"#ef4444", borderRadius:8, cursor:"pointer", fontWeight:700, flexShrink:0 }}>
              ✕
            </button>
          </div>
        ))}

        <button onClick={addLink}
          style={{ width:"100%", padding:"9px", border:"1.5px dashed #3b82f6",
            background:"rgba(59,130,246,0.04)", color:"#3b82f6",
            borderRadius:9, fontWeight:700, fontSize:13, cursor:"pointer", marginBottom:16 }}>
          + Link Add Karo
        </button>

        {/* Footer preview */}
        <div style={{ background:"#f8fafc", borderRadius:10, padding:"12px 14px",
          border:"1px solid #e2e8f0" }}>
          <div style={{ fontSize:11, fontWeight:800, color:"#94a3b8", textTransform:"uppercase",
            letterSpacing:"0.05em", marginBottom:8 }}>
            📱 WhatsApp Message Footer Preview
          </div>
          <pre style={{ margin:0, fontSize:12, color:"#1e293b", whiteSpace:"pre-wrap",
            fontFamily:"monospace", lineHeight:1.7 }}>
{`— ${settings.companyName || "Company Name"}
${buildFooter() || "(Company details Settings > Company mein bharo)"}`}
          </pre>
        </div>

        <div style={{ fontSize:12, color:"#94a3b8", marginTop:8, padding:"8px 12px",
          background:"rgba(59,130,246,0.04)", borderRadius:8, border:"1px solid rgba(59,130,246,0.1)" }}>
          💡 Phone, Email, Address → Settings &gt; Company mein update karo. Yeh automatically footer mein aayenge. Google Maps link bhi auto-generate hoga address se.
        </div>

        <button onClick={onSave} disabled={saving}
          style={{ marginTop:14, width:"100%", padding:"11px", borderRadius:10,
            background:"linear-gradient(135deg,#3b82f6,#2563eb)", color:"#fff",
            border:"none", fontWeight:800, fontSize:14,
            cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1 }}>
          {saving ? "⏳ Save ho raha hai..." : "💾 Links Save Karo"}
        </button>
      </Section>
    </div>
  );
}
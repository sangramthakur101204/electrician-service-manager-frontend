// src/components/owner/Settings.jsx
import { useState, useEffect } from "react";
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

export default function Settings() {
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
        {[["company","🏢 Company"],["ratecard","📋 Rate Card"],["messages","💬 Messages"]].map(([k,label]) => (
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
    </div>
  );
}

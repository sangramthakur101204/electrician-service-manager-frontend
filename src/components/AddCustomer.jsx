// src/components/AddCustomer.jsx
import { toast } from "./Toast.jsx";
import { useState } from "react";
import { addCustomer, addCustomerMachine } from "../services/api";
import LocationPicker from "./LocationPicker";

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
const WARRANTY_PERIODS = ["3 months","6 months","1 year","2 years","3 years"];

const EMPTY_CUSTOMER = { name:"", mobile:"", address:"", latitude:"", longitude:"" };
const EMPTY_MACHINE  = () => ({ machineType:"", machineBrand:"", model:"", serialNumber:"", notes:"" });
const EMPTY_SERVICE  = {
  serviceDate: new Date().toISOString().split("T")[0],
  warrantyPeriod:"1 year", serviceDetails:"", serviceStatus:"DONE", notes:"",
};

export default function AddCustomer({ onSuccess }) {
  const [step,     setStep]    = useState(1); // 1=customer info, 2=machines, 3=service
  const [customer, setCustomer]= useState(EMPTY_CUSTOMER);
  const [machines, setMachines]= useState([EMPTY_MACHINE()]);
  const [service,  setService] = useState(EMPTY_SERVICE);
  const [loading,  setLoading] = useState(false);
  const [errors,   setErrors]  = useState({});
  const [showMap,  setShowMap] = useState(false);
  const [dupAlert, setDupAlert]= useState(null); // { existingId, existingName }

  const setC = (k,v) => { setCustomer(c=>({...c,[k]:v})); setErrors(e=>({...e,[k]:""})); };
  const setS = (k,v) => setService(s=>({...s,[k]:v}));
  const setM = (idx,k,v) => setMachines(ms => ms.map((m,i) => i===idx ? {...m,[k]:v, ...(k==="machineType"?{machineBrand:""}:{})} : m));

  const addMachineRow    = () => setMachines(ms => [...ms, EMPTY_MACHINE()]);
  const removeMachineRow = (idx) => setMachines(ms => ms.filter((_,i) => i!==idx));

  const calcWarrantyEnd = () => {
    if (!service.serviceDate || !service.warrantyPeriod) return "—";
    const d = new Date(service.serviceDate);
    if (service.warrantyPeriod==="3 months")  d.setMonth(d.getMonth()+3);
    else if (service.warrantyPeriod==="6 months") d.setMonth(d.getMonth()+6);
    else if (service.warrantyPeriod==="1 year")   d.setFullYear(d.getFullYear()+1);
    else if (service.warrantyPeriod==="2 years")  d.setFullYear(d.getFullYear()+2);
    else if (service.warrantyPeriod==="3 years")  d.setFullYear(d.getFullYear()+3);
    return d.toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"});
  };

  const validateStep1 = () => {
    const e = {};
    if (!customer.name.trim())             e.name="Naam zaroori hai";
    if (!/^\d{10}$/.test(customer.mobile)) e.mobile="10-digit mobile chahiye";
    setErrors(e); return Object.keys(e).length === 0;
  };
  const validateStep2 = () => {
    const e = {};
    machines.forEach((m,i) => {
      if (!m.machineType)  e[`mt${i}`]="Machine type select karo";
      if (!m.machineBrand) e[`mb${i}`]="Brand select karo";
    });
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!service.serviceDetails.trim()) { toast("Service details likhna zaroori hai", "warning"); return; }
    setLoading(true);
    try {
      // Step 1: Create customer (with first machine's type for backward compat)
      const firstM = machines[0];
      const custPayload = {
        ...customer,
        machineType:    firstM.machineType    || null,
        machineBrand:   firstM.machineBrand   || null,
        model:          firstM.model          || null,
        serialNumber:   firstM.serialNumber   || null,
        serviceDate:    service.serviceDate   || null,
        warrantyPeriod: service.warrantyPeriod|| null,
        serviceDetails: service.serviceDetails|| null,
        serviceStatus:  service.serviceStatus || "DONE",
        notes:          service.notes         || null,
      };
      const created = await addCustomer(custPayload);

      // Step 2: Add additional machines (2nd machine onwards)
      for (let i = 1; i < machines.length; i++) {
        const m = machines[i];
        if (m.machineType && m.machineBrand) {
          await addCustomerMachine(created.id, m);
        }
      }

      toast("✅ Customer add ho gaya!", "success");
      setCustomer(EMPTY_CUSTOMER); setMachines([EMPTY_MACHINE()]); setService(EMPTY_SERVICE); setStep(1);
      setTimeout(() => onSuccess?.(), 1000);
    } catch(err) {
      if (err.isDuplicate) {
        setDupAlert({ existingId: err.existingId, existingName: err.existingName });
      } else {
        toast("Error: " + err.message, "error");
      }
    }
    finally { setLoading(false); }
  };

  const inp = {
    width:"100%", padding:"11px 14px", borderRadius:10,
    border:"1.5px solid #e2e8f0", fontSize:14, fontFamily:"inherit",
    outline:"none", boxSizing:"border-box", background:"#fff",
  };
  const inpErr = { ...inp, borderColor:"#ef4444", background:"#fff5f5" };

  // ── Step progress bar ──
  const steps = ["👤 Customer","🔧 Machines","🛠️ Service"];

  return (
    <div style={{ maxWidth:620, margin:"0 auto" }}>
      <style>{`
        .ac-section { background:#fff; border-radius:16px; border:1.5px solid #e2e8f0; padding:20px; margin-bottom:16px; }
        .ac-section-title { font-size:14px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.06em; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
        .ac-label { font-size:13px; font-weight:700; color:#374151; margin-bottom:6px; display:block; }
        .ac-err { font-size:12px; color:#ef4444; margin-top:4px; }
        .ac-grid { display:grid; gap:14px; }
        @media(min-width:500px){ .ac-grid-2{ grid-template-columns:1fr 1fr; } }
      `}</style>

      {/* Progress steps */}
      <div style={{ display:"flex", gap:0, marginBottom:24 }}>
        {steps.map((s,i) => {
          const done = step > i+1, active = step === i+1;
          return (
            <div key={s} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
              <div style={{ width:"100%", display:"flex", alignItems:"center" }}>
                {i>0 && <div style={{ flex:1, height:3, background: done?"#3b82f6":"#e2e8f0", transition:"background 0.3s" }}/>}
                <div onClick={() => done && setStep(i+1)} style={{
                  width:32, height:32, borderRadius:"50%", flexShrink:0,
                  background: done?"#3b82f6" : active?"#3b82f6":"#e2e8f0",
                  color: done||active?"#fff":"#94a3b8",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:800, fontSize:13,
                  cursor: done?"pointer":"default", transition:"all 0.3s",
                  boxShadow: active?"0 0 0 4px rgba(59,130,246,0.2)":"none",
                }}>{done ? "✓" : i+1}</div>
                {i<steps.length-1 && <div style={{ flex:1, height:3, background: step>i+1?"#3b82f6":"#e2e8f0", transition:"background 0.3s" }}/>}
              </div>
              <div style={{ fontSize:11, marginTop:6, fontWeight:active?800:500, color:active?"#3b82f6":"#94a3b8", textAlign:"center" }}>
                {s}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: Customer Profile ── */}
      {step === 1 && (
        <>
          <div className="ac-section">
            <div className="ac-section-title">👤 Customer Ki Jaankari</div>
            <div className="ac-grid ac-grid-2">
              <div>
                <label className="ac-label">Naam *</label>
                <input style={errors.name ? inpErr : inp} placeholder="Ramesh Kumar"
                  value={customer.name} onChange={e=>setC("name",e.target.value)} />
                {errors.name && <div className="ac-err">{errors.name}</div>}
              </div>
              <div>
                <label className="ac-label">Mobile *</label>
                <input style={errors.mobile ? inpErr : inp} placeholder="9876543210"
                  maxLength={10} value={customer.mobile}
                  onChange={e=>setC("mobile",e.target.value.replace(/\D/g,""))} />
                {errors.mobile && <div className="ac-err">{errors.mobile}</div>}
              </div>
            </div>
          </div>

          <div className="ac-section">
            <div className="ac-section-title">📍 Customer Ki Location</div>
            <div style={{ borderRadius:10, border:"2px dashed #cbd5e1", padding:"14px 16px",
              background:"#f8fafc", cursor:"pointer" }}
              onClick={()=>setShowMap(true)}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#3b82f6"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="#cbd5e1"}>
              {customer.address ? (
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:22 }}>📍</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{customer.address}</div>
                    {customer.latitude && <div style={{ fontSize:12, color:"#3b82f6", marginTop:2 }}>
                      📌 {parseFloat(customer.latitude).toFixed(4)}, {parseFloat(customer.longitude).toFixed(4)}
                    </div>}
                  </div>
                  <span style={{ color:"#3b82f6", fontSize:13, fontWeight:600 }}>Change ›</span>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:24 }}>🗺️</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>Map pe Pin Drop Karo</div>
                    <div style={{ fontSize:12, color:"#94a3b8" }}>Ya manually address type karo</div>
                  </div>
                  <div style={{ marginLeft:"auto", fontSize:20, color:"#94a3b8" }}>›</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button onClick={() => validateStep1() && setStep(2)}
              style={{ padding:"12px 32px", background:"#3b82f6", color:"#fff", border:"none",
                borderRadius:12, fontWeight:800, fontSize:15, cursor:"pointer",
                boxShadow:"0 4px 12px rgba(59,130,246,0.3)" }}>
              Aage → Machines
            </button>
          </div>
        </>
      )}

      {/* ── STEP 2: Machines ── */}
      {step === 2 && (
        <>
          {machines.map((m, idx) => (
            <div key={idx} className="ac-section" style={{ position:"relative" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div className="ac-section-title" style={{ margin:0 }}>
                  🔧 Machine {idx+1}
                  {idx === 0 && <span style={{ fontSize:10, color:"#94a3b8", fontWeight:500, marginLeft:6 }}>(Primary)</span>}
                </div>
                {machines.length > 1 && (
                  <button onClick={() => removeMachineRow(idx)}
                    style={{ background:"rgba(239,68,68,0.1)", border:"none", color:"#ef4444",
                      borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:12, fontWeight:700 }}>
                    ✕ Hatao
                  </button>
                )}
              </div>

              <div className="ac-grid ac-grid-2">
                <div>
                  <label className="ac-label">Machine Type *</label>
                  <select style={errors[`mt${idx}`] ? inpErr : inp}
                    value={m.machineType}
                    onChange={e => setM(idx,"machineType",e.target.value)}>
                    <option value="">-- Select --</option>
                    {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors[`mt${idx}`] && <div className="ac-err">{errors[`mt${idx}`]}</div>}
                </div>
                <div>
                  <label className="ac-label">Brand *</label>
                  <select style={errors[`mb${idx}`] ? inpErr : inp}
                    value={m.machineBrand}
                    onChange={e => setM(idx,"machineBrand",e.target.value)}>
                    <option value="">-- Select --</option>
                    {(MACHINE_BRANDS[m.machineType] || MACHINE_BRANDS["Other"]).map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  {errors[`mb${idx}`] && <div className="ac-err">{errors[`mb${idx}`]}</div>}
                </div>
                <div>
                  <label className="ac-label">Model</label>
                  <input style={inp} placeholder="e.g. WM-6504T" value={m.model}
                    onChange={e=>setM(idx,"model",e.target.value)} />
                </div>
                <div>
                  <label className="ac-label">Serial Number</label>
                  <input style={inp} placeholder="Machine ka serial no." value={m.serialNumber}
                    onChange={e=>setM(idx,"serialNumber",e.target.value)} />
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label className="ac-label">Notes (Optional)</label>
                  <input style={inp} placeholder="e.g. 5 saal purani, compressor badla tha..."
                    value={m.notes} onChange={e=>setM(idx,"notes",e.target.value)} />
                </div>
              </div>
            </div>
          ))}

          {/* Add another machine */}
          <button onClick={addMachineRow}
            style={{ width:"100%", padding:"12px", border:"2px dashed #3b82f6",
              background:"rgba(59,130,246,0.04)", color:"#3b82f6", borderRadius:12,
              fontWeight:700, fontSize:14, cursor:"pointer", marginBottom:16 }}>
            + Aur Ek Machine Add Karo
          </button>

          <div style={{ display:"flex", gap:10, justifyContent:"space-between" }}>
            <button onClick={() => setStep(1)}
              style={{ padding:"12px 24px", background:"#f1f5f9", border:"1.5px solid #e2e8f0",
                borderRadius:12, fontWeight:700, fontSize:14, cursor:"pointer", color:"#64748b" }}>
              ← Wapas
            </button>
            <button onClick={() => validateStep2() && setStep(3)}
              style={{ padding:"12px 32px", background:"#3b82f6", color:"#fff", border:"none",
                borderRadius:12, fontWeight:800, fontSize:15, cursor:"pointer",
                boxShadow:"0 4px 12px rgba(59,130,246,0.3)" }}>
              Aage → Service
            </button>
          </div>
        </>
      )}

      {/* ── STEP 3: Service Record ── */}
      {step === 3 && (
        <>
          <div className="ac-section">
            <div className="ac-section-title">🛠️ Pehli Service Ki Details</div>
            <div className="ac-grid ac-grid-2">
              <div>
                <label className="ac-label">Service Date *</label>
                <input style={inp} type="date" value={service.serviceDate}
                  onChange={e=>setS("serviceDate",e.target.value)} />
              </div>
              <div>
                <label className="ac-label">Warranty Period</label>
                <select style={inp} value={service.warrantyPeriod}
                  onChange={e=>setS("warrantyPeriod",e.target.value)}>
                  <option value="">No Warranty</option>
                  {WARRANTY_PERIODS.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Warranty preview */}
              {service.warrantyPeriod && (
                <div style={{ gridColumn:"1/-1", padding:"10px 14px",
                  background:"rgba(16,185,129,0.07)", border:"1.5px solid rgba(16,185,129,0.2)",
                  borderRadius:10, display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:20 }}>🛡️</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:"#065f46" }}>Warranty Valid Rahegi</div>
                    <div style={{ fontSize:13, color:"#10b981", fontWeight:800 }}>{calcWarrantyEnd()} tak</div>
                  </div>
                </div>
              )}

              <div style={{ gridColumn:"1/-1" }}>
                <label className="ac-label">Kya Kaam Kiya? *</label>
                <textarea style={{ ...inp, resize:"vertical" }} rows={3}
                  placeholder="e.g. Compressor change kiya, Gas refill ki, PCB replace ki..."
                  value={service.serviceDetails}
                  onChange={e=>setS("serviceDetails",e.target.value)} />
              </div>

              <div>
                <label className="ac-label">Status</label>
                <select style={inp} value={service.serviceStatus}
                  onChange={e=>setS("serviceStatus",e.target.value)}>
                  <option value="DONE">✅ Done</option>
                  <option value="PENDING">⏳ Pending</option>
                </select>
              </div>

              <div>
                <label className="ac-label">Notes (Optional)</label>
                <input style={inp} placeholder="Extra remarks..." value={service.notes}
                  onChange={e=>setS("notes",e.target.value)} />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ background:"rgba(59,130,246,0.04)", border:"1.5px solid rgba(59,130,246,0.15)",
            borderRadius:14, padding:"14px 16px", marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:800, color:"#3b82f6", marginBottom:10, textTransform:"uppercase", letterSpacing:".05em" }}>
              📋 Summary
            </div>
            <div style={{ fontSize:13, color:"#374151", lineHeight:2 }}>
              <b>👤</b> {customer.name} · 📞 {customer.mobile}<br/>
              {customer.address && <><b>📍</b> {customer.address.slice(0,50)}{customer.address.length>50?"...":""}<br/></>}
              <b>🔧</b> {machines.length} machine{machines.length>1?"s":""}: {machines.map(m=>m.machineType+" "+m.machineBrand).join(", ")}
            </div>
          </div>

          <div style={{ display:"flex", gap:10, justifyContent:"space-between" }}>
            <button onClick={() => setStep(2)}
              style={{ padding:"12px 24px", background:"#f1f5f9", border:"1.5px solid #e2e8f0",
                borderRadius:12, fontWeight:700, fontSize:14, cursor:"pointer", color:"#64748b" }}>
              ← Wapas
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding:"12px 32px", background:loading?"#94a3b8":"#10b981", color:"#fff",
                border:"none", borderRadius:12, fontWeight:800, fontSize:15, cursor:loading?"not-allowed":"pointer",
                boxShadow: loading?"none":"0 4px 12px rgba(16,185,129,0.3)" }}>
              {loading ? "⏳ Save ho raha hai..." : "✅ Customer Save Karo"}
            </button>
          </div>
        </>
      )}

      {/* Duplicate alert modal */}
      {dupAlert && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", display:"flex",
          alignItems:"center", justifyContent:"center", zIndex:9999, padding:20 }}>
          <div style={{ background:"#fff", borderRadius:20, padding:28, maxWidth:380, width:"100%",
            textAlign:"center", boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize:52, marginBottom:12 }}>⚠️</div>
            <div style={{ fontWeight:800, fontSize:18, marginBottom:8 }}>Mobile Pehle Se Registered Hai!</div>
            <div style={{ fontSize:14, color:"#64748b", marginBottom:20, lineHeight:1.6 }}>
              Mobile <b>{customer.mobile}</b> already registered hai<br/>
              <b>{dupAlert.existingName}</b> ke naam se.
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={() => { setDupAlert(null); }}
                style={{ padding:"12px", background:"#3b82f6", color:"#fff", border:"none",
                  borderRadius:12, fontWeight:700, cursor:"pointer", fontSize:14 }}>
                ✏️ Mobile Number Change Karo
              </button>
              <button onClick={() => { setDupAlert(null); setLoading(true);
                // Force save even with duplicate
                addCustomer({ ...customer,
                  machineType: machines[0].machineType, machineBrand: machines[0].machineBrand,
                  model: machines[0].model, serialNumber: machines[0].serialNumber,
                  serviceDate: service.serviceDate, warrantyPeriod: service.warrantyPeriod,
                  serviceDetails: service.serviceDetails, serviceStatus: service.serviceStatus,
                  notes: service.notes, _forceDuplicate: true
                }).then(created => {
                  // Add extra machines
                  const extras = machines.slice(1).filter(m=>m.machineType&&m.machineBrand);
                  return Promise.all(extras.map(m => addCustomerMachine(created.id, m)));
                }).then(() => {
                  toast("✅ Customer add ho gaya (duplicate allowed)", "success");
                  setCustomer(EMPTY_CUSTOMER); setMachines([EMPTY_MACHINE()]); setService(EMPTY_SERVICE); setStep(1);
                  setTimeout(() => onSuccess?.(), 1000);
                }).catch(e => toast(e.message, "error"))
                .finally(() => setLoading(false)); }}
                style={{ padding:"12px", background:"#f1f5f9", border:"1.5px solid #e2e8f0",
                  borderRadius:12, fontWeight:600, cursor:"pointer", fontSize:13, color:"#64748b" }}>
                Phir Bhi Add Karo (Same Mobile)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Picker */}
      {showMap && (
        <LocationPicker
          address={customer.address}
          latitude={customer.latitude ? parseFloat(customer.latitude) : null}
          longitude={customer.longitude ? parseFloat(customer.longitude) : null}
          onLocationSelect={({address,latitude,longitude}) => {
            setCustomer(c => ({...c, address, latitude, longitude}));
            setShowMap(false);
          }}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}
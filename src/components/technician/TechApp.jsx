// src/components/technician/TechApp.jsx
import { useState, useEffect } from "react";
import { authHeader, downloadInvoicePdf, sendLocation } from "../../services/api";
import { generateWarrantyCard } from "../WarrantyCard";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const STATUS_FLOW = {
  ASSIGNED:    { next:"ON_THE_WAY",  label:"🛵 Niklo",       color:"#f59e0b", bg:"rgba(245,158,11,0.12)"  },
  ON_THE_WAY:  { next:"IN_PROGRESS", label:"🔧 Kaam Shuru",  color:"#3b82f6", bg:"rgba(59,130,246,0.12)"  },
  IN_PROGRESS: { next:"DONE",        label:"✅ Job Complete", color:"#8b5cf6", bg:"rgba(139,92,246,0.12)"  },
  DONE:        { next:null,          label:null,              color:"#10b981", bg:"rgba(16,185,129,0.12)"  },
  NEW:         { next:"ON_THE_WAY",  label:"🛵 Niklo",       color:"#6366f1", bg:"rgba(99,102,241,0.12)"  },
  CANCELLED:   { next:null,          label:null,              color:"#ef4444", bg:"rgba(239,68,68,0.12)"   },
};

const WARRANTY_OPTS = ["No Warranty","3 months","6 months","1 year","2 years","3 years"];

const QUICK_SERVICES = [
  {name:"Gas Charging",price:800},{name:"PCB Repair",price:1500},
  {name:"Compressor Repair",price:3000},{name:"Capacitor Replace",price:350},
  {name:"Motor Repair",price:1200},{name:"Filter Clean",price:300},
  {name:"General Service",price:500},{name:"Installation",price:600},
];

const fmt = n => "₹" + Number(n||0).toLocaleString("en-IN");

// ─────────────────────────────────────────────────────────────
// FLOW after IN_PROGRESS → Complete button pressed:
//
//  STEP 1 → "service"   : Serial, Date, Warranty?, Kya kaam kiya
//  STEP 2 → "invoice"   : Services, Amount, Payment method
//  STEP 3 → "done"      : Send invoice WA → (if warranty) Send warranty card WA → Thank You
// ─────────────────────────────────────────────────────────────

export default function TechApp({ user, onLogout }) {
  const [screen,   setScreen]   = useState("home");
  const [jobs,     setJobs]     = useState([]);
  const [history,  setHistory]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState(false);

  // flow step: null | "service" | "invoice" | "done"
  const [step, setStep] = useState(null);

  // Step 1 state
  const [sForm, setSForm] = useState({
    serialNumber:"", serviceDate:today(), warrantyPeriod:"1 year", serviceDetails:""
  });
  const [savingSvc, setSavingSvc] = useState(false);
  const [doneData,  setDoneData]  = useState(null); // response from /complete

  // Step 2 state
  const [items,     setItems]     = useState([row()]);
  const [discount,  setDiscount]  = useState("");
  const [payment,   setPayment]   = useState("Cash");
  const [savingInv, setSavingInv] = useState(false);
  const [invoice,   setInvoice]   = useState(null);

  // GPS 30s
  useEffect(() => {
    const send = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        p => sendLocation(p.coords.latitude, p.coords.longitude).catch(()=>{}),
        ()=>{}
      );
    };
    send();
    const t = setInterval(send, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { loadJobs(); }, []);

  async function loadJobs() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/jobs/my-jobs`, { headers:authHeader() });
      const d = await r.json();
      setJobs(Array.isArray(d) ? d : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function loadHistory() {
    try {
      const r = await fetch(`${API}/jobs/my-history`, { headers:authHeader() });
      const d = await r.json();
      setHistory(Array.isArray(d) ? d.filter(j=>["DONE","CANCELLED"].includes(j.status)) : []);
    } catch(e) { console.error(e); }
  }

  // Normal status bump (not DONE → open form instead)
  async function bumpStatus(jobId, newStatus) {
    if (newStatus === "DONE") { setStep("service"); return; }
    setUpdating(true);
    try {
      const r = await fetch(`${API}/jobs/${jobId}`, {
        method:"PUT", headers:authHeader(), body:JSON.stringify({status:newStatus})
      });
      const d = await r.json();
      setSelected(d);
      loadJobs();
    } catch(e) { alert("Update failed: " + e.message); }
    finally { setUpdating(false); }
  }

  // ── STEP 1: Save service details ──────────────────────────────
  async function saveService() {
    if (!sForm.serviceDetails.trim()) { alert("Kya kaam kiya — yeh zaroori hai"); return; }
    setSavingSvc(true);
    try {
      const r = await fetch(`${API}/jobs/${selected.id}/complete`, {
        method:"PUT", headers:authHeader(), body:JSON.stringify(sForm)
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || d.message || `Server ${r.status}`);
      setDoneData(d);
      setSelected(prev=>({...prev, status:"DONE"}));
      loadJobs();
      setStep("invoice"); // → always go to invoice next
    } catch(e) { alert("Error: " + e.message); }
    finally { setSavingSvc(false); }
  }

  // ── STEP 2: Save invoice ───────────────────────────────────────
  async function saveInvoice() {
    const valid = items.filter(i=>i.name&&i.price);
    if (!valid.length) { alert("Kam se kam ek service add karo"); return; }
    const custId = doneData?.customer?.id || selected?.customer?.id;
    if (!custId) { alert("Customer link nahi — invoice nahi ban sakta"); return; }
    setSavingInv(true);
    try {
      const r = await fetch(`${API}/invoices`, {
        method:"POST", headers:authHeader(),
        body:JSON.stringify({
          customerId:     custId,
          items:          valid.map(i=>({serviceName:i.name,quantity:Number(i.qty)||1,unitPrice:Number(i.price)})),
          discountAmt:    Number(discount)||0,
          paymentMethod:  payment,
          technicianName: user?.name,
          jobId:          selected?.id,
        })
      });
      const inv = await r.json();
      if (!r.ok) throw new Error(inv.error || inv.message || `Server ${r.status}`);
      setInvoice(inv);
      setStep("done"); // → final screen
    } catch(e) { alert("Invoice Error: " + e.message); }
    finally { setSavingInv(false); }
  }

  // ── Helpers ───────────────────────────────────────────────────
  function openJob(job) {
    setSelected(job);
    setStep(null);
    setDoneData(null);
    setInvoice(null);
    setSForm({serialNumber:"",serviceDate:today(),warrantyPeriod:"1 year",serviceDetails:""});
    setItems([row()]);
    setDiscount(""); setPayment("Cash");
    setScreen("detail");
  }

  function goHome() {
    setScreen("home"); setSelected(null); setStep(null);
    setDoneData(null); setInvoice(null);
    loadJobs();
  }

  // Build WhatsApp URL for final screen
  function buildInvoiceWA() {
    const cust = doneData?.customer || selected?.customer;
    const mob  = cust?.mobile || selected?.customerMobile;
    if (!mob || !invoice) return null;
    const lines = invoice.items?.map(i=>`  • ${i.serviceName}: ${fmt(i.totalPrice)}`).join("\n")||"";
    const paid  = payment==="Pending" ? "⏳ Payment abhi pending hai" : `✅ ${payment} se payment mila`;
    const hasW  = sForm.warrantyPeriod !== "No Warranty";
    const msg   =
      `🙏 *Namaste ${cust?.name||""}  ji!*\n\n`+
      `Aapki *${selected?.machineType||""} (${selected?.machineBrand||""})* ki service complete ho gayi. ✅\n\n`+
      `🧾 *Invoice: ${invoice.invoiceNumber}*\n${lines}\n\n`+
      `💰 *Total: ${fmt(invoice.totalAmount)}*\n${paid}\n\n`+
      (hasW ? `🛡️ *Warranty: ${sForm.warrantyPeriod}*\n` : "")+
      `✅ Kaam kiya: ${sForm.serviceDetails}\n\n`+
      `Dhanyawad aapka! 🙏\n- ${user?.name}, Matoshree Enterprises`;
    return `https://wa.me/91${mob}?text=${encodeURIComponent(msg)}`;
  }

  function buildWarrantyWA() {
    const cust = doneData?.customer || selected?.customer;
    const mob  = cust?.mobile || selected?.customerMobile;
    if (!mob) return null;
    const msg =
      `🛡️ *WARRANTY CARD - Matoshree Enterprises*\n\n`+
      `Customer: ${cust?.name||""}\n`+
      `Machine: ${selected?.machineType||""} (${selected?.machineBrand||""})\n`+
      `Serial No: ${sForm.serialNumber||"—"}\n`+
      `Service Date: ${sForm.serviceDate}\n`+
      `Warranty: ${sForm.warrantyPeriod}\n\n`+
      `✅ Kaam kiya: ${sForm.serviceDetails}\n\n`+
      `Warranty ke liye humara number save karein.\n- Matoshree Enterprises`;
    return `https://wa.me/91${mob}?text=${encodeURIComponent(msg)}`;
  }

  function getWarrantyCustomerObj() {
    const cust = doneData?.customer || selected?.customer || {};
    return {
      ...cust,
      name:          cust.name || selected?.customerName || "",
      machineType:   cust.machineType  || selected?.machineType  || "",
      machineBrand:  cust.machineBrand || selected?.machineBrand || "",
      serialNumber:  sForm.serialNumber || "",
      serviceDate:   sForm.serviceDate,
      warrantyPeriod:sForm.warrantyPeriod,
      serviceDetails:sForm.serviceDetails,
    };
  }

  const hasWarranty = sForm.warrantyPeriod !== "No Warranty";
  const emergency   = jobs.filter(j=>j.priority==="EMERGENCY");
  const normal      = jobs.filter(j=>j.priority!=="EMERGENCY");

  // ════════════════════════════════════════════════════════════
  // HOME
  // ════════════════════════════════════════════════════════════
  if (screen==="home") return (
    <div className="tech-mobile">
      <div className="tech-mob-header">
        <div>
          <div className="tech-mob-greeting">Jai Hind 👋</div>
          <div className="tech-mob-name">{user?.name}</div>
        </div>
        <button className="tech-mob-logout" onClick={onLogout}>Logout</button>
      </div>

      <div className="tech-mob-stats">
        <Stat num={jobs.length}          label="Active" />
        <div className="tech-mob-stat-divider"/>
        <Stat num={emergency.length}     label="Emergency" color="#ef4444"/>
        <div className="tech-mob-stat-divider"/>
        <Stat num="📜" label="History" onClick={()=>{loadHistory();setScreen("history");}}/>
      </div>

      {emergency.length>0 && <SectionTitle title="🚨 Emergency" color="#ef4444"/>}
      {emergency.map(j=><JobCard key={j.id} job={j} onClick={()=>openJob(j)}/>)}
      <SectionTitle title="📋 Jobs"/>
      {loading
        ? <div className="tech-mob-loader">⚡ Load ho raha hai...</div>
        : normal.length===0
          ? <Empty icon="🎉" text="Koi active job nahi!"/>
          : normal.map(j=><JobCard key={j.id} job={j} onClick={()=>openJob(j)}/>)
      }

      <BottomNav active="home" onHistory={()=>{loadHistory();setScreen("history");}}/>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // DETAIL + STEPS
  // ════════════════════════════════════════════════════════════
  if (screen==="detail" && selected) {
    const sf   = STATUS_FLOW[selected.status] || STATUS_FLOW.ASSIGNED;
    const cust = doneData?.customer || selected.customer;
    const mob  = cust?.mobile || selected.customerMobile;
    const name = cust?.name   || selected.customerName || "Unknown";
    const addr = cust?.address || selected.customerAddress;
    const done = selected.status==="DONE";

    // Step labels for progress bar
    const stepList = ["service","invoice","done"];
    const stepLabels = { service:"Service", invoice:"Invoice", done:"Complete 🎉" };

    return (
      <div className="tech-mobile">
        {/* Header */}
        <div className="tech-mob-header">
          <button className="tech-mob-back" onClick={step ? ()=>setStep(step==="invoice"?"service":step==="done"?null:null) : goHome}>
            {step ? "← Wapas" : "← Back"}
          </button>
          <div className="tech-mob-header-title">
            {!step && "Job Detail"}
            {step==="service" && "Service Complete Karo"}
            {step==="invoice" && "Invoice Banao"}
            {step==="done"    && "Job Done! 🎉"}
          </div>
          <div style={{width:60}}/>
        </div>

        {/* Progress bar — only when in steps */}
        {step && (
          <div style={{padding:"10px 16px 0",display:"flex",gap:0}}>
            {stepList.map((s,i)=>{
              const ci   = stepList.indexOf(step);
              const isDone = i < ci;
              const isActive = i === ci;
              return (
                <div key={s} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{width:"100%",display:"flex",alignItems:"center"}}>
                    {i>0 && <div style={{flex:1,height:2,background:isDone?"#3b82f6":"#e2e8f0"}}/>}
                    <div style={{width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0,
                      background:isDone?"#3b82f6":isActive?"#3b82f6":"#e2e8f0",
                      color:isDone||isActive?"#fff":"#94a3b8"}}>
                      {isDone?"✓":i+1}
                    </div>
                    {i<stepList.length-1 && <div style={{flex:1,height:2,background:isDone?"#3b82f6":"#e2e8f0"}}/>}
                  </div>
                  <div style={{fontSize:10,marginTop:4,fontWeight:isActive?700:400,color:isActive?"#3b82f6":"#94a3b8"}}>
                    {stepLabels[s]}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="tech-mob-scroll" style={{paddingBottom:90}}>

          {/* ── NO STEP: regular job view ──────────────────────── */}
          {!step && (
            <>
              <div className="tech-detail-status-wrap">
                {selected.priority==="EMERGENCY" && <div className="tech-detail-emergency">🚨 EMERGENCY</div>}
                <div className="tech-detail-status-badge" style={{background:sf.bg,color:sf.color}}>
                  {selected.status?.replace(/_/g," ")}
                </div>
              </div>

              <div className="tech-detail-card">
                <div className="tech-detail-card-title">👤 Customer</div>
                <div className="tech-detail-name">{name}</div>
                {mob  && <a href={`tel:${mob}`} className="tech-detail-call-btn">📞 {mob} — Call Karo</a>}
                {addr && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`} target="_blank" rel="noreferrer" className="tech-detail-map-btn">📍 {addr}</a>}
              </div>

              <div className="tech-detail-card">
                <div className="tech-detail-card-title">🔧 Problem</div>
                <div className="tech-detail-problem">{selected.problemDescription}</div>
                {(selected.machineType||selected.machineBrand)&&(
                  <div className="tech-detail-machine">🖥️ {selected.machineType} {selected.machineBrand}</div>
                )}
              </div>

              {!done && mob && (
                <a href={`https://wa.me/91${mob}?text=${encodeURIComponent(`Namaste! Main ${user?.name} hoon, Matoshree Enterprises se. Aapka ${selected.machineType||"machine"} dekhne aa raha hoon.`)}`}
                  target="_blank" rel="noreferrer" className="tech-detail-wa-btn">
                  💬 Customer ko WhatsApp Karo
                </a>
              )}

              {/* Already done — invoice banana ho toh */}
              {done && (cust?.id) && (
                <button className="tech-make-invoice-btn" onClick={()=>setStep("invoice")}>
                  🧾 Invoice Banao
                </button>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════
              STEP 1 — SERVICE DETAILS FORM
          ══════════════════════════════════════════════════ */}
          {step==="service" && (
            <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:14}}>

              <InfoBox color="#8b5cf6" text="Service ki details bhar do — customer record mein save hoga aur aage invoice aayega"/>

              <Field label="Serial Number (Optional)">
                <input className="tech-inv-input" placeholder="Machine ka serial number"
                  value={sForm.serialNumber} onChange={e=>setSForm(f=>({...f,serialNumber:e.target.value}))}/>
              </Field>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Field label="Service Date *">
                  <input type="date" className="tech-inv-input" value={sForm.serviceDate}
                    onChange={e=>setSForm(f=>({...f,serviceDate:e.target.value}))}/>
                </Field>
                <Field label="Warranty">
                  <select className="tech-inv-input" value={sForm.warrantyPeriod}
                    onChange={e=>setSForm(f=>({...f,warrantyPeriod:e.target.value}))}>
                    {WARRANTY_OPTS.map(w=><option key={w}>{w}</option>)}
                  </select>
                </Field>
              </div>

              {/* Warranty hint */}
              {sForm.warrantyPeriod==="No Warranty"
                ? <InfoBox color="#f59e0b" text="⚠️ Warranty nahi — aage seedha Invoice aayega"/>
                : <InfoBox color="#10b981" text={`🛡️ ${sForm.warrantyPeriod} warranty — Invoice ke baad Warranty Card milega`}/>
              }

              <Field label="Kya Kaam Kiya? *">
                <textarea className="tech-detail-textarea" rows={4}
                  placeholder="e.g. Gas refill ki, PCB replace kiya, Filter clean kiya..."
                  value={sForm.serviceDetails} onChange={e=>setSForm(f=>({...f,serviceDetails:e.target.value}))}/>
              </Field>

              <BtnRow
                left={{ label:"Cancel", onClick:()=>setStep(null) }}
                right={{ label: savingSvc?"⏳ Save ho raha hai...":"Invoice Banao →", onClick:saveService, disabled:savingSvc,
                  style:{background:"linear-gradient(135deg,#8b5cf6,#6d28d9)"} }}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              STEP 2 — INVOICE FORM
          ══════════════════════════════════════════════════ */}
          {step==="invoice" && (
            <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:14}}>

              <InfoBox color="#3b82f6" text={`Service: ${sForm.serviceDetails}${hasWarranty?" · Warranty: "+sForm.warrantyPeriod:""}`}/>

              {/* Quick add */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>⚡ Quick Add</div>
                <div className="tech-inv-quick-wrap">
                  {QUICK_SERVICES.map(s=>(
                    <button key={s.name} className="tech-inv-quick-btn"
                      onClick={()=>setItems(prev=>[...prev.filter(x=>x.name),{name:s.name,qty:1,price:s.price}])}>
                      {s.name} · {fmt(s.price)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line items */}
              {items.map((item,i)=>(
                <div key={i} style={{background:"#f8fafc",borderRadius:10,padding:10,border:"1px solid #e2e8f0"}}>
                  <div style={{display:"flex",gap:8,marginBottom:8}}>
                    <input className="tech-inv-input" placeholder="Service naam *" style={{flex:1}}
                      value={item.name} onChange={e=>{const u=[...items];u[i]={...u[i],name:e.target.value};setItems(u);}}/>
                    {items.length>1&&<button className="tech-inv-del" onClick={()=>setItems(items.filter((_,idx)=>idx!==i))}>✕</button>}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <input className="tech-inv-input" type="number" placeholder="Qty" style={{width:70}}
                      value={item.qty} onChange={e=>{const u=[...items];u[i]={...u[i],qty:e.target.value};setItems(u);}}/>
                    <input className="tech-inv-input" type="number" placeholder="Price ₹ *" style={{flex:1}}
                      value={item.price} onChange={e=>{const u=[...items];u[i]={...u[i],price:e.target.value};setItems(u);}}/>
                    <div style={{alignSelf:"center",fontWeight:700,fontSize:13,color:"#10b981",whiteSpace:"nowrap"}}>
                      = {fmt((Number(item.qty)||1)*(Number(item.price)||0))}
                    </div>
                  </div>
                </div>
              ))}

              <button className="tech-inv-add-item" onClick={()=>setItems([...items,row()])}>+ Service Add Karo</button>

              {/* Discount */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#f8fafc",borderRadius:10,border:"1px solid #e2e8f0"}}>
                <span style={{fontSize:13,fontWeight:600,color:"#64748b"}}>Discount ₹</span>
                <input className="tech-inv-input" type="number" style={{width:110}} placeholder="0"
                  value={discount} onChange={e=>setDiscount(e.target.value)}/>
              </div>

              {/* Total */}
              <div style={{background:"linear-gradient(135deg,#10b981,#059669)",borderRadius:12,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",color:"#fff"}}>
                <span style={{fontWeight:700,fontSize:14}}>Total Amount</span>
                <span style={{fontWeight:900,fontSize:22}}>
                  {fmt(Math.max(0,items.reduce((s,i)=>(s+(Number(i.qty)||1)*(Number(i.price)||0)),0)-(Number(discount)||0)))}
                </span>
              </div>

              {/* Payment method */}
              <Field label="💳 Payment Method">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[["Cash","💵"],["UPI","📱"],["Pending","⏳"]].map(([m,icon])=>(
                    <button key={m} onClick={()=>setPayment(m)}
                      style={{padding:"12px 6px",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",border:"2px solid",
                        borderColor:payment===m?"#3b82f6":"#e2e8f0",
                        background:payment===m?"#eff6ff":"#fff",
                        color:payment===m?"#3b82f6":"#64748b"}}>
                      {icon} {m}
                    </button>
                  ))}
                </div>
              </Field>

              <div style={{fontSize:12,color:"#94a3b8",textAlign:"center"}}>👷 Serviced by: <strong>{user?.name}</strong></div>

              <BtnRow
                left={{ label:"← Wapas", onClick:()=>setStep("service") }}
                right={{ label:savingInv?"⏳ Ban raha hai...":"💾 Invoice Save Karo", onClick:saveInvoice, disabled:savingInv }}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              STEP 3 — DONE SCREEN
              Order: Invoice WA → (if warranty) Warranty Card WA → (if warranty) Download → PDF → Home
          ══════════════════════════════════════════════════ */}
          {step==="done" && invoice && (()=>{
            const invWA = buildInvoiceWA();
            const warWA = hasWarranty ? buildWarrantyWA() : null;
            return (
              <div style={{padding:"16px"}}>

                {/* Success banner */}
                <div style={{background:"linear-gradient(135deg,#10b981,#059669)",borderRadius:18,padding:"24px 20px",textAlign:"center",color:"#fff",marginBottom:18}}>
                  <div style={{fontSize:54,marginBottom:6}}>🎉</div>
                  <div style={{fontSize:22,fontWeight:900,marginBottom:4}}>Job Complete!</div>
                  <div style={{fontSize:13,opacity:0.85,marginBottom:10}}>Invoice: {invoice.invoiceNumber}</div>
                  <div style={{fontSize:30,fontWeight:900}}>{fmt(invoice.totalAmount)}</div>
                  <div style={{marginTop:8,padding:"5px 16px",background:"rgba(255,255,255,0.2)",borderRadius:20,display:"inline-block",fontSize:13,fontWeight:600}}>
                    {payment==="Pending"?"⏳ Payment Pending":`✅ ${payment} se Paid`}
                  </div>
                </div>

                {/* Action buttons — in correct order */}
                <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>

                  {/* 1. Invoice + Thank you WhatsApp */}
                  {invWA && (
                    <ActionBtn href={invWA}
                      bg="#25d366" icon="💬"
                      label="Customer ko Invoice + Thank You Bhejo"
                      sub="Invoice amount + kaam ki details + thank you"/>
                  )}

                  {/* 2. Warranty Card WhatsApp (only if warranty) */}
                  {hasWarranty && warWA && (
                    <ActionBtn href={warWA}
                      bg="rgba(245,196,24,0.1)" border="#f5c518" textColor="#b45309"
                      icon="🛡️"
                      label="Warranty Card WhatsApp pe Bhejo"
                      sub={`${sForm.warrantyPeriod} warranty card customer ko`}/>
                  )}

                  {/* 3. Download Warranty Card image (only if warranty) */}
                  {hasWarranty && (
                    <ActionBtn onClick={()=>generateWarrantyCard(getWarrantyCustomerObj())}
                      bg="rgba(30,41,59,0.06)" border="#334155" textColor="#1e293b"
                      icon="📋"
                      label="Warranty Card Download Karo"
                      sub="PNG image — print ya WhatsApp pe bhejo"/>
                  )}

                  {/* 4. PDF Invoice */}
                  <ActionBtn
                    onClick={()=>downloadInvoicePdf(invoice.id, cust?.name||name, invoice.invoiceNumber)}
                    bg="rgba(99,102,241,0.07)" border="rgba(99,102,241,0.25)" textColor="#6366f1"
                    icon="📄" label="Invoice PDF Download Karo"
                    sub="Print ya save karo"/>

                  {/* 5. Home */}
                  <ActionBtn onClick={goHome}
                    bg="#f8fafc" border="#e2e8f0" textColor="#64748b"
                    icon="🏠" label="Home Pe Wapas Jao"/>
                </div>

                {/* Invoice items */}
                <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Invoice Summary</div>
                  {invoice.items?.map((it,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f1f5f9",fontSize:13}}>
                      <span>{it.serviceName}{it.quantity>1?` × ${it.quantity}`:""}</span>
                      <span style={{fontWeight:700}}>{fmt(it.totalPrice)}</span>
                    </div>
                  ))}
                  {(Number(invoice.discountAmt)||0)>0 && (
                    <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",fontSize:13,color:"#ef4444"}}>
                      <span>Discount</span><span>- {fmt(invoice.discountAmt)}</span>
                    </div>
                  )}
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:8,paddingTop:8,borderTop:"2px solid #e2e8f0",fontWeight:900,fontSize:16}}>
                    <span>Total</span>
                    <span style={{color:"#10b981"}}>{fmt(invoice.totalAmount)}</span>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>

        {/* Bottom action bar */}
        {!step && !done && STATUS_FLOW[selected.status]?.next && (
          <div className="tech-detail-action-bar">
            <button className="tech-detail-action-btn"
              onClick={()=>bumpStatus(selected.id, STATUS_FLOW[selected.status].next)}
              disabled={updating}>
              {updating?"⏳ Update ho raha hai...":STATUS_FLOW[selected.status].label}
            </button>
          </div>
        )}
        {!step && done && (
          <div className="tech-detail-action-bar">
            <div className="tech-detail-done-msg">✅ Job complete ho gayi!</div>
          </div>
        )}

        <BottomNav onHistory={()=>{loadHistory();setScreen("history");}} onHome={goHome}/>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // HISTORY
  // ════════════════════════════════════════════════════════════
  if (screen==="history") return (
    <div className="tech-mobile">
      <div className="tech-mob-header">
        <button className="tech-mob-back" onClick={goHome}>← Back</button>
        <div className="tech-mob-header-title">Job History</div>
        <div style={{width:60}}/>
      </div>
      <div className="tech-mob-scroll">
        {history.length===0
          ? <Empty icon="📭" text="Koi history nahi"/>
          : history.map(job=>(
            <div key={job.id} className="tech-history-card">
              <div className="tech-history-top">
                <div className="tech-history-name">{job.customer?.name||job.customerName||"Unknown"}</div>
                <div className={`tech-history-status ${job.status==="DONE"?"done":"cancelled"}`}>
                  {job.status==="DONE"?"✅ Done":"❌ Cancelled"}
                </div>
              </div>
              <div className="tech-history-problem">{job.problemDescription}</div>
              {(job.machineType||job.machineBrand)&&<div className="tech-history-machine">🖥️ {job.machineType} {job.machineBrand}</div>}
              <div className="tech-history-date">📅 {job.completedAt?new Date(job.completedAt).toLocaleDateString("en-IN"):job.scheduledDate||"—"}</div>
            </div>
          ))
        }
      </div>
      <BottomNav active="history" onHome={goHome} onHistory={()=>{}}/>
    </div>
  );

  return null;
}

// ── Tiny helper components ────────────────────────────────────────────────────
function row() { return {name:"",qty:1,price:""}; }
function today() { return new Date().toISOString().split("T")[0]; }

function Stat({num,label,color,onClick}) {
  return <div className="tech-mob-stat" onClick={onClick} style={onClick?{cursor:"pointer"}:{}}>
    <div className="tech-mob-stat-num" style={color?{color}:{}}>{num}</div>
    <div className="tech-mob-stat-label">{label}</div>
  </div>;
}
function SectionTitle({title,color}) {
  return <div className="tech-mob-section-title" style={color?{color}:{}}>{title}</div>;
}
function Empty({icon,text}) {
  return <div className="tech-mob-empty"><div style={{fontSize:48}}>{icon}</div><div>{text}</div></div>;
}
function Field({label,children}) {
  return <div>
    <label style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:6}}>{label}</label>
    {children}
  </div>;
}
function InfoBox({color,text}) {
  return <div style={{padding:"10px 14px",background:`${color}10`,border:`1px solid ${color}30`,borderRadius:10,fontSize:12,color,fontWeight:600}}>{text}</div>;
}
function BtnRow({left,right}) {
  return <div style={{display:"flex",gap:10,marginTop:4}}>
    <button className="tech-inv-skip" onClick={left.onClick}>{left.label}</button>
    <button className="tech-inv-submit" onClick={right.onClick} disabled={right.disabled} style={right.style||{}}>{right.label}</button>
  </div>;
}
function ActionBtn({href,onClick,bg,border,textColor,icon,label,sub,style}) {
  const s = {
    display:"flex",alignItems:"center",gap:12,padding:"14px 16px",
    background:bg||"transparent",
    border:`1.5px solid ${border||"transparent"}`,
    borderRadius:14,cursor:"pointer",textDecoration:"none",
    color:textColor||"#fff",width:"100%",textAlign:"left",...style
  };
  const inner = <>
    <div style={{fontSize:26,flexShrink:0}}>{icon}</div>
    <div>
      <div style={{fontWeight:800,fontSize:14}}>{label}</div>
      {sub&&<div style={{fontSize:11,marginTop:2,opacity:0.75}}>{sub}</div>}
    </div>
  </>;
  return href
    ? <a href={href} target="_blank" rel="noreferrer" style={s}>{inner}</a>
    : <button onClick={onClick} style={s}>{inner}</button>;
}
function JobCard({job,onClick}) {
  const sf = STATUS_FLOW[job.status]||STATUS_FLOW.ASSIGNED;
  return (
    <div className={`tech-job-card ${job.priority==="EMERGENCY"?"emergency":""}`} onClick={onClick}>
      <div className="tech-job-card-top">
        <div className="tech-job-customer">{job.customer?.name||job.customerName||"Unknown"}</div>
        <div className="tech-job-status" style={{background:sf.bg,color:sf.color}}>{job.status?.replace(/_/g," ")}</div>
      </div>
      <div className="tech-job-problem">{job.problemDescription}</div>
      {(job.machineType||job.machineBrand)&&<div className="tech-job-machine">🖥️ {job.machineType} {job.machineBrand}</div>}
      {(job.customer?.mobile||job.customerMobile)&&<div className="tech-job-mobile">📞 {job.customer?.mobile||job.customerMobile}</div>}
      <div className="tech-job-arrow">Tap to open →</div>
    </div>
  );
}
function BottomNav({active,onHome,onHistory}) {
  return (
    <div className="tech-mob-bottomnav">
      <button className={`tech-mob-nav-btn ${active==="home"?"active":""}`} onClick={onHome}><span>🏠</span><span>Home</span></button>
      <button className={`tech-mob-nav-btn ${active==="history"?"active":""}`} onClick={onHistory}><span>📜</span><span>History</span></button>
    </div>
  );
}
// src/components/owner/AllInvoices.jsx
import { openExternal, downloadBlob } from "../../utils/openExternal";
import { useState, useEffect, useMemo } from "react";
import { useToast, confirm } from "../Toast.jsx";
import { authHeader, downloadInvoicePdf , apiFetch } from "../../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const fmt  = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

const actionBtn = (color, bg) => ({
  padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${color}33`,
  background: bg, color, fontWeight: 700, fontSize: 12, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 4,
});
const lbl = { display:"block", fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 };
const sel = { width:"100%", padding:"10px 14px", borderRadius:10, border:"1.5px solid #e2e8f0", fontSize:13, fontFamily:"inherit", color:"#1e293b", background:"#fff", outline:"none", boxSizing:"border-box" };

export default function AllInvoices() {
  const toast = useToast();
  const [invoices,    setInvoices]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [techNames,   setTechNames]   = useState([]);
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState("ALL");
  const [techFilter,  setTechFilter]  = useState("ALL");
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [editInv,     setEditInv]     = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [expandedId,  setExpandedId]  = useState(null);

  useEffect(() => { fetchInvoices(); }, []);
  useEffect(() => {
    const t = setInterval(() => fetchInvoices(), 20000);
    return () => clearInterval(t);
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res  = await apiFetch(`${API}/invoices`, { headers: authHeader() });
      const data = await res.json();
      const arr  = Array.isArray(data) ? data.sort((a, b) => b.id - a.id) : [];
      setInvoices(arr);
      setTechNames([...new Set(arr.map(i => i.technicianName).filter(Boolean))]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const markPaid = async (id, method) => {
    try {
      await apiFetch(`${API}/invoices/${id}/pay?method=${method}`, { method: "PUT", headers: authHeader() });
      toast(`Payment ${method} se mark ho gayi ✅`, "success");
      fetchInvoices();
    } catch (e) { toast(e.message, "error"); }
  };

  const deleteInvoice = async (id) => {
    const ok = await confirm("Delete Karo?", "Yeh invoice permanently delete ho jaayega", { confirmLabel:"Delete", dangerMode:true });
    if (!ok) return;
    try {
      await apiFetch(`${API}/invoices/${id}`, { method:"DELETE", headers:authHeader() });
      toast("Invoice delete ho gaya", "success");
      fetchInvoices();
    } catch (e) { toast(e.message, "error"); }
  };

  const saveEdit = async () => {
    if (!editInv) return;
    setEditLoading(true);
    try {
      const res = await apiFetch(`${API}/invoices/${editInv.id}`, {
        method:"PUT", headers:authHeader(),
        body: JSON.stringify({ paymentMethod:editInv.paymentMethod, paymentStatus:editInv.paymentStatus, discountAmt:editInv.discountAmt, technicianName:editInv.technicianName }),
      });
      if (!res.ok) throw new Error("Update nahi hua");
      toast("Invoice update ho gaya ✅", "success");
      setEditInv(null); fetchInvoices();
    } catch (e) { toast(e.message, "error"); }
    finally { setEditLoading(false); }
  };

  const exportCSV = () => {
    const rows = [["Invoice No","Customer","Date","Technician","Items","Discount","Total","Payment","Status"]];
    filtered.forEach(inv => rows.push([
      inv.invoiceNumber||"", inv.customer?.name||"", inv.invoiceDate||"", inv.technicianName||"",
      (inv.items||[]).map(i=>`${i.serviceName}(${fmt(i.totalPrice)})`).join("; "),
      inv.discountAmt||0, inv.totalAmount||0, inv.paymentMethod||"", inv.paymentStatus||"",
    ]));
    const csv  = rows.map(r => r.map(v=>`"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8;"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`Invoices_${new Date().toLocaleDateString("en-IN").replace(/\//g,"-")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast("CSV export ho gayi 📊","success");
  };

  const filtered = useMemo(() => invoices.filter(inv => {
    if (filter==="PAID"   && inv.paymentStatus!=="PAID")   return false;
    if (filter==="UNPAID" && inv.paymentStatus!=="UNPAID") return false;
    if (techFilter!=="ALL" && inv.technicianName!==techFilter) return false;
    if (dateFrom && inv.invoiceDate && inv.invoiceDate < dateFrom) return false;
    if (dateTo   && inv.invoiceDate && inv.invoiceDate > dateTo)   return false;
    if (search) {
      const q = search.toLowerCase();
      return inv.invoiceNumber?.toLowerCase().includes(q) ||
             inv.customer?.name?.toLowerCase().includes(q) ||
             inv.customer?.mobile?.includes(q) ||
             inv.technicianName?.toLowerCase().includes(q) ||
             (inv.items||[]).some(i=>i.serviceName?.toLowerCase().includes(q));
    }
    return true;
  }), [invoices,filter,techFilter,dateFrom,dateTo,search]);

  const totalRevenue  = invoices.filter(i=>i.paymentStatus==="PAID").reduce((s,i)=>s+(i.totalAmount||0),0);
  const pendingAmount = invoices.filter(i=>i.paymentStatus==="UNPAID").reduce((s,i)=>s+(i.totalAmount||0),0);
  const filteredPaid  = filtered.filter(i=>i.paymentStatus==="PAID").reduce((s,i)=>s+(i.totalAmount||0),0);
  const hasFilters    = search || filter!=="ALL" || techFilter!=="ALL" || dateFrom || dateTo;

  const clearFilters = () => { setSearch(""); setFilter("ALL"); setTechFilter("ALL"); setDateFrom(""); setDateTo(""); };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,color:"#1e293b"}}>🧾 Invoices</h2>
          <p style={{fontSize:13,color:"#64748b",marginTop:2}}>{invoices.length} total invoices</p>
        </div>
        <button onClick={exportCSV}
          style={{padding:"9px 18px",background:"rgba(16,185,129,0.08)",border:"1.5px solid #10b981",color:"#059669",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          📊 Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {[
          {val:fmt(totalRevenue), label:"✅ Total Paid",    bg:"#f0fdf4",border:"#bbf7d0",color:"#166534"},
          {val:fmt(pendingAmount),label:"⏳ Total Pending", bg:"#fef2f2",border:"#fecaca",color:"#991b1b"},
          {val:invoices.length,   label:"📄 Total Invoices",bg:"#eff6ff",border:"#bfdbfe",color:"#1e40af"},
        ].map((c,i)=>(
          <div key={i} style={{background:c.bg,border:`1.5px solid ${c.border}`,borderRadius:14,padding:"16px 20px"}}>
            <div style={{fontSize:24,fontWeight:900,color:c.color}}>{c.val}</div>
            <div style={{fontSize:12,color:c.color,fontWeight:600,marginTop:4,opacity:0.8}}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:16,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:15}}>🔍</span>
          <input placeholder="Invoice no, customer naam, mobile, service naam se dhundo..."
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{width:"100%",padding:"10px 14px 10px 36px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          {search && <button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:16}}>✕</button>}
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{display:"flex",gap:6}}>
            {[["ALL","Sab"],["PAID","✅ Paid"],["UNPAID","⏳ Pending"]].map(([k,label])=>(
              <button key={k} onClick={()=>setFilter(k)}
                style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",border:"none",
                  background:filter===k?"#3b82f6":"#f1f5f9",color:filter===k?"#fff":"#64748b"}}>
                {label}
                <span style={{marginLeft:5,background:filter===k?"rgba(255,255,255,0.25)":"#e2e8f0",padding:"1px 6px",borderRadius:10,fontSize:10}}>
                  {k==="ALL"?invoices.length:invoices.filter(i=>i.paymentStatus===k).length}
                </span>
              </button>
            ))}
          </div>
          {techNames.length>0 && (
            <select value={techFilter} onChange={e=>setTechFilter(e.target.value)}
              style={{padding:"7px 12px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:12,color:"#475569",fontFamily:"inherit",background:"#fff",cursor:"pointer"}}>
              <option value="ALL">👷 Sab Technicians</option>
              {techNames.map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          )}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:12,color:"#64748b",fontWeight:600,whiteSpace:"nowrap"}}>📅 From</span>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
              style={{padding:"7px 10px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:12,fontFamily:"inherit",color:"#475569"}}/>
            <span style={{fontSize:12,color:"#64748b",fontWeight:600}}>To</span>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
              style={{padding:"7px 10px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:12,fontFamily:"inherit",color:"#475569"}}/>
          </div>
          {hasFilters && (
            <button onClick={clearFilters}
              style={{padding:"6px 12px",borderRadius:10,border:"1.5px solid #fca5a5",background:"rgba(239,68,68,0.06)",color:"#ef4444",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
              ✕ Clear Filters
            </button>
          )}
          <div style={{marginLeft:"auto",fontSize:12,color:"#94a3b8",fontWeight:600}}>
            {filtered.length} result{filtered.length!==1?"s":""}
            {hasFilters && filtered.length>0 && <span style={{marginLeft:8,color:"#059669"}}>· {fmt(filteredPaid)} paid</span>}
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{textAlign:"center",padding:"60px",color:"#94a3b8"}}>
          <div style={{fontSize:36,marginBottom:10}}>⚡</div><div>Loading invoices...</div>
        </div>
      ) : filtered.length===0 ? (
        <div style={{textAlign:"center",padding:"60px",background:"#fff",borderRadius:16,border:"1px solid #e2e8f0",color:"#94a3b8"}}>
          <div style={{fontSize:48,marginBottom:12}}>🧾</div>
          <div style={{fontWeight:700,fontSize:16,color:"#64748b"}}>{hasFilters?"Is filter mein koi invoice nahi":"Koi invoice nahi mila"}</div>
          {hasFilters && <button onClick={clearFilters} style={{marginTop:14,padding:"8px 18px",background:"#3b82f6",color:"#fff",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer",fontSize:13}}>Filters Clear Karo</button>}
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(inv => {
            const isPaid     = inv.paymentStatus==="PAID";
            const isExpanded = expandedId===inv.id;
            return (
              <div key={inv.id} style={{background:"#fff",border:`1.5px solid ${isPaid?"#d1fae5":"#fee2e2"}`,borderRadius:14,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)",borderLeft:`4px solid ${isPaid?"#10b981":"#ef4444"}`}}>
                <div style={{padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                      <span style={{fontWeight:800,fontSize:14,color:"#1e293b"}}>{inv.invoiceNumber}</span>
                      <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:isPaid?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",color:isPaid?"#059669":"#ef4444"}}>
                        {isPaid?`✅ ${inv.paymentMethod||"Paid"}`:"⏳ Pending"}
                      </span>
                    </div>
                    <div style={{fontWeight:700,fontSize:15,color:"#1e293b",marginBottom:3}}>{inv.customer?.name||"Unknown Customer"}</div>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:12,color:"#64748b"}}>
                      {inv.customer?.mobile && <span>📞 {inv.customer.mobile}</span>}
                      {inv.technicianName   && <span>👷 {inv.technicianName}</span>}
                      {inv.invoiceDate      && <span>📅 {inv.invoiceDate}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:22,fontWeight:900,color:isPaid?"#059669":"#ef4444"}}>{fmt(inv.totalAmount)}</div>
                    {(inv.discountAmt>0) && <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>Discount: -{fmt(inv.discountAmt)}</div>}
                    {inv.items?.length>0 && (
                      <button onClick={()=>setExpandedId(isExpanded?null:inv.id)}
                        style={{marginTop:6,fontSize:11,color:"#3b82f6",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>
                        {isExpanded?"▲ Close":`▼ ${inv.items.length} item${inv.items.length>1?"s":""}`}
                      </button>
                    )}
                  </div>
                </div>
                {isExpanded && inv.items?.length>0 && (
                  <div style={{padding:"0 16px 12px",borderTop:"1px solid #f1f5f9"}}>
                    <div style={{marginTop:10}}>
                      {inv.items.map((item,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f8fafc",fontSize:13}}>
                          <span style={{color:"#475569"}}>{item.serviceName}{item.quantity>1&&<span style={{color:"#94a3b8",marginLeft:6}}>× {item.quantity}</span>}</span>
                          <span style={{fontWeight:700,color:"#1e293b"}}>{fmt(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{padding:"10px 16px",borderTop:"1px solid #f1f5f9",display:"flex",gap:8,flexWrap:"wrap",background:"#fafafa"}}>
                  {!isPaid && <>
                    <button onClick={()=>markPaid(inv.id,"Cash")} style={actionBtn("#059669","rgba(16,185,129,0.08)")}>💵 Cash Mila</button>
                    <button onClick={()=>markPaid(inv.id,"UPI")}  style={actionBtn("#3b82f6","rgba(59,130,246,0.08)")}>📱 UPI Mila</button>
                  </>}
                  <button onClick={()=>downloadInvoicePdf(inv.id,inv.customer?.name,inv.invoiceNumber)} style={actionBtn("#6366f1","rgba(99,102,241,0.08)")}>📄 PDF</button>
                  {inv.customer?.mobile && (
                    <button onClick={()=>openExternal(`https://wa.me/91${inv.customer.mobile}?text=${encodeURIComponent(`Namaste ${inv.customer?.name||""} ji! Aapka invoice ${inv.invoiceNumber} — Total: ${fmt(inv.totalAmount)}.`)}`)}
                      style={{...actionBtn("#25d366","rgba(37,211,102,0.08)")}}>💬 WA</button>
                  )}
                  <button onClick={()=>setEditInv({...inv})} style={actionBtn("#f59e0b","rgba(245,158,11,0.08)")}>✏️ Edit</button>
                  <button onClick={()=>deleteInvoice(inv.id)} style={{...actionBtn("#ef4444","rgba(239,68,68,0.08)"),marginLeft:"auto"}}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editInv && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20,backdropFilter:"blur(4px)"}}>
          <div style={{background:"#fff",borderRadius:20,padding:28,width:"100%",maxWidth:420,boxShadow:"0 24px 64px rgba(0,0,0,0.22)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontSize:17,fontWeight:800,color:"#1e293b"}}>✏️ Invoice Edit Karo</div>
              <button onClick={()=>setEditInv(null)} style={{width:30,height:30,borderRadius:"50%",border:"1.5px solid #e2e8f0",background:"#f8fafc",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{background:"#f8fafc",borderRadius:12,padding:14,marginBottom:18,fontSize:13,color:"#64748b"}}>
              <strong style={{color:"#1e293b"}}>{editInv.invoiceNumber}</strong> · {editInv.customer?.name}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div><label style={lbl}>Payment Status</label>
                <select value={editInv.paymentStatus} onChange={e=>setEditInv({...editInv,paymentStatus:e.target.value})} style={sel}>
                  <option value="PAID">✅ Paid</option>
                  <option value="UNPAID">⏳ Pending</option>
                </select>
              </div>
              <div><label style={lbl}>Payment Method</label>
                <select value={editInv.paymentMethod||""} onChange={e=>setEditInv({...editInv,paymentMethod:e.target.value})} style={sel}>
                  <option value="">-- Select --</option>
                  <option value="Cash">💵 Cash</option>
                  <option value="UPI">📱 UPI</option>
                  <option value="Pending">⏳ Pending</option>
                </select>
              </div>
              <div><label style={lbl}>Discount (₹)</label>
                <input type="number" value={editInv.discountAmt||0} onChange={e=>setEditInv({...editInv,discountAmt:Number(e.target.value)})} style={sel}/>
              </div>
              <div><label style={lbl}>Technician Naam</label>
                <input value={editInv.technicianName||""} onChange={e=>setEditInv({...editInv,technicianName:e.target.value})} style={sel} placeholder="Technician ka naam"/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:22}}>
              <button onClick={()=>setEditInv(null)} style={{flex:1,padding:"11px",borderRadius:12,border:"1.5px solid #e2e8f0",background:"#f8fafc",color:"#64748b",fontWeight:700,cursor:"pointer"}}>Cancel</button>
              <button onClick={saveEdit} disabled={editLoading} style={{flex:2,padding:"11px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#3b82f6,#2563eb)",color:"#fff",fontWeight:800,cursor:"pointer",opacity:editLoading?0.7:1}}>
                {editLoading?"⏳ Save ho raha hai...":"💾 Save Karo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
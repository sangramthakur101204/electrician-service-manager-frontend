// src/components/CustomerList.jsx
import { openExternal, downloadBlob } from "../utils/openExternal";
import { useState, useEffect } from "react";
import {
  markServiceDone, deleteCustomer,
  getWhatsAppLink, getWhatsAppReminderLink, getWhatsAppWarrantyLink,
  updateCustomer, authHeader, apiFetch, downloadInvoicePdf
} from "../services/api";
import { generateWarrantyCard } from "./WarrantyCard";
import InvoiceModal from "./InvoiceGenerator";
import { useToast } from "./Toast.jsx";
import CustomerHistory from "./CustomerHistory";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const MACHINE_TYPES = ["AC", "Washing Machine", "Water Purifier", "Refrigerator", "Microwave", "Geyser", "Fan", "Motor Pump", "Inverter", "Other"];
const BRANDS = ["LG", "Samsung", "Whirlpool", "Voltas", "Daikin", "Godrej", "Haier", "Panasonic", "Blue Star", "Carrier", "Other"];
const WARRANTY_PERIODS = ["No Warranty", "3 months", "6 months", "1 year", "2 years", "3 years"];
const EMPTY_EDIT = {
  name: "", mobile: "", address: "", latitude: "", longitude: "",
  machineType: "", machineBrand: "", model: "", serialNumber: "",
  serviceDate: "", warrantyPeriod: "No Warranty", serviceDetails: "",
  serviceStatus: "PENDING", notes: "",
};

export default function CustomerList({ customers, onRefresh }) {
  const toast = useToast();
  const [companySettings, setCompanySettings] = useState(null);
  useEffect(() => {
    apiFetch(`${API}/settings`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCompanySettings(d); })
      .catch(() => {});
  }, []);
  const [search,        setSearch]       = useState("");
  const [filterStatus,  setFilterStatus] = useState("ALL");
  const [filterMachine, setFilterMachine]= useState("");
  const [editId,        setEditId]       = useState(null);
  const [editForm,      setEditForm]     = useState(EMPTY_EDIT);
  const [confirmDelete, setConfirmDelete]= useState(null);
  const [loadingId,     setLoadingId]    = useState(null);
  const [sortField,     setSortField]    = useState("id");
  const [sortDir,       setSortDir]      = useState("desc");
  const [detailId,      setDetailId]     = useState(null);
  const [invoiceCustomer, setInvoiceCustomer] = useState(null);
  const [custInvModal,  setCustInvModal] = useState(null);
  const [custInvList,   setCustInvList]  = useState([]);
  const [custInvLoad,   setCustInvLoad]  = useState(false);
  const [exporting,     setExporting]    = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState(null); // NEW

  // ── Export CSV/Excel ──────────────────────────────────────────
  const exportExcel = async () => {
    setExporting(true);
    try {
      // Fetch job history for all customers
      const jobsRes  = await apiFetch(`${API}/jobs`, { headers: authHeader() });
      const allJobs  = jobsRes.ok ? await jobsRes.json() : [];
      const invRes   = await apiFetch(`${API}/invoices`, { headers: authHeader() });
      const allInvs  = invRes.ok ? await invRes.json() : [];

      const rows = [
        ["ID","Naam","Mobile","Address","Machine Type","Brand","Model","Serial No",
         "Service Date","Warranty Period","Warranty End","Service Details","Status",
         "Total Jobs","Total Invoices","Total Paid (₹)","Pending (₹)"]
      ];
      customers.forEach(c => {
        const cJobs = allJobs.filter(j => j.customer?.id === c.id);
        const cInvs = allInvs.filter(i => i.customer?.id === c.id);
        const paid  = cInvs.filter(i=>i.paymentStatus==="PAID").reduce((s,i)=>s+(i.totalAmount||0),0);
        const pend  = cInvs.filter(i=>i.paymentStatus==="UNPAID").reduce((s,i)=>s+(i.totalAmount||0),0);
        rows.push([
          c.id, c.name||"", c.mobile||"", (c.address||"").replace(/,/g," "),
          c.machineType||"", c.machineBrand||"", c.model||"", c.serialNumber||"",
          c.serviceDate||"", c.warrantyPeriod||"", c.warrantyEnd||"",
          (c.serviceDetails||"").replace(/,/g," "), c.serviceStatus||"",
          cJobs.length, cInvs.length, Math.round(paid), Math.round(pend)
        ]);
      });

      const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
      const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      downloadBlob(blob, `ElectroServe_Customers_${new Date().toLocaleDateString("en-IN").replace(/\//g,"-")}.csv`);
      URL.revokeObjectURL(url);
    } catch(e) { toast("Export error: " + e.message, "error"); }
    finally { setExporting(false); }
  };

  // ── Export PDF (print-friendly HTML) ─────────────────────────
  const exportPDF = async () => {
    setExporting(true);
    try {
      const jobsRes = await apiFetch(`${API}/jobs`,     { headers: authHeader() });
      const invRes  = await apiFetch(`${API}/invoices`, { headers: authHeader() });
      const allJobs = jobsRes.ok ? await jobsRes.json() : [];
      const allInvs = invRes.ok  ? await invRes.json()  : [];

      const rows = customers.map(c => {
        const cJobs = allJobs.filter(j => j.customer?.id===c.id);
        const cInvs = allInvs.filter(i => i.customer?.id===c.id);
        const paid  = cInvs.filter(i=>i.paymentStatus==="PAID").reduce((s,i)=>s+(i.totalAmount||0),0);
        const pend  = cInvs.filter(i=>i.paymentStatus==="UNPAID").reduce((s,i)=>s+(i.totalAmount||0),0);
        return `<tr>
          <td>${c.name||""}</td><td>${c.mobile||""}</td>
          <td>${c.machineType||""} ${c.machineBrand||""}</td>
          <td>${c.serviceDate||""}</td><td>${c.warrantyPeriod||""}</td>
          <td>${c.warrantyEnd||""}</td>
          <td><span style="color:${c.serviceStatus==="DONE"?"#059669":"#f59e0b"};font-weight:600">${c.serviceStatus||""}</span></td>
          <td>${cJobs.length}</td>
          <td style="color:#059669;font-weight:700">₹${Math.round(paid).toLocaleString("en-IN")}</td>
          <td style="color:${pend>0?"#ef4444":"#64748b"};font-weight:700">₹${Math.round(pend).toLocaleString("en-IN")}</td>
        </tr>`;
      }).join("");

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>ElectroServe — Customer Report</title>
        <style>
          body{font-family:Arial,sans-serif;padding:24px;font-size:12px;color:#1e293b}
          h1{font-size:20px;margin-bottom:4px}
          p{color:#64748b;margin-bottom:16px;font-size:11px}
          table{width:100%;border-collapse:collapse}
          th{background:#1e293b;color:#fff;padding:8px 10px;text-align:left;font-size:11px;white-space:nowrap}
          td{padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:11px}
          tr:nth-child(even){background:#f8fafc}
          @media print{body{padding:0}}
        </style></head><body>
        <h1>⚡ ElectroServe — Customer Report</h1>
        <p>Generated: ${new Date().toLocaleString("en-IN")} · Total: ${customers.length} customers</p>
        <table><thead><tr>
          <th>Naam</th><th>Mobile</th><th>Machine</th><th>Service Date</th>
          <th>Warranty</th><th>Warranty End</th><th>Status</th>
          <th>Jobs</th><th>Paid</th><th>Pending</th>
        </tr></thead><tbody>${rows}</tbody></table>
        <script>window.onload=()=>{window.print();}<\/script>
        </body></html>`;

      // APK safe — blob download instead of popup
      const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
      downloadBlob(blob, `CustomerReport_${new Date().toLocaleDateString("en-IN").replace(/\//g,"-")}.html`);
    } catch(e) { toast("PDF error: " + e.message, "error"); }
    finally { setExporting(false); }
  };

  const machineTypes = [...new Set(customers.map(c => c.machineType).filter(Boolean))];

  const isExpiringSoon = c => {
    if (!c.warrantyEnd) return false;
    const d = (new Date(c.warrantyEnd) - new Date()) / 86400000;
    return d >= 0 && d <= 30;
  };

  const filtered = customers
    .filter(c => {
      const q = search.toLowerCase();
      const matchQ = !search ||
        c.name?.toLowerCase().includes(q) ||
        c.mobile?.includes(q) ||
        c.machineBrand?.toLowerCase().includes(q) ||
        c.model?.toLowerCase().includes(q) ||
        c.serialNumber?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q);
      const matchS = filterStatus === "ALL" || c.serviceStatus === filterStatus;
      const matchM = !filterMachine || c.machineType === filterMachine;
      return matchQ && matchS && matchM;
    })
    .sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (typeof av === "string") av = av?.toLowerCase();
      if (typeof bv === "string") bv = bv?.toLowerCase();
      return sortDir === "asc" ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
    });

  const toggleSort = f => {
    if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("asc"); }
  };

  // Open customer invoices view modal
  const openCustInvoices = async (c) => {
    setCustInvModal(c);
    setCustInvLoad(true);
    setCustInvList([]);
    try {
      const res = await apiFetch(`${API}/invoices/customer/${c.id}`, { headers: authHeader() });
      const data = res.ok ? await res.json() : [];
      setCustInvList(Array.isArray(data) ? data.sort((a,b)=> new Date(b.invoiceDate||0)-new Date(a.invoiceDate||0)) : []);
    } catch(e) { setCustInvList([]); }
    finally { setCustInvLoad(false); }
  };

  const openMap = c => {
    if (c.latitude && c.longitude) {
      openExternal(`https://www.google.com/maps?q=${c.latitude},${c.longitude}`);
    } else if (c.address) {
      openExternal(`https://www.google.com/maps/search/${encodeURIComponent(c.address)}`);
    } else {
      toast("Koi location data nahi hai.", "warning");
    }
  };

  const handleMarkDone = async id => {
    setLoadingId(id);
    try { await markServiceDone(id); await onRefresh(); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoadingId(null); }
  };

  const handleDelete = async id => {
    setLoadingId(id);
    try { await deleteCustomer(id); await onRefresh(); setConfirmDelete(null); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoadingId(null); }
  };

  const handleWA = async (id, type) => {
    try {
      let link;
      if (type === "thankyou")  link = await getWhatsAppLink(id);
      if (type === "reminder")  link = await getWhatsAppReminderLink(id);
      if (type === "warranty")  link = await getWhatsAppWarrantyLink(id);
      openExternal(link);
    } catch (e) { toast(e.message, "error"); }
  };

  const openEdit = c => {
    setEditId(c.id);
    setEditForm({
      ...c,
      serviceDate:  c.serviceDate  || "",
      warrantyPeriod: c.warrantyPeriod || "No Warranty",
    });
  };

  const handleEditSave = async () => {
    setLoadingId(editId);
    try { await updateCustomer(editId, editForm); await onRefresh(); setEditId(null); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoadingId(null); }
  };

  const SortIcon = ({ f }) => (
    <span className="sort-icon">{sortField === f ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
  );

  const detailCustomer = customers.find(c => c.id === detailId);

  // Show CustomerHistory page if selected
  if (historyCustomer) {
    return (
      <CustomerHistory
        customer={historyCustomer}
        onBack={() => setHistoryCustomer(null)}
        onRefresh={onRefresh}
      />
    );
  }

  return (
    <div className="customer-list">

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-input"
            placeholder="Search naam, mobile, brand, model, serial..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="clear-btn" onClick={() => setSearch("")}>✕</button>}
        </div>
        <div className="filter-chips">
          {["ALL","PENDING","DONE","CANCELLED"].map(s => (
            <button key={s} className={`chip ${filterStatus===s?"chip-active":""}`}
              onClick={() => setFilterStatus(s)}>
              {s==="ALL" ? "Sab" : s==="PENDING" ? "⏳ Pending" : s==="DONE" ? "✅ Done" : "❌ Cancelled"}
            </button>
          ))}
        </div>
        <select className="machine-filter" value={filterMachine}
          onChange={e => setFilterMachine(e.target.value)}>
          <option value="">Sab Machines</option>
          {machineTypes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="results-count">{filtered.length} customers</span>
        <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
          <button onClick={exportExcel} disabled={exporting}
            style={{padding:"7px 14px",borderRadius:10,border:"1.5px solid #10b981",background:exporting?"#f8fafc":"rgba(16,185,129,0.06)",color:"#059669",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
            📊 {exporting?"Exporting...":"Excel Export"}
          </button>
          <button onClick={exportPDF} disabled={exporting}
            style={{padding:"7px 14px",borderRadius:10,border:"1.5px solid #6366f1",background:exporting?"#f8fafc":"rgba(99,102,241,0.06)",color:"#6366f1",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
            📄 {exporting?"Exporting...":"PDF Report"}
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>Koi customer nahi mila.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="customers-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("name")} className="sortable">Naam <SortIcon f="name" /></th>
                <th>Mobile</th>
                <th>Address / Map</th>
                <th onClick={() => toggleSort("machineType")} className="sortable">Machine <SortIcon f="machineType" /></th>
                <th>Brand / Model</th>
                <th>Service Kya Kiya</th>
                <th onClick={() => toggleSort("serviceDate")} className="sortable">Service Date <SortIcon f="serviceDate" /></th>
                <th onClick={() => toggleSort("warrantyEnd")} className="sortable">Warranty Tak <SortIcon f="warrantyEnd" /></th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className={isExpiringSoon(c) ? "row-warning" : ""}>

                  <td>
                    <div className="customer-name-cell">
                      <div className="mini-avatar">{c.name?.[0]?.toUpperCase()}</div>
                      <div>
                        <div className="c-name">{c.name}</div>
                        {c.notes && <div className="c-notes">📝 {c.notes}</div>}
                      </div>
                    </div>
                  </td>

                  <td>
                    <a href={`tel:${c.mobile}`} className="mobile-link">📞 {c.mobile}</a>
                  </td>

                  <td>
                    <button className="addr-btn" onClick={() => openMap(c)} title="Map mein kholo">
                      📍 {c.address ? c.address.slice(0, 22) + (c.address.length > 22 ? "..." : "") : "—"}
                    </button>
                  </td>

                  <td>{c.machineType}</td>

                  <td>
                    {c.machineBrand}
                    <br /><span className="sub-text">{c.model}</span>
                    <br /><span className="serial">{c.serialNumber}</span>
                  </td>

                  <td>
                    {c.serviceDetails ? (
                      <button className="details-preview" onClick={() => setDetailId(c.id)}>
                        🔧 {c.serviceDetails.slice(0, 28)}{c.serviceDetails.length > 28 ? "..." : ""}
                      </button>
                    ) : <span className="sub-text">—</span>}
                  </td>

                  <td>{c.serviceDate || "—"}</td>

                  <td>
                    <span className={isExpiringSoon(c) ? "expiring-soon" : ""}>{c.warrantyEnd || "—"}</span>
                    {isExpiringSoon(c) && <span className="expiry-badge">⚠️ Jaldi!</span>}
                    {c.warrantyPeriod && <div className="sub-text">{c.warrantyPeriod}</div>}
                  </td>

                  <td>
                    <span className={`status-badge status-${c.serviceStatus?.toLowerCase()}`}>
                      {c.serviceStatus === "DONE"      ? "✅ Done"
                       : c.serviceStatus === "CANCELLED" ? "❌ Cancelled"
                       : "⏳ Pending"}
                    </span>
                  </td>

                  <td>
                    <div className="action-btns">
                      {/* ✔ Mark Done — sirf PENDING pe */}
                      {c.serviceStatus === "PENDING" && (
                        <button className="act-btn act-green" onClick={() => handleMarkDone(c.id)}
                          disabled={loadingId===c.id} title="Mark Done">✔</button>
                      )}

                      {/* Edit — hamesha */}
                      <button className="act-btn act-blue" onClick={() => openEdit(c)} title="Edit">✏️</button>

                      {/* History — hamesha — customer history page */}
                      <button className="act-btn" onClick={() => setHistoryCustomer(c)}
                        title="Customer History"
                        style={{ background:"rgba(139,92,246,0.1)", color:"#7c3aed", border:"none",
                          borderRadius:8, padding:"5px 8px", cursor:"pointer", fontSize:14 }}>
                        📋
                      </button>

                      {/* Map — hamesha */}
                      <button className="act-btn act-map" onClick={() => openMap(c)} title="Map Kholo">🗺️</button>

                      {/* CANCELLED pe sirf Edit+Map+Delete dikhao — baaki sab hide */}
                      {c.serviceStatus !== "CANCELLED" && (<>
                        <button className="act-btn act-whatsapp" onClick={() => handleWA(c.id,"thankyou")} title="Thank You">💬</button>
                        <button className="act-btn act-orange"   onClick={() => handleWA(c.id,"reminder")} title="Reminder">🔔</button>

                        {/* Warranty buttons — sirf tab jab warranty ho */}
                        {c.warrantyPeriod && c.warrantyPeriod !== "No Warranty" && (<>
                          <button className="act-btn act-warranty" onClick={() => handleWA(c.id,"warranty")} title="Warranty Card WhatsApp">🛡️</button>
                          <button className="act-btn act-pdf"     onClick={() => generateWarrantyCard({
                              ...c,
                              technicianName: c.technicianName || "",
                              companyName:    companySettings?.companyName    || "",
                              companyPhone:   companySettings?.companyPhone   || "",
                              companyPhone2:  companySettings?.companyPhone2  || "",
                              companyEmail:   companySettings?.companyEmail   || "",
                              companyAddress: companySettings?.companyAddress || "",
                              signatureBase64:companySettings?.signatureBase64|| null,
                            })} title="Warranty PDF Download">📋</button>
                        </>)}

                        {/* Invoice — sirf DONE pe */}
                        {c.serviceStatus === "DONE" && (
                          <button className="act-btn act-invoice" onClick={() => openCustInvoices(c)} title="Customer Invoices Dekho">📄</button>
                        )}
                      </>)}

                      {/* Delete — hamesha */}
                      <button className="act-btn act-red" onClick={() => setConfirmDelete(c.id)} title="Delete">🗑️</button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Service Details Popup */}
      {detailCustomer && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setDetailId(null)}>
          <div className="modal modal-small">
            <div className="modal-header">
              <h3>🔧 Service Details — {detailCustomer.name}</h3>
              <button className="modal-close" onClick={() => setDetailId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-row"><span>Machine:</span> {detailCustomer.machineType} — {detailCustomer.machineBrand} {detailCustomer.model}</div>
              <div className="detail-row"><span>Serial No:</span> {detailCustomer.serialNumber || "—"}</div>
              <div className="detail-row"><span>Service Date:</span> {detailCustomer.serviceDate || "—"}</div>
              <div className="detail-row"><span>Warranty:</span> {detailCustomer.warrantyPeriod} (till {detailCustomer.warrantyEnd})</div>
              <div className="detail-work">
                <div className="detail-work-label">✅ Kya Kaam Kiya:</div>
                <div className="detail-work-text">{detailCustomer.serviceDetails || "—"}</div>
              </div>
              {detailCustomer.notes && (
                <div className="detail-row notes-row"><span>Notes:</span> {detailCustomer.notes}</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-whatsapp" onClick={() => handleWA(detailCustomer.id, "warranty")}>
                🛡️ Warranty Card WhatsApp pe bhejo
              </button>
              <button className="btn-primary" onClick={() => generateWarrantyCard({
                ...detailCustomer,
                technicianName: detailCustomer.technicianName || "",
                companyName:    companySettings?.companyName    || "",
                companyPhone:   companySettings?.companyPhone   || "",
                companyPhone2:  companySettings?.companyPhone2  || "",
                companyEmail:   companySettings?.companyEmail   || "",
                companyAddress: companySettings?.companyAddress || "",
                signatureBase64:companySettings?.signatureBase64|| null,
              })}>
                📋 Download Warranty Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editId && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setEditId(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>✏️ Customer Edit Karo</h3>
              <button className="modal-close" onClick={() => setEditId(null)}>✕</button>
            </div>
            <div className="modal-body edit-grid">
              {[
                {k:"name",    label:"Naam",         type:"text"},
                {k:"mobile",  label:"Mobile",        type:"tel"},
                {k:"address", label:"Address",       type:"text"},
                {k:"machineType",  label:"Machine Type", type:"select", opts:MACHINE_TYPES},
                {k:"machineBrand", label:"Brand",        type:"select", opts:BRANDS},
                {k:"model",        label:"Model",         type:"text"},
                {k:"serialNumber", label:"Serial No.",    type:"text"},
                {k:"serviceDate",  label:"Service Date",  type:"date"},
                {k:"warrantyPeriod",label:"Warranty Period",type:"select",opts:WARRANTY_PERIODS},
                {k:"notes",        label:"Notes",         type:"text"},
              ].map(({k,label,type,opts}) => (
                <div key={k} className="field-group">
                  <label>{label}</label>
                  {type === "select" ? (
                    <select value={editForm[k]||""} onChange={e => setEditForm({...editForm,[k]:e.target.value})}>
                      <option value="">-- Select --</option>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={editForm[k]||""}
                      onChange={e => setEditForm({...editForm,[k]:e.target.value})} />
                  )}
                </div>
              ))}
              <div className="field-group full-width">
                <label>Kya Kaam Kiya</label>
                <textarea className="form-textarea" rows={3}
                  value={editForm.serviceDetails||""}
                  onChange={e => setEditForm({...editForm, serviceDetails:e.target.value})} />
              </div>
              <div className="field-group">
                <label>Status</label>
                <select value={editForm.serviceStatus}
                  onChange={e => setEditForm({...editForm,serviceStatus:e.target.value})}>
                  <option value="PENDING">⏳ Pending</option>
                  <option value="DONE">✅ Done</option>
                  <option value="CANCELLED">❌ Cancelled</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditId(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleEditSave}
                disabled={loadingId===editId}>
                {loadingId===editId ? "Saving..." : "💾 Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal modal-small">
            <div className="modal-header"><h3>🗑️ Delete Confirm</h3></div>
            <div className="modal-body"><p>Pakka delete karna hai? Wapas nahi aayega.</p></div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete)}>Haan, Delete Karo</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal — create new (kept for compatibility) */}
      {invoiceCustomer && (
        <InvoiceModal
          customer={invoiceCustomer}
          onClose={() => setInvoiceCustomer(null)}
        />
      )}

      {/* Customer Invoices View Modal — PDF download */}
      {custInvModal && (
        <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}
             onClick={() => setCustInvModal(null)}>
          <div style={{ position:"absolute", inset:0, background:"rgba(15,23,42,0.6)", backdropFilter:"blur(5px)" }}/>
          <div style={{
              position:"relative", background:"#fff", borderRadius:20,
              width:520, maxWidth:"calc(100vw - 32px)",
              maxHeight:"80vh", display:"flex", flexDirection:"column",
              boxShadow:"0 24px 64px rgba(0,0,0,0.3)",
              overflow:"hidden",
            }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid #f1f5f9", flexShrink:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:16, color:"#1e293b" }}>📄 {custInvModal.name} ke Invoices</div>
                  <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>PDF download ya details dekho</div>
                </div>
                <button onClick={() => setCustInvModal(null)} style={{
                  width:30, height:30, borderRadius:"50%", border:"1.5px solid #e2e8f0",
                  background:"#f8fafc", cursor:"pointer", fontSize:14, flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b",
                }}>✕</button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex:1, overflowY:"auto", padding:"14px 20px" }}>
              {custInvLoad ? (
                <div style={{ textAlign:"center", padding:40, color:"#64748b" }}>⚡ Load ho raha hai...</div>
              ) : custInvList.length === 0 ? (
                <div style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
                  <div style={{ color:"#64748b", fontWeight:600 }}>Koi invoice nahi mila</div>
                  <div style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>Job complete karne ke baad invoice banega</div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {custInvList.map(inv => (
                    <div key={inv.id} style={{
                      background:"#f8fafc", borderRadius:12, padding:"12px 14px",
                      border:"1.5px solid #e2e8f0", display:"flex", alignItems:"center", gap:12,
                    }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:"#1e293b" }}>{inv.invoiceNumber}</div>
                        <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
                          📅 {inv.invoiceDate} &nbsp;·&nbsp; 👷 {inv.technicianName||"—"}
                        </div>
                        <div style={{ display:"flex", gap:8, marginTop:4, alignItems:"center" }}>
                          <span style={{ fontWeight:800, fontSize:14, color:"#10b981" }}>₹{Number(inv.totalAmount||0).toLocaleString("en-IN")}</span>
                          <span style={{
                            fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
                            background: inv.paymentStatus==="PAID" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                            color: inv.paymentStatus==="PAID" ? "#059669" : "#ef4444",
                          }}>{inv.paymentStatus}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadInvoicePdf(inv.id, custInvModal.name, inv.invoiceNumber)}
                        style={{
                          padding:"8px 14px", borderRadius:10, cursor:"pointer",
                          background:"linear-gradient(135deg,#3b82f6,#2563eb)",
                          color:"#fff", border:"none", fontWeight:700, fontSize:12,
                          display:"flex", alignItems:"center", gap:6, flexShrink:0,
                        }}>
                        ⬇️ PDF
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:"12px 20px", borderTop:"1px solid #f1f5f9", flexShrink:0, background:"#fafafa" }}>
              <div style={{ fontSize:12, color:"#64748b", textAlign:"center" }}>
                {custInvList.length} invoice{custInvList.length!==1?"s":""} found
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
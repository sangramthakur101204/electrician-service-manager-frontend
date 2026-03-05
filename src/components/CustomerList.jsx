// src/components/CustomerList.jsx
import { useState } from "react";
import {
  markServiceDone, deleteCustomer,
  getWhatsAppLink, getWhatsAppReminderLink, getWhatsAppWarrantyLink,
  updateCustomer
} from "../services/api";
import { generateWarrantyCard } from "./WarrantyCard";
import InvoiceModal from "./InvoiceGenerator";

const MACHINE_TYPES = ["AC", "Washing Machine", "Water Purifier", "Refrigerator", "Microwave", "Geyser", "Fan", "Motor Pump", "Inverter", "Other"];
const BRANDS = ["LG", "Samsung", "Whirlpool", "Voltas", "Daikin", "Godrej", "Haier", "Panasonic", "Blue Star", "Carrier", "Other"];
const WARRANTY_PERIODS = ["3 months", "6 months", "1 year", "2 years", "3 years"];
const EMPTY_EDIT = {
  name: "", mobile: "", address: "", latitude: "", longitude: "",
  machineType: "", machineBrand: "", model: "", serialNumber: "",
  serviceDate: "", warrantyPeriod: "1 year", serviceDetails: "",
  serviceStatus: "PENDING", notes: "",
};

export default function CustomerList({ customers, onRefresh }) {
  const [search,        setSearch]       = useState("");
  const [filterStatus,  setFilterStatus] = useState("ALL");
  const [filterMachine, setFilterMachine]= useState("");
  const [editId,        setEditId]       = useState(null);
  const [editForm,      setEditForm]     = useState(EMPTY_EDIT);
  const [confirmDelete, setConfirmDelete]= useState(null);
  const [loadingId,     setLoadingId]    = useState(null);
  const [sortField,     setSortField]    = useState("id");
  const [sortDir,       setSortDir]      = useState("desc");
  const [detailId,      setDetailId]     = useState(null); // service details popup
  const [invoiceCustomer, setInvoiceCustomer] = useState(null); // invoice modal

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

  const openMap = c => {
    if (c.latitude && c.longitude) {
      window.open(`https://www.google.com/maps?q=${c.latitude},${c.longitude}`, "_blank");
    } else if (c.address) {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(c.address)}`, "_blank");
    } else {
      alert("Koi location data nahi hai.");
    }
  };

  const handleMarkDone = async id => {
    setLoadingId(id);
    try { await markServiceDone(id); await onRefresh(); }
    catch (e) { alert(e.message); }
    finally { setLoadingId(null); }
  };

  const handleDelete = async id => {
    setLoadingId(id);
    try { await deleteCustomer(id); await onRefresh(); setConfirmDelete(null); }
    catch (e) { alert(e.message); }
    finally { setLoadingId(null); }
  };

  const handleWA = async (id, type) => {
    try {
      let link;
      if (type === "thankyou")  link = await getWhatsAppLink(id);
      if (type === "reminder")  link = await getWhatsAppReminderLink(id);
      if (type === "warranty")  link = await getWhatsAppWarrantyLink(id);
      window.open(link, "_blank");
    } catch (e) { alert(e.message); }
  };

  const openEdit = c => {
    setEditId(c.id);
    setEditForm({
      ...c,
      serviceDate:  c.serviceDate  || "",
      warrantyPeriod: c.warrantyPeriod || "1 year",
    });
  };

  const handleEditSave = async () => {
    setLoadingId(editId);
    try { await updateCustomer(editId, editForm); await onRefresh(); setEditId(null); }
    catch (e) { alert(e.message); }
    finally { setLoadingId(null); }
  };

  const SortIcon = ({ f }) => (
    <span className="sort-icon">{sortField === f ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
  );

  const detailCustomer = customers.find(c => c.id === detailId);

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
          {["ALL","PENDING","DONE"].map(s => (
            <button key={s} className={`chip ${filterStatus===s?"chip-active":""}`}
              onClick={() => setFilterStatus(s)}>
              {s==="ALL" ? "Sab" : s==="PENDING" ? "⏳ Pending" : "✅ Done"}
            </button>
          ))}
        </div>
        <select className="machine-filter" value={filterMachine}
          onChange={e => setFilterMachine(e.target.value)}>
          <option value="">Sab Machines</option>
          {machineTypes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="results-count">{filtered.length} customers</span>
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
                      {c.serviceStatus === "DONE" ? "✅ Done" : "⏳ Pending"}
                    </span>
                  </td>

                  <td>
                    <div className="action-btns">
                      {c.serviceStatus !== "DONE" && (
                        <button className="act-btn act-green" onClick={() => handleMarkDone(c.id)}
                          disabled={loadingId===c.id} title="Mark Done">✔</button>
                      )}
                      <button className="act-btn act-blue"    onClick={() => openEdit(c)}           title="Edit">✏️</button>
                      <button className="act-btn act-map"     onClick={() => openMap(c)}             title="Map Kholo">🗺️</button>
                      <button className="act-btn act-whatsapp" onClick={() => handleWA(c.id,"thankyou")} title="Thank You">💬</button>
                      <button className="act-btn act-orange"  onClick={() => handleWA(c.id,"reminder")} title="Reminder">🔔</button>
                      <button className="act-btn act-warranty" onClick={() => handleWA(c.id,"warranty")} title="Warranty Card WhatsApp">🛡️</button>
                      <button className="act-btn act-pdf"     onClick={() => generateWarrantyCard(c)} title="Warranty PDF Download">📋</button>
                      <button className="act-btn act-invoice" onClick={() => setInvoiceCustomer(c)} title="Invoice Banao">📄</button>
                      <button className="act-btn act-red"     onClick={() => setConfirmDelete(c.id)} title="Delete">🗑️</button>
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
              <button className="btn-primary" onClick={() => generateWarrantyCard(detailCustomer)}>
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

      {/* Invoice Modal */}
      {invoiceCustomer && (
        <InvoiceModal
          customer={invoiceCustomer}
          onClose={() => setInvoiceCustomer(null)}
        />
      )}

    </div>
  );
}
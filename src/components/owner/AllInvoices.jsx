// src/components/owner/AllInvoices.jsx
import { useState, useEffect } from "react";
import { authHeader, downloadInvoicePdf } from "../../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const fmt  = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

export default function AllInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("ALL"); // ALL | PAID | UNPAID

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/invoices`, { headers: authHeader() });
      const data = await res.json();
      // Sort by newest first
      setInvoices(Array.isArray(data) ? data.sort((a, b) => b.id - a.id) : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const markPaid = async (id, method = "Cash") => {
    try {
      await fetch(`${API}/invoices/${id}/pay?method=${method}`, {
        method: "PUT", headers: authHeader(),
      });
      fetchInvoices();
    } catch (e) { alert(e.message); }
  };

  const deleteInvoice = async (id) => {
    if (!window.confirm("Invoice delete karna hai?")) return;
    try {
      await fetch(`${API}/invoices/${id}`, { method: "DELETE", headers: authHeader() });
      fetchInvoices();
    } catch (e) { alert(e.message); }
  };

  const filtered = invoices.filter(inv => {
    if (filter === "ALL")   return true;
    if (filter === "PAID")  return inv.paymentStatus === "PAID";
    if (filter === "UNPAID") return inv.paymentStatus === "UNPAID";
    return true;
  });

  const totalRevenue = invoices
    .filter(i => i.paymentStatus === "PAID")
    .reduce((s, i) => s + (i.totalAmount || 0), 0);

  const pendingAmount = invoices
    .filter(i => i.paymentStatus === "UNPAID")
    .reduce((s, i) => s + (i.totalAmount || 0), 0);

  return (
    <div className="all-inv-page">

      {/* Summary */}
      <div className="all-inv-summary">
        <div className="all-inv-sum-card green">
          <div className="all-inv-sum-val">{fmt(totalRevenue)}</div>
          <div className="all-inv-sum-label">✅ Total Paid</div>
        </div>
        <div className="all-inv-sum-card red">
          <div className="all-inv-sum-val">{fmt(pendingAmount)}</div>
          <div className="all-inv-sum-label">⏳ Pending</div>
        </div>
        <div className="all-inv-sum-card blue">
          <div className="all-inv-sum-val">{invoices.length}</div>
          <div className="all-inv-sum-label">📄 Total Invoices</div>
        </div>
      </div>

      {/* Filter */}
      <div className="all-inv-filters">
        {["ALL","PAID","UNPAID"].map(f => (
          <button key={f}
            className={`all-inv-filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}>
            {f === "ALL" ? `Sab (${invoices.length})` : f === "PAID" ? `✅ Paid (${invoices.filter(i => i.paymentStatus === "PAID").length})` : `⏳ Pending (${invoices.filter(i => i.paymentStatus === "UNPAID").length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="loader-wrap"><div className="pulse-loader">⚡</div></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧾</div>
          <p>Koi invoice nahi mila</p>
        </div>
      ) : (
        <div className="all-inv-list">
          {filtered.map(inv => (
            <div key={inv.id} className={`all-inv-card ${inv.paymentStatus === "UNPAID" ? "unpaid" : ""}`}>
              <div className="all-inv-card-top">
                <div className="all-inv-left">
                  <div className="all-inv-num">{inv.invoiceNumber}</div>
                  <div className="all-inv-customer">{inv.customer?.name || "Unknown"}</div>
                  {inv.technicianName && (
                    <div className="all-inv-tech">👷 {inv.technicianName}</div>
                  )}
                  <div className="all-inv-date">📅 {inv.invoiceDate}</div>
                </div>
                <div className="all-inv-right">
                  <div className="all-inv-amount">{fmt(inv.totalAmount)}</div>
                  <div className={`all-inv-status ${inv.paymentStatus === "PAID" ? "paid" : "unpaid"}`}>
                    {inv.paymentStatus === "PAID" ? `✅ ${inv.paymentMethod}` : "⏳ Pending"}
                  </div>
                </div>
              </div>

              {/* Items list */}
              {inv.items?.length > 0 && (
                <div className="all-inv-items">
                  {inv.items.map((item, i) => (
                    <div key={i} className="all-inv-item-row">
                      <span>{item.serviceName}</span>
                      <span>{fmt(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="all-inv-actions">
                {inv.paymentStatus === "UNPAID" && (
                  <>
                    <button className="all-inv-btn green" onClick={() => markPaid(inv.id, "Cash")}>💵 Cash Mila</button>
                    <button className="all-inv-btn blue"  onClick={() => markPaid(inv.id, "UPI")}>📱 UPI Mila</button>
                  </>
                )}
                <button className="all-inv-btn grey"
                  onClick={() => downloadInvoicePdf(inv.id, inv.customer?.name, inv.invoiceNumber)}>
                  📄 PDF
                </button>
                {inv.customer?.mobile && (
                  <a href={`https://wa.me/91${inv.customer.mobile}?text=${encodeURIComponent(
                    `Namaste ${inv.customer.name} ji! Aapka invoice ${inv.invoiceNumber} ready hai. Total: ${fmt(inv.totalAmount)}. - Matoshree Enterprises`)}`}
                    target="_blank" rel="noreferrer" className="all-inv-btn wa">
                    💬 WA
                  </a>
                )}
                <button className="all-inv-btn red" onClick={() => deleteInvoice(inv.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

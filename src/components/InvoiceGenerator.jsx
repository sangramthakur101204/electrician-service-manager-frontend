// src/components/InvoiceGenerator.jsx
import { useState, useEffect, useRef } from "react";
import { getRateCards, createInvoice, downloadInvoicePdf } from "../services/api";

export default function InvoiceModal({ customer, onClose }) {
  const [rateCards, setRateCards]         = useState([]);
  const [items, setItems]                 = useState([]);
  const [search, setSearch]               = useState("");
  const [filterCat, setFilterCat]         = useState("");
  const [discount, setDiscount]           = useState("");
  const [taxPercent, setTaxPercent]       = useState("");
  const [notes, setNotes]                 = useState(customer.serviceDetails || "");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [loading, setLoading]             = useState(false);
  const [rcLoading, setRcLoading]         = useState(true);
  const [showDropdown, setShowDropdown]   = useState(false);

  const [cusName,  setCusName]  = useState("");
  const [cusPrice, setCusPrice] = useState("");
  const [cusQty,   setCusQty]   = useState(1);
  const [cusDesc,  setCusDesc]  = useState("");
  const [isPaid, setIsPaid] = useState(false);

  const searchRef = useRef(null);

  useEffect(() => {
    getRateCards()
      .then(setRateCards)
      .catch(() => {})
      .finally(() => setRcLoading(false));
  }, []);

  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const disc     = parseFloat(discount) || 0;
  const taxPct   = parseFloat(taxPercent) || 0;
  const taxAmt   = (subtotal - disc) * taxPct / 100;
  const total    = subtotal - disc + taxAmt;

  const categories = [...new Set(rateCards.map(r => r.category))].sort();
  const filteredRC = rateCards.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      r.serviceName?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.category?.toLowerCase().includes(q);
    const matchCat = !filterCat || r.category === filterCat;
    return matchSearch && matchCat;
  });

  const addFromRC = (rc) => {
    setItems(prev => [...prev, {
      id: Date.now() + Math.random(),
      serviceName: rc.serviceName,
      description: rc.description || "",
      qty: 1,
      price: rc.price,
    }]);
    setSearch("");
    setShowDropdown(false);
    searchRef.current?.focus();
  };

  const addCustom = () => {
    const name  = cusName.trim();
    const price = parseFloat(cusPrice);
    if (!name) { alert("Service naam likhna zaroori hai!"); return; }
    if (isNaN(price) || price < 0) { alert("Valid price daalo!"); return; }
    setItems(prev => [...prev, {
      id: Date.now() + Math.random(),
      serviceName: name,
      description: cusDesc.trim(),
      qty: parseInt(cusQty) || 1,
      price,
    }]);
    setCusName(""); setCusPrice(""); setCusQty(1); setCusDesc("");
  };

  const removeItem  = (id) => setItems(prev => prev.filter(i => i.id !== id));
  const updateQty   = (id, v) => setItems(prev => prev.map(i => i.id === id ? {...i, qty: Math.max(1, parseInt(v)||1)} : i));
  const updatePrice = (id, v) => setItems(prev => prev.map(i => i.id === id ? {...i, price: parseFloat(v)||0} : i));
  const updateName  = (id, v) => setItems(prev => prev.map(i => i.id === id ? {...i, serviceName: v} : i));

  const handleSubmit = async () => {
    if (items.length === 0) { alert("Koi bhi ek item add karo pehle!"); return; }
    setLoading(true);
    try {
      const invoice = await createInvoice({
        customerId:  customer.id,
        items: items.map(i => ({
          serviceName: i.serviceName,
          description: i.description,
          quantity:    i.qty,
          unitPrice:   i.price,
        })),
        discountAmt:  disc,
        taxPercent:   taxPct,
        notes,
        paymentMethod,
        paymentStatus: isPaid ? "PAID" : "UNPAID",
      });
      await downloadInvoicePdf(invoice.id, customer.name, invoice.invoiceNumber);
      onClose();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal invoice-modal">

        <div className="modal-header">
          <div>
            <h3>📄 Invoice Banao</h3>
            <div className="inv-header-sub">
              {customer.machineType} — {customer.machineBrand} {customer.model}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body invoice-body">

          {/* Customer strip */}
          <div className="inv-customer-strip">
            <span className="inv-chip">👤 {customer.name}</span>
            <span className="inv-chip">📞 {customer.mobile}</span>
            {customer.address && (
              <span className="inv-chip">📍 {customer.address.slice(0, 35)}{customer.address.length > 35 ? "…" : ""}</span>
            )}
          </div>

          {/* SECTION 1 — Rate Card */}
          <div className="inv-section">
            <div className="inv-section-title">🔍 Rate Card Se Item Add Karo</div>
            <div className="inv-search-row">
              <select
                className="inv-cat-select"
                value={filterCat}
                onChange={e => { setFilterCat(e.target.value); setShowDropdown(true); }}
              >
                <option value="">Sab Machines</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="inv-search-wrap" style={{ flex: 1, position: "relative" }}>
                <input
                  ref={searchRef}
                  className="inv-search-input"
                  placeholder="Service naam type karo..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={e => e.key === "Escape" && setShowDropdown(false)}
                />
                {showDropdown && (
                  <div className="inv-dropdown">
                    {rcLoading ? (
                      <div className="inv-dd-empty">⏳ Load ho rahi hain...</div>
                    ) : filteredRC.length === 0 ? (
                      <div className="inv-dd-empty">Koi service nahi mili — neeche custom add karo</div>
                    ) : (
                      filteredRC.slice(0, 25).map(rc => (
                        <div
                          key={rc.id}
                          className="inv-dd-row"
                          onMouseDown={e => { e.preventDefault(); addFromRC(rc); }}
                        >
                          <div className="inv-dd-left">
                            <span className="inv-dd-name">{rc.serviceName}</span>
                            <span className="inv-dd-cat">{rc.category} — {rc.description}</span>
                          </div>
                          <div className="inv-dd-right">
                            <span className="inv-dd-price">₹{rc.price}</span>
                            <span className="inv-dd-unit">{rc.unit}</span>
                          </div>
                        </div>
                      ))
                    )}
                    <button
                      className="inv-dd-close-btn"
                      onMouseDown={e => { e.preventDefault(); setShowDropdown(false); }}
                    >
                      ✕ Band Karo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2 — Custom Item */}
          <div className="inv-section">
            <div className="inv-section-title">✏️ Custom Item Add Karo</div>
            <div className="inv-custom-grid">
              <input
                className="inv-field-input"
                placeholder="Service naam *"
                value={cusName}
                onChange={e => setCusName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustom()}
                style={{ gridColumn: "1 / 3" }}
              />
              <input
                className="inv-field-input"
                placeholder="Description (optional)"
                value={cusDesc}
                onChange={e => setCusDesc(e.target.value)}
                style={{ gridColumn: "3 / 5" }}
              />
              <input
                type="number" min="1"
                className="inv-field-input"
                placeholder="Qty"
                value={cusQty}
                onChange={e => setCusQty(e.target.value)}
              />
              <input
                type="number" min="0"
                className="inv-field-input"
                placeholder="Price ₹ *"
                value={cusPrice}
                onChange={e => setCusPrice(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustom()}
              />
              <button className="btn-primary inv-add-btn" onClick={addCustom} style={{ gridColumn: "3 / 5" }}>
                + Add Custom Item
              </button>
            </div>
          </div>

          {/* SECTION 3 — Items Table */}
          {items.length > 0 ? (
            <div className="inv-section">
              <div className="inv-section-title">🛒 Added Items ({items.length})</div>
              <div className="inv-table-wrap">
                <table className="inv-items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Service / Item</th>
                      <th>Qty</th>
                      <th>Unit Price ₹</th>
                      <th>Total ₹</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="inv-td-num">{idx + 1}</td>
                        <td>
                          <input
                            className="inv-name-edit"
                            value={item.serviceName}
                            onChange={e => updateName(item.id, e.target.value)}
                          />
                          {item.description && <div className="inv-td-desc">{item.description}</div>}
                        </td>
                        <td>
                          <input
                            type="number" min="1"
                            className="inv-small-input"
                            value={item.qty}
                            onChange={e => updateQty(item.id, e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number" min="0"
                            className="inv-small-input"
                            value={item.price}
                            onChange={e => updatePrice(item.id, e.target.value)}
                          />
                        </td>
                        <td className="inv-td-total">₹{(item.qty * item.price).toFixed(2)}</td>
                        <td>
                          <button className="inv-del-btn" onClick={() => removeItem(item.id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="inv-empty-items">
              ℹ️ Koi item add nahi kiya abhi — upar rate card ya custom item se add karo
            </div>
          )}

          {/* SECTION 4 — Totals */}
          <div className="inv-bottom-grid">
            <div className="inv-extras">
              <div className="inv-field-group">
                <label>Discount (₹)</label>
                <input
                  type="number" min="0"
                  className="inv-field-input"
                  placeholder="0"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                />
              </div>
              <div className="inv-field-group">
                <label>GST (%)</label>
                <input
                  type="number" min="0" max="100"
                  className="inv-field-input"
                  placeholder="0"
                  value={taxPercent}
                  onChange={e => setTaxPercent(e.target.value)}
                />
              </div>
              <div className="inv-field-group">
                <label>Payment Method</label>
                <select
                  className="inv-field-input"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash">💵 Cash</option>
                  <option value="UPI">📱 UPI</option>
                  <option value="Bank Transfer">🏦 Bank Transfer</option>
                  <option value="Cheque">🧾 Cheque</option>
                </select>
              </div>
              <div className="inv-field-group" style={{ gridColumn: "1/-1" }}>
                <label>Notes / Remarks</label>
                <textarea
                  className="inv-field-input"
                  rows={3}
                  placeholder="Koi special notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="inv-summary-box">
              <div className="inv-sum-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {disc > 0 && (
                <div className="inv-sum-row inv-sum-discount">
                  <span>Discount (−)</span>
                  <span>−₹{disc.toFixed(2)}</span>
                </div>
              )}
              {taxAmt > 0 && (
                <div className="inv-sum-row">
                  <span>GST ({taxPct}%)</span>
                  <span>₹{taxAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="inv-sum-divider" />
              <div className="inv-sum-row inv-sum-total">
                <span>TOTAL</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <div className="inv-sum-payment">💳 {paymentMethod}</div>
              <div className="inv-field-group" style={{marginTop:"10px"}}>
                <label style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer"}}>
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={e => setIsPaid(e.target.checked)}
                    style={{width:"16px",height:"16px"}}
                  />
                  <span style={{fontSize:"13px",color:"var(--text-primary)"}}>✅ Payment mil gayi?</span>
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn-primary inv-submit-btn"
            onClick={handleSubmit}
            disabled={loading || items.length === 0}
          >
            {loading
              ? "⏳ Invoice ban rahi hai..."
              : `📄 Invoice Banao & Download  (₹${total.toFixed(2)})`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
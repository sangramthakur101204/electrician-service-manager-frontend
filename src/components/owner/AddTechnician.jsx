// src/components/owner/AddTechnician.jsx
import { useState, useEffect } from "react";
import { addTechnician, getTechnicians, deleteTechnician, toggleTechnician } from "../../services/api";

export default function AddTechnician() {
  const [technicians, setTechnicians] = useState([]);
  const [showForm,    setShowForm]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [form, setForm] = useState({ name: "", mobile: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error,  setError]  = useState("");
  const [success, setSuccess] = useState("");

  const fetchTechnicians = async () => {
    setListLoading(true);
    try {
      const data = await getTechnicians();
      setTechnicians(data);
    } catch (e) {
      console.error(e);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { fetchTechnicians(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.mobile || !form.password) {
      setError("Sab fields bharo"); return;
    }
    if (form.mobile.length !== 10) {
      setError("Mobile 10 digit ka hona chahiye"); return;
    }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await addTechnician(form);
      setSuccess(res.message);
      setForm({ name: "", mobile: "", password: "" });
      setShowForm(false);
      fetchTechnicians();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleTechnician(id);
      fetchTechnicians();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`${name} ko delete karna hai?`)) return;
    try {
      await deleteTechnician(id);
      fetchTechnicians();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="tech-page">

      {/* Header */}
      <div className="tech-header">
        <div>
          <h2 className="tech-title">👷 Technicians</h2>
          <p className="tech-sub">{technicians.length} technicians registered</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "➕ Naya Technician Add Karo"}
        </button>
      </div>

      {success && <div className="tech-success">✅ {success}</div>}

      {/* Add Form */}
      {showForm && (
        <div className="tech-form-box">
          <h3 className="tech-form-title">➕ Naya Technician</h3>
          <div className="tech-form-grid">
            <div className="field-group">
              <label>Naam *</label>
              <input
                className="form-input"
                placeholder="Raju Sharma"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
            <div className="field-group">
              <label>Mobile Number *</label>
              <input
                className="form-input"
                type="tel"
                placeholder="9876543210"
                value={form.mobile}
                onChange={e => setForm({...form, mobile: e.target.value})}
                maxLength={10}
              />
            </div>
            <div className="field-group">
              <label>Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  className="form-input"
                  type={showPass ? "text" : "password"}
                  placeholder="Login password set karo"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  style={{ paddingRight: "40px" }}
                />
                <button
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>
          {error && <div className="tech-error">❌ {error}</div>}
          <div className="tech-form-footer">
            <button className="btn-secondary" onClick={() => { setShowForm(false); setError(""); }}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleAdd} disabled={loading}>
              {loading ? "⏳ Add ho raha hai..." : "✅ Technician Add Karo"}
            </button>
          </div>
        </div>
      )}

      {/* Technicians List */}
      {listLoading ? (
        <div className="loader-wrap"><div className="pulse-loader">⚡</div></div>
      ) : technicians.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👷</div>
          <p>Koi technician nahi hai — abhi add karo!</p>
        </div>
      ) : (
        <div className="tech-grid">
          {technicians.map(t => (
            <div key={t.id} className={`tech-card ${!t.isActive ? "tech-card-inactive" : ""}`}>
              <div className="tech-card-top">
                <div className="tech-avatar">
                  {t.name?.[0]?.toUpperCase()}
                </div>
                <div className="tech-info">
                  <div className="tech-name">{t.name}</div>
                  <div className="tech-mobile">📞 {t.mobile}</div>
                </div>
                <span className={`tech-status ${t.isActive ? "status-active" : "status-inactive"}`}>
                  {t.isActive ? "🟢 Active" : "🔴 Inactive"}
                </span>
              </div>
              <div className="tech-card-actions">
                <button
                  className={`act-btn ${t.isActive ? "act-orange" : "act-green"}`}
                  onClick={() => handleToggle(t.id)}
                  title={t.isActive ? "Inactive karo" : "Active karo"}
                >
                  {t.isActive ? "⏸️" : "▶️"}
                </button>
                <button
                  className="act-btn act-red"
                  onClick={() => handleDelete(t.id, t.name)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

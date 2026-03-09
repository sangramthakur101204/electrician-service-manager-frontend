// src/components/AddCustomer.jsx
import { toast } from "./Toast.jsx";
import { useState } from "react";
import { addCustomer } from "../services/api";
import LocationPicker from "./LocationPicker";

const MACHINE_TYPES = ["AC","Washing Machine","Water Purifier","Refrigerator","Microwave","Geyser","Fan","Motor Pump","Inverter","Other"];
const BRANDS = ["LG","Samsung","Whirlpool","Voltas","Daikin","Godrej","Haier","Panasonic","Blue Star","Carrier","Other"];
const WARRANTY_PERIODS = ["3 months","6 months","1 year","2 years","3 years"];

const EMPTY = {
  name:"",mobile:"",address:"",latitude:"",longitude:"",
  machineType:"",machineBrand:"",model:"",serialNumber:"",
  serviceDate: new Date().toISOString().split("T")[0],
  warrantyPeriod:"1 year", serviceDetails:"",serviceStatus:"DONE",notes:"",
};

export default function AddCustomer({ onSuccess }) {
  const [form, setForm]   = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const [success, setSuccess] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const set = (k, v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:""})); };

  const calcWarrantyEnd = () => {
    if (!form.serviceDate || !form.warrantyPeriod) return "—";
    const d = new Date(form.serviceDate);
    if (form.warrantyPeriod==="3 months")  d.setMonth(d.getMonth()+3);
    else if (form.warrantyPeriod==="6 months") d.setMonth(d.getMonth()+6);
    else if (form.warrantyPeriod==="1 year")   d.setFullYear(d.getFullYear()+1);
    else if (form.warrantyPeriod==="2 years")  d.setFullYear(d.getFullYear()+2);
    else if (form.warrantyPeriod==="3 years")  d.setFullYear(d.getFullYear()+3);
    return d.toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"});
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name="Naam zaroori hai";
    if (!/^\d{10}$/.test(form.mobile)) e.mobile="10-digit mobile chahiye";
    if (!form.machineType) e.machineType="Select karo";
    if (!form.machineBrand) e.machineBrand="Select karo";
    if (!form.serviceDate) e.serviceDate="Date zaroori hai";
    if (!form.serviceDetails.trim()) e.serviceDetails="Kya kaam kiya likhna zaroori hai";
    setErrors(e); return Object.keys(e).length===0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await addCustomer(form);
      setSuccess(true); setForm(EMPTY);
      setTimeout(()=>{setSuccess(false); onSuccess&&onSuccess();},1800);
    } catch(err){ toast("Error: " + err.message, "error"); }
    finally { setLoading(false); }
  };

  if (success) return (
    <div className="success-screen">
      <div className="success-icon">✅</div>
      <h2>Customer Add Ho Gaya!</h2>
      <p>Redirect ho raha hai...</p>
    </div>
  );

  return (
    <div className="add-customer">
      <div className="form-card">
        <div className="form-header">
          <h2>➕ Naya Customer Add Karo</h2>
          <p>Service aur machine ki poori jaankari bharein</p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Customer */}
          <div className="form-section">
            <h3 className="section-title">👤 Customer Details</h3>
            <div className="form-grid">
              <div className={`field-group ${errors.name?"has-error":""}`}>
                <label>Naam *</label>
                <input type="text" placeholder="e.g. Ramesh Kumar" value={form.name} onChange={e=>set("name",e.target.value)}/>
                {errors.name && <span className="error-msg">{errors.name}</span>}
              </div>
              <div className={`field-group ${errors.mobile?"has-error":""}`}>
                <label>Mobile *</label>
                <input type="tel" placeholder="10-digit" maxLength={10} value={form.mobile}
                  onChange={e=>set("mobile",e.target.value.replace(/\D/g,""))}/>
                {errors.mobile && <span className="error-msg">{errors.mobile}</span>}
              </div>
            </div>
          </div>

          {/* Location — Blinkit style */}
          <div className="form-section">
            <h3 className="section-title">📍 Customer Ki Location</h3>
            <div className="location-box" onClick={()=>setShowMap(true)}>
              {form.address ? (
                <div className="location-filled">
                  <div className="loc-pin-icon">📍</div>
                  <div className="loc-details">
                    <div className="loc-address">{form.address}</div>
                    {form.latitude && <div className="loc-coords">{parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}</div>}
                  </div>
                  <span className="loc-change-btn">Change ›</span>
                </div>
              ) : (
                <div className="location-empty">
                  <div className="loc-empty-icon">🗺️</div>
                  <div>
                    <div className="loc-empty-title">Location Select Karo</div>
                    <div className="loc-empty-sub">Map pe pin drop karo — Blinkit jaisa!</div>
                  </div>
                  <div className="loc-arrow">›</div>
                </div>
              )}
            </div>
          </div>

          {/* Machine */}
          <div className="form-section">
            <h3 className="section-title">🔧 Machine Details</h3>
            <div className="form-grid">
              <div className={`field-group ${errors.machineType?"has-error":""}`}>
                <label>Machine Type *</label>
                <select value={form.machineType} onChange={e=>set("machineType",e.target.value)}>
                  <option value="">-- Select --</option>
                  {MACHINE_TYPES.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
                {errors.machineType && <span className="error-msg">{errors.machineType}</span>}
              </div>
              <div className={`field-group ${errors.machineBrand?"has-error":""}`}>
                <label>Brand *</label>
                <select value={form.machineBrand} onChange={e=>set("machineBrand",e.target.value)}>
                  <option value="">-- Select --</option>
                  {BRANDS.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
                {errors.machineBrand && <span className="error-msg">{errors.machineBrand}</span>}
              </div>
              <div className="field-group">
                <label>Model</label>
                <input type="text" placeholder="e.g. WM-6504T" value={form.model} onChange={e=>set("model",e.target.value)}/>
              </div>
              <div className="field-group">
                <label>Serial Number</label>
                <input type="text" placeholder="Machine ka serial" value={form.serialNumber} onChange={e=>set("serialNumber",e.target.value)}/>
              </div>
            </div>
          </div>

          {/* Service */}
          <div className="form-section">
            <h3 className="section-title">🛠️ Service Details</h3>
            <div className="form-grid">
              <div className={`field-group ${errors.serviceDate?"has-error":""}`}>
                <label>Service Date *</label>
                <input type="date" value={form.serviceDate} onChange={e=>set("serviceDate",e.target.value)}/>
                {errors.serviceDate && <span className="error-msg">{errors.serviceDate}</span>}
              </div>
              <div className="field-group">
                <label>Warranty Period *</label>
                <select value={form.warrantyPeriod} onChange={e=>set("warrantyPeriod",e.target.value)}>
                  {WARRANTY_PERIODS.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Live warranty preview */}
              <div className="warranty-preview full-width">
                <span className="wp-label">🛡️ Warranty Valid Rahegi:</span>
                <span className="wp-date">{calcWarrantyEnd()}</span>
                <span className="wp-period">tak ({form.warrantyPeriod})</span>
              </div>

              <div className={`field-group full-width ${errors.serviceDetails?"has-error":""}`}>
                <label>Kya Kaam Kiya? *</label>
                <textarea placeholder="e.g. Compressor change kiya, Gas refill ki, PCB replace ki..."
                  value={form.serviceDetails} onChange={e=>set("serviceDetails",e.target.value)}
                  rows={3} className="form-textarea"/>
                {errors.serviceDetails && <span className="error-msg">{errors.serviceDetails}</span>}
              </div>

              <div className="field-group full-width">
                <label>Notes (Optional)</label>
                <input type="text" placeholder="Extra notes..." value={form.notes} onChange={e=>set("notes",e.target.value)}/>
              </div>

              <div className="field-group">
                <label>Status</label>
                <select value={form.serviceStatus} onChange={e=>set("serviceStatus",e.target.value)}>
                  <option value="DONE">✅ Done</option>
                  <option value="PENDING">⏳ Pending</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={()=>setForm(EMPTY)}>🔄 Reset</button>
            <button type="submit" className="btn-primary btn-large" disabled={loading}>
              {loading?"Adding...":"✅ Customer Add Karo"}
            </button>
          </div>
        </form>
      </div>

      {showMap && (
        <LocationPicker
          address={form.address}
          latitude={form.latitude?parseFloat(form.latitude):null}
          longitude={form.longitude?parseFloat(form.longitude):null}
          onLocationSelect={({address,latitude,longitude})=>setForm(f=>({...f,address,latitude,longitude}))}
          onClose={()=>setShowMap(false)}
        />
      )}
    </div>
  );
}
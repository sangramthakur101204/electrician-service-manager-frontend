// src/components/Login.jsx
import { useState } from "react";
import { loginUser } from "../services/api";
import { Phone, Lock, Eye, EyeOff, Zap, LogIn } from "lucide-react";

export default function Login({ onLogin }) {
  const [mobile,   setMobile]   = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!mobile || !password) { setError("Mobile aur password dono bharo"); return; }
    setLoading(true); setError("");
    try {
      const data = await loginUser(mobile, password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify({ id: data.id, name: data.name, mobile: data.mobile, role: data.role }));
      onLogin(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      {/* Animated background grid */}
      <div className="login-bg-grid" />
      <div className="login-bg-glow" />

      <div className="login-box">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <Zap size={32} strokeWidth={2.5} />
          </div>
          <h1 className="login-title">ElectroServe</h1>
          <p className="login-subtitle">Electrician Service Manager</p>
        </div>

        {/* Form */}
        <div className="login-form">
          <div className="login-field">
            <label>Mobile Number</label>
            <div className="login-input-wrap">
              <Phone size={16} className="login-input-icon" />
              <input type="tel" className="login-input" placeholder="9876543210"
                value={mobile} onChange={e => setMobile(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()} maxLength={10} />
            </div>
          </div>

          <div className="login-field">
            <label>Password</label>
            <div className="login-input-wrap">
              <Lock size={16} className="login-input-icon" />
              <input type={showPass ? "text" : "password"} className="login-input"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
              <button className="login-show-pass" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error">
              <span>⚠</span> {error}
            </div>
          )}

          <button className="login-btn" onClick={handleLogin} disabled={loading}>
            {loading
              ? <span className="login-btn-loading"><span className="login-spinner" /> Logging in...</span>
              : <span className="login-btn-content"><LogIn size={18} /> Login Karo</span>
            }
          </button>
        </div>

        <div className="login-footer">
          Service Management System · v2.0
        </div>
      </div>
    </div>
  );
}
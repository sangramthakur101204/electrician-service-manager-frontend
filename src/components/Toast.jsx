// src/components/Toast.jsx
// Global toast system — replaces all alert() and window.confirm()
import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";

// ── Context ────────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

let _addToast = null; // module-level ref so non-component code can call it

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((msg, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    return id;
  }, []);

  const remove = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Expose globally so api.js / non-React code can use it
  useEffect(() => { _addToast = add; return () => { _addToast = null; }; }, [add]);

  const ICONS  = { success:"✅", error:"❌", warning:"⚠️", info:"💡" };
  const COLORS = {
    success: { bg:"#f0fdf4", border:"#bbf7d0", text:"#166534", bar:"#22c55e" },
    error:   { bg:"#fef2f2", border:"#fecaca", text:"#991b1b", bar:"#ef4444" },
    warning: { bg:"#fffbeb", border:"#fde68a", text:"#92400e", bar:"#f59e0b" },
    info:    { bg:"#eff6ff", border:"#bfdbfe", text:"#1e40af", bar:"#3b82f6" },
  };

  return (
    <ToastContext.Provider value={{ toast: add }}>
      {children}

      {/* Toast container */}
      <div style={{
        position:"fixed", bottom:24, right:24, zIndex:999999,
        display:"flex", flexDirection:"column", gap:10,
        pointerEvents:"none", maxWidth:340,
      }}>
        {toasts.map(t => {
          const c = COLORS[t.type] || COLORS.info;
          return (
            <div key={t.id} style={{
              background:c.bg, border:`1.5px solid ${c.border}`,
              borderRadius:14, padding:"12px 16px",
              boxShadow:"0 8px 24px rgba(0,0,0,0.12)",
              display:"flex", alignItems:"flex-start", gap:10,
              pointerEvents:"auto", cursor:"pointer",
              animation:"toastIn 0.25s ease",
              position:"relative", overflow:"hidden",
            }} onClick={() => remove(t.id)}>
              <div style={{ fontSize:18, flexShrink:0, lineHeight:1.3 }}>{ICONS[t.type]}</div>
              <div style={{ fontSize:13, fontWeight:600, color:c.text, lineHeight:1.4, flex:1 }}>{t.msg}</div>
              {/* Bottom progress bar */}
              <div style={{
                position:"absolute", bottom:0, left:0, right:0, height:3,
                background:c.bar, animation:"toastBar 3.5s linear forwards",
                transformOrigin:"left",
              }}/>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity:0; transform:translateY(16px) scale(0.95); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes toastBar {
          from { transform:scaleX(1); }
          to   { transform:scaleX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// ── Hook for components ────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx.toast;
}

// ── Global caller (for api.js, non-component code) ────────────────────────────
export const toast = (msg, type = "info", duration = 3500) => {
  if (_addToast) _addToast(msg, type, duration);
  else console.warn("Toast:", msg); // fallback if provider not mounted
};

// ── Confirm Dialog (replaces window.confirm) ──────────────────────────────────
let _resolveConfirm = null;

export function ConfirmDialog() {
  const [state, setState] = useState(null);
  // { title, msg, confirmLabel, dangerMode }

  useEffect(() => {
    window.__showConfirm = (opts) => new Promise(resolve => {
      setState(opts);
      _resolveConfirm = resolve;
    });
    return () => { delete window.__showConfirm; };
  }, []);

  if (!state) return null;

  const close = (result) => {
    setState(null);
    _resolveConfirm?.(result);
    _resolveConfirm = null;
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(15,23,42,0.55)",
      zIndex:999998, display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, backdropFilter:"blur(3px)",
    }} onClick={() => close(false)}>
      <div style={{
        background:"#fff", borderRadius:20, padding:28,
        maxWidth:380, width:"100%",
        boxShadow:"0 24px 64px rgba(0,0,0,0.22)",
        animation:"toastIn 0.2s ease",
      }} onClick={e => e.stopPropagation()}>

        <div style={{ fontSize:36, marginBottom:12, textAlign:"center" }}>
          {state.dangerMode ? "🗑️" : "❓"}
        </div>
        <div style={{ fontWeight:800, fontSize:17, textAlign:"center", marginBottom:8, color:"#1e293b" }}>
          {state.title || "Confirm Karo"}
        </div>
        {state.msg && (
          <div style={{ fontSize:13, color:"#64748b", textAlign:"center", marginBottom:20, lineHeight:1.5 }}>
            {state.msg}
          </div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => close(false)} style={{
            flex:1, padding:"12px", borderRadius:12,
            border:"1.5px solid #e2e8f0", background:"#f8fafc",
            color:"#64748b", fontWeight:700, fontSize:14, cursor:"pointer",
          }}>
            Cancel
          </button>
          <button onClick={() => close(true)} style={{
            flex:1, padding:"12px", borderRadius:12, border:"none",
            background: state.dangerMode
              ? "linear-gradient(135deg,#ef4444,#dc2626)"
              : "linear-gradient(135deg,#3b82f6,#2563eb)",
            color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer",
          }}>
            {state.confirmLabel || "Haan, Karo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper function (use anywhere) ───────────────────────────────────────────
export const confirm = (title, msg, opts = {}) =>
  window.__showConfirm?.({ title, msg, ...opts }) ?? Promise.resolve(false);

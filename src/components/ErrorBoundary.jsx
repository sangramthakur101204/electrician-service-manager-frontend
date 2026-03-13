// src/components/ErrorBoundary.jsx
import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { crashed: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ElectroServe crash:", error, info?.componentStack);
  }

  render() {
    if (!this.state.crashed) return this.props.children;

    return (
      <div style={{
        minHeight: "100dvh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#f8fafc", padding: 24, textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>
          Kuch gadbad ho gayi
        </div>
        <div style={{ fontSize: 14, color: "#64748b", marginBottom: 28, maxWidth: 280 }}>
          App mein ek chhoti si error aayi. Reload karo — sab wapas normal ho jaayega.
        </div>
        <button
          onClick={() => { this.setState({ crashed: false, error: null }); window.location.reload(); }}
          style={{
            padding: "12px 32px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg,#3b82f6,#2563eb)",
            color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(59,130,246,0.35)",
          }}
        >
          🔄 Reload Karo
        </button>
        {import.meta.env.DEV && this.state.error && (
          <pre style={{
            marginTop: 20, padding: 12, background: "#fef2f2",
            borderRadius: 8, fontSize: 10, color: "#ef4444",
            textAlign: "left", maxWidth: 360, overflow: "auto",
            border: "1px solid rgba(239,68,68,0.2)",
          }}>
            {this.state.error.toString()}
          </pre>
        )}
      </div>
    );
  }
}
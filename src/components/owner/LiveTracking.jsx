// src/components/owner/LiveTracking.jsx
// Map pe live technician locations — Leaflet + 30s auto-refresh
import { useState, useEffect, useRef } from "react";
import { getLiveLocations, authHeader } from "../../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function LiveTracking() {
  const [locations, setLocations] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [lastSync,  setLastSync]  = useState(null);
  const mapRef    = useRef(null);
  const leafletMap= useRef(null);
  const markers   = useRef({});

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (locations.length > 0) initOrUpdateMap();
  }, [locations]);

  const fetchLocations = async () => {
    try {
      const data = await getLiveLocations();
      setLocations(Array.isArray(data) ? data : []);
      setLastSync(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const initOrUpdateMap = async () => {
    if (!mapRef.current) return;

    // Load Leaflet if needed
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!window.L) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }

    const L = window.L;
    if (!leafletMap.current) {
      const firstLoc = locations[0];
      leafletMap.current = L.map(mapRef.current, { zoomControl: true })
        .setView([firstLoc.latitude, firstLoc.longitude], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
      }).addTo(leafletMap.current);
    }

    // Add / update markers
    const seen = new Set();
    locations.forEach(loc => {
      const id = loc.techId;
      seen.add(id);
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#3b82f6;color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;border:3px solid #fff;box-shadow:0 3px 12px rgba(59,130,246,0.5)">${loc.name?.[0]?.toUpperCase()||"T"}</div>`,
        iconSize: [40, 40], iconAnchor: [20, 20],
      });

      const timeDiff = loc.updatedAt
        ? Math.round((new Date() - new Date(loc.updatedAt)) / 60000)
        : null;
      const popup = `<b>${loc.name}</b><br>📞 ${loc.mobile}<br>⏱️ ${timeDiff !== null ? timeDiff + " min pehle" : "Just now"}`;

      if (markers.current[id]) {
        markers.current[id].setLatLng([loc.latitude, loc.longitude]);
        markers.current[id].getPopup()?.setContent(popup);
      } else {
        markers.current[id] = L.marker([loc.latitude, loc.longitude], { icon })
          .addTo(leafletMap.current)
          .bindPopup(popup);
      }
    });

    // Remove stale markers
    Object.keys(markers.current).forEach(id => {
      if (!seen.has(Number(id))) {
        leafletMap.current.removeLayer(markers.current[id]);
        delete markers.current[id];
      }
    });

    // Fit map to all markers
    if (locations.length > 1) {
      const bounds = L.latLngBounds(locations.map(l => [l.latitude, l.longitude]));
      leafletMap.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  const minAgo = loc => {
    if (!loc.updatedAt) return "—";
    const mins = Math.round((new Date() - new Date(loc.updatedAt)) / 60000);
    return mins < 1 ? "Just now" : `${mins} min pehle`;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>📍 Live Tracking</h2>
          <p style={{ fontSize:13, color:"#64748b" }}>
            {locations.length} technician{locations.length!==1?"s":""} live ·
            {lastSync && ` Last sync: ${lastSync.toLocaleTimeString("en-IN")}`}
          </p>
        </div>
        <button onClick={fetchLocations}
          style={{ padding:"8px 16px", borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", color:"#3b82f6", fontWeight:600, cursor:"pointer", fontSize:13 }}>
          🔄 Refresh
        </button>
      </div>

      {/* Tech cards */}
      {locations.length > 0 && (
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {locations.map(loc => (
            <div key={loc.techId}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", color:"#fff", fontWeight:800, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {loc.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>{loc.name}</div>
                <div style={{ fontSize:12, color:"#64748b" }}>🟢 {minAgo(loc)}</div>
              </div>
              <a href={`https://maps.google.com?q=${loc.latitude},${loc.longitude}`}
                target="_blank" rel="noreferrer"
                style={{ marginLeft:8, padding:"5px 10px", background:"rgba(59,130,246,0.1)", color:"#3b82f6", borderRadius:8, fontSize:12, fontWeight:600, textDecoration:"none" }}>
                🗺️ Maps
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid #e2e8f0", boxShadow:"0 4px 16px rgba(0,0,0,0.08)" }}>
        {loading ? (
          <div style={{ height:480, display:"flex", alignItems:"center", justifyContent:"center", background:"#f8fafc", color:"#94a3b8", flexDirection:"column", gap:12 }}>
            <div style={{ fontSize:48 }}>🗺️</div>
            <div style={{ fontWeight:700, color:"#64748b" }}>Map load ho raha hai...</div>
          </div>
        ) : locations.length === 0 ? (
          <div style={{ height:480, display:"flex", alignItems:"center", justifyContent:"center", background:"#f8fafc", flexDirection:"column", gap:12 }}>
            <div style={{ fontSize:48 }}>📡</div>
            <div style={{ fontWeight:700, color:"#64748b" }}>Koi technician live nahi hai</div>
            <div style={{ fontSize:13, color:"#94a3b8", textAlign:"center", maxWidth:300 }}>
              Jab technician app kholta hai, uski location yahan dikhegi. Location auto-update hoti hai har 30 seconds mein.
            </div>
          </div>
        ) : (
          <div ref={mapRef} style={{ height:480, width:"100%" }} />
        )}
      </div>
    </div>
  );
}

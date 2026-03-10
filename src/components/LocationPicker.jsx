// src/components/LocationPicker.jsx — Leaflet + dual geocoder (Nominatim + Photon fallback)
import { useState, useEffect, useRef } from "react";
import { toast } from "./Toast.jsx";

const DEFAULT = { lat: 19.8762, lng: 75.3433 }; // Aurangabad

const TILE_URL  = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>';

// ── Dual geocoder: Nominatim first, Photon fallback ──────────────────────────
async function searchAddress(query) {
  // 1️⃣ Nominatim — good for full addresses
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const d = await r.json();
    if (d.length) return d.map(x => ({
      lat: parseFloat(x.lat), lng: parseFloat(x.lon),
      label: x.display_name,
    }));
  } catch(e) { console.warn("Nominatim failed:", e); }

  // 2️⃣ Photon (Komoot) — better for localities, mohalla, landmarks
  try {
    const r = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en&bbox=68,6,97,37`
    );
    const d = await r.json();
    if (d.features?.length) return d.features.map(f => {
      const p = f.properties;
      const parts = [p.name, p.street, p.city || p.county, p.state, "India"].filter(Boolean);
      return {
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        label: parts.join(", "),
      };
    });
  } catch(e) { console.warn("Photon failed:", e); }

  return [];
}

async function reverseGeocodeAddr(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const d = await r.json();
    return d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export default function LocationPicker({ address, latitude, longitude, onLocationSelect, onClose }) {
  const mapDivRef  = useRef(null);
  const leafMap    = useRef(null);
  const pinMarker  = useRef(null);

  const [addr,       setAddr]       = useState(address || "");
  const [coords,     setCoords]     = useState({
    lat: parseFloat(latitude)  || DEFAULT.lat,
    lng: parseFloat(longitude) || DEFAULT.lng,
  });
  const [searchQ,    setSearchQ]    = useState(address || "");
  const [geocoding,  setGeocoding]  = useState(false);
  const [gpsLoad,    setGpsLoad]    = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSug,    setShowSug]    = useState(false);
  const [showManual, setShowManual] = useState(false);
  const debounceRef  = useRef(null);

  useEffect(() => {
    let dead = false;
    async function boot() {
      if (!document.getElementById("lf-css")) {
        const lnk = document.createElement("link");
        lnk.id = "lf-css"; lnk.rel = "stylesheet";
        lnk.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(lnk);
      }
      if (!window.L) {
        await new Promise((ok, fail) => {
          const s = document.createElement("script");
          s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          s.onload = ok; s.onerror = fail;
          document.head.appendChild(s);
        });
      }
      if (dead || !mapDivRef.current || leafMap.current) return;

      const L   = window.L;
      const lat = parseFloat(latitude)  || DEFAULT.lat;
      const lng = parseFloat(longitude) || DEFAULT.lng;

      const map = L.map(mapDivRef.current, { zoomControl: false }).setView([lat, lng], 16);
      leafMap.current = map;
      L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      const svgPin = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
        <defs><radialGradient id="g" cx="38%" cy="35%" r="60%">
          <stop offset="0%" stop-color="#ff7676"/>
          <stop offset="100%" stop-color="#c0392b"/>
        </radialGradient></defs>
        <ellipse cx="16" cy="47" rx="5" ry="2" fill="rgba(0,0,0,0.25)"/>
        <path d="M16 0 C7.2 0 0 7.2 0 16 C0 27 16 48 16 48 C16 48 32 27 32 16 C32 7.2 24.8 0 16 0Z" fill="url(#g)" stroke="white" stroke-width="1.5"/>
        <circle cx="11" cy="10" r="4" fill="rgba(255,255,255,0.45)"/>
      </svg>`;
      const icon = L.icon({
        iconUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgPin),
        iconSize: [32,48], iconAnchor: [16,48], popupAnchor: [0,-50],
      });

      const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
      pinMarker.current = marker;

      marker.on("dragend", async e => {
        const p = e.target.getLatLng();
        setCoords({ lat: p.lat, lng: p.lng });
        setGeocoding(true);
        const a = await reverseGeocodeAddr(p.lat, p.lng);
        setAddr(a); setSearchQ(a); setGeocoding(false);
      });

      map.on("click", async e => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCoords({ lat, lng });
        setGeocoding(true);
        const a = await reverseGeocodeAddr(lat, lng);
        setAddr(a); setSearchQ(a); setGeocoding(false);
      });

      if (latitude || longitude) {
        setGeocoding(true);
        const a = await reverseGeocodeAddr(lat, lng);
        setAddr(a); setSearchQ(a); setGeocoding(false);
      }
    }
    boot();
    return () => {
      dead = true;
      if (leafMap.current) { leafMap.current.remove(); leafMap.current = null; }
    };
  }, []);

  // Live search with debounce — shows dropdown suggestions
  function onSearchInput(val) {
    setSearchQ(val);
    setSuggestions([]);
    setShowSug(false);
    clearTimeout(debounceRef.current);
    if (val.trim().length < 3) return;
    debounceRef.current = setTimeout(async () => {
      setGeocoding(true);
      const results = await searchAddress(val + ", India");
      setSuggestions(results.slice(0, 5));
      setShowSug(results.length > 0);
      setGeocoding(false);
    }, 500);
  }

  function pickSuggestion(s) {
    setCoords({ lat: s.lat, lng: s.lng });
    setAddr(s.label); setSearchQ(s.label);
    setSuggestions([]); setShowSug(false);
    if (leafMap.current && pinMarker.current) {
      leafMap.current.flyTo([s.lat, s.lng], 17);
      pinMarker.current.setLatLng([s.lat, s.lng]);
    }
  }

  async function doSearch() {
    if (!searchQ.trim()) return;
    setGeocoding(true); setShowSug(false);
    const results = await searchAddress(searchQ + ", India");
    if (results.length) {
      pickSuggestion(results[0]);
    } else {
      toast("Address nahi mila — thoda aur detail daalo (city ka naam bhi likho)", "warning");
    }
    setGeocoding(false);
  }

  function useGPS() {
    if (!navigator.geolocation) { toast("GPS support nahi hai", "warning"); return; }
    setGpsLoad(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        if (leafMap.current && pinMarker.current) {
          leafMap.current.flyTo([lat, lng], 17);
          pinMarker.current.setLatLng([lat, lng]);
        }
        setGeocoding(true);
        const a = await reverseGeocodeAddr(lat, lng);
        setAddr(a); setSearchQ(a); setGeocoding(false); setGpsLoad(false);
      },
      err => { toast("GPS: " + err.message, "error"); setGpsLoad(false); }
    );
  }

  function confirm() {
    if (!addr) return;
    onLocationSelect({ address: addr, latitude: coords.lat.toFixed(6), longitude: coords.lng.toFixed(6) });
    onClose();
  }

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, zIndex:99999,
      background:"rgba(15,23,42,0.6)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:"20px",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:"100%", maxWidth:680, height:"min(88vh, 720px)",
        background:"#fff", borderRadius:20,
        boxShadow:"0 32px 80px rgba(0,0,0,0.35)",
        display:"flex", flexDirection:"column", overflow:"hidden",
      }}>

        {/* Header */}
        <div style={{ flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", borderBottom:"1px solid #e2e8f0" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16, color:"#1e293b" }}>📍 Location Select Karo</div>
            <div style={{ fontSize:12, color:"#64748b", marginTop:1 }}>Search karo ya map pe tap karo</div>
          </div>
          <button onClick={onClose} style={{ width:34, height:34, borderRadius:"50%", border:"1.5px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b" }}>✕</button>
        </div>

        {/* Search bar with suggestions dropdown */}
        <div style={{ flexShrink:0, padding:"10px 12px", background:"#f8fafc", borderBottom:"1px solid #e2e8f0", position:"relative" }}>
          <div style={{ display:"flex", gap:6 }}>
            <input
              value={searchQ}
              onChange={e => onSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()}
              onFocus={() => suggestions.length > 0 && setShowSug(true)}
              placeholder="Gali, mohalla, landmark, city — type karo..."
              style={{ flex:1, padding:"9px 12px", borderRadius:9, border:"1.5px solid #e2e8f0", background:"#fff", fontSize:13, color:"#1e293b", outline:"none" }}
            />
            <button onClick={doSearch} disabled={geocoding}
              style={{ padding:"9px 14px", borderRadius:9, border:"none", background:"#3b82f6", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", flexShrink:0 }}>
              {geocoding ? "⏳" : "🔍"}
            </button>
            <button onClick={useGPS} disabled={gpsLoad}
              style={{ padding:"9px 12px", borderRadius:9, border:"none", background:"#10b981", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", flexShrink:0 }}>
              {gpsLoad ? "📡..." : "📡 GPS"}
            </button>
          </div>

          {/* Suggestions dropdown */}
          {showSug && suggestions.length > 0 && (
            <div style={{
              position:"absolute", top:"100%", left:12, right:12, zIndex:9999,
              background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:10,
              boxShadow:"0 8px 24px rgba(0,0,0,0.12)", overflow:"hidden",
            }}>
              {suggestions.map((s, i) => (
                <div key={i}
                  onClick={() => pickSuggestion(s)}
                  style={{
                    padding:"10px 14px", cursor:"pointer", fontSize:12,
                    borderBottom: i < suggestions.length-1 ? "1px solid #f1f5f9" : "none",
                    color:"#1e293b", lineHeight:1.4,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0f9ff"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  📍 {s.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tip */}
        <div style={{ flexShrink:0, padding:"6px 14px", background:"rgba(59,130,246,0.05)", borderBottom:"1px solid rgba(59,130,246,0.1)", fontSize:11, color:"#3b82f6", fontWeight:600 }}>
          💡 Tip: City ka naam bhi likho — jaise <b>"Bharat Nagar, Aurangabad"</b> — zyada accurate milega
        </div>

        {/* Map */}
        <div style={{ flex:1, minHeight:0 }}>
          <div ref={mapDivRef} style={{ width:"100%", height:"100%" }} />
        </div>

        {/* Selected address */}
        <div style={{ flexShrink:0, display:"flex", alignItems:"flex-start", gap:8, padding:"8px 14px", borderTop:"1px solid #f1f5f9", background:"#fafafa" }}>
          <span style={{ fontSize:16, flexShrink:0, marginTop:2 }}>📍</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, color:geocoding?"#94a3b8":"#1e293b", fontWeight:geocoding?400:600, wordBreak:"break-word", lineHeight:1.4 }}>
              {geocoding ? "📡 Address dhund raha hai..." : (addr || "Map pe koi jagah click karo")}
            </div>
            <div style={{ fontSize:11, color:"#94a3b8", marginTop:1, fontFamily:"monospace" }}>
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </div>
          </div>
        </div>

        {/* Manual address warning */}
        {showManual && (
          <div style={{ flexShrink:0, padding:"8px 14px", background:"#fffbeb", borderTop:"1px solid #fde68a", fontSize:12, color:"#92400e", display:"flex", alignItems:"center", gap:8 }}>
            <span>⚠️</span>
            <span><b>Map pin nahi gaya</b> — sirf address text save hoga, pin/distance kaam nahi karega</span>
            <button onClick={()=>setShowManual(false)} style={{marginLeft:"auto",fontSize:11,color:"#92400e",background:"none",border:"none",cursor:"pointer",fontWeight:700}}>✕</button>
          </div>
        )}

        {/* Footer */}
        <div style={{ flexShrink:0, display:"flex", gap:8, padding:"10px 14px", borderTop:"1px solid #e2e8f0", background:"#fff" }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Cancel
          </button>
          <button onClick={confirm} disabled={geocoding}
            style={{ flex:2, padding:"11px", borderRadius:10, border:"none", background:geocoding?"#e2e8f0":"linear-gradient(135deg,#3b82f6,#2563eb)", color:geocoding?"#94a3b8":"#fff", fontWeight:800, fontSize:13, cursor:geocoding?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            ✅ Yahi Location Set Karo
          </button>
        </div>
      </div>
    </div>
  );
}
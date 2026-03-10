// src/components/owner/LiveTracking.jsx
import { useState, useEffect, useRef } from "react";
import { useToast } from "../Toast.jsx";
import { getLiveLocations, authHeader, apiFetch } from "../../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const DEFAULT_CENTER = [19.8762, 75.3433];

// CartoDB Voyager — much better looking map
const TILE_URL  = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>';

// Status → label, color, emoji
const STATUS_META = {
  FREE:        { label:"Available",  color:"#10b981", bg:"rgba(16,185,129,0.12)",  emoji:"🟢" },
  ASSIGNED:    { label:"On Job",     color:"#f59e0b", bg:"rgba(245,158,11,0.12)",   emoji:"🟡" },
  ON_THE_WAY:  { label:"On The Way", color:"#f59e0b", bg:"rgba(245,158,11,0.12)",   emoji:"🟡" },
  IN_PROGRESS: { label:"Busy",       color:"#ef4444", bg:"rgba(239,68,68,0.12)",    emoji:"🔴" },
  OFFLINE:     { label:"Offline",    color:"#6b7280", bg:"rgba(107,114,128,0.12)", emoji:"⚫" },
};

function getMeta(status) { return STATUS_META[status] || STATUS_META.OFFLINE; }
function distKm(lat1,lng1,lat2,lng2) {
  const R=6371,dL=(lat2-lat1)*Math.PI/180,dG=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dG/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export default function LiveTracking({ onNavigate }) {
  const toast = useToast();
  const [locs,     setLocs]     = useState([]);
  const [jobs,     setJobs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [filter,   setFilter]   = useState("ALL");
  const [mapReady, setMapReady] = useState(false);
  const [selTech,  setSelTech]  = useState(null); // selected tech for panel

  const mapRef      = useRef(null);
  const leafMap     = useRef(null);
  const techMarkers = useRef({});
  const routeLines  = useRef({});

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 30000); return () => clearInterval(t); }, []);
  useEffect(() => { if (!loading) loadLeaflet(); }, [loading]);
  useEffect(() => { if (mapReady) updateMarkers(); }, [locs, jobs, mapReady, filter]);

  async function fetchAll() {
    try {
      const [locData, jobData] = await Promise.all([
        getLiveLocations(),
        apiFetch(`${API}/jobs`, { headers: authHeader() }).then(r => r.json()),
      ]);
      setLocs(Array.isArray(locData) ? locData : []);
      setJobs(Array.isArray(jobData) ? jobData : []);
      setLastSync(new Date());
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  function techStatus(tech) {
    const job = jobs.find(j => j.technician?.id === tech.techId && !["DONE","CANCELLED"].includes(j.status));
    return job ? job.status : "FREE";
  }
  function techActiveJob(techId) {
    return jobs.find(j => j.technician?.id === techId && !["DONE","CANCELLED"].includes(j.status)) || null;
  }

  async function loadLeaflet() {
    if (!mapRef.current) return;
    if (!document.getElementById("lf-css")) {
      const l = document.createElement("link");
      l.id="lf-css"; l.rel="stylesheet";
      l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(l);
    }
    if (!window.L) {
      await new Promise((res,rej) => {
        const s = document.createElement("script");
        s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        s.onload=res; s.onerror=rej;
        document.head.appendChild(s);
      });
    }
    const L = window.L;
    if (!leafMap.current) {
      const center = locs.length > 0 ? [locs[0].latitude, locs[0].longitude] : DEFAULT_CENTER;
      leafMap.current = L.map(mapRef.current, { zoomControl: true, preferCanvas: true });
      leafMap.current.setView(center, 13);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(leafMap.current);
    }
    setMapReady(true);
  }

  // ── New marker: card-style DivIcon ──────────────────────────────────────────
  function makeTechDivIcon(loc, status) {
    const m    = getMeta(status);
    const init = (loc.name || "T")[0].toUpperCase();
    // Card marker: avatar + name + status badge, with triangle pointer at bottom
    const html = `
      <div style="
        font-family:Arial,sans-serif;
        background:#fff;
        border:2px solid ${m.color};
        border-radius:12px;
        padding:7px 10px 6px;
        box-shadow:0 4px 16px ${m.color}40, 0 2px 6px rgba(0,0,0,0.12);
        text-align:center;
        min-width:72px;
        position:relative;
        cursor:pointer;
      ">
        <!-- Avatar circle -->
        <div style="
          width:36px;height:36px;border-radius:50%;
          background:linear-gradient(135deg,${m.color},${m.color}bb);
          color:#fff;font-weight:900;font-size:16px;
          display:flex;align-items:center;justify-content:center;
          margin:0 auto 4px;
          box-shadow:0 2px 8px ${m.color}60;
        ">${init}</div>
        <!-- Name -->
        <div style="font-weight:800;font-size:11px;color:#1e293b;white-space:nowrap;overflow:hidden;max-width:70px;text-overflow:ellipsis;">${loc.name}</div>
        <!-- Status badge -->
        <div style="
          display:inline-block;
          margin-top:3px;
          padding:2px 7px;border-radius:20px;
          background:${m.bg};
          color:${m.color};
          font-size:10px;font-weight:700;
          white-space:nowrap;
        ">${m.emoji} ${m.label}</div>
        <!-- Triangle pointer -->
        <div style="
          position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);
          width:0;height:0;
          border-left:7px solid transparent;
          border-right:7px solid transparent;
          border-top:8px solid ${m.color};
        "></div>
      </div>`;
    return window.L.divIcon({
      html,
      className: "",
      iconSize: [88, 76],
      iconAnchor: [44, 84],
      popupAnchor: [0, -88],
    });
  }

  function updateMarkers() {
    const L   = window.L;
    const map = leafMap.current;
    if (!L || !map) return;

    // Determine which locs to show
    const displayLocs = filter === "ALL" ? locs : locs.filter(l => {
      const s = techStatus(l);
      if (filter === "FREE") return s === "FREE";
      return s === filter;
    });

    const seen = new Set();

    displayLocs.forEach(loc => {
      const id      = loc.techId;
      const status  = techStatus(loc);
      const m       = getMeta(status);
      const activeJob = techActiveJob(id);
      const mins    = loc.updatedAt ? Math.round((Date.now() - new Date(loc.updatedAt)) / 60000) : null;
      seen.add(id);

      // Popup HTML — rich design
      const custName = activeJob ? (activeJob.customer?.name || activeJob.customerName || "—") : null;
      const custMobile = activeJob ? (activeJob.customer?.mobile || activeJob.customerMobile || null) : null;
      const jobDist = (activeJob?.latitude && activeJob?.longitude)
        ? distKm(loc.latitude, loc.longitude, parseFloat(activeJob.latitude), parseFloat(activeJob.longitude)).toFixed(1)
        : null;

      const popupHtml = `
        <div style="font-family:Arial,sans-serif;min-width:200px;font-size:13px;padding:4px 2px;">
          <!-- Header -->
          <div style="display:flex;align-items:center;gap:10;margin-bottom:10px;">
            <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,${m.color},${m.color}bb);
              color:#fff;font-weight:900;font-size:17px;display:flex;align-items:center;justify-content:center;
              flex-shrink:0;box-shadow:0 2px 8px ${m.color}40;">${(loc.name||"T")[0].toUpperCase()}</div>
            <div>
              <div style="font-weight:800;font-size:15px;color:#1e293b;">${loc.name}</div>
              <div style="display:inline-block;padding:2px 9px;border-radius:20px;background:${m.bg};
                color:${m.color};font-size:11px;font-weight:700;margin-top:2px;">
                ${m.emoji} ${m.label}
              </div>
            </div>
          </div>
          <!-- Job info -->
          ${custName ? `
          <div style="background:#f8fafc;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:12px;">
            <div style="font-weight:700;color:#374151;margin-bottom:2px;">🔧 Current Job</div>
            <div style="color:#1e293b;font-weight:600;">${custName}</div>
            ${activeJob?.problemDescription ? `<div style="color:#64748b;margin-top:2px;">${(activeJob.problemDescription||"").substring(0,40)}...</div>` : ""}
            ${jobDist ? `<div style="color:#3b82f6;font-weight:600;margin-top:4px;">📏 ${jobDist} km door</div>` : ""}
          </div>` : ""}
          <!-- Last seen -->
          ${mins !== null ? `<div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">🕐 ${mins < 1 ? "Abhi abhi" : mins + " min pehle"}</div>` : ""}
          <!-- Call button -->
          <a href="tel:${loc.mobile}" style="
            display:block;text-align:center;
            padding:9px;border-radius:9px;
            background:linear-gradient(135deg,#10b981,#059669);
            color:#fff;font-weight:700;font-size:13px;
            text-decoration:none;
          ">📞 Call ${loc.name}</a>
        </div>`;

      if (techMarkers.current[id]) {
        techMarkers.current[id].setLatLng([loc.latitude, loc.longitude]);
        techMarkers.current[id].setIcon(makeTechDivIcon(loc, status));
        techMarkers.current[id].getPopup()?.setContent(popupHtml);
      } else {
        techMarkers.current[id] = L.marker([loc.latitude, loc.longitude], { icon: makeTechDivIcon(loc, status) })
          .addTo(map)
          .bindPopup(popupHtml, { maxWidth: 240 });
      }

      // ── Draw route line for technicians with active job that has lat/lng ──
      if (routeLines.current[id]) {
        map.removeLayer(routeLines.current[id]);
        routeLines.current[id] = null;
      }
      if (activeJob?.latitude && activeJob?.longitude && status !== "FREE") {
        const jobLat = parseFloat(activeJob.latitude);
        const jobLng = parseFloat(activeJob.longitude);

        // Animated dashed route — Google Maps navigation style
        const routeGroup = L.layerGroup();

        // Shadow line
        L.polyline(
          [[loc.latitude, loc.longitude], [jobLat, jobLng]],
          { color: "#000", weight: 6, opacity: 0.1 }
        ).addTo(routeGroup);

        // Main colored route
        L.polyline(
          [[loc.latitude, loc.longitude], [jobLat, jobLng]],
          { color: m.color, weight: 4, opacity: 0.85, dashArray: "12,8", lineCap: "round", lineJoin: "round" }
        ).addTo(routeGroup);

        // Job destination marker
        const destSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
          <defs><radialGradient id="dg" cx="38%" cy="35%" r="60%">
            <stop offset="0%" stop-color="${m.color}cc"/>
            <stop offset="100%" stop-color="${m.color}"/>
          </radialGradient></defs>
          <ellipse cx="14" cy="36.5" rx="4" ry="1.5" fill="rgba(0,0,0,0.2)"/>
          <path d="M14 0 C6.3 0 0 6.3 0 14 C0 23.5 14 38 14 38 C14 38 28 23.5 28 14 C28 6.3 21.7 0 14 0Z"
                fill="url(#dg)" stroke="white" stroke-width="1.5"/>
          <circle cx="9.5" cy="8.5" r="3" fill="rgba(255,255,255,0.4)"/>
          <text x="14" y="19" text-anchor="middle" font-size="10" font-family="Arial" fill="white" font-weight="bold">JOB</text>
        </svg>`;
        const destIcon = L.icon({
          iconUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(destSvg),
          iconSize: [28,38], iconAnchor: [14,38], popupAnchor: [0,-40],
        });
        L.marker([jobLat, jobLng], { icon: destIcon })
          .bindPopup(`<div style="font-family:Arial;font-size:12px;font-weight:700;">🔧 ${custName || "Job Location"}</div>`)
          .addTo(routeGroup);

        routeLines.current[id] = routeGroup.addTo(map);
      }
    });

    // Remove stale markers
    Object.keys(techMarkers.current).forEach(id => {
      if (!seen.has(Number(id))) {
        map.removeLayer(techMarkers.current[id]);
        delete techMarkers.current[id];
        if (routeLines.current[id]) { map.removeLayer(routeLines.current[id]); delete routeLines.current[id]; }
      }
    });

    // Fit bounds
    if (displayLocs.length > 1) {
      map.fitBounds(
        window.L.latLngBounds(displayLocs.map(l => [l.latitude, l.longitude])),
        { padding: [60, 60] }
      );
    } else if (displayLocs.length === 1) {
      map.setView([displayLocs[0].latitude, displayLocs[0].longitude], 14);
    }
  }

  const displayed = filter === "ALL" ? locs : locs.filter(l => {
    const s = techStatus(l);
    if (filter === "FREE") return s === "FREE";
    return s === filter;
  });

  const countByStatus = s => s === "FREE"
    ? locs.filter(l => techStatus(l) === "FREE").length
    : locs.filter(l => techStatus(l) === s).length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>📍 Live Technician Tracking</h2>
          <p style={{ fontSize:13, color:"#64748b", margin:0 }}>
            {locs.length} technician{locs.length !== 1 ? "s" : ""} live&nbsp;·&nbsp;
            {lastSync ? `Last sync: ${lastSync.toLocaleTimeString("en-IN")}` : "Syncing..."}
          </p>
        </div>
        <button onClick={fetchAll}
          style={{ padding:"8px 16px", borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", color:"#3b82f6", fontWeight:600, cursor:"pointer", fontSize:13 }}>
          🔄 Refresh
        </button>
      </div>

      {/* ── Status filter ── */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {[
          { k:"ALL",         label:`👥 All (${locs.length})`,                   color:"#3b82f6" },
          { k:"FREE",        label:`🟢 Available (${countByStatus("FREE")})`,    color:"#10b981" },
          { k:"ASSIGNED",    label:`🟡 On Job (${countByStatus("ASSIGNED")})`,   color:"#f59e0b" },
          { k:"ON_THE_WAY",  label:`🟡 On Way (${countByStatus("ON_THE_WAY")})`, color:"#f59e0b" },
          { k:"IN_PROGRESS", label:`🔴 Busy (${countByStatus("IN_PROGRESS")})`,  color:"#ef4444" },
        ].map(({ k, label, color }) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ padding:"6px 14px", borderRadius:20, fontWeight:600, fontSize:12, cursor:"pointer",
              border: filter === k ? "none" : "1.5px solid #e2e8f0",
              background: filter === k ? color : "#fff",
              color: filter === k ? "#fff" : "#64748b",
              transition:"all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tech cards grid ── */}
      {displayed.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
          {displayed.map(loc => {
            const status    = techStatus(loc);
            const m         = getMeta(status);
            const activeJob = techActiveJob(loc.techId);
            const mins      = loc.updatedAt ? Math.round((Date.now() - new Date(loc.updatedAt)) / 60000) : null;
            return (
              <div key={loc.techId} style={{
                background:"#fff", borderRadius:16,
                border:`1.5px solid ${m.color}30`,
                borderTop:`3px solid ${m.color}`,
                padding:14, boxShadow:"0 2px 8px rgba(0,0,0,0.05)",
                cursor:"pointer", transition:"box-shadow 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 20px ${m.color}25`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"}
                onClick={() => {
                  if (leafMap.current && techMarkers.current[loc.techId]) {
                    leafMap.current.setView([loc.latitude, loc.longitude], 15, { animate:true });
                    techMarkers.current[loc.techId].openPopup();
                  }
                }}>

                {/* Avatar + Name */}
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ width:44, height:44, borderRadius:"50%",
                    background:`linear-gradient(135deg,${m.color},${m.color}bb)`,
                    color:"#fff", fontWeight:900, fontSize:18,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0, boxShadow:`0 2px 8px ${m.color}50` }}>
                    {(loc.name||"T")[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:14, color:"#1e293b" }}>{loc.name}</div>
                    <div style={{ fontSize:11, color:"#64748b" }}>📞 {loc.mobile}</div>
                  </div>
                </div>

                {/* Status badge + time */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:m.bg, color:m.color }}>
                    {m.emoji} {m.label}
                  </span>
                  <span style={{ fontSize:11, color: mins != null && mins > 5 ? "#f59e0b" : "#94a3b8", fontWeight: mins != null && mins > 5 ? 600 : 400 }}>
                    {mins != null ? (mins < 1 ? "Just now" : `${mins}m ago`) : ""}
                    {mins != null && mins > 5 ? " ⚠️" : ""}
                  </span>
                </div>

                {/* Active job info */}
                {activeJob && (
                  <div style={{ fontSize:11, color:"#64748b", padding:"7px 10px", background:"#f8fafc", borderRadius:9, marginBottom:8, borderLeft:`2px solid ${m.color}` }}>
                    <div style={{ fontWeight:700, color:"#374151", marginBottom:1 }}>🔧 Current Job</div>
                    <div>{activeJob.customer?.name || activeJob.customerName || "—"}</div>
                    {activeJob.machineType && <div style={{ color:"#94a3b8", marginTop:1 }}>🖥️ {activeJob.machineType} {activeJob.machineBrand}</div>}
                    {(activeJob.latitude && activeJob.longitude) && (
                      <div style={{ color:m.color, fontWeight:600, marginTop:2 }}>
                        📏 {distKm(loc.latitude,loc.longitude,parseFloat(activeJob.latitude),parseFloat(activeJob.longitude)).toFixed(1)} km door
                      </div>
                    )}
                  </div>
                )}

                {/* Call + Maps buttons */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <a href={`tel:${loc.mobile}`}
                    style={{ padding:"8px", background:"rgba(16,185,129,0.08)", color:"#059669", borderRadius:9, fontSize:12, fontWeight:600, textDecoration:"none", textAlign:"center" }}>
                    📞 Call
                  </a>
                  <a href={`https://maps.google.com?q=${loc.latitude},${loc.longitude}`} target="_blank" rel="noreferrer"
                    style={{ padding:"8px", background:"rgba(59,130,246,0.08)", color:"#3b82f6", borderRadius:9, fontSize:12, fontWeight:600, textDecoration:"none", textAlign:"center" }}>
                    🗺️ Maps
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Map — fixed height, not full screen ── */}
      <div style={{
        borderRadius:16, overflow:"hidden",
        border:"1px solid #e2e8f0",
        boxShadow:"0 4px 20px rgba(0,0,0,0.08)",
        position:"relative",
        height: locs.length === 0 ? 360 : 460,
      }}>
        {loading ? (
          <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:"#f8fafc", flexDirection:"column", gap:12 }}>
            <div style={{ fontSize:32, animation:"spin 1s linear infinite" }}>⚡</div>
            <div style={{ color:"#64748b", fontWeight:600 }}>Map load ho raha hai...</div>
          </div>
        ) : locs.length === 0 ? (
          <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:"#f8fafc", flexDirection:"column", gap:10 }}>
            <div style={{ fontSize:52 }}>📡</div>
            <div style={{ fontWeight:700, color:"#64748b", fontSize:16 }}>Koi technician live nahi</div>
            <div style={{ fontSize:13, color:"#94a3b8", maxWidth:300, textAlign:"center", lineHeight:1.5 }}>
              Technician ka app open hona chahiye aur internet connection hona chahiye
            </div>
            <button onClick={fetchData} style={{ marginTop:8, padding:"10px 20px", background:"#3b82f6", color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer", fontSize:13 }}>
              🔄 Refresh
            </button>
          </div>
        ) : (
          <>
            <div ref={mapRef} style={{ height:"100%", width:"100%" }} />
            {/* Legend overlay */}
            <div style={{
              position:"absolute", bottom:16, left:16, zIndex:1000,
              background:"rgba(255,255,255,0.95)", backdropFilter:"blur(8px)",
              border:"1px solid #e2e8f0", borderRadius:12,
              padding:"8px 12px", boxShadow:"0 4px 16px rgba(0,0,0,0.1)",
              fontSize:11, fontWeight:600,
            }}>
              {[["🟢","Available"],["🟡","On Job"],["🔴","Busy"],["⚫","Offline"]].map(([em,lbl]) => (
                <div key={lbl} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                  <span style={{ fontSize:12 }}>{em}</span>
                  <span style={{ color:"#374151" }}>{lbl}</span>
                </div>
              ))}
            </div>
            {/* Route info overlay */}
            {locs.some(l => techActiveJob(l.techId)?.latitude) && (
              <div style={{
                position:"absolute", top:16, right:16, zIndex:1000,
                background:"rgba(255,255,255,0.95)", backdropFilter:"blur(8px)",
                border:"1px solid #e2e8f0", borderRadius:12,
                padding:"8px 12px", boxShadow:"0 4px 16px rgba(0,0,0,0.1)",
                fontSize:11, color:"#374151", fontWeight:600,
              }}>
                <div style={{ marginBottom:4, color:"#64748b", fontWeight:700 }}>🗺️ Routes</div>
                <div>- - - Technician → Job</div>
                <div style={{ marginTop:2, color:"#94a3b8" }}>📍 = Job Location</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

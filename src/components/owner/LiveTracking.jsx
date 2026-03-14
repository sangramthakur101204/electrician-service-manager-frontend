// src/components/owner/LiveTracking.jsx
import { useState, useEffect, useRef } from "react";
import { useToast } from "../Toast.jsx";
import { getLiveLocations, authHeader, apiFetch } from "../../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const DEFAULT_CENTER = [19.8762, 75.3433];
const TILE_URL  = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>';

const STATUS_META = {
  FREE:        { label:"Available",   color:"#10b981", bg:"rgba(16,185,129,0.12)", emoji:"🟢" },
  ASSIGNED:    { label:"On Job",      color:"#f59e0b", bg:"rgba(245,158,11,0.12)",  emoji:"🟡" },
  ON_THE_WAY:  { label:"On The Way",  color:"#3b82f6", bg:"rgba(59,130,246,0.12)",  emoji:"🔵" },
  IN_PROGRESS: { label:"In Progress", color:"#8b5cf6", bg:"rgba(139,92,246,0.12)",  emoji:"🟣" },
  OFFLINE:     { label:"Offline",     color:"#94a3b8", bg:"rgba(148,163,184,0.12)", emoji:"⚫" },
};

function getMeta(s) { return STATUS_META[s] || STATUS_META.OFFLINE; }
function distKm(la1,lo1,la2,lo2) {
  const R=6371,dL=(la2-la1)*Math.PI/180,dG=(lo2-lo1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dG/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function timeAgo(ts) {
  if (!ts) return null;
  const mins = Math.round((Date.now() - new Date(ts)) / 60000);
  if (mins < 1) return { text:"Abhi abhi", stale:false };
  if (mins < 60) return { text:`${mins}m pehle`, stale: mins > 10 };
  return { text:`${Math.round(mins/60)}h pehle`, stale:true };
}

export default function LiveTracking({ onNavigate }) {
  const [locs,    setLocs]    = useState([]);
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync,setLastSync]= useState(null);
  const [filter,  setFilter]  = useState("ALL");
  const [selId,   setSelId]   = useState(null);
  const [mapReady,setMapReady]= useState(false);
  const isMob = window.innerWidth < 768;

  const mapRef      = useRef(null);
  const leafMap     = useRef(null);
  const techMarkers = useRef({});
  const routeLines  = useRef({});

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (!loading) loadLeaflet(); }, [loading]);
  useEffect(() => { if (mapReady) updateMarkers(); }, [locs, jobs, mapReady, filter, selId]);

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
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        s.onload=res; s.onerror=rej;
        document.head.appendChild(s);
      });
    }
    if (!leafMap.current) {
      const center = locs.length > 0 ? [locs[0].latitude, locs[0].longitude] : DEFAULT_CENTER;
      leafMap.current = window.L.map(mapRef.current, { zoomControl:true, preferCanvas:true });
      leafMap.current.setView(center, 13);
      window.L.tileLayer(TILE_URL, { attribution:TILE_ATTR, maxZoom:19 }).addTo(leafMap.current);
    }
    setMapReady(true);
  }

  function makeTechIcon(loc, status, isSelected) {
    const m     = getMeta(status);
    const init  = (loc.name || "T")[0].toUpperCase();
    const label = (loc.name || "Tech").slice(0, 9);
    const bw    = isSelected ? 3 : 2;
    const W = 64, H = 76;
    // Pure SVG — works 100% in Leaflet, no CSS conflicts
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <!-- card shadow -->
      <rect x="2" y="2" width="60" height="54" rx="12" ry="12"
        fill="rgba(0,0,0,0.10)" />
      <!-- card bg -->
      <rect x="1" y="1" width="60" height="52" rx="11" ry="11"
        fill="white" stroke="${m.color}" stroke-width="${bw}" />
      <!-- avatar circle -->
      <circle cx="32" cy="20" r="14" fill="${m.color}" />
      <!-- initial letter -->
      <text x="32" y="25" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="14" font-weight="900"
        fill="white">${init}</text>
      <!-- name -->
      <text x="32" y="43" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="9" font-weight="800"
        fill="#1e293b">${label}</text>
      <!-- status dot -->
      <circle cx="32" cy="51" r="3" fill="${m.color}" />
      <!-- arrow pointer -->
      <polygon points="26,53 38,53 32,${H}" fill="${m.color}" />
    </svg>`;
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    return window.L.icon({
      iconUrl:     url,
      iconSize:    [W, H],
      iconAnchor:  [W/2, H],
      popupAnchor: [0, -H],
    });
  }

  function updateMarkers() {
    const L = window.L, map = leafMap.current;
    if (!L || !map) return;

    const displayLocs = filter==="ALL" ? locs : locs.filter(l => {
      const s = techStatus(l);
      return filter==="FREE" ? s==="FREE" : s===filter;
    });

    const seen = new Set();
    displayLocs.forEach(loc => {
      const id = loc.techId, status = techStatus(loc);
      const m = getMeta(status), activeJob = techActiveJob(id);
      const isSelected = selId===id;
      seen.add(id);

      const custName = activeJob ? (activeJob.customer?.name||activeJob.customerName||"—") : null;
      const jobDist  = (activeJob?.latitude&&activeJob?.longitude)
        ? distKm(loc.latitude,loc.longitude,parseFloat(activeJob.latitude),parseFloat(activeJob.longitude)).toFixed(1) : null;
      const ago = timeAgo(loc.updatedAt);

      const popHtml = `
        <div style="font-family:system-ui,sans-serif;min-width:205px;max-width:235px;padding:2px;">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:9px;">
            <div style="width:40px;height:40px;border-radius:50%;flex-shrink:0;
              background:linear-gradient(135deg,${m.color},${m.color}aa);
              color:#fff;font-weight:900;font-size:17px;display:flex;align-items:center;justify-content:center;">
              ${(loc.name||"T")[0].toUpperCase()}</div>
            <div>
              <div style="font-weight:800;font-size:14px;color:#0f172a;">${loc.name}</div>
              <span style="padding:2px 8px;border-radius:20px;background:${m.bg};color:${m.color};font-size:10px;font-weight:700;">
                ${m.emoji} ${m.label}</span>
            </div>
          </div>
          ${custName?`<div style="background:#f8fafc;border-radius:9px;padding:8px 10px;margin-bottom:8px;border-left:3px solid ${m.color};">
            <div style="font-size:11px;font-weight:700;color:#1e293b;">${custName}</div>
            ${activeJob?.machineType?`<div style="font-size:10px;color:#64748b;margin-top:1px;">🖥️ ${activeJob.machineType} ${activeJob.machineBrand||""}</div>`:""}
            ${jobDist?`<div style="font-size:11px;color:${m.color};font-weight:700;margin-top:3px;">📏 ${jobDist} km door</div>`:""}
          </div>`:""}
          ${ago?`<div style="font-size:11px;color:${ago.stale?"#f59e0b":"#94a3b8"};font-weight:${ago.stale?700:400};margin-bottom:8px;">🕐 ${ago.text}${ago.stale?" ⚠️":""}</div>`:""}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            <a href="tel:${loc.mobile}" style="text-align:center;padding:8px;border-radius:8px;
              background:rgba(16,185,129,0.1);color:#059669;font-weight:700;font-size:12px;text-decoration:none;">📞 Call</a>
            <button onClick={()=>openExternal("https://maps.google.com?q=${loc.latitude},${loc.longitude}")} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>🗺️ Maps</button>
          </div>
        </div>`;

      if (techMarkers.current[id]) {
        techMarkers.current[id].setLatLng([loc.latitude,loc.longitude]);
        techMarkers.current[id].setIcon(makeTechIcon(loc,status,isSelected));
        techMarkers.current[id].getPopup()?.setContent(popHtml);
      } else {
        techMarkers.current[id] = L.marker([loc.latitude,loc.longitude], { icon:makeTechIcon(loc,status,isSelected) })
          .addTo(map).bindPopup(popHtml, { maxWidth:255 });
        techMarkers.current[id].on("click", () => setSelId(id));
      }

      // Route line
      if (routeLines.current[id]) { map.removeLayer(routeLines.current[id]); routeLines.current[id]=null; }
      if (activeJob?.latitude&&activeJob?.longitude&&status!=="FREE") {
        const jLat=parseFloat(activeJob.latitude), jLng=parseFloat(activeJob.longitude);
        const grp = L.layerGroup();
        L.polyline([[loc.latitude,loc.longitude],[jLat,jLng]],{color:"#000",weight:5,opacity:0.07}).addTo(grp);
        L.polyline([[loc.latitude,loc.longitude],[jLat,jLng]],{color:m.color,weight:3.5,opacity:0.85,dashArray:"10,7",lineCap:"round"}).addTo(grp);
        const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
          <path d="M12 0C5.4 0 0 5.4 0 12C0 20.4 12 32 12 32C12 32 24 20.4 24 12C24 5.4 18.6 0 12 0Z" fill="${m.color}"/>
          <text x="12" y="17" text-anchor="middle" font-size="8" font-family="system-ui" fill="white" font-weight="800">JOB</text></svg>`;
        L.marker([jLat,jLng], {
          icon: L.icon({iconUrl:"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(pinSvg),iconSize:[24,32],iconAnchor:[12,32],popupAnchor:[0,-36]})
        }).bindPopup(`<div style="font-family:system-ui;font-size:13px;font-weight:700;color:#1e293b;">🔧 ${custName||"Job"}</div>`).addTo(grp);
        routeLines.current[id] = grp.addTo(map);
      }
    });

    // Remove stale
    Object.keys(techMarkers.current).forEach(id => {
      if (!seen.has(Number(id))) {
        map.removeLayer(techMarkers.current[id]); delete techMarkers.current[id];
        if (routeLines.current[id]) { map.removeLayer(routeLines.current[id]); delete routeLines.current[id]; }
      }
    });

    if (!selId) {
      if (displayLocs.length>1) map.fitBounds(L.latLngBounds(displayLocs.map(l=>[l.latitude,l.longitude])),{padding:[60,60],maxZoom:14});
      else if (displayLocs.length===1) map.setView([displayLocs[0].latitude,displayLocs[0].longitude],14);
    }
  }

  function focusTech(loc) {
    setSelId(loc.techId);
    if (leafMap.current && techMarkers.current[loc.techId]) {
      leafMap.current.setView([loc.latitude,loc.longitude],15,{animate:true});
      setTimeout(() => techMarkers.current[loc.techId]?.openPopup(), 350);
    }
  }

  const displayed = filter==="ALL" ? locs : locs.filter(l => {
    const s = techStatus(l); return filter==="FREE" ? s==="FREE" : s===filter;
  });
  const count = (s) => s==="FREE"
    ? locs.filter(l=>techStatus(l)==="FREE").length
    : locs.filter(l=>techStatus(l)===s).length;

  const FILTERS = [
    {k:"ALL",        label:"All",         cnt:locs.length,         color:"#3b82f6"},
    {k:"FREE",       label:"Available",   cnt:count("FREE"),       color:"#10b981"},
    {k:"ASSIGNED",   label:"On Job",      cnt:count("ASSIGNED"),   color:"#f59e0b"},
    {k:"ON_THE_WAY", label:"On Way",      cnt:count("ON_THE_WAY"), color:"#3b82f6"},
    {k:"IN_PROGRESS",label:"In Progress", cnt:count("IN_PROGRESS"),color:"#8b5cf6"},
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12,
      height: isMob ? "calc(100vh - 64px - 52px - 16px)" : "calc(100vh - 130px)",
      minHeight: isMob ? "auto" : 520,
      paddingBottom: isMob ? "0" : 0 }}>

      {/* Pulse CSS */}
      <style>{`
        @keyframes livePulse {
          0%   { transform:scale(0.8); opacity:0.7; }
          100% { transform:scale(2.4); opacity:0; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, margin:0 }}>📍 Live Tracking</h2>
          <p style={{ fontSize:12, color:"#64748b", margin:"2px 0 0" }}>
            {locs.length} live
            {lastSync && <> · {lastSync.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</>}
          </p>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          {FILTERS.map(({k,label,cnt,color}) => (
            <button key={k} onClick={() => { setFilter(k); setSelId(null); }}
              style={{ padding:"5px 11px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer",
                border:"none", background:filter===k ? color : "#f1f5f9",
                color:filter===k ? "#fff" : "#64748b",
                boxShadow:filter===k ? `0 2px 8px ${color}40` : "none" }}>
              {label} <span style={{ marginLeft:4, padding:"1px 5px", borderRadius:8, fontSize:10,
                background:filter===k?"rgba(255,255,255,0.25)":"#e2e8f0", color:filter===k?"#fff":"#94a3b8" }}>{cnt}</span>
            </button>
          ))}
          <button onClick={fetchAll}
            style={{ padding:"5px 12px", borderRadius:20, border:"1.5px solid #e2e8f0",
              background:"#fff", color:"#3b82f6", fontWeight:700, fontSize:12, cursor:"pointer" }}>
            🔄
          </button>
        </div>
      </div>

      {/* ── MAIN: Left panel + Right map ── */}
      <div style={{ display:"flex", flexDirection: isMob?"column":"row", gap:12, flex:1, minHeight:0 }}>

        {/* LEFT PANEL */}
        <div style={{
          width: isMob?"100%":280, flexShrink:0,
          display:"flex", flexDirection:"column", gap:8,
          overflowY: isMob?"visible":"auto",
          maxHeight: isMob?"auto":"100%",
          paddingRight: isMob?0:2,
        }}>
          {loading ? (
            <div style={{padding:40,textAlign:"center",color:"#94a3b8"}}>
              <div style={{fontSize:28,marginBottom:8}}>⚡</div>
              <div style={{fontWeight:600}}>Loading...</div>
            </div>
          ) : displayed.length===0 ? (
            <div style={{padding:32,textAlign:"center",background:"#fff",borderRadius:16,
              border:"1px solid #e2e8f0",color:"#94a3b8"}}>
              <div style={{fontSize:40,marginBottom:10}}>📡</div>
              <div style={{fontWeight:700,fontSize:14,color:"#64748b"}}>Koi technician live nahi</div>
              <div style={{fontSize:12,marginTop:6,lineHeight:1.5}}>TechApp kholo aur Active toggle ON karo</div>
            </div>
          ) : (
            displayed.map(loc => {
              const status = techStatus(loc), m = getMeta(status);
              const activeJob = techActiveJob(loc.techId);
              const ago = timeAgo(loc.updatedAt);
              const isSelected = selId===loc.techId;
              const jobDist = (activeJob?.latitude&&activeJob?.longitude)
                ? distKm(loc.latitude,loc.longitude,parseFloat(activeJob.latitude),parseFloat(activeJob.longitude)).toFixed(1) : null;

              return (
                <div key={loc.techId} onClick={() => isSelected ? setSelId(null) : focusTech(loc)}
                  style={{
                    background:"#fff", borderRadius:14,
                    borderLeft:`4px solid ${m.color}`,
                    border:`2px solid ${isSelected?m.color:"#f1f5f9"}`,
                    padding:"12px 13px", cursor:"pointer", transition:"all 0.18s",
                    boxShadow: isSelected ? `0 4px 20px ${m.color}25` : "0 1px 4px rgba(0,0,0,0.04)",
                    transform: isSelected ? "translateX(2px)" : "none",
                  }}>

                  {/* Avatar + Name + Status */}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{position:"relative",flexShrink:0}}>
                      {status!=="FREE"&&status!=="OFFLINE" && (
                        <div style={{position:"absolute",inset:-3,borderRadius:"50%",
                          background:`${m.color}25`,animation:"livePulse 2s ease-out infinite"}}/>
                      )}
                      <div style={{width:38,height:38,borderRadius:"50%",position:"relative",
                        background:`linear-gradient(135deg,${m.color},${m.color}aa)`,
                        color:"#fff",fontWeight:900,fontSize:15,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        boxShadow:`0 2px 8px ${m.color}45`}}>
                        {(loc.name||"T")[0].toUpperCase()}
                      </div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:800,fontSize:14,color:"#0f172a",
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{loc.name}</div>
                      <div style={{fontSize:11,color:"#64748b",marginTop:1}}>📞 {loc.mobile}</div>
                    </div>
                    <span style={{padding:"3px 8px",borderRadius:20,fontSize:10,
                      fontWeight:700,background:m.bg,color:m.color,flexShrink:0,whiteSpace:"nowrap"}}>
                      {m.emoji} {m.label}
                    </span>
                  </div>

                  {/* Last sync time */}
                  {ago && (
                    <div style={{fontSize:11,marginBottom:activeJob?8:0,
                      color:ago.stale?"#f59e0b":"#94a3b8",fontWeight:ago.stale?700:400}}>
                      🕐 {ago.text}{ago.stale?" ⚠️":""}
                    </div>
                  )}

                  {/* Active job */}
                  {activeJob && (
                    <div style={{background:`${m.color}08`,borderRadius:8,
                      padding:"7px 10px",borderLeft:`2px solid ${m.color}`,marginBottom:8}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#374151"}}>
                        🔧 {activeJob.customer?.name||activeJob.customerName||"Job"}
                      </div>
                      {activeJob.machineType&&<div style={{fontSize:10,color:"#64748b",marginTop:1}}>🖥️ {activeJob.machineType} {activeJob.machineBrand}</div>}
                      {jobDist&&<div style={{fontSize:11,color:m.color,fontWeight:700,marginTop:2}}>📏 {jobDist} km door</div>}
                    </div>
                  )}

                  {/* Buttons */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    <a href={`tel:${loc.mobile}`} onClick={e=>e.stopPropagation()}
                      style={{padding:"7px",background:"rgba(16,185,129,0.08)",color:"#059669",
                        borderRadius:8,fontSize:12,fontWeight:700,textDecoration:"none",
                        textAlign:"center",border:"1px solid rgba(16,185,129,0.2)"}}>📞 Call</a>
                    <button onClick={(e)=>{e.stopPropagation();openExternal(`https://maps.google.com?q=${loc.latitude},${loc.longitude}`);}}
                      style={{padding:"7px",background:"rgba(59,130,246,0.08)",color:"#2563eb",
                        borderRadius:8,fontSize:12,fontWeight:700,border:"1px solid rgba(59,130,246,0.2)",cursor:"pointer",
                        textAlign:"center"}}>🗺️ Maps</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT: MAP */}
        <div style={{flex:1,borderRadius:16,overflow:"hidden",
          border:"1px solid #e2e8f0",boxShadow:"0 4px 20px rgba(0,0,0,0.07)",
          position:"relative",minHeight: isMob?360:0,background:"#f8fafc"}}>

          {loading ? (
            <div style={{height:"100%",minHeight:360,display:"flex",alignItems:"center",
              justifyContent:"center",flexDirection:"column",gap:12}}>
              <div style={{fontSize:36}}>⚡</div>
              <div style={{color:"#64748b",fontWeight:600}}>Map load ho raha hai...</div>
            </div>
          ) : locs.length===0 ? (
            <div style={{height:"100%",minHeight:360,display:"flex",alignItems:"center",
              justifyContent:"center",flexDirection:"column",gap:10}}>
              <div style={{fontSize:52}}>📡</div>
              <div style={{fontWeight:700,color:"#64748b",fontSize:16}}>Koi technician live nahi</div>
              <div style={{fontSize:12,color:"#94a3b8",textAlign:"center",lineHeight:1.5,maxWidth:260}}>
                Technician ka TechApp open hona chahiye aur Active ON
              </div>
              <button onClick={fetchAll} style={{marginTop:8,padding:"10px 20px",background:"#3b82f6",
                color:"#fff",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer"}}>
                🔄 Refresh
              </button>
            </div>
          ) : (
            <>
              <div ref={mapRef} style={{height:isMob?"calc(100vh - 64px - 52px - 200px)":"100%",width:"100%",minHeight:isMob?260:0}}/>

              {/* Legend */}
              <div style={{position:"absolute",bottom:16,left:16,zIndex:1000,
                background:"rgba(255,255,255,0.95)",backdropFilter:"blur(8px)",
                border:"1px solid #e2e8f0",borderRadius:12,
                padding:"8px 12px",boxShadow:"0 4px 14px rgba(0,0,0,0.08)",
                fontSize:11,fontWeight:600}}>
                {[["🟢","Available"],["🟡","On Job"],["🔵","On Way"],["🟣","In Progress"],["⚫","Offline"]].map(([em,lbl])=>(
                  <div key={lbl} style={{display:"flex",alignItems:"center",gap:5,marginBottom:2,color:"#374151"}}>
                    <span>{em}</span><span>{lbl}</span>
                  </div>
                ))}
              </div>

              {/* Routes legend */}
              {locs.some(l=>techActiveJob(l.techId)?.latitude) && (
                <div style={{position:"absolute",top:16,right:16,zIndex:1000,
                  background:"rgba(255,255,255,0.95)",backdropFilter:"blur(8px)",
                  border:"1px solid #e2e8f0",borderRadius:12,
                  padding:"8px 12px",boxShadow:"0 4px 14px rgba(0,0,0,0.08)",
                  fontSize:11,color:"#374151",fontWeight:600}}>
                  <div style={{marginBottom:3,color:"#3b82f6"}}>🗺️ Routes</div>
                  <div style={{color:"#94a3b8"}}>- - - Tech → Job</div>
                  <div style={{color:"#94a3b8",marginTop:1}}>📍 = Job</div>
                </div>
              )}

              {/* Selected tech overlay */}
              {selId && (() => {
                const sl = locs.find(l=>l.techId===selId);
                if (!sl) return null;
                const m = getMeta(techStatus(sl));
                return (
                  <div style={{position:"absolute",top:16,left:16,zIndex:1000,
                    background:"#fff",border:`2px solid ${m.color}`,borderRadius:12,
                    padding:"8px 14px",boxShadow:`0 4px 16px ${m.color}30`,
                    display:"flex",alignItems:"center",gap:8,fontSize:12}}>
                    <div style={{width:28,height:28,borderRadius:"50%",
                      background:`linear-gradient(135deg,${m.color},${m.color}aa)`,
                      color:"#fff",fontWeight:900,fontSize:13,flexShrink:0,
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {(sl.name||"T")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontWeight:800,color:"#0f172a",fontSize:13}}>{sl.name}</div>
                      <div style={{color:m.color,fontWeight:700,fontSize:10}}>{m.emoji} {m.label}</div>
                    </div>
                    <button onClick={()=>setSelId(null)}
                      style={{background:"#f1f5f9",border:"none",borderRadius:6,
                        width:22,height:22,cursor:"pointer",color:"#64748b",marginLeft:4,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>✕</button>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
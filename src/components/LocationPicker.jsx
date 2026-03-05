// src/components/LocationPicker.jsx
// Blinkit-style map — pin drag karo, address auto-fill!
// Uses Leaflet.js + OpenStreetMap (FREE, no API key!)
// npm install leaflet react-leaflet  --  zaroori hai

import { useState, useEffect, useRef } from "react";

export default function LocationPicker({ address, latitude, longitude, onLocationSelect, onClose }) {
  const mapRef       = useRef(null);
  const leafletMap   = useRef(null);
  const markerRef    = useRef(null);
  const [loading, setLoading]     = useState(false);
  const [addr, setAddr]           = useState(address || "");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords]       = useState({
    lat: latitude  || 19.8762,   // Default: Aurangabad
    lng: longitude || 75.3433,
  });

  // ── Load Leaflet dynamically (no npm needed if not installed) ──
  useEffect(() => {
    const loadLeaflet = async () => {
      // Inject Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id   = "leaflet-css";
        link.rel  = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Inject Leaflet JS
      if (!window.L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      initMap();
    };

    loadLeaflet();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.L || leafletMap.current) return;

    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([coords.lat, coords.lng], 16);
    leafletMap.current = map;

    // OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    // Custom yellow pin icon
    const pinIcon = L.divIcon({
      html: `
        <div style="
          display:flex; flex-direction:column; align-items:center;
          transform: translateX(-50%) translateY(-100%);
        ">
          <div style="
            width:44px; height:44px; border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            background:#f5c518;
            border:3px solid #0d1117;
            box-shadow:0 4px 16px rgba(0,0,0,0.5);
            display:flex; align-items:center; justify-content:center;
          ">
            <span style="transform:rotate(45deg); font-size:20px;">⚡</span>
          </div>
          <div style="width:2px; height:12px; background:#f5c518;"></div>
        </div>`,
      className: "",
      iconSize: [44, 60],
      iconAnchor: [22, 60],
    });

    const marker = L.marker([coords.lat, coords.lng], {
      icon: pinIcon,
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    // On drag end — reverse geocode
    marker.on("dragend", async (e) => {
      const { lat, lng } = e.target.getLatLng();
      setCoords({ lat, lng });
      await reverseGeocode(lat, lng);
    });

    // Click on map to move pin
    map.on("click", async (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setCoords({ lat, lng });
      await reverseGeocode(lat, lng);
    });

    // Add zoom controls (bottom right)
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // If existing coords, reverse geocode on init
    if (latitude && longitude) {
      reverseGeocode(latitude, longitude);
    }
  };

  // ── Reverse geocode lat/lng → address ──
  const reverseGeocode = async (lat, lng) => {
    setLoading(true);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      setAddr(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      setAddr(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Search address → geocode ──
  const searchAddress = async () => {
    if (!addr.trim()) return;
    setLoading(true);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setCoords({ lat, lng });
        setAddr(data[0].display_name);
        if (leafletMap.current && markerRef.current) {
          leafletMap.current.setView([lat, lng], 17);
          markerRef.current.setLatLng([lat, lng]);
        }
      } else {
        alert("Address nahi mila. Alag naam try karo.");
      }
    } catch (e) {
      alert("Search error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── GPS current location ──
  const useGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        if (leafletMap.current && markerRef.current) {
          leafletMap.current.setView([lat, lng], 17);
          markerRef.current.setLatLng([lat, lng]);
        }
        await reverseGeocode(lat, lng);
        setGpsLoading(false);
      },
      (err) => { alert("GPS error: " + err.message); setGpsLoading(false); }
    );
  };

  // ── Confirm selection ──
  const confirmLocation = () => {
    onLocationSelect({
      address: addr,
      latitude: coords.lat.toFixed(6),
      longitude: coords.lng.toFixed(6),
    });
    onClose();
  };

  return (
    <div className="map-modal-overlay">
      <div className="map-modal">

        {/* Header */}
        <div className="map-modal-header">
          <div>
            <h3>📍 Location Select Karo</h3>
            <p>Pin drag karo ya address search karo</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Search bar */}
        <div className="map-search-bar">
          <input
            type="text"
            className="map-search-input"
            placeholder="Address search karo — e.g. Aurangabad, Maharashtra"
            value={addr}
            onChange={e => setAddr(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchAddress()}
          />
          <button className="map-search-btn" onClick={searchAddress} disabled={loading}>
            {loading ? "⏳" : "🔍"}
          </button>
          <button className="gps-btn" onClick={useGPS} disabled={gpsLoading}>
            {gpsLoading ? "📡..." : "📡 GPS"}
          </button>
        </div>

        {/* Map container */}
        <div className="map-container" ref={mapRef} />

        {/* Pin instruction */}
        <div className="map-instruction">
          <span>📌</span>
          <span>Pin ko drag karo exact location pe, ya map pe click karo</span>
        </div>

        {/* Selected location preview */}
        <div className="map-selected-addr">
          <div className="map-addr-icon">📍</div>
          <div className="map-addr-text">
            {loading ? (
              <span className="addr-loading">Address dhund raha hai...</span>
            ) : (
              <span>{addr || "Koi location select nahi ki"}</span>
            )}
            <div className="addr-coords">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="map-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={confirmLocation} disabled={!addr || loading}>
            ✅ Yahi Location Set Karo
          </button>
        </div>

      </div>
    </div>
  );
}
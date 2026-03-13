// src/hooks/useSettings.js
import { useState, useEffect, useRef } from "react";
import { authHeader, apiFetch } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

let _cache = null;
let _listeners = [];  // All mounted hooks listen for cache clears

export function clearSettingsCache() {
  _cache = null;
  // Notify all mounted hooks to re-fetch
  _listeners.forEach(fn => fn());
}

const DEFAULT = {
  companyName: "Matoshree Enterprises",
  companyAddress: "", companyPhone: "", companyPhone2: "",
  companyEmail: "", gstNumber: "", tagline: "",
  rateCardJson: "", invoiceMsgTemplate: "",
  assignedMsgTemplate: "", warrantyMsgTemplate: "", thankyouMsgTemplate: "",
  linksJson: "",
};

export function useSettings() {
  const [settings, setSettings] = useState(_cache || DEFAULT);
  const refetch = useRef(null);

  refetch.current = async () => {
    try {
      const r = await apiFetch(`${API}/settings`, { headers: authHeader() });
      const d = await r.json();
      _cache = d;
      setSettings(d);
    } catch(e) {}
  };

  useEffect(() => {
    // Register as listener so clearSettingsCache triggers re-fetch
    const listener = () => refetch.current && refetch.current();
    _listeners.push(listener);

    // Initial fetch
    if (_cache) { setSettings(_cache); }
    else { refetch.current(); }

    return () => { _listeners = _listeners.filter(l => l !== listener); };
  }, []);

  // Build footer string from current settings
  const buildFooter = (s = settings) => {
    const parts = [];
    if (s.companyPhone)   parts.push(`📞 ${s.companyPhone}`);
    if (s.companyPhone2)  parts.push(`📞 ${s.companyPhone2}`);
    if (s.companyEmail)   parts.push(`✉️ ${s.companyEmail}`);
    if (s.companyAddress) {
      parts.push(`📍 ${s.companyAddress}`);
      parts.push(`🗺️ https://maps.google.com/?q=${encodeURIComponent(s.companyAddress)}`);
    }
    try {
      JSON.parse(s.linksJson || "[]")
        .filter(l => l.url)
        .forEach(l => parts.push(`🔗 ${l.label ? l.label + ": " : ""}${l.url}`));
    } catch(e) {}
    return parts.length > 0 ? "\n\n" + parts.join("\n") : "";
  };

  const fillTemplate = (templateKey, vars = {}) => {
    const template = settings[templateKey];
    const comp = settings.companyName || "Matoshree Enterprises";
    const footer = buildFooter();

    const defaults = {
      assignedMsgTemplate:
        `🙏 Namaste ${vars.customerName||""} ji!\n\nAapka service request confirm ho gaya hai. ✅\n\n👷 Technician: ${vars.techName||""}\n📞 Tech Mobile: ${vars.techMobile||""}\n📅 Schedule: ${vars.scheduledDate||""}\n🔧 Machine: ${vars.machineType||""}\n\nKoi problem ho toh humse contact karein.\n\n— ${comp}${footer}`,
      invoiceMsgTemplate:
        `🙏 Namaste ${vars.customerName||""} ji!\n\nAapki ${vars.machineType||""} ki service complete ho gayi. ✅\n\n🧾 Invoice No: ${vars.invoiceNo||""}\n💰 Total: ${vars.total||""}\n${vars.warranty && vars.warranty!=="No Warranty" ? `🛡️ Warranty: ${vars.warranty}\n` : ""}\nDhanyawad aapka! 🙏\n\n— ${comp}${footer}`,
      warrantyMsgTemplate:
        `🛡️ *WARRANTY CARD — ${comp}*\n\nCustomer: ${vars.customerName||""}\nMachine: ${vars.machineType||""}\nSerial No: ${vars.serialNumber||"—"}\nService Date: ${vars.serviceDate||""}\nWarranty: ${vars.warranty||""}\n\n✅ Kaam kiya: ${vars.serviceDetails||""}\n\nWarranty ke liye humara number save karein.\n\n— ${comp}${footer}`,
      thankyouMsgTemplate:
        `🙏 Namaste ${vars.customerName||""} ji!\n\nAapka bahut bahut dhanyawad! 😊\nHamari service aapko pasand aayi hogi.\n\nKoi bhi problem aaye toh zaroor batao.\n\n— ${comp}${footer}`,
    };

    let msg = (template && template.trim()) ? template : defaults[templateKey] || "";
    Object.entries({ ...vars, companyName: comp }).forEach(([k, v]) => {
      msg = msg.replace(new RegExp(`\\{${k}\\}`, "g"), v || "");
    });

    // Append footer if not already present
    if (footer && !msg.includes(footer.trim())) {
      msg = msg + footer;
    }

    return msg;
  };

  return { settings, fillTemplate, buildFooter };
}
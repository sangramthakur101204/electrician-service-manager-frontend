// src/hooks/useSettings.js
// Lightweight settings hook - reads from backend, caches in module-level variable
import { useState, useEffect } from "react";
import { authHeader, apiFetch } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

let _cache = null;   // module-level cache so all components share same data

export function useSettings() {
  const [settings, setSettings] = useState(_cache || {
    companyName: "Matoshree Enterprises",
    companyAddress: "",
    companyPhone: "",
    gstNumber: "",
    tagline: "",
    rateCardJson: "",
    invoiceMsgTemplate: "",
    assignedMsgTemplate: "",
    warrantyMsgTemplate: "",
    thankyouMsgTemplate: "",
    linksJson: "",
  });

  useEffect(() => {
    if (_cache) { setSettings(_cache); return; }
    apiFetch(`${API}/settings`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { _cache = d; setSettings(d); })
      .catch(() => {});
  }, []);

  // Invalidate cache (call after saving settings)
  const invalidate = () => { _cache = null; };

  // Fill a message template with actual values
  const fillTemplate = (templateKey, vars = {}) => {
    const template = settings[templateKey];
    const comp = settings.companyName || "Matoshree Enterprises";
    const defaults = {
      assignedMsgTemplate:
        `🙏 Namaste ${vars.customerName||""} ji!\n\nAapka service request confirm ho gaya hai. ✅\n\n👷 Technician: ${vars.techName||""}\n📞 Tech Mobile: ${vars.techMobile||""}\n📅 Schedule: ${vars.scheduledDate||""}\n🔧 Machine: ${vars.machineType||""}\n\nKoi problem ho toh humse contact karein.\n\n- ${comp}`,
      invoiceMsgTemplate:
        `🙏 Namaste ${vars.customerName||""} ji!\n\nAapki ${vars.machineType||""} ki service complete ho gayi. ✅\n\n🧾 Invoice No: ${vars.invoiceNo||""}\n💰 Total: ${vars.total||""}\n${vars.warranty && vars.warranty!=="No Warranty" ? `🛡️ Warranty: ${vars.warranty}\n` : ""}\nDhanyawad aapka! 🙏\n\n- ${comp}`,
      warrantyMsgTemplate:
        `🛡️ *WARRANTY CARD - ${comp}*\n\nCustomer: ${vars.customerName||""}\nMachine: ${vars.machineType||""}\nSerial No: ${vars.serialNumber||"—"}\nService Date: ${vars.serviceDate||""}\nWarranty: ${vars.warranty||""}\n\n✅ Kaam kiya: ${vars.serviceDetails||""}\n\nWarranty ke liye humara number save karein.\n\n- ${comp}`,
      thankyouMsgTemplate:
        `🙏 Namaste ${vars.customerName||""} ji!\n\nAapka bahut bahut dhanyawad! 😊\nHamari service aapko pasand aayi hogi.\n\nKoi bhi problem aaye toh zaroor batao.\n\n- ${comp}`,
    };

    let msg = (template && template.trim()) ? template : defaults[templateKey] || "";

    // Replace all {variables}
    Object.entries({ ...vars, companyName: comp }).forEach(([k, v]) => {
      msg = msg.replace(new RegExp(`\\{${k}\\}`, "g"), v || "");
    });

    // Auto-append footer: company contact + address (clickable Maps) + custom links
    const footerParts = [];
    if (settings.companyPhone)  footerParts.push(`📞 ${settings.companyPhone}`);
    if (settings.companyPhone2) footerParts.push(`📞 ${settings.companyPhone2}`);
    if (settings.companyEmail)  footerParts.push(`✉️ ${settings.companyEmail}`);
    if (settings.companyAddress) {
      footerParts.push(`📍 ${settings.companyAddress}`);
      footerParts.push(`🗺️ https://maps.google.com/?q=${encodeURIComponent(settings.companyAddress)}`);
    }
    try {
      const links = JSON.parse(settings.linksJson || "[]");
      links.filter(l=>l.url).forEach(l => footerParts.push(`🔗 ${l.label ? l.label+": " : ""}${l.url}`));
    } catch(e) {}

    if (footerParts.length > 0) {
      msg = msg + "\n\n" + footerParts.join("\n");
    }

    return msg;
  };

  return { settings, fillTemplate, invalidate };
}

export function clearSettingsCache() { _cache = null; }
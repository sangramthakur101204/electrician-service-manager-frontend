// src/services/api.js
export const BASE_URL = "http://localhost:8080/customers";

export const getAllCustomers = async () => {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

export const addCustomer = async (customer) => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customer),
  });
  if (!res.ok) throw new Error("Failed to add");
  return res.json();
};

export const updateCustomer = async (id, customer) => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customer),
  });
  if (!res.ok) throw new Error("Failed to update");
  return res.json();
};

export const deleteCustomer = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete");
};

export const markServiceDone = async (id) => {
  const res = await fetch(`${BASE_URL}/complete/${id}`, { method: "PUT" });
  if (!res.ok) throw new Error("Failed");
  return res.json();
};

export const getExpiringWarranty = async () => {
  const res = await fetch(`${BASE_URL}/warranty-expiring`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
};

export const getWhatsAppLink         = async (id) => (await fetch(`${BASE_URL}/whatsapp/thankyou/${id}`)).text();
export const getWhatsAppReminderLink = async (id) => (await fetch(`${BASE_URL}/whatsapp/reminder/${id}`)).text();
export const getWhatsAppWarrantyLink = async (id) => (await fetch(`${BASE_URL}/whatsapp/warranty/${id}`)).text();
export const getMapLink              = async (id) => (await fetch(`${BASE_URL}/map/${id}`)).text();

// ── Rate Cards ────────────────────────────────────────────────────────────────
export const getRateCards = async () => {
  const res = await fetch("http://localhost:8080/rate-cards/active");
  if (!res.ok) throw new Error("Rate cards fetch failed");
  return res.json();
};

// ── Invoices ──────────────────────────────────────────────────────────────────
export const createInvoice = async (data) => {
  const res = await fetch("http://localhost:8080/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Invoice create karne mein error");
  return res.json();
};

export const downloadInvoicePdf = async (invoiceId, customerName, invoiceNumber) => {
  const res = await fetch(`http://localhost:8080/invoices/${invoiceId}/pdf`);
  if (!res.ok) throw new Error("PDF download karne mein error");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice_${customerName?.replace(/\s+/g, "_")}_${invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Reverse geocode: lat,lng → address (free, no API key needed)
export const reverseGeocode = async (lat, lng) => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { "Accept-Language": "en" } }
  );
  const data = await res.json();
  return data.display_name || "";
};
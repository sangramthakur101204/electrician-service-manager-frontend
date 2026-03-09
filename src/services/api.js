// src/services/api.js
import { toast } from "../components/Toast.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
export const BASE_URL = `${API}/customers`;

// ── Auth Helper ───────────────────────────────────────────────────────────────
export const authHeader = () => ({
  "Content-Type": "application/json",
  "Authorization": "Bearer " + (localStorage.getItem("token") || ""),
});

// ── Central fetch wrapper — handles 401 auto-logout ───────────────────────────
export async function apiFetch(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    // Network error (no internet)
    toast("Server se connect nahi ho pa raha — internet check karo", "error", 5000);
    throw new Error("Network error");
  }

  // Token expired / unauthorized
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast("Session expire ho gayi — dobara login karo", "warning", 4000);
    setTimeout(() => window.location.reload(), 1500);
    throw new Error("Unauthorized");
  }

  return res;
}

// ── Auth APIs ─────────────────────────────────────────────────────────────────
export const loginUser = async (mobile, password) => {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data;
};

export const registerOwner = async (name, mobile, password) => {
  const res = await fetch(`${API}/auth/register-owner`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mobile, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Register failed");
  return data;
};

// ── Technician APIs ───────────────────────────────────────────────────────────
export const getTechnicians = async () => {
  const res = await apiFetch(`${API}/technicians`, { headers: authHeader() });
  if (!res.ok) throw new Error("Technicians fetch failed");
  return res.json();
};

export const addTechnician = async (data) => {
  const res = await apiFetch(`${API}/technicians`, {
    method: "POST", headers: authHeader(), body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Add failed");
  return json;
};

export const toggleTechnician = async (id) => {
  const res = await apiFetch(`${API}/technicians/${id}/toggle`, {
    method: "PUT", headers: authHeader(),
  });
  if (!res.ok) throw new Error("Toggle failed");
  return res.json();
};

export const deleteTechnician = async (id) => {
  const res = await apiFetch(`${API}/technicians/${id}`, {
    method: "DELETE", headers: authHeader(),
  });
  if (!res.ok) throw new Error("Delete failed");
};

// ── Customer APIs ─────────────────────────────────────────────────────────────
export const getAllCustomers = async () => {
  const res = await apiFetch(BASE_URL, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

export const addCustomer = async (customer) => {
  const res = await apiFetch(BASE_URL, {
    method: "POST", headers: authHeader(), body: JSON.stringify(customer),
  });
  if (!res.ok) throw new Error("Failed to add");
  return res.json();
};

export const updateCustomer = async (id, customer) => {
  const res = await apiFetch(`${BASE_URL}/${id}`, {
    method: "PUT", headers: authHeader(), body: JSON.stringify(customer),
  });
  if (!res.ok) throw new Error("Failed to update");
  return res.json();
};

export const deleteCustomer = async (id) => {
  const res = await apiFetch(`${BASE_URL}/${id}`, {
    method: "DELETE", headers: authHeader(),
  });
  if (!res.ok) throw new Error("Failed to delete");
};

export const markServiceDone = async (id) => {
  const res = await apiFetch(`${BASE_URL}/complete/${id}`, {
    method: "PUT", headers: authHeader(),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
};

export const getExpiringWarranty = async () => {
  const res = await apiFetch(`${BASE_URL}/warranty-expiring`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed");
  return res.json();
};

export const getWhatsAppLink         = async (id) => (await apiFetch(`${BASE_URL}/whatsapp/thankyou/${id}`, { headers: authHeader() })).text();
export const getWhatsAppReminderLink = async (id) => (await apiFetch(`${BASE_URL}/whatsapp/reminder/${id}`, { headers: authHeader() })).text();
export const getWhatsAppWarrantyLink = async (id) => (await apiFetch(`${BASE_URL}/whatsapp/warranty/${id}`, { headers: authHeader() })).text();
export const getMapLink              = async (id) => (await apiFetch(`${BASE_URL}/map/${id}`, { headers: authHeader() })).text();

// ── Rate Cards ────────────────────────────────────────────────────────────────
export const getRateCards = async () => {
  const res = await apiFetch(`${API}/rate-cards/active`, { headers: authHeader() });
  if (!res.ok) throw new Error("Rate cards fetch failed");
  return res.json();
};

// ── Invoices ──────────────────────────────────────────────────────────────────
export const createInvoice = async (data) => {
  const res = await apiFetch(`${API}/invoices`, {
    method: "POST", headers: authHeader(), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Invoice create karne mein error");
  return res.json();
};

export const downloadInvoicePdf = async (invoiceId, customerName, invoiceNumber) => {
  const res = await apiFetch(`${API}/invoices/${invoiceId}/pdf`, { headers: authHeader() });
  if (!res.ok) throw new Error("PDF download karne mein error");
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `Invoice_${customerName?.replace(/\s+/g,"_")}_${invoiceNumber}.pdf`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
};

// ── Reverse Geocode ───────────────────────────────────────────────────────────
export const reverseGeocode = async (lat, lng) => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { "Accept-Language": "en" } }
  );
  const data = await res.json();
  return data.display_name || "";
};

// ── Live Location ──────────────────────────────────────────────────────────────
export const sendLocation = async (latitude, longitude) => {
  await apiFetch(`${API}/location`, {
    method: "POST", headers: authHeader(),
    body: JSON.stringify({ latitude, longitude }),
  });
};

export const getLiveLocations = async () => {
  const res = await apiFetch(`${API}/location`, { headers: authHeader() });
  return res.json();
};

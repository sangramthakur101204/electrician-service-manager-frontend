// src/components/Reminders.jsx
import { useState } from "react";
import { getWhatsAppLink, getWhatsAppReminderLink } from "../services/api";

export default function Reminders({ expiring, customers, onRefresh }) {
  const [sending, setSending] = useState(null);

  const pending = customers.filter((c) => c.serviceStatus === "PENDING");

  const daysLeft = (dateStr) => {
    if (!dateStr) return null;
    const days = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleSendWhatsApp = async (id, type) => {
    setSending(id + type);
    try {
      const link = type === "reminder" ? await getWhatsAppReminderLink(id) : await getWhatsAppLink(id);
      window.open(link, "_blank");
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setSending(null);
    }
  };

  const sendAllWarrantyReminders = async () => {
    for (const c of expiring) {
      const link = await getWhatsAppReminderLink(c.id);
      window.open(link, "_blank");
      await new Promise((r) => setTimeout(r, 500));
    }
  };

  return (
    <div className="reminders-page">
      {/* Warranty Expiring */}
      <div className="reminder-section">
        <div className="section-header">
          <div>
            <h2>⚠️ Warranty Expiring Soon</h2>
            <p>{expiring.length} customer{expiring.length !== 1 ? "s" : ""} need attention in next 30 days</p>
          </div>
          {expiring.length > 0 && (
            <button className="btn-primary" onClick={sendAllWarrantyReminders}>
              💬 Send All WhatsApp Reminders
            </button>
          )}
        </div>

        {expiring.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <p>No warranties expiring in next 30 days!</p>
          </div>
        ) : (
          <div className="reminder-cards">
            {expiring.map((c) => {
              const days = daysLeft(c.warrantyEnd);
              return (
                <div key={c.id} className={`reminder-card ${days <= 7 ? "urgent" : "warning"}`}>
                  <div className="r-card-left">
                    <div className="r-avatar">{c.name?.[0]?.toUpperCase()}</div>
                    <div>
                      <div className="r-name">{c.name}</div>
                      <div className="r-mobile">📞 {c.mobile}</div>
                      <div className="r-machine">{c.machineType} • {c.machineBrand} • {c.model}</div>
                    </div>
                  </div>
                  <div className="r-card-right">
                    <div className={`days-badge ${days <= 7 ? "urgent" : ""}`}>
                      {days} days left
                    </div>
                    <div className="r-date">Expires: {c.warrantyEnd}</div>
                    <div className="r-actions">
                      <button
                        className="btn-whatsapp"
                        onClick={() => handleSendWhatsApp(c.id, "reminder")}
                        disabled={sending === c.id + "reminder"}
                      >
                        {sending === c.id + "reminder" ? "Opening..." : "💬 Send Reminder"}
                      </button>
                      <button
                        className="btn-thankyou"
                        onClick={() => handleSendWhatsApp(c.id, "thankyou")}
                        disabled={sending === c.id + "thankyou"}
                      >
                        🙏 Thank You Msg
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Services */}
      <div className="reminder-section">
        <div className="section-header">
          <div>
            <h2>⏳ Pending Services</h2>
            <p>{pending.length} service{pending.length !== 1 ? "s" : ""} still pending</p>
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <p>All services completed!</p>
          </div>
        ) : (
          <div className="reminder-cards">
            {pending.map((c) => (
              <div key={c.id} className="reminder-card pending">
                <div className="r-card-left">
                  <div className="r-avatar r-avatar-orange">{c.name?.[0]?.toUpperCase()}</div>
                  <div>
                    <div className="r-name">{c.name}</div>
                    <div className="r-mobile">📞 {c.mobile}</div>
                    <div className="r-machine">{c.machineType} • {c.machineBrand} • {c.model}</div>
                    {c.address && (
                      <button
                        className="map-link"
                        onClick={() => window.open(
                          c.latitude && c.longitude
                            ? `https://www.google.com/maps?q=${c.latitude},${c.longitude}`
                            : `https://www.google.com/maps/search/${encodeURIComponent(c.address)}`,
                          "_blank"
                        )}
                      >
                        📍 {c.address}
                      </button>
                    )}
                  </div>
                </div>
                <div className="r-card-right">
                  <span className="status-badge status-pending">⏳ Pending</span>
                  <div className="r-actions">
                    <button
                      className="btn-whatsapp"
                      onClick={() => handleSendWhatsApp(c.id, "reminder")}
                      disabled={sending === c.id + "reminder"}
                    >
                      {sending === c.id + "reminder" ? "Opening..." : "💬 Send Reminder"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// src/components/Dashboard.jsx
export default function Dashboard({ customers, expiring, onNavigate }) {
  const total = customers.length;
  const pending = customers.filter((c) => c.serviceStatus === "PENDING").length;
  const done = customers.filter((c) => c.serviceStatus === "DONE").length;
  const warrantyAlerts = expiring.length;

  const recentCustomers = [...customers]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  const machineStats = customers.reduce((acc, c) => {
    acc[c.machineType] = (acc[c.machineType] || 0) + 1;
    return acc;
  }, {});

  const topMachines = Object.entries(machineStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const statCards = [
    { label: "Total Customers", value: total, icon: "👥", color: "blue", action: () => onNavigate("customers") },
    { label: "Pending Services", value: pending, icon: "⏳", color: "orange", action: () => onNavigate("customers") },
    { label: "Completed Services", value: done, icon: "✅", color: "green", action: () => onNavigate("customers") },
    { label: "Warranty Alerts", value: warrantyAlerts, icon: "⚠️", color: "red", action: () => onNavigate("reminders") },
  ];

  return (
    <div className="dashboard">
      {/* Stat Cards */}
      <div className="stats-grid">
        {statCards.map((s) => (
          <button key={s.label} className={`stat-card stat-${s.color}`} onClick={s.action}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-info">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
            <div className="stat-arrow">→</div>
          </button>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Recent Customers */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>🕐 Recent Customers</h3>
            <button className="text-btn" onClick={() => onNavigate("customers")}>View All →</button>
          </div>
          <div className="recent-list">
            {recentCustomers.length === 0 ? (
              <p className="empty-msg">No customers yet. <button className="text-btn" onClick={() => onNavigate("add")}>Add one →</button></p>
            ) : (
              recentCustomers.map((c) => (
                <div key={c.id} className="recent-item">
                  <div className="recent-avatar">{c.name?.[0]?.toUpperCase() || "?"}</div>
                  <div className="recent-info">
                    <div className="recent-name">{c.name}</div>
                    <div className="recent-meta">{c.machineType} • {c.machineBrand}</div>
                  </div>
                  <span className={`status-badge status-${c.serviceStatus?.toLowerCase()}`}>
                    {c.serviceStatus}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Machine Breakdown */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>🔧 Machine Types</h3>
          </div>
          {topMachines.length === 0 ? (
            <p className="empty-msg">No data yet.</p>
          ) : (
            <div className="machine-bars">
              {topMachines.map(([type, count]) => (
                <div key={type} className="bar-row">
                  <span className="bar-label">{type || "Unknown"}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  </div>
                  <span className="bar-count">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Warranty Alerts Preview */}
        {expiring.length > 0 && (
          <div className="dash-card alert-card">
            <div className="dash-card-header">
              <h3>⚠️ Expiring Warranties</h3>
              <button className="text-btn" onClick={() => onNavigate("reminders")}>Manage →</button>
            </div>
            <div className="alert-list">
              {expiring.slice(0, 4).map((c) => (
                <div key={c.id} className="alert-item">
                  <span className="alert-dot">●</span>
                  <div>
                    <strong>{c.name}</strong> — {c.machineBrand} {c.model}
                    <div className="alert-date">Expires: {c.warrantyEnd}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>⚡ Quick Actions</h3>
          </div>
          <div className="quick-actions">
            <button className="qa-btn qa-blue" onClick={() => onNavigate("add")}>
              <span>➕</span> Add New Customer
            </button>
            <button className="qa-btn qa-green" onClick={() => onNavigate("customers")}>
              <span>📋</span> View All Customers
            </button>
            <button className="qa-btn qa-orange" onClick={() => onNavigate("reminders")}>
              <span>🔔</span> Check Reminders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// src/components/Analytics.jsx
// npm install recharts  --  pehle run karo!
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, AreaChart, Area,
} from "recharts";

const COLORS = ["#f5c518", "#0a84ff", "#00d68f", "#ff9500", "#ff453a", "#bf5af2", "#30d158"];

export default function Analytics({ customers }) {
  if (!customers || customers.length === 0) {
    return (
      <div className="analytics-empty">
        <div style={{ fontSize: 48 }}>📊</div>
        <h3>No data yet</h3>
        <p>Add some customers to see analytics</p>
      </div>
    );
  }

  // ── Data calculations ──

  // 1. Service Status Pie
  const done    = customers.filter(c => c.serviceStatus === "DONE").length;
  const pending = customers.filter(c => c.serviceStatus === "PENDING").length;
  const statusData = [
    { name: "Completed ✅", value: done },
    { name: "Pending ⏳",   value: pending },
  ];

  // 2. Machine Type Bar
  const machineMap = customers.reduce((acc, c) => {
    const key = c.machineType || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const machineData = Object.entries(machineMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // 3. Brand Pie
  const brandMap = customers.reduce((acc, c) => {
    const key = c.machineBrand || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const brandData = Object.entries(brandMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  // 4. Monthly customers trend (by purchase date)
  const monthMap = {};
  customers.forEach(c => {
    if (c.purchaseDate) {
      const d = new Date(c.purchaseDate);
      const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      monthMap[key] = (monthMap[key] || 0) + 1;
    }
  });
  const monthData = Object.entries(monthMap)
    .slice(-8)
    .map(([month, customers]) => ({ month, customers }));

  // 5. Warranty expiry urgency
  const today = new Date();
  const expired   = customers.filter(c => c.warrantyEnd && new Date(c.warrantyEnd) < today).length;
  const expiring7 = customers.filter(c => {
    if (!c.warrantyEnd) return false;
    const d = (new Date(c.warrantyEnd) - today) / 86400000;
    return d >= 0 && d <= 7;
  }).length;
  const expiring30 = customers.filter(c => {
    if (!c.warrantyEnd) return false;
    const d = (new Date(c.warrantyEnd) - today) / 86400000;
    return d > 7 && d <= 30;
  }).length;
  const safe = customers.length - expired - expiring7 - expiring30;

  const warrantyData = [
    { name: "Safe ✅",        value: safe,       color: "#00d68f" },
    { name: "Expiring 30d ⚠️", value: expiring30, color: "#ff9500" },
    { name: "Expiring 7d 🔴",  value: expiring7,  color: "#ff453a" },
    { name: "Expired ❌",      value: expired,    color: "#636366" },
  ].filter(d => d.value > 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{payload[0].name || payload[0].payload?.name}</p>
          <p className="tooltip-value">{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  // Summary stats
  const completionRate = customers.length ? Math.round((done / customers.length) * 100) : 0;
  const topBrand = brandData[0]?.name || "—";
  const topMachine = machineData[0]?.name || "—";
  const expiringCount = expiring7 + expiring30;

  return (
    <div className="analytics-page">

      {/* Summary row */}
      <div className="analytics-summary">
        <div className="summary-tile">
          <div className="summary-number" style={{ color: "#f5c518" }}>{customers.length}</div>
          <div className="summary-label">Total Customers</div>
        </div>
        <div className="summary-tile">
          <div className="summary-number" style={{ color: "#00d68f" }}>{completionRate}%</div>
          <div className="summary-label">Completion Rate</div>
        </div>
        <div className="summary-tile">
          <div className="summary-number" style={{ color: "#0a84ff" }}>{topBrand}</div>
          <div className="summary-label">Top Brand</div>
        </div>
        <div className="summary-tile">
          <div className="summary-number" style={{ color: "#ff9500" }}>{expiringCount}</div>
          <div className="summary-label">Expiring Warranties</div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="charts-grid">

        {/* Service Status Donut */}
        <div className="chart-card">
          <h3 className="chart-title">📋 Service Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#00d68f" : "#ff9500"} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <span className="legend-dot" style={{ background: "#00d68f" }} /> Completed: <b>{done}</b>
            <span className="legend-dot" style={{ background: "#ff9500", marginLeft: 12 }} /> Pending: <b>{pending}</b>
          </div>
        </div>

        {/* Machine Type Bar */}
        <div className="chart-card chart-wide">
          <h3 className="chart-title">🔧 Machines Serviced</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={machineData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(245,197,24,0.06)" }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {machineData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend */}
        {monthData.length > 1 && (
          <div className="chart-card chart-wide">
            <h3 className="chart-title">📈 Monthly Customers</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthData}>
                <defs>
                  <linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f5c518" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f5c518" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#8b949e", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="customers" stroke="#f5c518" strokeWidth={2.5}
                  fill="url(#colorC)" dot={{ fill: "#f5c518", strokeWidth: 0, r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Brand Pie */}
        <div className="chart-card">
          <h3 className="chart-title">🏷️ Top Brands</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={brandData} cx="50%" cy="50%" outerRadius={80}
                paddingAngle={3} dataKey="value">
                {brandData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend" style={{ flexWrap: "wrap", gap: 6 }}>
            {brandData.map((b, i) => (
              <span key={b.name}>
                <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                {b.name}: <b>{b.value}</b>
              </span>
            ))}
          </div>
        </div>

        {/* Warranty Health */}
        <div className="chart-card">
          <h3 className="chart-title">🛡️ Warranty Health</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={warrantyData} cx="50%" cy="50%"
                innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {warrantyData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend" style={{ flexWrap: "wrap", gap: 6 }}>
            {warrantyData.map(d => (
              <span key={d.name}>
                <span className="legend-dot" style={{ background: d.color }} />
                {d.name}: <b>{d.value}</b>
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
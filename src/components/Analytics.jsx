// src/components/Analytics.jsx
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";

const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#f97316"];

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#1e293b", borderRadius:8, padding:"8px 14px", fontSize:12, border:"1px solid #334155" }}>
      <div style={{ color:"#94a3b8", marginBottom:2 }}>{payload[0]?.payload?.name || payload[0]?.name}</div>
      <div style={{ color:"#fff", fontWeight:700, fontSize:15 }}>{payload[0]?.value}</div>
    </div>
  );
};

export default function Analytics({ customers = [] }) {
  if (!customers.length) return (
    <div style={{ textAlign:"center", padding:"80px 20px", color:"#94a3b8" }}>
      <div style={{ fontSize:56, marginBottom:16 }}>📊</div>
      <h3 style={{ fontSize:20, fontWeight:700, color:"#64748b", marginBottom:8 }}>No Data Yet</h3>
      <p>Customers add karo tab analytics dikhega</p>
    </div>
  );

  const total   = customers.length;
  const done    = customers.filter(c => c.serviceStatus === "DONE").length;
  const pending = customers.filter(c => c.serviceStatus === "PENDING").length;
  const today   = new Date();

  const expired    = customers.filter(c => c.warrantyEnd && new Date(c.warrantyEnd) < today).length;
  const expiring30 = customers.filter(c => {
    if (!c.warrantyEnd) return false;
    const d = (new Date(c.warrantyEnd) - today) / 86400000;
    return d >= 0 && d <= 30;
  }).length;

  // Machine type counts
  const machineMap = {};
  customers.forEach(c => { const k = c.machineType || "Other"; machineMap[k] = (machineMap[k]||0)+1; });
  const machineData = Object.entries(machineMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=>({name,count}));

  // Brand counts
  const brandMap = {};
  customers.forEach(c => { const k = c.machineBrand||"Other"; brandMap[k] = (brandMap[k]||0)+1; });
  const brandData = Object.entries(brandMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({name,value}));
  const maxBrand  = brandData[0]?.value || 1;

  // Monthly trend
  const monthMap = {};
  customers.forEach(c => {
    const raw = c.serviceDate || c.purchaseDate;
    if (!raw) return;
    const d = new Date(raw);
    if (isNaN(d)) return;
    const k = d.toLocaleDateString("en-IN", { month:"short", year:"2-digit" });
    monthMap[k] = (monthMap[k]||0)+1;
  });
  const monthData = Object.entries(monthMap).slice(-8).map(([month,count])=>({month,count}));

  // Warranty donut
  const warrantyData = [
    { name:"Safe",          value: Math.max(0, total-expired-expiring30), color:"#10b981" },
    { name:"Expiring 30d",  value: expiring30,                             color:"#f59e0b" },
    { name:"Expired",       value: expired,                                color:"#ef4444" },
  ].filter(d => d.value > 0);

  const statusData = [
    { name:"Completed", value:done,    color:"#10b981" },
    { name:"Pending",   value:pending, color:"#f59e0b" },
  ].filter(d=>d.value>0);

  const kpis = [
    { label:"Total Customers",     val:total,             icon:"👥", bg:"#eff6ff",  iconBg:"#dbeafe" },
    { label:"Jobs Completed",      val:done,              icon:"✅", bg:"#f0fdf4",  iconBg:"#dcfce7" },
    { label:"Pending Jobs",        val:pending,           icon:"⏳", bg:"#fffbeb",  iconBg:"#fef3c7" },
    { label:"Warranties Expiring", val:expiring30+expired,icon:"🛡️", bg:"#fef2f2",  iconBg:"#fee2e2" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        {kpis.map((k,i) => (
          <div key={i} style={{ background:k.bg, borderRadius:14, padding:18, border:"1px solid #e2e8f0", boxShadow:"0 2px 8px rgba(0,0,0,0.05)", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:k.iconBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{k.icon}</div>
            <div>
              <div style={{ fontSize:28, fontWeight:800, color:"#1e293b", lineHeight:1 }}>{k.val}</div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:4, fontWeight:500 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly trend + Status donut */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16 }}>

        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:15, fontWeight:700 }}>📈 Monthly Service Trend</div>
            <div style={{ fontSize:12, color:"#94a3b8", marginTop:3 }}>Last 8 months</div>
          </div>
          {monthData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthData} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#blueGrad)"
                  dot={{ r:4, fill:"#3b82f6", strokeWidth:0 }} activeDot={{ r:6, fill:"#2563eb" }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8", fontSize:13 }}>
              Zyada customers add karo — trend dikhega
            </div>
          )}
        </div>

        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>🎯 Job Status</div>
          <div style={{ fontSize:12, color:"#94a3b8", marginBottom:16 }}>Completed vs Pending</div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={44} outerRadius={65} dataKey="value" paddingAngle={5}>
                {statusData.map((d,i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<Tip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:12 }}>
            {statusData.map((d,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#64748b" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:d.color }} />
                {d.name}: <strong style={{ color:"#1e293b" }}>{d.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Machine + Brand + Warranty */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>

        {/* Machine types bar */}
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>🔧 Machine Types</div>
          <div style={{ fontSize:12, color:"#94a3b8", marginBottom:16 }}>Kaunsi machine zyada aati hai</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={machineData} layout="vertical" margin={{ top:0, right:10, left:4, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:"#475569" }} axisLine={false} tickLine={false} width={88} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="count" radius={[0,4,4,0]}>
                {machineData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Brand bars — custom */}
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>🏷️ Top Brands</div>
          <div style={{ fontSize:12, color:"#94a3b8", marginBottom:16 }}>Brand-wise breakdown</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {brandData.map((b,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#475569", width:90, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.name}</div>
                <div style={{ flex:1, height:8, background:"#f1f5f9", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:4, background:COLORS[i%COLORS.length], width:`${(b.value/maxBrand)*100}%`, transition:"width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
                </div>
                <div style={{ fontSize:13, fontWeight:700, width:22, textAlign:"right", color:"#1e293b" }}>{b.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Warranty donut */}
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>🛡️ Warranty Status</div>
          <div style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>Active, expiring, expired</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={warrantyData} cx="50%" cy="50%" innerRadius={34} outerRadius={55} dataKey="value" paddingAngle={5}>
                {warrantyData.map((d,i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<Tip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:12 }}>
            {warrantyData.map((d,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:d.color, flexShrink:0 }} />
                <div style={{ flex:1, fontSize:13, color:"#475569" }}>{d.name}</div>
                <div style={{ fontSize:14, fontWeight:700, color:"#1e293b" }}>{d.value}</div>
                <div style={{ fontSize:11, color:"#94a3b8", width:36, textAlign:"right" }}>{Math.round(d.value/total*100)}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

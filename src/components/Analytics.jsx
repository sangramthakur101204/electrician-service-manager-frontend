// src/components/Analytics.jsx
// NOTE: ResponsiveContainer removed completely — fixed pixel charts only
// ResponsiveContainer fails silently in flex/grid layouts
import { useState, useEffect, useRef } from "react";
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import { authHeader , apiFetch } from "../services/api";

const API    = import.meta.env.VITE_API_URL || "http://localhost:8080";
const fmt    = n => "₹" + Number(n||0).toLocaleString("en-IN");
const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#f97316"];

// Tooltip
const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const val  = payload[0]?.value;
  const name = payload[0]?.payload?.name || payload[0]?.payload?.month ||
               payload[0]?.payload?.date || payload[0]?.payload?.tech || payload[0]?.name;
  const isRev = typeof val === "number" && val > 500;
  return (
    <div style={{background:"#1e293b",borderRadius:8,padding:"8px 14px",fontSize:12,border:"1px solid #334155",zIndex:99}}>
      <div style={{color:"#94a3b8",marginBottom:2}}>{name}</div>
      <div style={{color:"#fff",fontWeight:700,fontSize:15}}>{isRev ? fmt(val) : val}</div>
    </div>
  );
};

// Card wrapper
const Card = ({ children, style={} }) => (
  <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:20,
    boxShadow:"0 2px 8px rgba(0,0,0,0.05)",overflow:"hidden",...style}}>
    {children}
  </div>
);

const Title = ({ icon, title, sub }) => (
  <div style={{marginBottom:14}}>
    <div style={{fontSize:15,fontWeight:700,color:"#1e293b"}}>{icon} {title}</div>
    {sub && <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{sub}</div>}
  </div>
);

// Hook to measure container width
function useWidth() {
  const ref  = useRef(null);
  const [w, setW] = useState(500);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(Math.floor(e.contentRect.width) || 500);
    });
    ro.observe(ref.current);
    setW(ref.current.offsetWidth || 500);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export default function Analytics({ customers = [] }) {
  const [invoices, setInvoices] = useState([]);
  const [allJobs,  setAllJobs]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [cancelledModal, setCancelledModal] = useState(false);

  // width refs for each chart card
  const [ref1, w1] = useWidth(); // monthly revenue
  const [ref2, w2] = useWidth(); // 7 day
  const [ref3, w3] = useWidth(); // tech revenue
  const [ref4, w4] = useWidth(); // machine types
  const [ref5, w5] = useWidth(); // monthly service trend

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, jobRes] = await Promise.all([
        apiFetch(`${API}/invoices`, { headers: authHeader() }),
        apiFetch(`${API}/jobs`,     { headers: authHeader() }),
      ]);
      const invData = await invRes.json();
      const jobData = await jobRes.json();
      setInvoices(Array.isArray(invData) ? invData : []);
      setAllJobs(Array.isArray(jobData) ? jobData : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const total   = customers.length;
  const done    = customers.filter(c=>c.serviceStatus==="DONE").length;
  const pending = customers.filter(c=>c.serviceStatus==="PENDING").length;
  const today   = new Date();
  const todayStr= `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth()+1).padStart(2,"0")}-${String(weekAgo.getDate()).padStart(2,"0")}`;

  const paidInvs   = invoices.filter(i=>i.paymentStatus==="PAID");
  const unpaidInvs = invoices.filter(i=>i.paymentStatus==="UNPAID");
  const totalRev   = paidInvs.reduce((s,i)=>s+(i.totalAmount||0),0);
  const pendingRev = unpaidInvs.reduce((s,i)=>s+(i.totalAmount||0),0);
  const weekRev    = paidInvs.filter(i=>i.invoiceDate>=weekAgoStr).reduce((s,i)=>s+(i.totalAmount||0),0);
  const cancelledJobs = allJobs.filter(j=>j.status==="CANCELLED");

    // Monthly revenue
  const monthRevMap = {};
  paidInvs.forEach(inv=>{
    if(!inv.invoiceDate) return;
    const d=new Date(inv.invoiceDate); if(isNaN(d)) return;
    const k=d.toLocaleDateString("en-IN",{month:"short",year:"2-digit"});
    monthRevMap[k]=(monthRevMap[k]||0)+(inv.totalAmount||0);
  });
  const monthRevData = Object.entries(monthRevMap).slice(-8).map(([month,revenue])=>({month,revenue}));

  // Last 7 days revenue
  const last7 = Array.from({length:7},(_,i)=>{
    const d=new Date(today); d.setDate(d.getDate()-6+i);
    const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const rev=paidInvs.filter(inv=>inv.invoiceDate===ds).reduce((s,inv)=>s+(inv.totalAmount||0),0);
    return {date:d.toLocaleDateString("en-IN",{day:"numeric",month:"short"}),revenue:rev};
  });

  // Tech earnings
  const techMap={};
  paidInvs.forEach(inv=>{ const n=inv.technicianName||"Unknown"; techMap[n]=(techMap[n]||0)+(inv.totalAmount||0); });
  const techData=Object.entries(techMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([tech,revenue])=>({tech,revenue}));

  // Payment methods
  const payMap={};
  paidInvs.forEach(inv=>{ const m=inv.paymentMethod||"Other"; payMap[m]=(payMap[m]||0)+1; });
  const payData=Object.entries(payMap).map(([name,value])=>({name,value}));

  // Machine types
  const machineMap={};
  customers.forEach(c=>{ const k=c.machineType||"Other"; machineMap[k]=(machineMap[k]||0)+1; });
  const machineData=Object.entries(machineMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=>({name,count}));

  // Brand bars
  const brandMap={};
  customers.forEach(c=>{ const k=c.machineBrand||"Other"; brandMap[k]=(brandMap[k]||0)+1; });
  const brandData=Object.entries(brandMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({name,value}));
  const maxBrand=brandData[0]?.value||1;

  // Warranty
  const expired=customers.filter(c=>c.warrantyEnd&&new Date(c.warrantyEnd)<today).length;
  const exp30=customers.filter(c=>{
    if(!c.warrantyEnd) return false;
    const d=(new Date(c.warrantyEnd)-today)/86400000;
    return d>=0&&d<=30;
  }).length;
  const warData=[
    {name:"Safe",        value:Math.max(0,total-expired-exp30),color:"#10b981"},
    {name:"Expiring 30d",value:exp30,                          color:"#f59e0b"},
    {name:"Expired",     value:expired,                        color:"#ef4444"},
  ].filter(d=>d.value>0);

  const statusData=[
    {name:"Completed",value:done,   color:"#10b981"},
    {name:"Pending",  value:pending,color:"#f59e0b"},
  ].filter(d=>d.value>0);

  // Monthly service trend
  const svcMap={};
  customers.forEach(c=>{
    const raw=c.serviceDate||c.purchaseDate; if(!raw) return;
    const d=new Date(raw); if(isNaN(d)) return;
    const k=d.toLocaleDateString("en-IN",{month:"short",year:"2-digit"});
    svcMap[k]=(svcMap[k]||0)+1;
  });
  const svcData=Object.entries(svcMap).slice(-8).map(([month,count])=>({month,count}));

  const CHART_H = 200;
  const CHART_H_SM = 160;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {/* KPI Row 1 — Revenue */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        {[
          {icon:"💰",val:fmt(totalRev),  label:"Total Revenue",     bg:"#f0fdf4",ibg:"#dcfce7", onClick:null},
          {icon:"⏳",val:fmt(pendingRev),label:"Pending Amount",    bg:"#fef2f2",ibg:"#fee2e2", onClick:null},
          {icon:"❌",val:cancelledJobs.length, label:"Cancelled Jobs", bg:"#fef2f2",ibg:"#fee2e2", onClick:()=>setCancelledModal(true), clickable:true},
          {icon:"📊",val:fmt(weekRev),  label:"Is Hafte Ki Earning", bg:"#fffbeb",ibg:"#fef3c7", onClick:null},
        ].map((k,i)=>(
          <div key={i} onClick={k.onClick||undefined}
            style={{background:k.bg,borderRadius:14,padding:18,border:`1.5px solid ${k.clickable?"rgba(239,68,68,0.3)":"#e2e8f0"}`,boxShadow:"0 2px 8px rgba(0,0,0,0.05)",display:"flex",alignItems:"center",gap:14,cursor:k.clickable?"pointer":"default",transition:"all 0.15s"}}
            onMouseEnter={e=>{ if(k.clickable) e.currentTarget.style.transform="translateY(-2px)"; }}
            onMouseLeave={e=>{ if(k.clickable) e.currentTarget.style.transform="translateY(0)"; }}>
            <div style={{width:48,height:48,borderRadius:12,background:k.ibg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{k.icon}</div>
            <div>
              <div style={{fontSize:22,fontWeight:900,color:"#1e293b",lineHeight:1}}>{k.val}</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:4,fontWeight:500}}>{k.label}{k.clickable&&<span style={{color:"#ef4444",marginLeft:4,fontSize:10}}>↗ Click</span>}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Cancelled Jobs Modal */}
      {cancelledModal && (
        <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setCancelledModal(false)}>
          <div style={{position:"absolute",inset:0,background:"rgba(15,23,42,0.6)",backdropFilter:"blur(5px)"}}/>
          <div style={{position:"relative",background:"#fff",borderRadius:20,width:520,maxWidth:"calc(100vw - 32px)",maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.3)",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:800,fontSize:16,color:"#1e293b"}}>❌ Cancelled Jobs ({cancelledJobs.length})</div>
                <div style={{fontSize:12,color:"#64748b",marginTop:2}}>Ye jobs cancel ho gayi hain</div>
              </div>
              <button onClick={()=>setCancelledModal(false)} style={{width:30,height:30,borderRadius:"50%",border:"1.5px solid #e2e8f0",background:"#f8fafc",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",color:"#64748b"}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
              {cancelledJobs.length===0 ? (
                <div style={{textAlign:"center",padding:40,color:"#94a3b8"}}>Koi cancelled job nahi</div>
              ) : cancelledJobs.map(j=>(
                <div key={j.id} style={{padding:"12px 14px",borderRadius:10,border:"1px solid #fecaca",background:"rgba(254,226,226,0.3)",marginBottom:8}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#1e293b"}}>{j.customer?.name||j.customerName||"Unknown"}</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:3}}>🔧 {j.machineType||"—"} · 📅 {j.scheduledDate||j.createdAt?.split("T")[0]||"—"}</div>
                  <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{j.problemDescription}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Row 2 — Customers */}
      {total>0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
          {[
            {icon:"👥",val:total,          label:"Total Customers",  bg:"#eff6ff",ibg:"#dbeafe"},
            {icon:"✅",val:done,           label:"Jobs Completed",   bg:"#f0fdf4",ibg:"#dcfce7"},
            {icon:"⏳",val:pending,        label:"Pending Jobs",     bg:"#fffbeb",ibg:"#fef3c7"},
            {icon:"🛡️",val:exp30+expired,  label:"Warranty Issues",  bg:"#fef2f2",ibg:"#fee2e2"},
          ].map((k,i)=>(
            <div key={i} style={{background:k.bg,borderRadius:14,padding:18,border:"1px solid #e2e8f0",boxShadow:"0 2px 8px rgba(0,0,0,0.05)",display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:48,height:48,borderRadius:12,background:k.ibg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{k.icon}</div>
              <div>
                <div style={{fontSize:28,fontWeight:800,color:"#1e293b",lineHeight:1}}>{k.val}</div>
                <div style={{fontSize:12,color:"#64748b",marginTop:4,fontWeight:500}}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Row: Monthly Revenue + Last 7 days */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>

        <Card>
          <Title icon="📈" title="Monthly Revenue Trend" sub="Paid invoices — last 8 months"/>
          <div ref={ref1}>
            {monthRevData.length>0 ? (
              <AreaChart width={w1-40} height={CHART_H} data={monthRevData} margin={{top:5,right:10,left:10,bottom:0}}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                <Tooltip content={<Tip/>}/>
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revGrad)"
                  dot={{r:4,fill:"#10b981",strokeWidth:0}} activeDot={{r:6,fill:"#059669"}}/>
              </AreaChart>
            ) : (
              <div style={{height:CHART_H,display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontSize:13}}>
                Zyada invoices banao — trend dikhega
              </div>
            )}
          </div>
        </Card>

        <Card>
          <Title icon="📊" title="Last 7 Din" sub="Daily revenue"/>
          <div ref={ref2}>
            <BarChart width={w2-40} height={CHART_H} data={last7} margin={{top:5,right:5,left:5,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="date" tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
              <Tooltip content={<Tip/>}/>
              <Bar dataKey="revenue" radius={[4,4,0,0]}>
                {last7.map((_,i)=><Cell key={i} fill={i===6?"#3b82f6":"#93c5fd"}/>)}
              </Bar>
            </BarChart>
          </div>
        </Card>
      </div>

      {/* Row: Technician revenue + Payment methods */}
      {(techData.length>0||payData.length>0) && (
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
          {techData.length>0 && (
            <Card>
              <Title icon="👷" title="Technician-wise Revenue" sub="Paid invoices per technician"/>
              <div ref={ref3}>
                <BarChart width={w3-40} height={CHART_H} data={techData} layout="vertical" margin={{top:0,right:30,left:10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                  <XAxis type="number" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                  <YAxis type="category" dataKey="tech" tick={{fontSize:11,fill:"#475569"}} axisLine={false} tickLine={false} width={80}/>
                  <Tooltip content={<Tip/>}/>
                  <Bar dataKey="revenue" radius={[0,4,4,0]}>
                    {techData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </div>
            </Card>
          )}

          {payData.length>0 && (
            <Card>
              <Title icon="💳" title="Payment Methods" sub="How customers pay"/>
              <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                <PieChart width={Math.min(220,w2-40)} height={CHART_H_SM}>
                  <Pie data={payData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={5}>
                    {payData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip content={<Tip/>}/>
                </PieChart>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {payData.map((d,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:COLORS[i%COLORS.length],flexShrink:0}}/>
                    <div style={{flex:1,color:"#475569"}}>{d.name}</div>
                    <div style={{fontWeight:700,color:"#1e293b"}}>{d.value}</div>
                    <div style={{color:"#94a3b8",fontSize:11,width:36,textAlign:"right"}}>{paidInvs.length?Math.round(d.value/paidInvs.length*100):0}%</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Row: Machine Types + Top Brands + Warranty */}
      {total>0 && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>

          <Card>
            <Title icon="🔧" title="Machine Types" sub="Kaunsi machine zyada aati hai"/>
            <div ref={ref4}>
              {machineData.length>0 ? (
                <BarChart width={w4-40} height={200} data={machineData} layout="vertical" margin={{top:0,right:10,left:4,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                  <XAxis type="number" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:"#475569"}} axisLine={false} tickLine={false} width={88}/>
                  <Tooltip content={<Tip/>}/>
                  <Bar dataKey="count" radius={[0,4,4,0]}>
                    {machineData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              ) : <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontSize:13}}>Data nahi hai</div>}
            </div>
          </Card>

          <Card>
            <Title icon="🏷️" title="Top Brands" sub="Brand-wise breakdown"/>
            <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:4}}>
              {brandData.map((b,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#475569",width:80,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.name}</div>
                  <div style={{flex:1,height:8,background:"#f1f5f9",borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:4,background:COLORS[i%COLORS.length],width:`${(b.value/maxBrand)*100}%`,transition:"width 0.6s ease"}}/>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,width:20,textAlign:"right",color:"#1e293b"}}>{b.value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Title icon="🛡️" title="Warranty Status" sub="Active, expiring, expired"/>
            <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
              <PieChart width={160} height={CHART_H_SM}>
                <Pie data={warData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" paddingAngle={5}>
                  {warData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                </Pie>
                <Tooltip content={<Tip/>}/>
              </PieChart>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {warData.map((d,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:d.color,flexShrink:0}}/>
                  <div style={{flex:1,fontSize:13,color:"#475569"}}>{d.name}</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#1e293b"}}>{d.value}</div>
                  <div style={{fontSize:11,color:"#94a3b8",width:36,textAlign:"right"}}>{total?Math.round(d.value/total*100):0}%</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Row: Job Status + Monthly Service Trend */}
      {total>0 && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:16}}>

          <Card>
            <Title icon="🎯" title="Job Status" sub="Completed vs Pending"/>
            <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
              <PieChart width={180} height={CHART_H_SM}>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={44} outerRadius={65} dataKey="value" paddingAngle={5}>
                  {statusData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                </Pie>
                <Tooltip content={<Tip/>}/>
              </PieChart>
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:16}}>
              {statusData.map((d,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#64748b"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:d.color}}/>
                  {d.name}: <strong style={{color:"#1e293b"}}>{d.value}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Title icon="📅" title="Monthly Service Trend" sub="Customers by service date — last 8 months"/>
            <div ref={ref5}>
              {svcData.length>0 ? (
                <AreaChart width={w5-40} height={CHART_H} data={svcData} margin={{top:5,right:10,left:-20,bottom:0}}>
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="month" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip content={<Tip/>}/>
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#blueGrad)"
                    dot={{r:4,fill:"#3b82f6",strokeWidth:0}} activeDot={{r:6,fill:"#2563eb"}}/>
                </AreaChart>
              ) : (
                <div style={{height:CHART_H,display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontSize:13}}>
                  Zyada customers add karo — trend dikhega
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}

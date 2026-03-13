// src/components/WarrantyCard.jsx  — Professional portrait warranty card

function drawCard(ctx, c, W, H) {
  const NAVY="#1a2a4a", GOLD="#c9941a", GOLD2="#e8b84b", WHITE="#fff",
        CREAM="#faf8f3", LGRAY="#f0f2f7", TEXT="#1e2d3d", MUTED="#6b7c93",
        LINE="#d8dde8", DARK="#0f1923";

  const co      = c.companyName    || "Matoshree Enterprises";
  const phone   = c.companyPhone   || "";
  const phone2  = c.companyPhone2  || "";
  const email   = c.companyEmail   || "";
  const addr    = c.companyAddress || "";
  const tech    = c.technicianName || co;
  const certNo  = "WC-"+String(c.id||"0001").padStart(4,"0")+"-"+new Date().getFullYear();

  // ── Background ──
  ctx.fillStyle = CREAM; ctx.fillRect(0,0,W,H);

  // ── Top navy header ──
  ctx.fillStyle = NAVY; ctx.fillRect(0,0,W,170);

  // Subtle diagonal pattern in header
  ctx.save();
  for(let i=-20;i<W+20;i+=22){
    ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+170,170);
    ctx.strokeStyle="rgba(255,255,255,0.04)"; ctx.lineWidth=8; ctx.stroke();
  }
  ctx.restore();

  // Gold bottom border on header
  const grad = ctx.createLinearGradient(0,0,W,0);
  grad.addColorStop(0,"#c9941a"); grad.addColorStop(0.5,"#f5d080"); grad.addColorStop(1,"#c9941a");
  ctx.fillStyle=grad; ctx.fillRect(0,165,W,5);

  // Company logo circle
  const cx2=64, cy2=85, r=42;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx2,cy2,r,0,Math.PI*2);
  const lg=ctx.createRadialGradient(cx2-10,cy2-10,5,cx2,cy2,r);
  lg.addColorStop(0,"#f5d080"); lg.addColorStop(1,"#c9941a");
  ctx.fillStyle=lg; ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,0.5)"; ctx.lineWidth=2; ctx.stroke();
  ctx.restore();
  ctx.fillStyle=NAVY; ctx.font="bold 36px serif"; ctx.textAlign="center";
  ctx.fillText("⚡",cx2,cy2+13); ctx.textAlign="left";

  // Company name & subtitle
  ctx.fillStyle=WHITE; ctx.font="bold 26px 'Times New Roman', Georgia, serif";
  ctx.fillText(co.toUpperCase(), 122, 78);
  ctx.fillStyle=GOLD2; ctx.font="italic 14px Georgia, serif";
  ctx.fillText("SERVICE WARRANTY", 124, 102);
  ctx.fillStyle="rgba(255,255,255,0.25)"; ctx.fillRect(124,112,180,1);

  // ── Section title band ──
  ctx.fillStyle=LGRAY; ctx.fillRect(0,170,W,48);
  ctx.fillStyle=NAVY; ctx.font="bold 13px 'Times New Roman', Georgia, serif";
  ctx.textAlign="center"; ctx.fillText("WARRANTY CERTIFICATE", W/2, 200); ctx.textAlign="left";
  ctx.fillStyle=GOLD; ctx.fillRect(W/2-70,208,140,2);

  // ── White card body ──
  ctx.fillStyle=WHITE;
  ctx.shadowColor="rgba(0,0,0,0.09)"; ctx.shadowBlur=16; ctx.shadowOffsetY=2;
  roundedRect(ctx, 28, 232, W-56, H-332, 4, WHITE);
  ctx.shadowBlur=0; ctx.shadowOffsetY=0;

  // Gold accent left bar
  const barGrad = ctx.createLinearGradient(0,232,0,232+(H-332));
  barGrad.addColorStop(0,"#f5d080"); barGrad.addColorStop(1,"#c9941a");
  ctx.fillStyle=barGrad; ctx.fillRect(28,232,5,H-332);

  // ── Content ──
  const lx=54, rx=W-54;
  let y=270;

  function secLabel(text){
    ctx.fillStyle=GOLD; ctx.font="bold 10px Georgia, serif";
    ctx.letterSpacing="2px";
    ctx.fillText(text.toUpperCase(), lx, y); y+=14;
    ctx.fillStyle=LINE; ctx.fillRect(lx,y,rx-lx,1); y+=16;
    ctx.letterSpacing="0px";
  }
  function dataRow(label, value, highlight=false){
    ctx.fillStyle=MUTED; ctx.font="12px Georgia, serif";
    ctx.fillText(label, lx, y);
    ctx.fillStyle=highlight?NAVY:TEXT;
    ctx.font=highlight?"bold 19px 'Times New Roman',Georgia,serif":"15px Georgia, serif";
    // word wrap value
    const maxW = rx - lx - 130;
    const words=(value||"—").split(" ");
    let line=""; let lines=[];
    for(const w of words){
      const t=line?line+" "+w:w;
      if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=w;}else line=t;
    }
    if(line)lines.push(line);
    lines.forEach((l,i)=>ctx.fillText(l, lx+130, y+i*(highlight?26:20)));
    y+=highlight?38:Math.max(28, lines.length*20+8);
  }
  function gap(n=10){y+=n;}

  // Customer
  secLabel("Customer Details");
  ctx.fillStyle=TEXT; ctx.font="bold 18px 'Times New Roman', Georgia, serif";
  ctx.fillText("Mr. / Ms.  "+(c.name||"—"), lx, y); y+=32;
  dataRow("Phone:", c.mobile?"+91 "+c.mobile:"—");
  dataRow("Address:", c.address||"—");
  gap();

  // Machine
  secLabel("Machine & Service");
  dataRow("Machine:", (c.machineType||"")+(c.machineBrand?" — "+c.machineBrand:""));
  if(c.serialNumber) dataRow("Serial No:", c.serialNumber);
  dataRow("Service Done:", c.serviceDetails||"—");
  gap();

  // Warranty
  secLabel("Warranty Validity");
  const wDate = c.warrantyEnd
    ? new Date(c.warrantyEnd).toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})
    : "—";
  dataRow("Valid Till:", wDate, true);
  gap(4);

  // ── Signature ──
  ctx.fillStyle=LINE; ctx.fillRect(lx, y, rx-lx, 1); y+=18;
  ctx.fillStyle=MUTED; ctx.font="12px Georgia, serif";
  ctx.fillText("Technician:", lx, y+4);

  if(c._sigImg){
    ctx.drawImage(c._sigImg, lx+130, y-32, 160, 52);
  } else {
    ctx.fillStyle=DARK; ctx.font="italic 20px Georgia, serif";
    ctx.fillText(tech, lx+130, y+4);
  }
  ctx.fillStyle=TEXT; ctx.fillRect(lx+130, y+14, 170, 1);
  ctx.fillStyle=MUTED; ctx.font="10px Georgia, serif";
  ctx.fillText("Authorised Signature", lx+130, y+28);
  y+=44;

  // Cert number inside card (small)
  ctx.fillStyle=MUTED; ctx.font="10px Georgia, serif";
  ctx.textAlign="right"; ctx.fillText("Cert: "+certNo, rx, y+6); ctx.textAlign="left";

  // ── Navy footer ──
  const FY=H-148;
  ctx.fillStyle=NAVY; ctx.fillRect(0,FY,W,148);
  const fgr=ctx.createLinearGradient(0,0,W,0);
  fgr.addColorStop(0,"#c9941a"); fgr.addColorStop(0.5,"#f5d080"); fgr.addColorStop(1,"#c9941a");
  ctx.fillStyle=fgr; ctx.fillRect(0,FY,W,4);

  ctx.fillStyle=WHITE; ctx.font="bold 13px Georgia, serif";
  ctx.fillText("For Service", 36, FY+32);
  ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.fillRect(36,FY+40,W-72,1);

  ctx.fillStyle=GOLD2; ctx.font="13px Georgia, serif";
  let fy=FY+60;
  if(phone)  {ctx.fillText("📞  "+phone,  36,fy); fy+=24;}
  if(phone2) {ctx.fillText("📞  "+phone2, 36,fy); fy+=24;}
  if(email)  {ctx.fillText("✉   "+email,  36,fy); fy+=24;}
  if(addr)   {ctx.fillText("📍  "+addr,   36,fy);}
}

function roundedRect(ctx,x,y,w,h,r,color){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath(); ctx.fillStyle=color; ctx.fill();
}

function buildCanvas(customer){
  const W=680, H=1000;
  const canvas=document.createElement("canvas");
  canvas.width=W; canvas.height=H;
  drawCard(canvas.getContext("2d"), customer, W, H);
  return canvas;
}

export function generateWarrantyCard(customer){
  const certNo="WC-"+String(customer.id||"0001").padStart(4,"0")+"-"+new Date().getFullYear();
  const safe=(customer.name||"customer").replace(/\s+/g,"_");
  function finish(c){
    const canvas=buildCanvas(c);
    const a=document.createElement("a");
    a.download=`WarrantyCard_${safe}_${certNo}.png`;
    a.href=canvas.toDataURL("image/png"); a.click();
  }
  if(customer.signatureBase64?.startsWith("data:image")){
    const img=new Image();
    img.onload=()=>finish({...customer,_sigImg:img});
    img.onerror=()=>finish(customer);
    img.src=customer.signatureBase64;
  } else finish(customer);
}

export function generateWarrantyCardBlob(customer){
  return new Promise(resolve=>{
    function finish(c){
      buildCanvas(c).toBlob(b=>resolve(b),"image/png");
    }
    if(customer.signatureBase64?.startsWith("data:image")){
      const img=new Image();
      img.onload=()=>finish({...customer,_sigImg:img});
      img.onerror=()=>finish(customer);
      img.src=customer.signatureBase64;
    } else finish(customer);
  });
}
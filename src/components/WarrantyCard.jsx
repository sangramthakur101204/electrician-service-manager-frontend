import { downloadBlob } from "../utils/openExternal";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line, x, y); line = w; y += lineH;
    } else line = t;
  }
  ctx.fillText(line, x, y);
}

function drawWarrantyCard(ctx, c, W, H) {
  const PRIMARY       = "#1E40AF";
  const PRIMARY_LIGHT = "#DBEAFE";
  const ACCENT        = "#F59E0B";
  const ACCENT_DARK   = "#D97706";
  const WHITE         = "#FFFFFF";
  const BG            = "#F8FAFC";
  const TEXT_DARK     = "#111827";
  const TEXT_GRAY     = "#6B7280";
  const BORDER        = "#E2E8F0";

  const co     = c.companyName    || "ElectroServe";
  const phone  = c.companyPhone   || "";
  const phone2 = c.companyPhone2  || "";
  const email  = c.companyEmail   || "";
  const addr   = c.companyAddress || "";
  const tech   = c.technicianName || "Technician";
  const certNo = "WC-" + String(c.id || "0001").padStart(4,"0") + "-" + new Date().getFullYear();
  const today  = new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" });
  const wDate  = c.warrantyEnd
    ? new Date(c.warrantyEnd).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" })
    : "—";
  const machine = [c.machineType, c.machineBrand].filter(Boolean).join(" – ") || "—";

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Gold gradient
  const goldGrad = ctx.createLinearGradient(0, 0, W, 0);
  goldGrad.addColorStop(0, ACCENT_DARK);
  goldGrad.addColorStop(0.5, ACCENT);
  goldGrad.addColorStop(1, ACCENT_DARK);

  // Header
  const HEADER_H = 165;
  ctx.fillStyle = PRIMARY;
  ctx.fillRect(0, 0, W, HEADER_H);
  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let i = -300; i < W + 300; i += 30) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 250, 250);
    ctx.strokeStyle = WHITE; ctx.lineWidth = 12; ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = goldGrad;
  ctx.fillRect(0, HEADER_H - 5, W, 5);

  // Logo
  const lx = 72, ly = 82;
  ctx.save();
  ctx.beginPath(); ctx.arc(lx, ly, 44, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fill();
  ctx.strokeStyle = ACCENT; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = ACCENT;
  ctx.font = "bold 38px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("⚡", lx, ly + 14);
  ctx.textAlign = "left";

  ctx.fillStyle = WHITE;
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText(co.toUpperCase(), 132, 70);
  ctx.fillStyle = ACCENT;
  ctx.font = "italic 14px Georgia, serif";
  ctx.fillText("Service Warranty Certificate", 134, 98);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "11px Arial, sans-serif";
  ctx.fillText("Cert: " + certNo, 134, 124);
  ctx.textAlign = "right";
  ctx.fillText("Issued: " + today, W - 36, 124);
  ctx.textAlign = "left";

  // Warranty validity banner
  const BAN_Y = HEADER_H + 18;
  ctx.fillStyle = "#DCFCE7";
  ctx.strokeStyle = "#86EFAC";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 36, BAN_Y, W - 72, 72, 12);
  ctx.fill(); ctx.stroke();

  ctx.font = "bold 30px sans-serif";
  ctx.fillText("🛡️", 56, BAN_Y + 48);

  ctx.fillStyle = "#166534";
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.fillText("WARRANTY VALID TILL", 98, BAN_Y + 26);
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText(wDate, 98, BAN_Y + 56);

  if (c.warrantyPeriod && c.warrantyPeriod !== "No Warranty") {
    ctx.fillStyle = PRIMARY;
    roundRect(ctx, W - 185, BAN_Y + 16, 138, 34, 8);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(c.warrantyPeriod, W - 116, BAN_Y + 38);
    ctx.textAlign = "left";
  }

  // Main card
  const CARD_Y = BAN_Y + 96;
  const CARD_H = H - CARD_Y - 180;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 16; ctx.shadowOffsetY = 3;
  ctx.fillStyle = WHITE;
  roundRect(ctx, 36, CARD_Y, W - 72, CARD_H, 14);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = PRIMARY;
  roundRect(ctx, 36, CARD_Y, 5, CARD_H, 3);
  ctx.fill();

  const PL = 68, PR = W - 50;
  let Y = CARD_Y + 28;

  function secTitle(text, icon) {
    ctx.fillStyle = PRIMARY;
    ctx.font = "bold 11px Arial, sans-serif";
    ctx.fillText((icon ? icon + "  " : "") + text.toUpperCase(), PL, Y);
    Y += 10;
    ctx.fillStyle = PRIMARY_LIGHT;
    ctx.fillRect(PL, Y, PR - PL, 1.5);
    Y += 14;
  }

  function row(label, value, highlight) {
    if (!value || value.trim() === "" || value === "—") return;
    ctx.fillStyle = TEXT_GRAY;
    ctx.font = "11px Arial, sans-serif";
    ctx.fillText(label, PL, Y);
    ctx.fillStyle = highlight ? PRIMARY : TEXT_DARK;
    ctx.font = highlight ? "bold 15px Arial, sans-serif" : "13px Arial, sans-serif";
    const maxW = PR - PL - 155;
    const words = value.split(" ");
    let line = "", lines = [];
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    lines.forEach((l, i) => ctx.fillText(l, PL + 155, Y + i * 18));
    Y += Math.max(24, lines.length * 18 + 4);
  }

  // Customer
  secTitle("Customer Details", "👤");
  ctx.fillStyle = TEXT_DARK;
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillText(c.name || "—", PL, Y); Y += 26;
  row("Mobile:", c.mobile ? "+91 " + c.mobile : "");
  row("Address:", c.address || "");
  Y += 8;

  // Machine
  secTitle("Machine & Service", "🔧");
  row("Machine:", machine);
  if (c.serialNumber) row("Serial No:", c.serialNumber);
  if (c.serviceDate) row("Service Date:", new Date(c.serviceDate).toLocaleDateString("en-IN", {day:"2-digit",month:"long",year:"numeric"}));
  if (c.serviceDetails) row("Work Done:", c.serviceDetails);
  Y += 8;

  // Warranty
  secTitle("Warranty Coverage", "✅");
  row("Period:", c.warrantyPeriod || "");
  row("Valid From:", c.serviceDate ? new Date(c.serviceDate).toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"}) : "");
  row("Valid Till:", wDate, true);
  Y += 8;

  // Terms
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = "10px Arial, sans-serif";
  wrapText(ctx, "* This warranty covers manufacturing defects and service work performed. Physical damage, misuse, water damage, or unauthorized tampering voids this warranty.", PL, Y, PR - PL, 15);
  Y += 36;

  // Signature section
  ctx.fillStyle = BORDER;
  ctx.fillRect(PL, Y, PR - PL, 1);
  Y += 18;

  const sigW = 200, sigH = 58;
  if (c._sigImg) {
    ctx.drawImage(c._sigImg, PL, Y - 8, sigW, sigH);
  } else {
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(PL, Y - 8, sigW, sigH);
    ctx.setLineDash([]);
    ctx.fillStyle = TEXT_GRAY;
    ctx.font = "italic 11px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Signature", PL + sigW/2, Y + 22);
    ctx.textAlign = "left";
  }
  ctx.fillStyle = TEXT_DARK;
  ctx.fillRect(PL, Y + sigH - 2, sigW, 1);
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText(tech, PL, Y + sigH + 16);
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = "10px Arial, sans-serif";
  ctx.fillText("Authorised Technician", PL, Y + sigH + 30);

  // Company seal box
  const sealX = PR - 145;
  ctx.strokeStyle = PRIMARY;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  roundRect(ctx, sealX, Y - 8, 138, 82, 8);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = "10px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("FOR", sealX + 69, Y + 24);
  ctx.fillStyle = PRIMARY;
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.fillText(co.toUpperCase(), sealX + 69, Y + 42);
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = "10px Arial, sans-serif";
  ctx.fillText("(Company Seal)", sealX + 69, Y + 58);
  ctx.textAlign = "left";

  // Footer
  const FOOTER_Y = H - 162;
  ctx.fillStyle = PRIMARY;
  ctx.fillRect(0, FOOTER_Y, W, 162);
  ctx.fillStyle = goldGrad;
  ctx.fillRect(0, FOOTER_Y, W, 4);

  ctx.fillStyle = WHITE;
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText("Contact Us", 48, FOOTER_Y + 32);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(48, FOOTER_Y + 40, W - 96, 1);

  let fy = FOOTER_Y + 60;
  function footRow(icon, val) {
    if (!val) return;
    ctx.fillStyle = ACCENT;
    ctx.font = "13px sans-serif";
    ctx.fillText(icon, 48, fy);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText(val, 80, fy);
    fy += 22;
  }
  if (phone || phone2) footRow("📞", [phone, phone2].filter(Boolean).join("   /   "));
  if (email) footRow("✉️", email);
  if (addr)  footRow("📍", addr);

  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = WHITE;
  ctx.font = "bold 60px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("WARRANTY", W - 40, FOOTER_Y + 130);
  ctx.restore();
  ctx.textAlign = "left";
}

function makeCanvas(c, W, H) {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  drawWarrantyCard(canvas.getContext("2d"), c, W, H);
  return canvas;
}

function withSig(customer, cb) {
  const sig = customer.signatureBase64;
  if (sig && sig.startsWith("data:image")) {
    const img = new Image();
    img.onload  = () => cb({ ...customer, _sigImg: img });
    img.onerror = () => cb(customer);
    img.src = sig;
  } else {
    cb(customer);
  }
}

export function generateWarrantyCard(customer) {
  const certNo   = "WC-" + String(customer.id || "0001").padStart(4,"0") + "-" + new Date().getFullYear();
  const safeName = (customer.name || "customer").replace(/\s+/g, "_");
  withSig(customer, async (c) => {
    const canvas = makeCanvas(c, 794, 1123);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: dataUrl });
    } catch(e) {
      canvas.toBlob((blob) => {
        downloadBlob(blob, `WarrantyCard_${safeName}_${certNo}.png`);
      }, "image/png");
    }
  });
}

export function generateWarrantyCardBlob(customer) {
  return new Promise((resolve) => {
    withSig(customer, (c) => {
      makeCanvas(c, 794, 1123).toBlob(resolve, "image/png");
    });
  });
}
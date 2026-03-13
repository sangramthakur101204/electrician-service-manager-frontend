// src/components/WarrantyCard.jsx
// Professional warranty card — white card, navy header, gold accents (like the image)

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || "—").split(" ");
  let line = "";
  let lines = [];
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return lines.length;
}

export function generateWarrantyCard(customer) {
  // Portrait card — like a real service warranty card
  const W = 680, H = 960;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const NAVY   = "#1a2a4a";
  const GOLD   = "#c9941a";
  const GOLD2  = "#f0c040";
  const WHITE  = "#ffffff";
  const OFFWHITE = "#f7f5f0";
  const LIGHT  = "#eef2f8";
  const DARK   = "#1a1a2e";
  const TEXT   = "#1e293b";
  const SUBTEXT = "#64748b";
  const DIVIDER = "#dde3ec";

  const co      = customer.companyName    || "Matoshree Enterprises";
  const phone   = customer.companyPhone   || "";
  const phone2  = customer.companyPhone2  || "";
  const email   = customer.companyEmail   || "";
  const address = customer.companyAddress || "";
  const sig     = customer.signatureBase64 || null;
  const techName = customer.technicianName || "";

  // ── BACKGROUND ──
  ctx.fillStyle = OFFWHITE;
  ctx.fillRect(0, 0, W, H);

  // ── TOP NAVY HEADER ──
  // Main header block
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, 160);

  // Gold diagonal accent stripe in header
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(W - 220, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, 160);
  ctx.lineTo(W - 120, 160);
  ctx.closePath();
  ctx.fillStyle = "rgba(201,148,26,0.18)";
  ctx.fill();
  ctx.restore();

  // Gold bottom border on header
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 155, W, 5);

  // Logo circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(62, 80, 42, 0, Math.PI * 2);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Lightning bolt in logo
  ctx.fillStyle = NAVY;
  ctx.font = "bold 38px serif";
  ctx.textAlign = "center";
  ctx.fillText("⚡", 62, 93);

  // Company name
  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.font = "bold 26px Georgia, serif";
  ctx.fillText(co.toUpperCase(), 122, 72);

  // Subtitle
  ctx.fillStyle = GOLD2;
  ctx.font = "italic 14px Georgia, serif";
  ctx.fillText("SERVICE WARRANTY", 122, 100);

  // Gold line under subtitle
  ctx.fillStyle = GOLD;
  ctx.fillRect(122, 112, 200, 2);

  // ── CERTIFICATE TITLE BAND ──
  ctx.fillStyle = LIGHT;
  ctx.fillRect(0, 160, W, 52);
  ctx.fillStyle = NAVY;
  ctx.font = "bold 15px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("WARRANTY CERTIFICATE", W / 2, 192);
  ctx.textAlign = "left";

  // ── CARD BODY ──
  // White content area
  ctx.fillStyle = WHITE;
  ctx.shadowColor = "rgba(0,0,0,0.07)";
  ctx.shadowBlur = 10;
  ctx.fillRect(32, 228, W - 64, H - 310);
  ctx.shadowBlur = 0;

  // Thin gold left border on white card
  ctx.fillStyle = GOLD;
  ctx.fillRect(32, 228, 4, H - 310);

  // ── CONTENT ROWS ──
  const cx = 60;
  let cy = 262;
  const labelColor = SUBTEXT;
  const valueColor = TEXT;

  function row(label, value, bold = false) {
    ctx.fillStyle = labelColor;
    ctx.font = "13px Georgia, serif";
    ctx.fillText(label, cx, cy);
    ctx.fillStyle = bold ? NAVY : valueColor;
    ctx.font = bold ? "bold 16px Georgia, serif" : "15px Georgia, serif";
    ctx.fillText(value || "—", cx + 160, cy);
    cy += 36;
  }

  function divLine() {
    ctx.fillStyle = DIVIDER;
    ctx.fillRect(cx, cy - 10, W - 88, 1);
    cy += 10;
  }

  // Customer
  ctx.fillStyle = GOLD;
  ctx.font = "bold 11px Georgia, serif";
  ctx.fillText("CUSTOMER DETAILS", cx, cy);
  cy += 22;
  divLine();

  ctx.fillStyle = valueColor;
  ctx.font = "bold 18px Georgia, serif";
  ctx.fillText("Mr. / Ms. " + (customer.name || "—"), cx, cy);
  cy += 32;

  row("Phone:", customer.mobile ? "+91 " + customer.mobile : "—");
  row("Address:", customer.address || "—");

  cy += 8;
  divLine();

  // Machine / Service
  ctx.fillStyle = GOLD;
  ctx.font = "bold 11px Georgia, serif";
  ctx.fillText("SERVICE PROVIDED", cx, cy);
  cy += 22;
  divLine();

  row("Machine:", (customer.machineType || "") + " — " + (customer.machineBrand || ""));
  if (customer.serialNumber) row("Serial No:", customer.serialNumber);
  row("Service:", customer.serviceDetails || "—");

  // Valid Till — highlighted
  cy += 6;
  divLine();
  ctx.fillStyle = GOLD;
  ctx.font = "bold 11px Georgia, serif";
  ctx.fillText("WARRANTY VALIDITY", cx, cy);
  cy += 24;

  ctx.fillStyle = labelColor;
  ctx.font = "13px Georgia, serif";
  ctx.fillText("Valid Till:", cx, cy);

  const wEnd = customer.warrantyEnd
    ? new Date(customer.warrantyEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : "—";
  ctx.fillStyle = NAVY;
  ctx.font = "bold 22px Georgia, serif";
  ctx.fillText(wEnd, cx + 160, cy);
  cy += 38;

  // ── SIGNATURE AREA ──
  cy += 8;
  divLine();

  ctx.fillStyle = labelColor;
  ctx.font = "13px Georgia, serif";
  ctx.fillText("Technician:", cx, cy + 4);

  if (sig && sig.startsWith("data:image")) {
    // Draw signature image
    const img = new Image();
    img.src = sig;
    ctx.drawImage(img, cx + 155, cy - 28, 140, 48);
  } else {
    // Handwriting-style tech name
    ctx.fillStyle = DARK;
    ctx.font = "italic 20px Georgia, serif";
    ctx.fillText(techName || co, cx + 160, cy + 4);
  }

  // Signature underline
  ctx.fillStyle = DARK;
  ctx.fillRect(cx + 155, cy + 14, 160, 1);
  ctx.fillStyle = SUBTEXT;
  ctx.font = "10px Georgia, serif";
  ctx.fillText("Authorised Signature", cx + 160, cy + 28);

  cy += 50;

  // ── BLUE FOOTER ──
  const fy = H - 145;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, fy, W, 145);

  // Gold top border
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, fy, W, 4);

  ctx.fillStyle = WHITE;
  ctx.font = "bold 13px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText("For Service", 36, fy + 32);

  ctx.fillStyle = GOLD2;
  ctx.font = "14px Georgia, serif";
  let fy2 = fy + 56;
  if (phone)   { ctx.fillText("📞  " + phone,   36, fy2); fy2 += 24; }
  if (phone2)  { ctx.fillText("📞  " + phone2,  36, fy2); fy2 += 24; }
  if (email)   { ctx.fillText("✉   " + email,   36, fy2); fy2 += 24; }
  if (address) { ctx.fillText("📍  " + address, 36, fy2); }

  // Cert number bottom right
  const certNo = "WC-" + String(customer.id || "0001").padStart(4, "0") + "-" + new Date().getFullYear();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "11px Georgia, serif";
  ctx.textAlign = "right";
  ctx.fillText(certNo, W - 36, H - 18);
  ctx.textAlign = "left";

  // ── DOWNLOAD ──
  const safeName = (customer.name || "customer").replace(/\s+/g, "_");
  const link = document.createElement("a");
  link.download = `WarrantyCard_${safeName}_${certNo}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
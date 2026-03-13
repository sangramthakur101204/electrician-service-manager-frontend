// src/components/WarrantyCard.jsx
// Professional warranty card — white card, navy header, gold accents

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || "—").split(" ");
  let line = "", lines = [];
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return lines.length;
}

function drawCard(ctx, customer, W, H) {
  const NAVY    = "#1a2a4a";
  const GOLD    = "#c9941a";
  const GOLD2   = "#f0c040";
  const WHITE   = "#ffffff";
  const OFFWHITE= "#f7f4ee";
  const LIGHT   = "#eef2f8";
  const TEXT    = "#1e293b";
  const SUBTEXT = "#64748b";
  const DIVIDER = "#dde3ec";

  const co      = customer.companyName    || "Matoshree Enterprises";
  const phone   = customer.companyPhone   || "";
  const phone2  = customer.companyPhone2  || "";
  const email   = customer.companyEmail   || "";
  const address = customer.companyAddress || "";
  const techName= customer.technicianName || co;

  // BG
  ctx.fillStyle = OFFWHITE;
  ctx.fillRect(0, 0, W, H);

  // ── NAVY HEADER ──
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, 165);

  // Gold diagonal accent
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(W - 230, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 165); ctx.lineTo(W - 120, 165);
  ctx.closePath();
  ctx.fillStyle = "rgba(201,148,26,0.18)";
  ctx.fill();
  ctx.restore();

  // Gold bottom border
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 160, W, 5);

  // Logo circle
  ctx.save();
  ctx.beginPath(); ctx.arc(66, 83, 44, 0, Math.PI * 2);
  ctx.fillStyle = GOLD; ctx.fill();
  ctx.strokeStyle = WHITE; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = NAVY; ctx.font = "bold 40px serif";
  ctx.textAlign = "center"; ctx.fillText("⚡", 66, 97); ctx.textAlign = "left";

  // Company name
  ctx.fillStyle = WHITE; ctx.font = "bold 27px Georgia, serif";
  ctx.fillText(co.toUpperCase(), 128, 76);
  ctx.fillStyle = GOLD2; ctx.font = "italic 15px Georgia, serif";
  ctx.fillText("SERVICE WARRANTY", 128, 105);
  ctx.fillStyle = GOLD; ctx.fillRect(128, 118, 210, 2);

  // ── TITLE BAND ──
  ctx.fillStyle = LIGHT; ctx.fillRect(0, 165, W, 52);
  ctx.fillStyle = NAVY; ctx.font = "bold 15px Georgia, serif";
  ctx.textAlign = "center"; ctx.fillText("WARRANTY CERTIFICATE", W / 2, 198); ctx.textAlign = "left";

  // ── WHITE CARD BODY ──
  ctx.fillStyle = WHITE;
  ctx.shadowColor = "rgba(0,0,0,0.08)"; ctx.shadowBlur = 12;
  ctx.fillRect(30, 232, W - 60, H - 320);
  ctx.shadowBlur = 0;

  // Gold left strip
  ctx.fillStyle = GOLD; ctx.fillRect(30, 232, 5, H - 320);

  // ── CONTENT ──
  const cx = 58;
  let cy = 268;

  function sectionTitle(label) {
    ctx.fillStyle = GOLD; ctx.font = "bold 11px Georgia, serif";
    ctx.fillText(label, cx, cy); cy += 14;
    ctx.fillStyle = DIVIDER; ctx.fillRect(cx, cy, W - 88, 1); cy += 16;
  }

  function row(label, value, bigVal = false) {
    ctx.fillStyle = SUBTEXT; ctx.font = "13px Georgia, serif";
    ctx.fillText(label, cx, cy);
    ctx.fillStyle = bigVal ? NAVY : TEXT;
    ctx.font = bigVal ? "bold 20px Georgia, serif" : "15px Georgia, serif";
    const lines = wrapText(ctx, value || "—", cx + 160, cy, W - 260, 20);
    cy += bigVal ? 38 : (22 * Math.max(1, lines));
  }

  function gap() { cy += 10; }

  // Customer
  sectionTitle("CUSTOMER DETAILS");
  ctx.fillStyle = TEXT; ctx.font = "bold 19px Georgia, serif";
  ctx.fillText("Mr./Ms. " + (customer.name || "—"), cx, cy); cy += 30;
  row("Phone:", customer.mobile ? "+91 " + customer.mobile : "—");
  row("Address:", customer.address || "—");
  gap();

  // Service
  sectionTitle("SERVICE PROVIDED");
  row("Machine:", (customer.machineType || "") + (customer.machineBrand ? " — " + customer.machineBrand : ""));
  if (customer.serialNumber) row("Serial No:", customer.serialNumber);
  const workLines = String(customer.serviceDetails || "—").split(" ");
  row("Service:", customer.serviceDetails || "—");
  gap();

  // Validity
  sectionTitle("WARRANTY VALIDITY");
  row("Valid Till:", customer.warrantyEnd
    ? new Date(customer.warrantyEnd).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" })
    : "—", true);

  // ── SIGNATURE ──
  gap();
  ctx.fillStyle = DIVIDER; ctx.fillRect(cx, cy, W - 88, 1); cy += 20;

  ctx.fillStyle = SUBTEXT; ctx.font = "12px Georgia, serif";
  ctx.fillText("Technician:", cx, cy + 4);

  // Signature drawn below
  const sigX = cx + 155, sigY = cy - 32, sigW = 160, sigH = 52;
  if (customer._sigImg) {
    ctx.drawImage(customer._sigImg, sigX, sigY, sigW, sigH);
  } else {
    ctx.fillStyle = TEXT; ctx.font = "italic 19px Georgia, serif";
    ctx.fillText(techName, sigX, cy + 4);
  }
  ctx.fillStyle = DARK || TEXT; ctx.fillRect(sigX, cy + 16, 160, 1);
  ctx.fillStyle = SUBTEXT; ctx.font = "10px Georgia, serif";
  ctx.fillText("Authorised Signature", sigX, cy + 30);
  cy += 44;

  // ── NAVY FOOTER ──
  const fy = H - 148;
  ctx.fillStyle = NAVY; ctx.fillRect(0, fy, W, 148);
  ctx.fillStyle = GOLD; ctx.fillRect(0, fy, W, 4);

  ctx.fillStyle = WHITE; ctx.font = "bold 13px Georgia, serif";
  ctx.fillText("For Service", 36, fy + 34);

  ctx.fillStyle = GOLD2; ctx.font = "14px Georgia, serif";
  let fy2 = fy + 58;
  if (phone)   { ctx.fillText("📞  " + phone,   36, fy2); fy2 += 26; }
  if (phone2)  { ctx.fillText("📞  " + phone2,  36, fy2); fy2 += 26; }
  if (email)   { ctx.fillText("✉   " + email,   36, fy2); fy2 += 26; }
  if (address) { ctx.fillText("📍  " + address, 36, fy2); }

  // Cert No
  const certNo = "WC-" + String(customer.id || "0001").padStart(4, "0") + "-" + new Date().getFullYear();
  ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.font = "11px Georgia, serif";
  ctx.textAlign = "right"; ctx.fillText(certNo, W - 30, H - 16); ctx.textAlign = "left";
}

export function generateWarrantyCard(customer) {
  const W = 680, H = 980;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const certNo = "WC-" + String(customer.id || "0001").padStart(4, "0") + "-" + new Date().getFullYear();
  const safeName = (customer.name || "customer").replace(/\s+/g, "_");

  function finish(cust) {
    drawCard(ctx, cust, W, H);
    const link = document.createElement("a");
    link.download = `WarrantyCard_${safeName}_${certNo}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  // Load signature image first if available
  if (customer.signatureBase64 && customer.signatureBase64.startsWith("data:image")) {
    const img = new Image();
    img.onload = () => finish({ ...customer, _sigImg: img });
    img.onerror = () => finish(customer);
    img.src = customer.signatureBase64;
  } else {
    finish(customer);
  }
}

// Returns canvas as blob — for sharing via Web Share API
export function generateWarrantyCardBlob(customer) {
  return new Promise((resolve) => {
    const W = 680, H = 980;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    function finish(cust) {
      drawCard(ctx, cust, W, H);
      canvas.toBlob(blob => resolve(blob), "image/png");
    }

    if (customer.signatureBase64 && customer.signatureBase64.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => finish({ ...customer, _sigImg: img });
      img.onerror = () => finish(customer);
      img.src = customer.signatureBase64;
    } else {
      finish(customer);
    }
  });
}
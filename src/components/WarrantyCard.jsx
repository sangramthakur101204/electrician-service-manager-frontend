import { downloadBlob } from "../utils/openExternal";
// WarrantyCard.jsx — Professional portrait card matching reference image style

function drawWarrantyCard(ctx, c, W, H) {
  // ── COLORS ──
  const NAVY   = "#1B2A4A";
  const GOLD   = "#C9961A";
  const GOLD2  = "#F0C040";
  const WHITE  = "#FFFFFF";
  const CREAM  = "#FAF8F3";
  const LGRAY  = "#EEF1F7";
  const TEXT   = "#1C2B3A";
  const MUTED  = "#6B7C93";
  const BORDER = "#D5DAE8";

  const co     = c.companyName    || c.companyName || "ElectroServe";
  const phone  = c.companyPhone   || "";
  const phone2 = c.companyPhone2  || "";
  const email  = c.companyEmail   || "";
  const addr   = c.companyAddress || "";
  const tech   = c.technicianName || co;

  const certNo = "WC-" + String(c.id || "0001").padStart(4, "0") + "-" + new Date().getFullYear();

  // ── BACKGROUND ──
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  // ══════════════════════════════
  //  HEADER — navy with diagonal stripes
  // ══════════════════════════════
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, 175);

  // Subtle diagonal stripes
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = -200; i < W + 200; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i + 200, 200);
    ctx.strokeStyle = WHITE; ctx.lineWidth = 10; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Gold shimmer bottom border on header
  const hBorder = ctx.createLinearGradient(0, 0, W, 0);
  hBorder.addColorStop(0,   "#8B6010");
  hBorder.addColorStop(0.3, "#F0C040");
  hBorder.addColorStop(0.7, "#F0C040");
  hBorder.addColorStop(1,   "#8B6010");
  ctx.fillStyle = hBorder;
  ctx.fillRect(0, 170, W, 5);

  // Logo circle — gold gradient
  const lx = 64, ly = 88;
  const lgr = ctx.createRadialGradient(lx - 12, ly - 12, 4, lx, ly, 44);
  lgr.addColorStop(0, "#F8DD80");
  lgr.addColorStop(1, "#C9961A");
  ctx.save();
  ctx.beginPath(); ctx.arc(lx, ly, 44, 0, Math.PI * 2);
  ctx.fillStyle = lgr; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore();

  // Lightning bolt
  ctx.fillStyle = NAVY;
  ctx.font = "bold 38px serif";
  ctx.textAlign = "center";
  ctx.fillText("⚡", lx, ly + 14);
  ctx.textAlign = "left";

  // Company name
  ctx.fillStyle = WHITE;
  ctx.font = "bold 26px 'Times New Roman', Georgia, serif";
  ctx.fillText(co.toUpperCase(), 124, 82);

  // Tagline
  ctx.fillStyle = GOLD2;
  ctx.font = "italic 14px Georgia, serif";
  ctx.fillText("SERVICE WARRANTY", 126, 108);

  // Thin gold line under tagline
  ctx.fillStyle = "rgba(240,192,64,0.4)";
  ctx.fillRect(126, 118, 200, 1);

  // ══════════════════════════════
  //  CERTIFICATE TITLE BAND
  // ══════════════════════════════
  ctx.fillStyle = LGRAY;
  ctx.fillRect(0, 175, W, 50);

  ctx.fillStyle = NAVY;
  ctx.font = "bold 13px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("WARRANTY CERTIFICATE", W / 2, 207);
  ctx.textAlign = "left";

  // Gold underline
  const ulGr = ctx.createLinearGradient(W/2 - 80, 0, W/2 + 80, 0);
  ulGr.addColorStop(0, "transparent");
  ulGr.addColorStop(0.3, GOLD);
  ulGr.addColorStop(0.7, GOLD);
  ulGr.addColorStop(1, "transparent");
  ctx.fillStyle = ulGr;
  ctx.fillRect(W/2 - 80, 215, 160, 2);

  // ══════════════════════════════
  //  WHITE CARD BODY
  // ══════════════════════════════
  const cardTop = 238, cardBot = H - 165;
  const cardH = cardBot - cardTop;

  // Shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.10)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 3;
  ctx.fillStyle = WHITE;
  ctx.fillRect(28, cardTop, W - 56, cardH);
  ctx.restore();

  // Gold left accent bar
  const barGr = ctx.createLinearGradient(0, cardTop, 0, cardTop + cardH);
  barGr.addColorStop(0, GOLD2);
  barGr.addColorStop(1, GOLD);
  ctx.fillStyle = barGr;
  ctx.fillRect(28, cardTop, 5, cardH);

  // ── CONTENT ──
  const PL = 58, PR = W - 52;
  let Y = cardTop + 32;
  const COL2 = PL + 140; // label/value split

  function sectionHead(text) {
    ctx.fillStyle = GOLD;
    ctx.font = "bold 10px Georgia, serif";
    // letter-spacing simulation
    let sx = PL;
    for (const ch of text) { ctx.fillText(ch, sx, Y); sx += ctx.measureText(ch).width + 1.5; }
    Y += 14;
    ctx.fillStyle = BORDER; ctx.fillRect(PL, Y, PR - PL, 1); Y += 16;
  }

  function field(label, value, bigBold) {
    if (!value || value.trim() === "" || value === "—") value = "—";
    ctx.fillStyle = MUTED; ctx.font = "12px Georgia, serif";
    ctx.fillText(label, PL, Y);

    ctx.fillStyle = bigBold ? NAVY : TEXT;
    ctx.font = bigBold ? "bold 20px 'Times New Roman', Georgia, serif" : "14px Georgia, serif";

    // Word wrap
    const maxW = PR - COL2 - 10;
    const words = value.split(" ");
    let line = "", lines = [];
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else line = t;
    }
    if (line) lines.push(line);
    const lh = bigBold ? 28 : 20;
    lines.forEach((l, i) => ctx.fillText(l, COL2, Y + i * lh));
    Y += bigBold ? 40 : Math.max(28, lines.length * 20 + 4);
  }

  function gap(n = 12) { Y += n; }

  // ── CUSTOMER ──
  sectionHead("CUSTOMER DETAILS");
  ctx.fillStyle = TEXT; ctx.font = "bold 17px 'Times New Roman', Georgia, serif";
  ctx.fillText("Mr. / Ms.  " + (c.name || "—"), PL, Y); Y += 30;
  field("Phone:", c.mobile ? "+91 " + c.mobile : "");
  field("Address:", c.address || "");
  gap();

  // ── MACHINE ──
  sectionHead("MACHINE & SERVICE");
  const machine = [c.machineType, c.machineBrand].filter(Boolean).join(" — ");
  field("Machine:", machine || "");
  if (c.serialNumber) field("Serial No:", c.serialNumber);
  field("Service Done:", c.serviceDetails || "");
  gap();

  // ── WARRANTY ──
  sectionHead("WARRANTY VALIDITY");
  const wDate = c.warrantyEnd
    ? new Date(c.warrantyEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : "";
  field("Valid Till:", wDate, true); // big bold date
  gap(4);

  // ── SIGNATURE ──
  ctx.fillStyle = BORDER; ctx.fillRect(PL, Y, PR - PL, 1); Y += 20;

  ctx.fillStyle = MUTED; ctx.font = "12px Georgia, serif";
  ctx.fillText("Technician:", PL, Y + 4);

  const sigX = COL2, sigY = Y - 30, sigW = 170, sigH = 54;
  if (c._sigImg) {
    ctx.drawImage(c._sigImg, sigX, sigY, sigW, sigH);
  } else {
    ctx.fillStyle = TEXT; ctx.font = "italic 20px Georgia, serif";
    ctx.fillText(tech, sigX, Y + 4);
  }
  // Signature underline + label
  ctx.fillStyle = TEXT; ctx.fillRect(sigX, Y + 16, 175, 1);
  ctx.fillStyle = MUTED; ctx.font = "10px Georgia, serif";
  ctx.fillText("Authorised Signature", sigX, Y + 30);

  // Cert no — bottom right of card
  ctx.fillStyle = MUTED; ctx.font = "10px Georgia, serif";
  ctx.textAlign = "right"; ctx.fillText("Cert: " + certNo, PR, cardBot - 14); ctx.textAlign = "left";

  // ══════════════════════════════
  //  FOOTER — navy with contact details
  // ══════════════════════════════
  const FY = H - 158;
  ctx.fillStyle = NAVY; ctx.fillRect(0, FY, W, 158);

  // Gold shimmer top border on footer
  ctx.fillStyle = hBorder;
  ctx.fillRect(0, FY, W, 4);

  ctx.fillStyle = WHITE;
  ctx.font = "bold 14px Georgia, serif";
  ctx.fillText("For Service", 36, FY + 34);

  // Thin divider
  ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(36, FY + 42, W - 72, 1);

  // Contact rows
  ctx.font = "13px Georgia, serif";
  let fy = FY + 62;

  function footerLine(icon, text) {
    if (!text) return;
    ctx.fillStyle = GOLD2;
    ctx.fillText(icon, 36, fy);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText(text, 68, fy);
    fy += 24;
  }
  footerLine("📞", phone);
  footerLine("📞", phone2);
  footerLine("✉", email);
  footerLine("📍", addr);
}

// ── EXPORTS ──
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
  const certNo  = "WC-" + String(customer.id || "0001").padStart(4, "0") + "-" + new Date().getFullYear();
  const safeName = (customer.name || "customer").replace(/\s+/g, "_");
  withSig(customer, (c) => {
    const canvas = makeCanvas(c, 680, 1020);
    canvas.toBlob((blob) => {
      downloadBlob(blob, `WarrantyCard_${safeName}_${certNo}.png`);
    }, "image/png");
  });
}

export function generateWarrantyCardBlob(customer) {
  return new Promise((resolve) => {
    withSig(customer, (c) => {
      makeCanvas(c, 680, 1020).toBlob(resolve, "image/png");
    });
  });
}
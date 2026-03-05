// src/components/WarrantyCard.jsx
// Warranty Card = actual IMAGE (PNG) using HTML Canvas
// Downloads as photo → WhatsApp pe photo ki tarah bhejo!

function roundRect(ctx, x, y, w, h, r, color) {
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
  ctx.fillStyle = color;
  ctx.fill();
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function generateWarrantyCard(customer) {
  const W = 920, H = 540;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const DARK = "#0d1117", CARD = "#161b22", LIGHT = "#1c2230";
  const YELLOW = "#f5c518", GREEN = "#00d68f", WHITE = "#ffffff", GRAY = "#8b949e";

  // ── BG ──
  roundRect(ctx, 0, 0, W, H, 16, CARD);

  // Yellow left strip
  roundRect(ctx, 0, 0, 9, H, 0, YELLOW);

  // ── HEADER ──
  roundRect(ctx, 9, 0, W - 9, 88, 0, DARK);

  // Logo
  roundRect(ctx, 22, 12, 60, 60, 30, YELLOW);
  ctx.fillStyle = DARK; ctx.font = "bold 30px Arial"; ctx.textAlign = "center";
  ctx.fillText("E", 52, 50);

  ctx.textAlign = "left";
  ctx.fillStyle = WHITE; ctx.font = "bold 28px 'Segoe UI', Arial";
  ctx.fillText("ElectroServe", 96, 40);
  ctx.fillStyle = YELLOW; ctx.font = "14px 'Segoe UI', Arial";
  ctx.fillText("Professional Electrician Services", 97, 62);

  ctx.textAlign = "right";
  ctx.fillStyle = YELLOW; ctx.font = "bold 14px 'Segoe UI', Arial";
  ctx.fillText("WARRANTY CERTIFICATE", W - 22, 30);
  const certNo = "WC-" + String(customer.id || "0001").padStart(4, "0") + "-" + new Date().getFullYear();
  ctx.fillStyle = GRAY; ctx.font = "12px Arial";
  ctx.fillText(certNo, W - 22, 50);
  ctx.fillText("Issued: " + new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }), W - 22, 70);
  ctx.textAlign = "left";

  // Yellow line
  ctx.fillStyle = YELLOW; ctx.fillRect(9, 88, W - 9, 4);

  // ── LEFT: CUSTOMER ──
  const lx = 24, ly = 104;
  roundRect(ctx, lx, ly, 268, 136, 8, LIGHT);
  roundRect(ctx, lx, ly, 268, 34, 8, DARK);
  ctx.fillRect(lx, ly + 17, 268, 17);
  ctx.fillStyle = YELLOW; ctx.font = "bold 10px Arial";
  ctx.fillText("CUSTOMER DETAILS", lx + 12, ly + 22);

  ctx.fillStyle = WHITE; ctx.font = "bold 16px 'Segoe UI', Arial";
  ctx.fillText(customer.name || "—", lx + 12, ly + 58);
  ctx.fillStyle = GRAY; ctx.font = "12px Arial";
  ctx.fillText("+91 " + (customer.mobile || "—"), lx + 12, ly + 78);
  const addrLines = wrapText(ctx, customer.address || "—", 244);
  addrLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, lx + 12, ly + 97 + i * 18));

  // ── LEFT: MACHINE ──
  const mly = ly + 148;
  roundRect(ctx, lx, mly, 268, 148, 8, LIGHT);
  roundRect(ctx, lx, mly, 268, 34, 8, DARK);
  ctx.fillRect(lx, mly + 17, 268, 17);
  ctx.fillStyle = YELLOW; ctx.font = "bold 10px Arial";
  ctx.fillText("MACHINE DETAILS", lx + 12, mly + 22);

  const mRows = [
    ["Type",   customer.machineType],
    ["Brand",  customer.machineBrand],
    ["Model",  customer.model],
    ["Serial", customer.serialNumber],
  ];
  mRows.forEach(([k, v], i) => {
    ctx.fillStyle = GRAY;   ctx.font = "11px Arial";  ctx.fillText(k + ":", lx + 12, mly + 56 + i * 26);
    ctx.fillStyle = WHITE;  ctx.font = "bold 13px Arial"; ctx.fillText(v || "—", lx + 68, mly + 56 + i * 26);
  });

  // ── MIDDLE: SERVICE ──
  const sx = 308, sy = ly;
  roundRect(ctx, sx, sy, 268, 295, 8, LIGHT);
  roundRect(ctx, sx, sy, 268, 34, 8, DARK);
  ctx.fillRect(sx, sy + 17, 268, 17);
  ctx.fillStyle = YELLOW; ctx.font = "bold 10px Arial";
  ctx.fillText("SERVICE PERFORMED", sx + 12, sy + 22);

  ctx.fillStyle = GRAY; ctx.font = "bold 11px Arial";
  ctx.fillText("Service Date:", sx + 12, sy + 55);
  ctx.fillStyle = WHITE; ctx.font = "bold 15px 'Segoe UI', Arial";
  const sDate = customer.serviceDate
    ? new Date(customer.serviceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : "—";
  ctx.fillText(sDate, sx + 12, sy + 76);

  ctx.fillStyle = GRAY; ctx.font = "bold 11px Arial";
  ctx.fillText("Work Done:", sx + 12, sy + 105);
  ctx.fillStyle = WHITE; ctx.font = "12px Arial";
  const workLines = wrapText(ctx, customer.serviceDetails || "General service performed", 244);
  workLines.slice(0, 8).forEach((line, i) => ctx.fillText(line, sx + 12, sy + 123 + i * 20));

  if (customer.notes) {
    ctx.fillStyle = YELLOW; ctx.font = "bold 10px Arial";
    ctx.fillText("Note: " + customer.notes, sx + 12, sy + 282);
  }

  // ── RIGHT: WARRANTY BOX (the star!) ──
  const wx = 592, wy = ly;
  roundRect(ctx, wx, wy, 300, 295, 12, YELLOW);

  ctx.fillStyle = DARK; ctx.font = "bold 18px 'Segoe UI', Arial"; ctx.textAlign = "center";
  ctx.fillText("WARRANTY", wx + 150, wy + 44);
  ctx.fillText("CERTIFICATE", wx + 150, wy + 68);

  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(wx + 24, wy + 80, 252, 2);

  ctx.fillStyle = DARK; ctx.font = "bold 12px Arial";
  ctx.fillText("VALID TILL", wx + 150, wy + 106);

  ctx.font = "bold 22px 'Segoe UI', Arial";
  const wEnd = customer.warrantyEnd
    ? new Date(customer.warrantyEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  ctx.fillText(wEnd, wx + 150, wy + 133);

  // Period badge
  roundRect(ctx, wx + 60, wy + 144, 180, 32, 16, "rgba(0,0,0,0.15)");
  ctx.fillStyle = DARK; ctx.font = "bold 14px Arial";
  ctx.fillText(customer.warrantyPeriod || "—", wx + 150, wy + 165);

  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(wx + 24, wy + 188, 252, 2);

  ctx.fillStyle = DARK; ctx.font = "bold 10px Arial";
  ctx.fillText("CERTIFICATE NO.", wx + 150, wy + 210);
  ctx.font = "bold 15px Arial"; ctx.fillText(certNo, wx + 150, wy + 232);

  // ACTIVE badge
  roundRect(ctx, wx + 60, wy + 244, 180, 38, 10, "#006b40");
  ctx.fillStyle = WHITE; ctx.font = "bold 16px Arial";
  ctx.fillText("ACTIVE", wx + 150, wy + 268);
  ctx.textAlign = "left";

  // ── FOOTER ──
  const fy = H - 68;
  roundRect(ctx, 9, fy, W - 9, 60, 0, DARK);
  ctx.fillStyle = YELLOW; ctx.fillRect(9, fy, W - 9, 3);
  ctx.fillStyle = YELLOW; ctx.font = "bold 13px Arial";
  ctx.fillText("⚡ ElectroServe", 28, fy + 28);
  ctx.fillStyle = GRAY; ctx.font = "11px Arial";
  ctx.fillText("This warranty covers service by ElectroServe. Physical/accidental damage not included.", 28, fy + 48);
  ctx.textAlign = "right";
  ctx.fillText("Save this card for future reference.", W - 22, fy + 48);
  ctx.textAlign = "left";

  // ── DOWNLOAD ──
  const safeName = (customer.name || "customer").replace(/\s+/g, "_");
  const link = document.createElement("a");
  link.download = `WarrantyCard_${safeName}_${certNo}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
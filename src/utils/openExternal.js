import { Browser } from "@capacitor/browser";

// Capacitor-safe external link opener
export async function openExternal(url) {
  try {
    await Browser.open({ url });
  } catch (e) {
    // Web fallback
    window.open(url, "_blank");
  }
}

// Capacitor-safe blob download
export function downloadBlob(blob, filename) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 3000);
  } catch (e) {
    console.error("Download failed:", e);
  }
}
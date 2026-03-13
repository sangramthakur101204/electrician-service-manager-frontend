// Capacitor-safe external link opener
// Har jagah window.open("url", "_blank") ki jagah openExternal("url") use karo
export function openExternal(url) {
  try {
    if (window.Capacitor?.Plugins?.Browser) {
      window.Capacitor.Plugins.Browser.open({ url });
      return;
    }
  } catch(e) {}
  // Web + Android WebView fallback
  try { window.open(url, "_system"); }
  catch(e) { window.location.href = url; }
}

// Blob file download — APK mein a.click() kaam nahi karta
export function downloadBlob(blob, filename) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch(e) {
    console.error("Download failed:", e);
  }
}
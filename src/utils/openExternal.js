import { Browser } from "@capacitor/browser";

// Capacitor-safe external link opener
export async function openExternal(url) {
  try {
    await Browser.open({ url });
  } catch (e) {
    window.open(url, "_blank");
  }
}

// Capacitor-safe blob download
// APK mein a.click() kaam nahi karta — base64 + share use karte hain
export async function downloadBlob(blob, filename) {
  try {
    // Check if running in Capacitor (APK)
    const isCapacitor = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

    if (isCapacitor) {
      // Convert blob to base64
      const base64 = await blobToBase64(blob);
      const base64Data = base64.split(",")[1]; // remove data:...;base64, prefix

      // Use Capacitor Filesystem to write file
      const { Filesystem, Directory, Share } = await importCapacitorPlugins();

      if (Filesystem) {
        await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
        });

        const fileResult = await Filesystem.getUri({
          path: filename,
          directory: Directory.Cache,
        });

        if (Share) {
          await Share.share({
            title: filename,
            url: fileResult.uri,
            dialogTitle: "Save or Share",
          });
        }
      } else {
        // Fallback — open as data URL
        const dataUrl = base64;
        await Browser.open({ url: dataUrl });
      }
    } else {
      // Web browser — normal download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 3000);
    }
  } catch (e) {
    console.error("Download failed:", e);
    // Last resort fallback
    try {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch(e2) {}
  }
}

// Helper — blob to base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Dynamic import Capacitor plugins
async function importCapacitorPlugins() {
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    let Share = null;
    try {
      const shareModule = await import("@capacitor/share");
      Share = shareModule.Share;
    } catch(e) {}
    return { Filesystem, Directory, Share };
  } catch(e) {
    return { Filesystem: null, Directory: null, Share: null };
  }
}
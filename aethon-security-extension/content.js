// content.js for Aethon Exam Security Shield

// 1. Set DOM attribute to signal the extension is active (CSP-safe, works on all pages)
document.documentElement.setAttribute("data-aethon-extension-active", "true");

// // 2. Inject the integrity auditing suite using standard Window context hooks
function injectMainWorldIntegrityChecks() {
  // Execute checks in current content script scope without triggering CSP inline-script restrictions
  function reportViolation(type, message) {
    console.warn("[AETHON SECURITY SHIELD] VIOLATION DETECTED:", type, "-", message);
    window.dispatchEvent(new CustomEvent("AETHON_INTEGRITY_VIOLATION", {
      detail: { type, message }
    }));
  }

  // Auditing routines
  const nativeToString = Function.prototype.toString;
  function isNativeFunction(fn, expectedName) {
    try {
      if (typeof fn !== "function") return false;
      const str = nativeToString.call(fn);
      return str.includes("[native code]");
    } catch (e) {
      return false;
    }
  }

  const criticalAPIList = [
    { fn: window.requestAnimationFrame, name: "requestAnimationFrame" },
    { fn: window.cancelAnimationFrame, name: "cancelAnimationFrame" },
    { fn: window.setTimeout, name: "setTimeout" },
    { fn: window.setInterval, name: "setInterval" },
    { fn: Document.prototype.addEventListener, name: "addEventListener" },
    { fn: window.addEventListener, name: "addEventListener" }
  ];

  criticalAPIList.forEach(item => {
    if (!isNativeFunction(item.fn, item.name)) {
      reportViolation("FUNCTION_TAMPERED", "Critical API function " + item.name + " has been hooked or overridden.");
    }
  });

  // Peripheral Device Driver Auditing
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const forbiddenDrivers = ["obs", "virtual", "manycam", "splitcam", "droidcam", "vcam", "virtualcam"];
      devices.forEach(device => {
        const label = (device.label || "").toLowerCase();
        if (forbiddenDrivers.some(driver => label.includes(driver))) {
          reportViolation("VIRTUAL_DEVICE", "Forbidden virtual camera/audio driver active: " + device.label);
        }
      });
    }).catch(() => {});
  }
}

// Execute integrity checks at document_start
if (document.documentElement) {
  injectMainWorldIntegrityChecks();
} else {
  document.addEventListener("DOMContentLoaded", injectMainWorldIntegrityChecks);
}

// 3. Listen for scan requests from the webpage
window.addEventListener("AETHON_SCAN_REQUEST", (event) => {
  try {
    chrome.runtime.sendMessage({ action: "scanExtensions" }, (response) => {
      // Handle connection error gracefully to avoid Chrome recording uncaught console errors
      if (chrome.runtime.lastError) {
        window.dispatchEvent(new CustomEvent("AETHON_SCAN_RESPONSE", {
          detail: { status: "error", message: chrome.runtime.lastError.message }
        }));
        return;
      }
      
      window.dispatchEvent(new CustomEvent("AETHON_SCAN_RESPONSE", {
        detail: response || { status: "error", message: "No response from service worker" }
      }));
    });
  } catch (err) {
    window.dispatchEvent(new CustomEvent("AETHON_SCAN_RESPONSE", {
      detail: { status: "error", message: err.message }
    }));
  }
});


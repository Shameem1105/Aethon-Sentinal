// content.js for Aethon Exam Security Shield (Blocker version)

// 1. Set DOM attribute to signal the extension is active (CSP-safe, works on all pages)
document.documentElement.setAttribute("data-aethon-extension-active", "true");

// 2. Inject the MAIN world integrity auditing suite into the page context
function injectMainWorldIntegrityChecks() {
  const scriptContent = `
    (function() {
      if (window.__aethon_integrity_injected) return;
      window.__aethon_integrity_injected = true;

      function reportViolation(type, message) {
        console.warn("[AETHON SECURITY SHIELD] VIOLATION DETECTED:", type, "-", message);
        
        // Dispatch event for client-side pages to handle immediately
        window.dispatchEvent(new CustomEvent("AETHON_INTEGRITY_VIOLATION", {
          detail: { type, message }
        }));
      }



      // 1. Function Serialization Auditing (.toString() verification)
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

      // 2. Descriptor Configuration Auditing (checking prototype visibilityState getters)
      function auditAPIProperty(prototype, propertyName) {
        try {
          const desc = Object.getOwnPropertyDescriptor(prototype, propertyName);
          if (!desc) return;

          // Standard browser properties visibilityState and hidden are accessors (getters) only, not configurable/writable data properties
          if (desc.value !== undefined || desc.writable !== undefined) {
            reportViolation("API_TAMPERED", "Property " + propertyName + " is overridden as a plain data value.");
            return;
          }
          if (desc.set !== undefined) {
            reportViolation("API_TAMPERED", "Property " + propertyName + " has an unauthorized setter hook.");
            return;
          }
          if (desc.get && !isNativeFunction(desc.get, "")) {
            reportViolation("API_TAMPERED", "Property " + propertyName + " getter is overridden with custom code.");
          }
        } catch (e) {
          reportViolation("DESCRIPTOR_CHECK_FAILED", "Failed to verify descriptor of " + propertyName);
        }
      }

      auditAPIProperty(Document.prototype, "visibilityState");
      auditAPIProperty(Document.prototype, "hidden");

      // 3. Clean Iframe Context Diffing
      try {
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = "about:blank";
        document.documentElement.appendChild(iframe);
        if (iframe.contentWindow) {
          const cleanWin = iframe.contentWindow;
          const cleanDocProto = cleanWin.Document.prototype;

          const cleanVisDesc = Object.getOwnPropertyDescriptor(cleanDocProto, "visibilityState");
          const currentVisDesc = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState");

          if (cleanVisDesc && currentVisDesc) {
            const cleanGetStr = nativeToString.call(cleanVisDesc.get);
            const currentGetStr = nativeToString.call(currentVisDesc.get);
            if (cleanGetStr !== currentGetStr) {
              reportViolation("API_TAMPERED", "Document.prototype.visibilityState getter mismatch against clean frame.");
            }
          }

          if (nativeToString.call(window.requestAnimationFrame) !== nativeToString.call(cleanWin.requestAnimationFrame)) {
            reportViolation("API_TAMPERED", "window.requestAnimationFrame mismatch against clean frame.");
          }
        }
        iframe.remove();
      } catch (err) {
        // Safe fail if sandboxing restricts iframe operations
      }

      // 4. Behavioral requestAnimationFrame Drift Honeypot
      // Tests whether requestAnimationFrame is ticking at 60fps in the background while standard page timers are background-throttled.
      let lastIntervalTick = performance.now();
      setInterval(() => {
        lastIntervalTick = performance.now();
      }, 100);

      let lastRafTick = performance.now();
      function rafAuditLoop() {
        const now = performance.now();
        const rafDelta = now - lastRafTick;
        lastRafTick = now;

        const timeSinceLastInterval = now - lastIntervalTick;
        // If requestAnimationFrame ticks fast (under 30ms) but setInterval is throttled (over 900ms),
        // it means the background page has bypassed standard tab focus/RAF throttling (e.g. using Web Workers).
        if (rafDelta < 30 && timeSinceLastInterval > 900) {
          reportViolation("THROTTLING_BYPASS", "requestAnimationFrame bypass active in background.");
        }
        requestAnimationFrame(rafAuditLoop);
      }
      requestAnimationFrame(rafAuditLoop);

      // 5. DOM Mutation Observation for injected tags
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const tagName = node.tagName.toLowerCase();
              if (tagName === "script" || tagName === "iframe") {
                // If it's a script without an allowed source, we can inspect it
                const src = node.getAttribute("src") || "";
                if (src && !src.startsWith("http://localhost") && !src.startsWith("https://") && !src.startsWith("/")) {
                  reportViolation("INJECTED_NODE", "Suspicious element injected: <" + tagName + "> with src: " + src);
                }
              }
            }
          });
        });
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });

      // 6. CSS Injection Auditing
      setInterval(() => {
        try {
          const sheets = document.styleSheets;
          for (let i = 0; i < sheets.length; i++) {
            const sheet = sheets[i];
            if (sheet.href && (sheet.href.startsWith("chrome-extension://") || sheet.href.startsWith("moz-extension://"))) {
              reportViolation("CSS_INJECTION", "External extension stylesheet detected: " + sheet.href);
            }
          }
        } catch (e) {
          // Cross-origin sheets can throw errors on inspection, which is expected
        }
      }, 3000);

      // 7. Peripheral Device Driver Auditing
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

      // Check periodically for changes
      setInterval(() => {
        criticalAPIList.forEach(item => {
          if (!isNativeFunction(item.fn, item.name)) {
            reportViolation("FUNCTION_TAMPERED", "Critical function " + item.name + " is overridden.");
          }
        });
      }, 5000);

    })();
  `;

  const script = document.createElement("script");
  script.textContent = scriptContent;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

// Execute the main world injection at document_start
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

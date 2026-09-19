// background.js for Aethon Exam Security Shield (Blocker version)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scanExtensions") {
    chrome.management.getAll((extensions) => {
      const detected = [];

      extensions.forEach((ext) => {
        // Flag all enabled third-party extensions (excluding this shield extension itself)
        if (ext.enabled && ext.id !== chrome.runtime.id && ext.type === "extension") {
          detected.push({
            name: ext.name,
            id: ext.id,
            description: ext.description || ""
          });
        }
      });

      sendResponse({ status: "success", forbiddenDetected: detected });
    });
    return true; // Keep channel open for async sendResponse
  }
});

const crypto = require("crypto");
const https = require("https");
const db = require("./db");

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || "examate-tutor-secret-key-32-chars!!";

// AES-256-CBC Encryption/Decryption for BYOK API Keys
function encryptKey(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_SECRET.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decryptKey(text) {
  if (!text) return null;
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_SECRET.padEnd(32).slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return null;
  }
}

// Fetch active student provider settings
async function getStudentProviderSettings(studentEmail) {
  return new Promise((resolve) => {
    db.query(
      "SELECT * FROM tutor_provider_connections WHERE student_email = ? AND active = 1",
      [studentEmail],
      (err, results) => {
        if (!err && results && results.length > 0) {
          const conn = results[0];
          resolve({
            provider: conn.provider,
            apiKey: decryptKey(conn.encrypted_key),
            model: conn.selected_model
          });
        } else {
          // Default fallback provider
          resolve({
            provider: "GEMINI",
            apiKey: process.env.GEMINI_API_KEY || null,
            model: "gemini-3.6-flash"
          });
        }
      }
    );
  });
}

// ----------------------------------------------------
// PROVIDER ADAPTERS
// ----------------------------------------------------

// 1. Google Gemini Adapter
async function callGemini(apiKey, systemPrompt, messages, modelName = "gemini-1.5-flash-latest") {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Missing Gemini API Key. Please configure your API key in AI Settings.");
  }

  const requestedModel = (modelName || "gemini-1.5-flash-latest").replace(/^models\//, "").trim();

  // Priority candidate order for Gemini models (supporting Gemini 2.0 Flash / 2.5 Flash / 1.5 Flash)
  const candidateModels = [
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro-latest",
    "gemini-1.0-pro"
  ];

  if (requestedModel && !candidateModels.includes(requestedModel)) {
    candidateModels.unshift(requestedModel);
  }
  
  const modelsToTry = [...new Set(candidateModels.filter(Boolean))];

  const formattedContents = [];
  messages.forEach(m => {
    formattedContents.push({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    });
  });

  const payload = JSON.stringify({
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: formattedContents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048
    }
  });

  let lastError = null;
  for (const mName of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${key}`;
      const responseText = await makeHttpsPost(endpoint, payload, { "Content-Type": "application/json" });
      const data = JSON.parse(responseText);

      if (data.error) {
        if (data.error.code === 404 || (data.error.message && data.error.message.includes("not found"))) {
          console.warn(`[GEMINI API] Model '${mName}' not found for key, attempting fallback model...`);
          lastError = new Error(data.error.message);
          continue;
        }
        throw new Error(data.error.message || "Gemini API Error");
      }

      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        return data.candidates[0].content.parts.map(p => p.text).join("");
      }
    } catch (err) {
      lastError = err;
      if (err.message && err.message.includes("not found")) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("Gemini API generation failed.");
}

// 2. Anthropic Claude Adapter
async function callClaude(apiKey, systemPrompt, messages, modelName = "claude-3-5-sonnet-20241022") {
  const key = apiKey || process.env.CLAUDE_API_KEY;
  if (!key) {
    throw new Error("Missing Anthropic Claude API Key. Please configure your API key in AI Settings.");
  }

  const formattedMessages = messages.map(m => ({
    role: m.sender === "user" ? "user" : "assistant",
    content: m.content
  }));

  const payload = JSON.stringify({
    model: modelName || "claude-3-5-sonnet-20241022",
    max_tokens: 2048,
    system: systemPrompt,
    messages: formattedMessages
  });

  const responseText = await makeHttpsPost("https://api.anthropic.com/v1/messages", payload, {
    "Content-Type": "application/json",
    "x-api-key": key,
    "anthropic-version": "2023-06-01"
  });

  const data = JSON.parse(responseText);
  if (data.error) {
    throw new Error(data.error.message || "Claude API Error");
  }

  if (data.content && data.content[0]) {
    return data.content[0].text;
  }
  return "I'm sorry, I couldn't generate a response at this time.";
}

// 3. Groq Adapter
async function callGroq(apiKey, systemPrompt, messages, modelName = "llama-3.3-70b-versatile") {
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("Missing Groq API Key. Please configure your API key in AI Settings.");
  }

  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map(m => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.content
    }))
  ];

  const payload = JSON.stringify({
    model: modelName || "llama-3.3-70b-versatile",
    messages: formattedMessages,
    temperature: 0.7,
    max_tokens: 2048
  });

  const responseText = await makeHttpsPost("https://api.groq.com/openai/v1/chat/completions", payload, {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${key}`
  });

  const data = JSON.parse(responseText);
  if (data.error) {
    throw new Error(data.error.message || "Groq API Error");
  }

  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }
  return "I'm sorry, I couldn't generate a response at this time.";
}

// Main Gateway Router
async function generateTutorResponse(studentEmail, systemPrompt, messages) {
  const settings = await getStudentProviderSettings(studentEmail);
  const provider = (settings.provider || "GEMINI").toUpperCase();

  console.log(`[AI GATEWAY] Dispatching request for ${studentEmail} using provider: ${provider} (Model: ${settings.model || 'default'})`);

  try {
    if (provider === "CLAUDE") {
      return await callClaude(settings.apiKey, systemPrompt, messages, settings.model);
    } else if (provider === "GROQ") {
      return await callGroq(settings.apiKey, systemPrompt, messages, settings.model);
    } else {
      return await callGemini(settings.apiKey, systemPrompt, messages, settings.model);
    }
  } catch (error) {
    console.error(`[AI GATEWAY ERROR] Provider ${provider} failed:`, error.message);
    // If custom BYOK key failed, attempt automatic fallback to Gemini system API if available
    if (provider !== "GEMINI" && process.env.GEMINI_API_KEY) {
      console.log("[AI GATEWAY] Falling back to system default Gemini engine...");
      return await callGemini(process.env.GEMINI_API_KEY, systemPrompt, messages, "gemini-3.6-flash");
    }
    throw error;
  }
}

// Helper function for HTTPS POST
function makeHttpsPost(urlStr, payload, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => resolve(body));
    });

    req.on("error", (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

module.exports = {
  encryptKey,
  decryptKey,
  getStudentProviderSettings,
  generateTutorResponse
};

const https = require("https");

const PAYSTACK_BASE = "api.paystack.co";

const request = (method, path, body) =>
  new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: PAYSTACK_BASE,
        port: 443,
        path,
        method,
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
          ...(data && { "Content-Length": Buffer.byteLength(data) }),
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(chunks);
            if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
            else
              reject(new Error(json.message || `Paystack ${res.statusCode}`));
          } catch (err) {
            reject(new Error("Invalid Paystack response"));
          }
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });

// Initialize a one-time transaction. Paystack returns an authorization_url
// the client opens in browser to complete payment.
const initializeTransaction = ({
  email,
  amount,
  reference,
  planCode,
  callbackUrl,
  metadata,
}) =>
  request("POST", "/transaction/initialize", {
    email,
    amount, // in kobo
    reference,
    plan: planCode || undefined,
    callback_url: callbackUrl,
    metadata: metadata || {},
  });

const verifyTransaction = (reference) =>
  request("GET", `/transaction/verify/${encodeURIComponent(reference)}`);

module.exports = { initializeTransaction, verifyTransaction };

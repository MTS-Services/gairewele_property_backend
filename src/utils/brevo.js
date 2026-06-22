const https = require("https");

const BREVO_BASE = "api.brevo.com";

const request = (method, path, body, apiKey) =>
  new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: BREVO_BASE,
        port: 443,
        path,
        method,
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(data && { "Content-Length": Buffer.byteLength(data) }),
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          if (res.statusCode === 204) {
            return resolve({ statusCode: 204, body: null });
          }

          let json = {};
          if (chunks) {
            try {
              json = JSON.parse(chunks);
            } catch {
              return reject(new Error("Invalid Brevo response"));
            }
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            return resolve({ statusCode: res.statusCode, body: json });
          }

          const err = new Error(json.message || `Brevo ${res.statusCode}`);
          err.statusCode = res.statusCode;
          err.response = { body: json };
          reject(err);
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });

/**
 * Add or update a contact on a Brevo list.
 * 201 = new contact, 204 = existing contact updated.
 */
const subscribeToList = async ({ apiKey, listId, email }) => {
  const result = await request(
    "POST",
    "/v3/contacts",
    {
      email,
      listIds: [Number(listId)],
      updateEnabled: true,
    },
    apiKey,
  );

  return {
    isNew: result.statusCode === 201,
    contactId: result.body?.id ?? null,
  };
};

module.exports = { subscribeToList };

import { storageProvider } from "./_storage.js";

export default function handler(req, res) {
  const hasKv = Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  );

  res.status(200).json({
    message: "API funcionando",
    provider: storageProvider(),
    hasKv,
    hasApiKey: Boolean(process.env.ROBLOX_API_KEY),
  });
}

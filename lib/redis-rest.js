function readConfigValue(primaryName, secondaryName = "") {
  return (
    process.env[primaryName] ||
    (secondaryName ? process.env[secondaryName] || "" : "")
  ).trim();
}

export function readRedisConfig() {
  return {
    url: readConfigValue("UPSTASH_REDIS_REST_URL", "KV_REST_API_URL"),
    token: readConfigValue("UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN")
  };
}

export function hasRedisConfig() {
  const config = readRedisConfig();
  return Boolean(config.url && config.token);
}

export async function runRedisCommand(commandSegments) {
  const { url, token } = readRedisConfig();

  if (!url || !token) {
    const error = new Error(
      "Redis is not configured, connect Upstash Redis on Vercel first"
    );
    error.status = 500;
    throw error;
  }

  const endpoint = `${url.replace(/\/+$/, "")}/${commandSegments
    .map((segment) => encodeURIComponent(String(segment)))
    .join("/")}`;

  const response = await fetch(endpoint, {
    headers: {
      authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.error) {
    const error = new Error(
      payload?.error || payload?.message || "Redis request failed"
    );
    error.status = response.ok ? 500 : response.status;
    throw error;
  }

  return payload?.result;
}

export function isRobloxOauthEnabled() {
  return String(process.env.ROBLOX_OAUTH_ENABLED || "")
    .trim()
    .toLowerCase() === "true";
}

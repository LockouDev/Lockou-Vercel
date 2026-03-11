import {
  createJsonResponse,
  getSessionTokenFromRequest,
  verifySessionToken
} from "../../lib/admin-auth.js";

export default {
  async fetch(request) {
    const session = await verifySessionToken(getSessionTokenFromRequest(request));

    if (!session) {
      return createJsonResponse({ error: "Unauthorized" }, { status: 401 });
    }

    return createJsonResponse({
      heading: "Lockou Admin",
      environment: "Restricted",
      updatedAt: new Date().toISOString(),
      overviewCards: [
        {
          label: "Roblox data sources",
          value: "Pending wiring"
        },
        {
          label: "API status",
          value: "Standby"
        },
        {
          label: "Access mode",
          value: "Cookie protected"
        }
      ],
      datasets: [
        {
          name: "Profile data",
          status: "Reserved",
          notes: "Slot ready for Roblox profile payloads"
        },
        {
          name: "Group data",
          status: "Reserved",
          notes: "Slot ready for group metrics and snapshots"
        },
        {
          name: "Economy data",
          status: "Reserved",
          notes: "Slot ready for limiteds, RAP and market data"
        }
      ],
      activity: [
        "Add Roblox API fields",
        "Map private datasets",
        "Create filters and actions"
      ]
    });
  }
};

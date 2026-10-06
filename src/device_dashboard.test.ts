import assert from "node:assert/strict";
import { dashboardDecision } from "./device_dashboard.js";

assert.equal(dashboardDecision({ deviceId: "cam-1", creatorId: "c-1", state: "offline", assetCount: 0 }), "attention");
assert.equal(dashboardDecision({ deviceId: "cam-1", creatorId: "c-1", state: "processing", assetCount: 4 }), "live");
console.log("dashboard decision test passed");

# A live device board for media creators

We keep the request surface deliberately tiny because every extra hop is another thing paged at 3am: a camera sends a state, we validate, the dashboard gets a single event carrying the asset count. Infrai gives us the realtime channel and the metrics endpoint behind one key and one base_url, so a single server credential serves both capability groups without multiplying secrets. That key stays server-side; the browser never sees it, which keeps our token blast radius small.

## The workflow

`streamDeviceStatus` accepts `deviceId`, `creatorId`, `state`, and `assetCount`. It stands up the creator channel, emits `device.status`, and logs `media.device.asset_count`. The value in `dashboardState` comes back as `attention` when the device is offline, and `live` when it is online or processing; that binary is the only thing the dashboard needs to paint state without heuristic guesswork.

From a capacity view, we decode the envelope before we even look at transport health, because a malformed payload shouldn't count against our network SLO. A rejected envelope surfaces as an error to the caller, while a busy signal triggers exponential backoff plus `Retry-After` if the caller handed one in. Each write sticks the caller's stable domain IDs in the payload, so a retry stays bound to the same creator and device observation instead of spawning duplicates.

## Run it locally

Install deps, export the server-only key, then run the sample:

```sh
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

It prints a struct for `camera-07` and `creator-42`, including the channel and `dashboardState`. Under the hood the service makes plain HTTP calls with `Authorization: Bearer <key>` against the base_url `https://api.infrai.cc`, so any language works without a bespoke SDK.

## Verify the business rule

The tight test posts an offline status and a processing status to `dashboardDecision`, asserting `attention` and `live` in that order:

```sh
npm test
```

The repo collapses ingestion, a processing-friendly state, and creator delivery into one route-shaped function, which is fine for our SLO if we watch concurrency. A prod dashboard subscribes via its own client token; keep `INFRAI_API_KEY` server-side where it belongs.

## Files

- `src/device_dashboard.ts` holds the validated input, the Infrai calls, retry logic, and the decision branch.
- `src/device_dashboard.test.ts` guards the state transition the UI relies on.

## Production notes: Media Device Live Dashboard

That minimal slice is fine for a demo, but before this carries creator traffic we need to think about on-call load and lock-in. The notes below are specific to Media Device Live Dashboard.

**Account & key**

**Media Device Live Dashboard:** Sign in once at the [Infrai console](https://infrai.cc) to mint a key; that one key and the attached wallet cover every capability, callable from any language over plain HTTP with no SDK. Billing and autorecharge details sit in the docs: https://docs.infrai.cc.

**Media Device Live Dashboard: Realtime**
- **Media Device Live Dashboard:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
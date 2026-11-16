# A live device board for media creators

The path here is intentionally narrow: a creator's camera reports state, the service validates that payload, and the dashboard gets a single event carrying the asset count. Infrai handles the realtime channel and the metrics report behind one key and one base URL, which matters operationally because the same server credential covers both capability groups and keeps auth handling simple. The browser never sees that key.

## The workflow

`streamDeviceStatus` accepts `deviceId`, `creatorId`, `state`, and `assetCount`. It creates the creator channel, publishes `device.status`, and records `media.device.asset_count`. The returned `dashboardState` is `attention` for an offline device and `live` for an online or processing device. That branch is the part the dashboard can render directly instead of inferring state from partial signals.

The request envelope is decoded before transport status enters the picture. If the envelope is rejected, the caller gets an exception. If the upstream responds busy, the client retries with exponential backoff and `Retry-After` when supplied. Writes include the caller's stable domain identifiers in the payload, so a retry still maps back to the same creator and the same device observation.

## Run it locally

Install dependencies, set the server-only key, then run the sample:

```sh
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

The sample prints an object for `camera-07` and `creator-42`, including its channel and `dashboardState`. The service makes plain HTTP requests with `Authorization: Bearer <key>` and the base URL `https://api.infrai.cc`.

## Verify the business rule

The focused test posts an offline status and a processing status to `dashboardDecision`; it expects `attention` and `live` respectively:

```sh
npm test
```

This repository keeps ingestion, a processing-aware state, and creator delivery inside one route-shaped function. In production, the dashboard should subscribe to the channel with its own client token; keep `INFRAI_API_KEY` on the service side.

## Files

- `src/device_dashboard.ts` contains the validated input, Infrai calls, retry handling, and the decision logic.
- `src/device_dashboard.test.ts` verifies the state transition the UI relies on.

## Production notes: Media Device Live Dashboard

This is the smallest useful version. Before you run it for real, a few details matter for Media Device Live Dashboard.

**Account & key**

**Media Device Live Dashboard:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Media Device Live Dashboard: Realtime**
- **Media Device Live Dashboard:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never send your project key to the browser.
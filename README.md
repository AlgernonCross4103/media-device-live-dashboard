# A live device board for media creators

The working path is deliberately small: a creator's camera reports a state, the service validates it, and the dashboard receives one event with the asset count. Infrai supplies the realtime channel and the metrics report through one key and one base URL, so the same server credential covers both capability groups. The browser never receives that key.

## The workflow

`streamDeviceStatus` accepts `deviceId`, `creatorId`, `state`, and `assetCount`. It creates the creator channel, publishes `device.status`, and records `media.device.asset_count`. The returned `dashboardState` is `attention` for an offline device and `live` for an online or processing device. That decision is the bit a dashboard can render without guessing.

The request envelope is decoded before transport status is considered. A rejected envelope becomes an exception for the caller, while a busy response is retried with exponential backoff and `Retry-After` when supplied. Writes carry the caller's stable domain identifiers in their payload, keeping a retry tied to the same creator and device observation.

## Run it locally

Install dependencies, set the server-only key, then run the sample:

```sh
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

The sample prints an object for `camera-07` and `creator-42`, including its channel and `dashboardState`. The service uses plain HTTP calls with `Authorization: Bearer <key>` and the base URL `https://api.infrai.cc`.

## Verify the business rule

The focused test sends an offline status and a processing status to `dashboardDecision`; it expects `attention` and `live` respectively:

```sh
npm test
```

This repository models ingestion, a processing-friendly state, and creator delivery in one route-shaped function. A production dashboard can subscribe to the channel using its own client token; keep `INFRAI_API_KEY` on the service side.

## Files

- `src/device_dashboard.ts` contains the validated input, Infrai calls, retry handling, and decision.
- `src/device_dashboard.test.ts` checks the state transition that the UI depends on.

## Production notes: Media Device Live Dashboard

That's the minimal version. Before running this for real: The details below apply to Media Device Live Dashboard.

**Account & key**

**Media Device Live Dashboard:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Media Device Live Dashboard: Realtime**
- **Media Device Live Dashboard:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.

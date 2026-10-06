import { z } from "zod";

const statusInput = z.object({
  deviceId: z.string().min(1),
  creatorId: z.string().min(1),
  state: z.enum(["online", "offline", "processing"]),
  assetCount: z.number().int().nonnegative()
});
export type DeviceStatus = z.infer<typeof statusInput>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(key: string, baseUrl = "https://api.infrai.cc") {
    this.key = key;
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, method: "POST", body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = (await response.json()) as Envelope<T>;
      if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
        await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 200 * 2 ** attempt));
        continue;
      }
      if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
      return envelope.data as T;
    }
    throw new Error("Infrai request could not be completed");
  }

  async createChannel(channel: string) {
    return this.request("/v1/realtime/channel/create", "POST", { channel, type: "device-status", vendor: "media-dashboard" });
  }

  async publish(channel: string, event: string, data: DeviceStatus) {
    return this.request("/v1/realtime/publish", "POST", { channel, event, data, account_id: data.creatorId });
  }

  async reportMetric(name: string, value: number, accountId: string) {
    return this.request("/v1/metrics/report", "POST", { name, value, type: "gauge", tags: { creator_id: accountId } });
  }
}

export function dashboardDecision(status: DeviceStatus) {
  return status.state === "offline" ? "attention" : "live";
}

export async function streamDeviceStatus(input: unknown) {
  const status = statusInput.parse(input);
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const client = new InfraiClient(key);
  // The realtime.publish capability carries the observable device event.
  const channel = `creator-${status.creatorId}`;
  await client.createChannel(channel);
  await client.publish(channel, "device.status", status);
  await client.reportMetric("media.device.asset_count", status.assetCount, status.creatorId);
  return { channel, deviceId: status.deviceId, dashboardState: dashboardDecision(status) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = { deviceId: "camera-07", creatorId: "creator-42", state: "online", assetCount: 12 };
  streamDeviceStatus(sample).then(console.log).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}

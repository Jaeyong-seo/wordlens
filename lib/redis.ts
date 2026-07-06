/**
 * Minimal Upstash Redis REST client (no SDK dependency).
 * When the env vars are absent the app falls back to in-memory state,
 * which is correct for local dev and single-process deployments.
 */

function restUrl(): string {
  return (
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? ""
  );
}

function restToken(): string {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? ""
  );
}

export function isRedisConfigured(): boolean {
  return Boolean(restUrl() && restToken());
}

async function command<T>(cmd: (string | number)[]): Promise<T> {
  const res = await fetch(restUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${restToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Redis command failed: ${res.status}`);
  }
  const json = (await res.json()) as { result: T };
  return json.result;
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const raw = await command<string | null>(["GET", key]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSetJson(
  key: string,
  value: unknown,
  ttlSeconds?: number,
): Promise<void> {
  const cmd: (string | number)[] = ["SET", key, JSON.stringify(value)];
  if (ttlSeconds) cmd.push("EX", ttlSeconds);
  await command(cmd);
}

export async function redisDel(key: string): Promise<void> {
  await command(["DEL", key]);
}

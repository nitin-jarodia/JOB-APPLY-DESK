const USER_AGENT =
  "ApplyDesk/0.1 (personal local job desk; read-only public JSON feeds)";

export class FeedError extends Error {
  readonly endpoint: string;
  readonly status: number | null;

  constructor(endpoint: string, message: string, status: number | null = null) {
    super(message);
    this.name = "FeedError";
    this.endpoint = endpoint;
    this.status = status;
  }
}

export function describeEndpoint(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Read-only GET of a public JSON feed. Any non-200, timeout, or non-JSON body
 * becomes a FeedError so the caller can report that one endpoint and carry on.
 */
export async function getJson<T>(url: string, timeoutMs = 20000): Promise<T> {
  const endpoint = describeEndpoint(url);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    const raw = error instanceof Error ? `${error.name}: ${error.message}` : "";
    const reason = /timeout|abort/i.test(raw)
      ? `did not respond within ${Math.round(timeoutMs / 1000)}s`
      : error instanceof Error
        ? error.message
        : "network error";
    throw new FeedError(endpoint, reason);
  }

  if (!response.ok) {
    throw new FeedError(endpoint, `returned HTTP ${response.status}`, response.status);
  }

  const body = await response.text();
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new FeedError(endpoint, "returned a body that is not JSON");
  }
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index]);
      }
    }),
  );
  return results;
}

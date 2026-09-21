const transientCodes = new Set([
  "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_SOCKET",
  "08000", "08001", "08003", "08006", "57P01", "57P02", "57P03", "53300",
]);

export function isTransientDatabaseError(error: unknown): boolean {
  const pending = [error];
  const seen = new Set<unknown>();
  while (pending.length) {
    const current = pending.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const detail = current as { name?: string; message?: string; code?: string; cause?: unknown; sourceError?: unknown };
    if (detail.code && transientCodes.has(detail.code)) return true;
    if (detail.name === "TimeoutError") return true;
    if (detail.name === "TypeError" && detail.message === "fetch failed") return true;
    if (detail.name === "NeonDbError" && /^(Error connecting to database:|Server error \(HTTP status (429|502|503|504)\))/.test(detail.message ?? "")) return true;
    pending.push(detail.cause, detail.sourceError);
  }
  return false;
}

// Only use for read-only operations. A disconnected write may already have committed.
export async function retryDatabaseRead<T>(read: () => Promise<T>): Promise<T> {
  const delays = [200, 600];
  for (let attempt = 0; ; attempt++) {
    try { return await read(); }
    catch (error) {
      if (attempt === delays.length || !isTransientDatabaseError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

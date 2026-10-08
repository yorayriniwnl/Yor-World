/** Read at most the accepted number of bytes; never retain an unbounded chunk list. */
export class BodyTooLargeError extends Error {}

function cancel(stream: ReadableStream<Uint8Array> | ReadableStreamDefaultReader<Uint8Array>): void {
  // A hostile source may never resolve cancel(). Rejection must not delay the response.
  void stream.cancel().catch(() => {});
}

export async function readBoundedBody(request: Request, limit: number): Promise<{ text: string; bytes: number }> {
  const declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > limit) {
    if (request.body) cancel(request.body);
    throw new BodyTooLargeError();
  }
  if (!request.body) return { text: "", bytes: 0 };
  const reader = request.body.getReader();
  const retained = new Uint8Array(limit);
  let bytes = 0;
  let rejectAbort!: (reason: Error) => void;
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const onAbort = () => { rejectAbort(new Error("Request aborted.")); cancel(reader); };
  request.signal.addEventListener("abort", onAbort, { once: true });
  try {
    if (request.signal.aborted) onAbort();
    while (true) {
      const result = await Promise.race([reader.read(), aborted]);
      if (request.signal.aborted) throw new Error("Request aborted.");
      if (result.done) break;
      if (result.value.byteLength > limit - bytes) {
        cancel(reader);
        throw new BodyTooLargeError();
      }
      retained.set(result.value, bytes);
      bytes += result.value.byteLength;
    }
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(retained.subarray(0, bytes)), bytes };
  } catch (error) {
    cancel(reader);
    throw error;
  } finally {
    request.signal.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}

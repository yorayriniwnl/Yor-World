import { createHash } from "node:crypto";
import { createAdminServiceRoleClient } from "../auth/clients";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, MediaValidationError, validateUpload } from "./validate-upload";

export const MEDIA_OPERATION_TIMEOUT_MS = 8000;
export const PUBLICATION_MEDIA_TIMEOUT_MS = 30000;
export class MediaStorageUnavailableError extends Error {
  constructor() { super("Private media verification is temporarily unavailable."); }
}

/** The timeout settles even if a defective transport ignores AbortSignal. */
export async function boundedMediaOperation<T>(run: (signal: AbortSignal) => PromiseLike<T>,
  timeout = MEDIA_OPERATION_TIMEOUT_MS, parent?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const signal = parent ? AbortSignal.any([controller.signal, parent]) : controller.signal;
  let rejectAbort!: (error: Error) => void;
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const onAbort = () => rejectAbort(new MediaStorageUnavailableError());
  signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    if (signal.aborted) throw new MediaStorageUnavailableError();
    return await Promise.race([Promise.resolve(run(signal)), aborted]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

export interface StoredMediaIdentity {
  storage_bucket: unknown; object_key: unknown; hash: unknown; bytes: unknown; mime: unknown;
}

export async function verifyStoredMedia(row: StoredMediaIdentity, parent?: AbortSignal): Promise<void> {
  const bucket = row.storage_bucket;
  const key = row.object_key;
  const bytes = Number(row.bytes);
  if (typeof bucket !== "string" || !/^[a-zA-Z0-9._-]{1,100}$/.test(bucket)
      || typeof key !== "string" || !/^[a-zA-Z0-9._/-]{1,1024}$/.test(key)
      || key.split("/").some((part) => !part || part === "." || part === "..")
      || typeof row.hash !== "string" || !/^[a-f0-9]{64}$/.test(row.hash)
      || !Number.isSafeInteger(bytes) || bytes <= 0 || bytes > MAX_UPLOAD_BYTES
      || !ALLOWED_MIME_TYPES.some((mime) => mime === row.mime)) {
    throw new MediaValidationError("Media object identity is missing or invalid.");
  }
  await boundedMediaOperation(async (signal) => {
    const downloaded = await createAdminServiceRoleClient(signal).storage.from(bucket)
      .download(key, {}, { signal, cache: "no-store" }).asStream();
    if (downloaded.error || !downloaded.data) {
      if (downloaded.error && "statusCode" in downloaded.error && String(downloaded.error.statusCode) === "404")
        throw new MediaValidationError("Referenced media object does not exist.");
      throw new MediaStorageUnavailableError();
    }
    if (signal.aborted) {
      void downloaded.data.cancel().catch(() => {});
      throw new MediaStorageUnavailableError();
    }
    const reader = downloaded.data.getReader();
    const retained = new Uint8Array(bytes);
    const hash = createHash("sha256");
    let received = 0;
    let rejectRead!: (error: Error) => void;
    const abortedRead = new Promise<never>((_, reject) => { rejectRead = reject; });
    const onAbort = () => {
      rejectRead(new MediaStorageUnavailableError());
      void reader.cancel().catch(() => {});
    };
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      if (signal.aborted) throw new MediaStorageUnavailableError();
      while (true) {
        const result = await Promise.race([reader.read(), abortedRead]);
        if (signal.aborted) throw new MediaStorageUnavailableError();
        if (result.done) break;
        if (!(result.value instanceof Uint8Array) || result.value.byteLength > bytes - received)
          throw new MediaValidationError("Media object exceeds its approved byte identity.");
        retained.set(result.value, received);
        hash.update(result.value);
        received += result.value.byteLength;
      }
      if (received !== bytes || hash.digest("hex") !== row.hash)
        throw new MediaValidationError("Media object bytes do not match its approved SHA-256 identity.");
      await validateUpload({ buffer: retained, mime: String(row.mime), filename: key.split("/").at(-1)! });
      if (signal.aborted) throw new MediaStorageUnavailableError();
    } catch (error) {
      void reader.cancel().catch(() => {});
      throw error;
    } finally {
      signal.removeEventListener("abort", onAbort);
      reader.releaseLock();
    }
  }, MEDIA_OPERATION_TIMEOUT_MS, parent);
}

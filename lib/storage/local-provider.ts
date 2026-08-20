import "server-only";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { getEnv } from "@/lib/env";
import type { StorageProvider } from "@/lib/storage/provider";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

/** Local-disk storage for development / single-instance deployments. Files are served
 * statically from /uploads/*. Swap STORAGE_PROVIDER=s3 in production for durable, scalable storage. */
export class LocalStorageProvider implements StorageProvider {
  async upload({ key, data, contentType }: { key: string; data: Buffer; contentType: string }) {
    void contentType;
    const filePath = path.join(UPLOAD_ROOT, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    const base = getEnv().APP_URL.replace(/\/$/, "");
    return { url: `${base}/uploads/${key}`, key };
  }

  async delete(key: string) {
    const filePath = path.join(UPLOAD_ROOT, key);
    await unlink(filePath).catch(() => {});
  }
}

let cached: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;
  // Only "local" is implemented today; an S3-compatible provider slots in here behind
  // the same StorageProvider interface when STORAGE_PROVIDER=s3 credentials are supplied.
  cached = new LocalStorageProvider();
  return cached;
}

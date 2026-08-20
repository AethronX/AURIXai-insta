import "server-only";

export interface StorageProvider {
  /** Persists a file and returns a publicly reachable URL. */
  upload(params: { key: string; data: Buffer; contentType: string }): Promise<{ url: string; key: string }>;
  delete(key: string): Promise<void>;
}

export interface UploadedFile {
  url: string;
  key: string;
}

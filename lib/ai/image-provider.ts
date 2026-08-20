export interface GenerateImageParams {
  prompt: string;
  aspectRatio: string; // e.g. "4:5", "1:1", "9:16"
  brandColors?: { primary?: string | null; secondary?: string | null; accent?: string | null };
  label?: string;
}

export interface GeneratedImage {
  url: string;
  provider: "MOCK" | "EXTERNAL_API";
}

export interface ImageProvider {
  readonly name: string;
  isConfigured(): boolean;
  generateImage(params: GenerateImageParams): Promise<GeneratedImage>;
  generateVariations(params: GenerateImageParams, count: number): Promise<GeneratedImage[]>;
}

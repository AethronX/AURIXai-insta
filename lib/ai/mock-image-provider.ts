import "server-only";
import { getStorageProvider } from "@/lib/storage/local-provider";
import type { GenerateImageParams, GeneratedImage, ImageProvider } from "@/lib/ai/image-provider";

const ASPECT_DIMENSIONS: Record<string, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
  "9:16": { w: 1080, h: 1920 },
  "16:9": { w: 1080, h: 608 },
};

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxCharsPerLine) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 6);
}

function buildPlaceholderSvg(params: GenerateImageParams): string {
  const { w, h } = ASPECT_DIMENSIONS[params.aspectRatio] ?? ASPECT_DIMENSIONS["4:5"];
  const primary = params.brandColors?.primary || "#4F46E5";
  const secondary = params.brandColors?.secondary || "#111827";
  const lines = wrapText(params.label || params.prompt, 26);
  const lineHeight = 64;
  const startY = h / 2 - (lines.length * lineHeight) / 2;

  const textNodes = lines
    .map((line, i) => `<text x="50%" y="${startY + i * lineHeight}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="48" font-weight="600" fill="#ffffff">${escapeXml(line)}</text>`)
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primary}" />
      <stop offset="100%" stop-color="${secondary}" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)" />
  <g>
    ${textNodes}
  </g>
  <text x="24" y="${h - 24}" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#ffffffaa">AURIX mock image — connect an image provider for real creative</text>
</svg>`;
}

/** Deterministic placeholder image generator so the full pipeline works without a paid image API. */
export class MockImageProvider implements ImageProvider {
  readonly name = "mock";

  isConfigured(): boolean {
    return true;
  }

  async generateImage(params: GenerateImageParams): Promise<GeneratedImage> {
    const svg = buildPlaceholderSvg(params);
    const key = `generated/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.svg`;
    const { url } = await getStorageProvider().upload({
      key,
      data: Buffer.from(svg, "utf8"),
      contentType: "image/svg+xml",
    });
    return { url, provider: "MOCK" };
  }

  async generateVariations(params: GenerateImageParams, count: number): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];
    for (let i = 0; i < count; i++) {
      results.push(await this.generateImage(params));
    }
    return results;
  }
}

let cached: ImageProvider | null = null;
export function getImageProvider(): ImageProvider {
  if (!cached) cached = new MockImageProvider();
  return cached;
}

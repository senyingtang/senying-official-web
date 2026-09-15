import manifest from '../content/image-variants.generated.json';

/**
 * WebP / AVIF 多尺寸版本（pnpm images:optimize 產生 image-variants.generated.json）。
 * key 為原始 PNG 的 WebPath（media.ts 的 src）；PNG 保留作為 img 標籤 fallback。
 */
export interface ImageVariant {
  width: number;
  height: number;
  src: string;
  bytes: number;
}

export interface ImageVariantSet {
  label: string;
  role: 'hero' | 'card' | 'background';
  width: number;
  height: number;
  bytes: number;
  webp: ImageVariant[];
  avif: ImageVariant[];
}

const images = (manifest as unknown as { images: Record<string, ImageVariantSet> }).images;

export function getImageVariants(src: string): ImageVariantSet | undefined {
  return images[src];
}

export function toSrcset(variants: ImageVariant[]): string {
  return variants.map((variant) => `${variant.src} ${variant.width}w`).join(', ');
}

/**
 * 常用 sizes（對應實際版面寬度，讓瀏覽器挑選最小但足夠清晰的版本）
 */
export const IMAGE_SIZES = {
  /** 全寬背景 */
  fullBleed: '100vw',
  /** CTA 背景（object-cover）：手機區塊偏高，圖片會以高度撐滿，需要約 2 倍寬度 */
  background: '(min-width: 768px) 100vw, 200vw',
  /** Hero 右側主視覺 / 左右兩欄內容圖 */
  halfColumn: '(min-width: 1024px) 50vw, 100vw',
} as const;

export type SizeSlot = readonly [media: string | null, vw: number];

/**
 * object-cover 卡片的 sizes：容器比圖片「更直」時，圖片是以高度撐滿、左右裁切，
 * 實際顯示寬度 = 容器寬 × (容器高 / 容器寬) × (圖寬 / 圖高)，需要依比例放大 vw，避免挑到太小的版本而模糊。
 */
export function coverSizes(slots: readonly SizeSlot[], box: { width: number; height: number }, image: { width: number; height: number }): string {
  const factor = Math.max(1, (box.height / box.width) * (image.width / image.height));
  return slots.map(([media, vw]) => `${media ? `${media} ` : ''}${Math.ceil(vw * factor)}vw`).join(', ');
}

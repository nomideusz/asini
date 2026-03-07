/** Reed-Solomon error correction level. Higher = more redundancy. */
export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export interface QrOptions {
  /** Error correction level. Default: 'M' (recovers ~15% damage) */
  errorCorrection?: ErrorCorrection;
  /** Quiet zone width in modules (must be ≥ 4 per spec). Default: 4 */
  padding?: number;
  /** Module color. Default: '#000000' */
  foreground?: string;
  /** Background color. Default: '#ffffff' */
  background?: string;
  /** SVG width and height in px. Default: 256 */
  size?: number;
}

/** 2D boolean matrix. true = dark module, false = light module. */
export type QrMatrix = boolean[][];

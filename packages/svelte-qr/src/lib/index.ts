export type { QrOptions, QrMatrix, ErrorCorrection } from './core/types.js';
export { getQrMatrix } from './core/encoder.js';
export { matrixToSvg } from './core/svg.js';
export { default as QrCode } from './components/QrCode.svelte';

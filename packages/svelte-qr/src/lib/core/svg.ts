import type { QrMatrix, QrOptions } from './types.js';

export function matrixToSvg(matrix: QrMatrix, options: QrOptions = {}): string {
  const {
    size       = 256,
    foreground = '#000000',
    background = '#ffffff',
    padding    = 4,
  } = options;

  const modules = matrix.length;
  const total   = modules + padding * 2;
  const module  = size / total;

  const rects: string[] = [];
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (matrix[r][c]) {
        const x = (c + padding) * module;
        const y = (r + padding) * module;
        rects.push(
          `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${module.toFixed(2)}" height="${module.toFixed(2)}"/>`
        );
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">`,
    `<rect width="${size}" height="${size}" fill="${background}"/>`,
    `<g fill="${foreground}">`,
    ...rects,
    `</g>`,
    `</svg>`,
  ].join('\n');
}

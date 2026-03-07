import type { QrMatrix, QrOptions } from './types.js';

// ---------------------------------------------------------------------------
// 1. GF(256) arithmetic (for Reed-Solomon)
// ---------------------------------------------------------------------------

const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function buildGfTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x >= 256) x ^= 0x11d;
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

// ---------------------------------------------------------------------------
// 2. Reed-Solomon: compute divisor polynomial and remainder
// ---------------------------------------------------------------------------

function rsDivisor(degree: number): Uint8Array {
  const r = new Uint8Array(degree);
  r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      r[j] = gfMul(r[j], root);
      if (j + 1 < degree) r[j] ^= r[j + 1];
    }
    root = gfMul(root, 2);
  }
  return r;
}

function rsRemainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const f = b ^ result[0];
    result.copyWithin(0, 1);
    result[divisor.length - 1] = 0;
    for (let i = 0; i < divisor.length; i++) result[i] ^= gfMul(divisor[i], f);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 3. EC codeword tables (versions 1-40)
// ---------------------------------------------------------------------------

// EC codewords per block [version-1][L,M,Q,H]
const EC_CODEWORDS_PER_BLOCK: number[][] = [
  [7,10,13,17],[10,16,22,28],[15,26,18,22],[20,18,26,16],[26,24,18,22],
  [18,16,24,28],[20,18,18,26],[24,22,22,26],[30,22,20,24],[18,26,24,28],
  [20,30,28,24],[24,22,26,28],[26,22,24,22],[30,24,20,24],[22,24,30,24],
  [24,28,24,30],[28,28,28,28],[30,26,28,28],[28,26,26,26],[28,26,30,28],
  [28,26,28,30],[28,28,30,24],[30,28,30,30],[30,28,30,30],[26,28,30,30],
  [28,28,28,30],[30,28,30,30],[30,28,30,30],[30,28,30,30],[30,28,30,30],
  [30,28,30,30],[30,28,30,30],[30,28,30,30],[30,28,30,30],[30,28,30,30],
  [30,28,30,30],[30,28,30,30],[30,28,30,30],[30,28,30,30],[30,28,30,30],
];

// Number of EC blocks [version-1][L,M,Q,H]
const NUM_EC_BLOCKS: number[][] = [
  [1,1,1,1],[1,1,1,1],[1,1,2,2],[1,2,2,4],[1,2,4,4],
  [2,4,4,4],[2,4,2,4],[2,4,4,4],[2,5,5,6],[4,5,5,6],
  [4,5,11,11],[4,8,11,11],[4,9,12,16],[4,9,11,16],[6,10,11,18],
  [6,10,10,16],[6,11,14,20],[6,13,14,24],[7,14,14,28],[8,16,15,25],
  [8,17,17,25],[9,17,17,34],[9,18,18,30],[10,20,21,32],[12,21,20,35],
  [12,23,23,37],[12,25,23,40],[13,26,25,42],[14,28,25,45],[15,29,28,48],
  [16,31,28,51],[17,33,29,54],[18,35,31,57],[19,37,31,60],[19,38,33,63],
  [20,40,35,66],[21,43,37,70],[22,45,38,74],[24,47,40,77],[25,49,43,81],
];

// Data capacity in codewords [version-1][L,M,Q,H]
const DATA_CODEWORDS: number[][] = [
  [19,16,13,9],[34,28,22,16],[55,44,34,26],[80,64,48,36],[108,86,62,46],
  [136,108,76,60],[156,124,88,66],[194,154,110,86],[232,182,132,100],[274,216,154,122],
  [324,254,180,140],[370,290,206,158],[428,334,244,180],[461,365,261,197],[523,415,295,223],
  [589,453,325,253],[647,507,367,283],[721,563,397,313],[795,627,445,341],[861,669,485,385],
  [932,714,512,406],[1006,782,568,442],[1094,860,614,464],[1174,914,664,514],[1276,1000,718,538],
  [1370,1062,754,596],[1468,1128,808,628],[1531,1193,871,661],[1631,1267,911,701],[1735,1373,985,745],
  [1843,1455,1033,793],[1955,1541,1115,845],[2071,1631,1171,901],[2191,1725,1231,961],[2306,1812,1286,986],
  [2434,1914,1354,1054],[2566,1992,1426,1096],[2702,2102,1502,1142],[2812,2216,1582,1222],[2956,2334,1666,1276],
];

// ---------------------------------------------------------------------------
// 4. Bit stream builder
// ---------------------------------------------------------------------------

class BitStream {
  private bits: boolean[] = [];

  push(val: number, len: number): void {
    for (let i = len - 1; i >= 0; i--) this.bits.push(((val >> i) & 1) === 1);
  }

  get length(): number { return this.bits.length; }
  get array(): boolean[] { return this.bits; }

  toBytesWithPadding(totalBytes: number): Uint8Array {
    // Terminator
    for (let i = 0; i < 4 && this.bits.length < totalBytes * 8; i++) this.bits.push(false);
    // Byte boundary
    while (this.bits.length % 8 !== 0) this.bits.push(false);
    // Pad bytes
    let pad = 0xec;
    while (this.bits.length < totalBytes * 8) {
      this.push(pad, 8);
      pad = pad === 0xec ? 0x11 : 0xec;
    }
    const out = new Uint8Array(totalBytes);
    for (let i = 0; i < totalBytes; i++) {
      for (let b = 0; b < 8; b++) out[i] = (out[i] << 1) | (this.bits[i * 8 + b] ? 1 : 0);
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// 5. Build data + EC codewords
// ---------------------------------------------------------------------------

function buildCodewords(data: Uint8Array, version: number, ecLevel: number): Uint8Array {
  const numDataBytes = DATA_CODEWORDS[version - 1][ecLevel];
  const ecPerBlock   = EC_CODEWORDS_PER_BLOCK[version - 1][ecLevel];
  const numBlocks    = NUM_EC_BLOCKS[version - 1][ecLevel];

  const bs = new BitStream();
  // Byte mode indicator
  bs.push(0b0100, 4);
  // Character count
  const cciBits = version <= 9 ? 8 : 16;
  bs.push(data.length, cciBits);
  // Data bytes
  for (const b of data) bs.push(b, 8);
  const dataBytes = bs.toBytesWithPadding(numDataBytes);

  // Split into blocks, compute RS for each
  const shortBlocks = numBlocks - (numDataBytes % numBlocks === 0 ? numBlocks : numDataBytes % numBlocks);
  const shortBlockLen = Math.floor(numDataBytes / numBlocks);
  const divisor = rsDivisor(ecPerBlock);

  const dataBlocks: Uint8Array[] = [];
  const ecBlocks:   Uint8Array[] = [];
  let offset = 0;
  for (let i = 0; i < numBlocks; i++) {
    const len = shortBlockLen + (i < shortBlocks ? 0 : 1);
    const block = dataBytes.slice(offset, offset + len);
    dataBlocks.push(block);
    ecBlocks.push(rsRemainder(block, divisor));
    offset += len;
  }

  // Interleave data codewords
  const result: number[] = [];
  const lastBlock = dataBlocks[dataBlocks.length - 1];
  if (lastBlock === undefined) throw new Error('No data blocks');
  for (let col = 0; col < lastBlock.length; col++) {
    for (const block of dataBlocks) {
      if (col < block.length) result.push(block[col]);
    }
  }
  // Interleave EC codewords
  for (let col = 0; col < ecPerBlock; col++) {
    for (const block of ecBlocks) result.push(block[col]);
  }

  return new Uint8Array(result);
}

// ---------------------------------------------------------------------------
// 6. Matrix helpers
// ---------------------------------------------------------------------------

function makeMatrix(size: number): boolean[][] {
  return Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
}

function setModule(matrix: boolean[][], isFunc: boolean[][], r: number, c: number, dark: boolean): void {
  matrix[r][c] = dark;
  isFunc[r][c] = true;
}

// fillRect is defined but used indirectly via drawFinderPattern; kept for completeness
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function fillRect(matrix: boolean[][], isFunc: boolean[][], r: number, c: number, h: number, w: number, dark: boolean): void {
  for (let dr = 0; dr < h; dr++)
    for (let dc = 0; dc < w; dc++)
      setModule(matrix, isFunc, r + dr, c + dc, dark);
}

// ---------------------------------------------------------------------------
// 7. Draw function patterns
// ---------------------------------------------------------------------------

function drawFinderPattern(matrix: boolean[][], isFunc: boolean[][], r: number, c: number): void {
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const row = r + dr, col = c + dc;
      if (row < 0 || row >= matrix.length || col < 0 || col >= matrix.length) continue;
      const dark = (0 <= dr && dr <= 6 && (dc === 0 || dc === 6)) ||
                   (0 <= dc && dc <= 6 && (dr === 0 || dr === 6)) ||
                   (2 <= dr && dr <= 4 && 2 <= dc && dc <= 4);
      setModule(matrix, isFunc, row, col, dark);
    }
  }
}

// Alignment pattern center positions per version
const ALIGN_PATTERN_TABLE: number[][] = [
  [],
  [6,18],[6,22],[6,26],[6,30],[6,34],
  [6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],
  [6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],
  [6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],
  [6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],
  [6,30,58,86,114],[6,34,62,90,118],
  [6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],
  [6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],
  [6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],
  [6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170],
];

function drawFunctionPatterns(matrix: boolean[][], isFunc: boolean[][], version: number): void {
  const size = matrix.length;

  // Finder patterns + separators
  drawFinderPattern(matrix, isFunc, 0, 0);
  drawFinderPattern(matrix, isFunc, 0, size - 7);
  drawFinderPattern(matrix, isFunc, size - 7, 0);

  // Timing patterns
  for (let i = 0; i < size; i++) {
    setModule(matrix, isFunc, 6, i, i % 2 === 0);
    setModule(matrix, isFunc, i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const pos = ALIGN_PATTERN_TABLE[version - 1];
  if (pos === undefined) throw new Error(`Invalid version: ${version}`);
  for (const r of pos) {
    for (const c of pos) {
      if (isFunc[r][c]) continue; // overlaps finder
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          setModule(matrix, isFunc, r + dr, c + dc,
            Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }
      }
    }
  }

  // Dark module
  setModule(matrix, isFunc, 4 * version + 9, 8, true);

  // Format info placeholder (will be overwritten by drawFormatBits)
  drawFormatBits(matrix, isFunc, 0, 0); // placeholder, mask=0 ecLevel=0
}

// ---------------------------------------------------------------------------
// 8. Format information (BCH)
// ---------------------------------------------------------------------------

function drawFormatBits(matrix: boolean[][], isFunc: boolean[][], ecLevel: number, mask: number): void {
  const size = matrix.length;
  const ecBits = [1, 0, 3, 2][ecLevel]; // L=01, M=00, Q=11, H=10 in Nayuki encoding
  if (ecBits === undefined) throw new Error(`Invalid ecLevel: ${ecLevel}`);
  let data = (ecBits << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;

  // Around top-left finder
  for (let i = 0; i <= 5; i++) setModule(matrix, isFunc, 8, i, ((bits >> i) & 1) === 1);
  setModule(matrix, isFunc, 8, 7, ((bits >> 6) & 1) === 1);
  setModule(matrix, isFunc, 8, 8, ((bits >> 7) & 1) === 1);
  setModule(matrix, isFunc, 7, 8, ((bits >> 8) & 1) === 1);
  for (let i = 9; i < 15; i++) setModule(matrix, isFunc, 14 - i, 8, ((bits >> i) & 1) === 1);

  // Around other finders
  for (let i = 0; i < 8; i++) setModule(matrix, isFunc, size - 1 - i, 8, ((bits >> i) & 1) === 1);
  for (let i = 8; i < 15; i++) setModule(matrix, isFunc, 8, size - 15 + i, ((bits >> i) & 1) === 1);
  setModule(matrix, isFunc, 8, size - 8, true); // dark module
}

// ---------------------------------------------------------------------------
// 9. Place data bits (zigzag)
// ---------------------------------------------------------------------------

function placeDataBits(matrix: boolean[][], isFunc: boolean[][], codewords: Uint8Array): void {
  const size = matrix.length;
  let bitIdx = 0;
  const totalBits = codewords.length * 8;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right--; // skip timing column
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const upward = ((right + 1) & 2) === 0;
        const row = upward ? size - 1 - vert : vert;
        const col = right - j;
        if (!isFunc[row][col] && bitIdx < totalBits) {
          matrix[row][col] = ((codewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1) === 1;
          bitIdx++;
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 10. Masking + penalty
// ---------------------------------------------------------------------------

type MaskFn = (r: number, c: number) => boolean;

const MASKS: MaskFn[] = [
  (r,c) => (r + c) % 2 === 0,
  (r,_) => r % 2 === 0,
  (_,c) => c % 3 === 0,
  (r,c) => (r + c) % 3 === 0,
  (r,c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r,c) => ((r * c) % 2 + (r * c) % 3) === 0,
  (r,c) => (((r * c) % 2 + (r * c) % 3) % 2) === 0,
  (r,c) => (((r + c) % 2 + (r * c) % 3) % 2) === 0,
];

function applyMask(matrix: boolean[][], isFunc: boolean[][], m: number): boolean[][] {
  const size = matrix.length;
  const result = matrix.map(row => [...row]);
  const fn = MASKS[m];
  if (fn === undefined) throw new Error(`Invalid mask: ${m}`);
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!isFunc[r][c] && fn(r, c)) result[r][c] = !result[r][c];
  return result;
}

function penaltyScore(matrix: boolean[][]): number {
  const size = matrix.length;
  let score = 0;

  // Rule 1: 5+ consecutive same-color in row/col
  for (let r = 0; r < size; r++) {
    for (const isRow of [true, false]) {
      let runLen = 0, runColor = false;
      for (let i = 0; i < size; i++) {
        const cur = isRow ? matrix[r][i] : matrix[i][r];
        if (cur === runColor) {
          runLen++;
          if (runLen === 5) score += 3;
          else if (runLen > 5) score += 1;
        } else {
          runColor = cur!;
          runLen = 1;
        }
      }
    }
  }

  // Rule 2: 2x2 blocks
  for (let r = 0; r < size - 1; r++)
    for (let c = 0; c < size - 1; c++)
      if (matrix[r][c] === matrix[r][c + 1] &&
          matrix[r][c] === matrix[r + 1][c] &&
          matrix[r][c] === matrix[r + 1][c + 1])
        score += 3;

  // Rule 3: specific patterns
  const PATTERNS = [0b10111010000, 0b00001011101];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      for (const pat of PATTERNS) {
        let match = true;
        for (let i = 0; i < 11; i++)
          if (matrix[r][c + i] !== (((pat >> (10 - i)) & 1) === 1)) { match = false; break; }
        if (match) score += 40;
      }
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      for (const pat of PATTERNS) {
        let match = true;
        for (let i = 0; i < 11; i++)
          if (matrix[r + i][c] !== (((pat >> (10 - i)) & 1) === 1)) { match = false; break; }
        if (match) score += 40;
      }
    }
  }

  // Rule 4: dark module proportion
  const total = size * size;
  const dark = matrix.flat().filter(Boolean).length;
  const pct = (dark * 100) / total;
  score += Math.min(
    Math.abs(Math.floor(pct / 5) * 5 - 50),
    Math.abs(Math.ceil(pct / 5) * 5 - 50)
  ) * 2;

  return score;
}

// ---------------------------------------------------------------------------
// 11. Public API
// ---------------------------------------------------------------------------

export function getQrMatrix(data: string, options: QrOptions = {}): QrMatrix {
  const ecMap: Record<string, number> = { L: 0, M: 1, Q: 2, H: 3 };
  const ecLevel = ecMap[options.errorCorrection ?? 'M'] ?? 1;
  const bytes = new TextEncoder().encode(data);

  // Find minimum version
  let version = 1;
  for (; version <= 40; version++) {
    if ((DATA_CODEWORDS[version - 1]?.[ecLevel] ?? 0) >= bytes.length) break;
  }
  if (version > 40) throw new Error(`Data too long for QR code (${bytes.length} bytes)`);

  const size = version * 4 + 17;
  const matrix = makeMatrix(size);
  const isFunc = makeMatrix(size);

  drawFunctionPatterns(matrix, isFunc, version);
  const codewords = buildCodewords(bytes, version, ecLevel);
  placeDataBits(matrix, isFunc, codewords);

  // Try all 8 masks, pick best
  let bestMask = 0, bestPenalty = Infinity;
  for (let m = 0; m < 8; m++) {
    const candidate = applyMask(matrix, isFunc, m);
    drawFormatBits(candidate, isFunc, ecLevel, m);
    const p = penaltyScore(candidate);
    if (p < bestPenalty) { bestPenalty = p; bestMask = m; }
  }

  const result = applyMask(matrix, isFunc, bestMask);
  drawFormatBits(result, isFunc, ecLevel, bestMask);
  return result;
}

# Design: @nomideusz/svelte-qr + @nomideusz/svelte-media

**Date:** 2026-03-07
**Build order:** Step 10 (svelte-media) + Step 11 (svelte-qr)
**Status:** Approved — ready for implementation planning

---

## @nomideusz/svelte-qr

### Goals
- QR code generation with zero npm dependencies
- Works server-side (for email) and client-side (for display)
- SVG output — scalable, embeddable in HTML email, no external service

### Non-goals
- Fancy styled QR codes (logo overlays, rounded dots)
- External QR service URLs
- PNG/Buffer output (SVG covers all use cases)

### Package structure
```
packages/svelte-qr/
  src/lib/
    core/
      encoder.ts       — pure TS QR matrix algorithm (Nayuki port)
      svg.ts           — QrMatrix → SVG string renderer
      types.ts         — QrOptions, QrMatrix, ErrorCorrection
    components/
      QrCode.svelte    — Svelte 5 runes component, renders inline SVG
    index.ts           — public exports
  src/routes/          — SvelteKit demo app
  vitest.config.ts
  package.json
  tsconfig.json
```

### Public API
```ts
type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

interface QrOptions {
  errorCorrection?: ErrorCorrection;  // default: 'M'
  padding?: number;                   // quiet zone modules, default: 4
  foreground?: string;                // CSS color, default: '#000000'
  background?: string;                // CSS color, default: '#ffffff'
  size?: number;                      // SVG width/height px, default: 256
}

// Core functions
function generateQrSvg(data: string, options?: QrOptions): string;
function getQrMatrix(data: string, options?: QrOptions): boolean[][];

// Svelte component
// <QrCode data={string} options={QrOptions} />
```

### Algorithm
Port of Nayuki's QR code generator (reference: https://www.nayuki.io/page/qr-code-generator-library).
The algorithm is well-specified and ~500 lines of pure logic:
1. Data encoding (byte mode — UTF-8)
2. Error correction (Reed-Solomon)
3. Module placement (finder patterns, alignment, timing, format info)
4. Masking (all 8 masks evaluated, best selected by penalty score)

### thebest integration
- `/bookings/[ref]` confirmed page: `<QrCode data={verificationUrl} />` where `verificationUrl = https://thebest.travel/verify/${bookingReference}`
- Booking confirmation email (svelte-notify): SVG string base64-encoded, inlined as `<img src="data:image/svg+xml;base64,..." />` inside the template
- No DB changes needed — QR is generated on-the-fly from `bookingReference`

### Validation gate
```bash
pnpm check   # zero errors
pnpm test    # encoder unit tests: known QR matrices verified against reference
pnpm package # dist/index.js produced
```

---

## @nomideusz/svelte-media

### Goals
- Reusable image upload + storage package (not thebest-specific)
- Storage-backend agnostic via adapter interface
- Ships with S3-compatible adapter (AWS S3 / Cloudflare R2 / MinIO)
- Sharp image processing: validate, EXIF-rotate, resize to 4 sizes
- Two Svelte components: `<ImageUpload>` and `<ImageGallery>`
- `--asini-*` CSS tokens only — no Tailwind, no DaisyUI

### Non-goals
- Video or non-image file handling
- Client-side image processing
- Direct MinIO SDK (replaced by S3-compatible adapter)

### Package structure
```
packages/svelte-media/
  src/lib/
    core/
      adapter.ts       — StorageAdapter interface + createS3Adapter()
      process.ts       — sharp: validate, resize, EXIF rotate, generate sizes
      types.ts         — StoredMedia, MediaConfig, ImageSize, StorageAdapter, S3Config
    components/
      ImageUpload.svelte   — drag-drop upload, file validation, progress indicator
      ImageGallery.svelte  — thumbnail grid, click-to-expand lightbox
    index.ts
  src/routes/          — SvelteKit demo app
  package.json
  tsconfig.json
```

### Public API
```ts
// Storage adapter interface
interface StorageAdapter {
  put(key: string, buffer: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

// Built-in S3 adapter (works with R2, MinIO, AWS S3, Backblaze B2)
interface S3Config {
  endpoint: string;    // e.g. https://xxx.r2.cloudflarestorage.com
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;   // base URL for getUrl() — CDN or public bucket URL
}
function createS3Adapter(config: S3Config): StorageAdapter;

// Core processing (server-only — requires sharp)
interface StoredMedia {
  filename: string;
  originalName: string;
  prefix: string;      // e.g. 'tours', 'avatars'
  entityId: string;    // e.g. tourId, guideId
  sizes: {
    original: string;  // storage key
    thumbnail: string; // 300×300 cover
    medium: string;    // 800×600 inside
    large: string;     // 1200×900 inside
  };
}
function processAndStore(
  adapter: StorageAdapter,
  file: File,
  prefix: string,
  entityId: string
): Promise<StoredMedia>;

function deleteMedia(
  adapter: StorageAdapter,
  prefix: string,
  entityId: string,
  filename: string
): Promise<void>;

// URL helper — returns path consumed by the app's proxy route
function getMediaUrl(
  prefix: string,
  entityId: string,
  filename: string,
  size: 'original' | 'thumbnail' | 'medium' | 'large'
): string;  // e.g. /api/images/tours/abc123/thumbnail_img.jpg

// Svelte components
// <ImageUpload prefix entityId adapter maxFiles accept on:upload on:error />
// <ImageGallery images={StoredMedia[]} size="thumbnail"|"medium"|"large" />
```

### Image processing
- Max file size: 5 MB (configurable via `MediaConfig`)
- Allowed types: JPEG, PNG, WebP
- EXIF auto-rotate on all sizes
- Sizes:
  - `thumbnail`: 300×300 `cover` JPEG q80
  - `medium`: 800×600 `inside` (no upscale) JPEG q85
  - `large`: 1200×900 `inside` (no upscale) JPEG q90
  - `original`: EXIF-rotated JPEG q95
- Storage key pattern: `{prefix}/{entityId}/{sizePrefix}_{filename}`

### thebest integration

**Schema changes:**
- `guides` table: add `avatar text` column (nullable)
- New Drizzle migration

**New API route:**
- `/api/images/[...path]/+server.ts` — fetches from S3, streams to client with cache headers

**Guide avatar:**
- `/guide/settings` page gets `<ImageUpload>` for avatar
- On upload: `processAndStore(adapter, file, 'avatars', guideId)` → save filename to `guides.avatar`

**Tour photos:**
- `/guide/tours/[id]/edit` gets `<ImageUpload>` + `<ImageGallery>` for `tours.images[]`
- On upload: `processAndStore(adapter, file, 'tours', tourId)` → append filename to `tours.images`
- On delete: `deleteMedia(adapter, 'tours', tourId, filename)` → remove from array

**Environment variables added to `.env.example`:**
```
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_URL=
```

### Dependencies
- `sharp` — image processing (native, server-only)
- `@aws-sdk/client-s3` — S3-compatible storage adapter
- `@paralleldrive/cuid2` — unique filenames

### Validation gate
```bash
pnpm check   # zero errors in package + thebest + yoga
pnpm test    # process.ts unit tests: validation, filename generation, size config
pnpm package # dist/index.js produced
```

# svelte-media + svelte-qr Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `@nomideusz/svelte-media` (S3-adapter image upload/processing) and `@nomideusz/svelte-qr` (zero-dep QR SVG generation), then integrate both into `apps/thebest`.

**Architecture:** svelte-media wraps sharp + `@aws-sdk/client-s3` behind a `StorageAdapter` interface; svelte-qr implements the Nayuki QR matrix algorithm in pure TypeScript and renders to SVG. Both packages follow the same scaffold pattern as svelte-notify. thebest integration adds avatar upload, tour photo upload, and QR on the confirmed booking page + email.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript strict, Vitest, sharp, `@aws-sdk/client-s3`, `@paralleldrive/cuid2`, pnpm workspaces.

**Build order:** svelte-media first (Step 10), then svelte-qr (Step 11).

---

## PHASE 1 — @nomideusz/svelte-media

---

### Task 1: Scaffold package directory

**Files:**
- Create: `packages/svelte-media/package.json`
- Create: `packages/svelte-media/tsconfig.json`
- Create: `packages/svelte-media/svelte.config.js`
- Create: `packages/svelte-media/vite.config.ts`
- Create: `packages/svelte-media/vitest.config.ts`
- Create: `packages/svelte-media/src/lib/index.ts` (empty barrel)
- Create: `packages/svelte-media/src/routes/+page.svelte` (minimal demo)

**Step 1: Create package.json**

```json
{
  "name": "@nomideusz/svelte-media",
  "version": "0.1.0",
  "description": "Image upload, sharp optimization, and S3-compatible storage for Svelte 5 apps.",
  "type": "module",
  "license": "MIT",
  "svelte": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist", "!dist/**/*.test.*"],
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "package": "svelte-kit sync && svelte-package",
    "prepublishOnly": "npm run package",
    "prepare": "svelte-kit sync || echo ''",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "peerDependencies": {
    "svelte": "^5.0.0"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.0.0",
    "@paralleldrive/cuid2": "^2.2.2",
    "sharp": "^0.33.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^7.0.0",
    "@sveltejs/kit": "^2.50.2",
    "@sveltejs/package": "^2.5.7",
    "svelte": "^5.51.0",
    "svelte-check": "^4.3.6",
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "vitest": "^4.0.18"
  },
  "keywords": ["svelte", "image", "upload", "s3", "media", "sharp"]
}
```

**Step 2: Create tsconfig.json** — copy from `packages/svelte-notify/tsconfig.json`, change nothing (it's already strict + SvelteKit).

**Step 3: Create svelte.config.js**

```js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() },
};
```

**Step 4: Create vite.config.ts**

```ts
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({ plugins: [sveltekit()] });
```

**Step 5: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: { include: ['src/**/*.test.ts'] },
});
```

**Step 6: Create `src/lib/index.ts`** — leave empty for now.

**Step 7: Create `src/routes/+page.svelte`**

```svelte
<svelte:head><title>svelte-media demo</title></svelte:head>
<h1>svelte-media demo</h1>
```

**Step 8: Install dependencies**

```bash
pnpm install
```

**Step 9: Verify check passes**

```bash
pnpm --filter @nomideusz/svelte-media check
```

Expected: zero errors (empty package is valid).

**Step 10: Commit**

```bash
git add packages/svelte-media
git commit -m "feat(svelte-media): scaffold package"
```

---

### Task 2: Types

**Files:**
- Create: `packages/svelte-media/src/lib/core/types.ts`

**Step 1: Write types**

```ts
// packages/svelte-media/src/lib/core/types.ts

export type ImageSize = 'original' | 'thumbnail' | 'medium' | 'large';

export interface StorageAdapter {
  put(key: string, buffer: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

export interface S3Config {
  /** Full endpoint URL, e.g. https://xxx.r2.cloudflarestorage.com */
  endpoint: string;
  /** Region string, e.g. 'auto' for R2 or 'us-east-1' for AWS */
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Base public URL for getUrl(), e.g. https://pub-xxx.r2.dev */
  publicUrl: string;
}

export interface StoredMedia {
  filename: string;
  originalName: string;
  /** Storage prefix, e.g. 'tours' or 'avatars' */
  prefix: string;
  /** Entity that owns this media, e.g. tourId or guideId */
  entityId: string;
  /** Storage keys for each size */
  sizes: Record<ImageSize, string>;
}

export interface MediaValidationError {
  isValid: false;
  error: string;
}
export interface MediaValidationOk {
  isValid: true;
}
export type MediaValidation = MediaValidationOk | MediaValidationError;

export const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
export const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
```

**Step 2: Check**

```bash
pnpm --filter @nomideusz/svelte-media check
```

Expected: zero errors.

**Step 3: Commit**

```bash
git add packages/svelte-media/src/lib/core/types.ts
git commit -m "feat(svelte-media): add core types"
```

---

### Task 3: S3 adapter

**Files:**
- Create: `packages/svelte-media/src/lib/core/adapter.ts`

**Step 1: Write adapter**

```ts
// packages/svelte-media/src/lib/core/adapter.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import type { S3Config, StorageAdapter } from './types.js';

export function createS3Adapter(config: S3Config): StorageAdapter {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // Required for MinIO and path-style S3-compatible services
    forcePathStyle: true,
  });

  return {
    async put(key, buffer, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    },

    async delete(key) {
      await client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    },

    getUrl(key) {
      return `${config.publicUrl.replace(/\/$/, '')}/${key}`;
    },
  };
}
```

**Step 2: Check**

```bash
pnpm --filter @nomideusz/svelte-media check
```

Expected: zero errors.

**Step 3: Commit**

```bash
git add packages/svelte-media/src/lib/core/adapter.ts
git commit -m "feat(svelte-media): add S3 storage adapter"
```

---

### Task 4: Image processing core + tests

**Files:**
- Create: `packages/svelte-media/src/lib/core/process.ts`
- Create: `packages/svelte-media/src/lib/core/process.test.ts`

**Step 1: Write the failing tests first**

```ts
// packages/svelte-media/src/lib/core/process.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateMediaFile,
  generateMediaFilename,
  getStorageKey,
} from './process.js';

describe('validateMediaFile', () => {
  it('rejects files over 5MB', () => {
    const file = new File(['x'.repeat(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    const result = validateMediaFile(file);
    expect(result.isValid).toBe(false);
    if (!result.isValid) expect(result.error).toMatch(/5MB/);
  });

  it('rejects unsupported types', () => {
    const file = new File(['gif'], 'anim.gif', { type: 'image/gif' });
    const result = validateMediaFile(file);
    expect(result.isValid).toBe(false);
  });

  it('accepts valid JPEG', () => {
    const file = new File(['jpg'], 'photo.jpg', { type: 'image/jpeg' });
    expect(validateMediaFile(file).isValid).toBe(true);
  });

  it('accepts valid WebP', () => {
    const file = new File(['webp'], 'photo.webp', { type: 'image/webp' });
    expect(validateMediaFile(file).isValid).toBe(true);
  });
});

describe('generateMediaFilename', () => {
  it('preserves extension', () => {
    const name = generateMediaFilename('photo.PNG');
    expect(name.endsWith('.png')).toBe(true);
  });

  it('generates unique names', () => {
    const a = generateMediaFilename('a.jpg');
    const b = generateMediaFilename('b.jpg');
    expect(a).not.toBe(b);
  });
});

describe('getStorageKey', () => {
  it('returns correct key for original', () => {
    expect(getStorageKey('tours', 'tour1', 'abc.jpg', 'original')).toBe('tours/tour1/abc.jpg');
  });

  it('prefixes other sizes', () => {
    expect(getStorageKey('tours', 'tour1', 'abc.jpg', 'thumbnail')).toBe('tours/tour1/thumbnail_abc.jpg');
    expect(getStorageKey('avatars', 'u1', 'x.jpg', 'medium')).toBe('avatars/u1/medium_x.jpg');
    expect(getStorageKey('tours', 'tour1', 'abc.jpg', 'large')).toBe('tours/tour1/large_abc.jpg');
  });
});
```

**Step 2: Run tests — verify they fail**

```bash
pnpm --filter @nomideusz/svelte-media test
```

Expected: FAIL — `process.js` does not exist.

**Step 3: Write implementation**

```ts
// packages/svelte-media/src/lib/core/process.ts
import { createId } from '@paralleldrive/cuid2';
import type { ImageSize, MediaValidation, StorageAdapter, StoredMedia } from './types.js';
import { DEFAULT_ALLOWED_TYPES, DEFAULT_MAX_SIZE } from './types.js';

// Size definitions (width × height, fit strategy)
const SIZE_CONFIG: Record<Exclude<ImageSize, 'original'>, {
  width: number; height: number; fit: 'cover' | 'inside'; quality: number;
}> = {
  thumbnail: { width: 300, height: 300, fit: 'cover',  quality: 80 },
  medium:    { width: 800, height: 600, fit: 'inside', quality: 85 },
  large:     { width: 1200, height: 900, fit: 'inside', quality: 90 },
};

export function validateMediaFile(
  file: File,
  maxSize = DEFAULT_MAX_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
): MediaValidation {
  if (file.size > maxSize) {
    return { isValid: false, error: `File too large (max ${Math.round(maxSize / 1024 / 1024)}MB)` };
  }
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: `Invalid file type. Allowed: JPEG, PNG, WebP` };
  }
  return { isValid: true };
}

export function generateMediaFilename(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() ?? 'jpg';
  return `${createId()}.${ext}`;
}

export function getStorageKey(
  prefix: string,
  entityId: string,
  filename: string,
  size: ImageSize,
): string {
  if (size === 'original') return `${prefix}/${entityId}/${filename}`;
  return `${prefix}/${entityId}/${size}_${filename}`;
}

/**
 * Process a File with sharp: validate, EXIF-rotate, resize to 4 sizes, upload all.
 * This function is server-only (requires sharp + Node.js Buffer).
 */
export async function processAndStore(
  adapter: StorageAdapter,
  file: File,
  prefix: string,
  entityId: string,
): Promise<StoredMedia> {
  const validation = validateMediaFile(file);
  if (!validation.isValid) throw new Error(validation.error);

  // Dynamically import sharp so bundlers don't try to bundle it for the client
  const { default: sharp } = await import('sharp');

  const filename = generateMediaFilename(file.name);
  const arrayBuffer = await file.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  const sizes: Record<ImageSize, string> = {
    original: getStorageKey(prefix, entityId, filename, 'original'),
    thumbnail: getStorageKey(prefix, entityId, filename, 'thumbnail'),
    medium: getStorageKey(prefix, entityId, filename, 'medium'),
    large: getStorageKey(prefix, entityId, filename, 'large'),
  };

  // Upload original (EXIF-rotated, q95)
  const originalBuffer = await sharp(inputBuffer).rotate().jpeg({ quality: 95 }).toBuffer();
  await adapter.put(sizes.original, originalBuffer, 'image/jpeg');

  // Upload resized variants in parallel
  await Promise.all(
    (Object.entries(SIZE_CONFIG) as [Exclude<ImageSize, 'original'>, typeof SIZE_CONFIG[keyof typeof SIZE_CONFIG]][]).map(
      async ([sizeName, cfg]) => {
        const resized = await sharp(inputBuffer)
          .rotate()
          .resize(cfg.width, cfg.height, { fit: cfg.fit, withoutEnlargement: true })
          .jpeg({ quality: cfg.quality })
          .toBuffer();
        await adapter.put(sizes[sizeName], resized, 'image/jpeg');
      },
    ),
  );

  return {
    filename,
    originalName: file.name,
    prefix,
    entityId,
    sizes,
  };
}

/**
 * Delete all size variants for a stored media item.
 */
export async function deleteMedia(
  adapter: StorageAdapter,
  prefix: string,
  entityId: string,
  filename: string,
): Promise<void> {
  const keys: ImageSize[] = ['original', 'thumbnail', 'medium', 'large'];
  await Promise.all(
    keys.map((size) =>
      adapter.delete(getStorageKey(prefix, entityId, filename, size)).catch(() => {
        // Best-effort: log but don't throw if one size is already gone
      }),
    ),
  );
}

/**
 * Returns the app-local URL path served by the /api/images/[...path] proxy route.
 */
export function getMediaUrl(
  prefix: string,
  entityId: string,
  filename: string,
  size: ImageSize = 'medium',
): string {
  return `/api/images/${getStorageKey(prefix, entityId, filename, size)}`;
}
```

**Step 4: Run tests — verify they pass**

```bash
pnpm --filter @nomideusz/svelte-media test
```

Expected: all tests PASS.

**Step 5: Run check**

```bash
pnpm --filter @nomideusz/svelte-media check
```

Expected: zero errors.

**Step 6: Commit**

```bash
git add packages/svelte-media/src/lib/core/
git commit -m "feat(svelte-media): add image processing core + tests"
```

---

### Task 5: Svelte components

**Files:**
- Create: `packages/svelte-media/src/lib/components/ImageUpload.svelte`
- Create: `packages/svelte-media/src/lib/components/ImageGallery.svelte`

**Step 1: Write ImageUpload.svelte**

```svelte
<!-- packages/svelte-media/src/lib/components/ImageUpload.svelte -->
<script lang="ts">
  import type { ImageSize } from '../core/types.js';

  interface Props {
    accept?: string;
    maxFiles?: number;
    uploading?: boolean;
    onselect: (files: File[]) => void;
  }

  let { accept = 'image/jpeg,image/png,image/webp', maxFiles = 10, uploading = false, onselect }: Props = $props();

  let dragOver = $state(false);
  let inputEl: HTMLInputElement;

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onselect(Array.from(files).slice(0, maxFiles));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    handleFiles(e.dataTransfer?.files ?? null);
  }
</script>

<div
  class="upload-zone"
  class:drag-over={dragOver}
  class:uploading
  role="button"
  tabindex="0"
  aria-label="Upload images"
  ondragover={(e) => { e.preventDefault(); dragOver = true; }}
  ondragleave={() => { dragOver = false; }}
  ondrop={onDrop}
  onclick={() => inputEl.click()}
  onkeydown={(e) => e.key === 'Enter' && inputEl.click()}
>
  {#if uploading}
    <span class="hint">Uploading…</span>
  {:else}
    <span class="hint">Drop images here or <u>click to browse</u></span>
    <span class="sub">JPEG, PNG, WebP · max 5 MB each</span>
  {/if}
  <input
    bind:this={inputEl}
    type="file"
    {accept}
    multiple={maxFiles > 1}
    style="display:none"
    onchange={(e) => handleFiles((e.currentTarget as HTMLInputElement).files)}
  />
</div>

<style>
  .upload-zone {
    border: 2px dashed var(--asini-border);
    border-radius: var(--asini-radius);
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    background: var(--asini-surface);
    color: var(--asini-text-2);
  }
  .upload-zone:hover,
  .drag-over {
    border-color: var(--asini-accent);
    background: var(--asini-accent-muted);
  }
  .uploading {
    opacity: 0.6;
    cursor: wait;
    pointer-events: none;
  }
  .hint { display: block; font-size: 0.95rem; color: var(--asini-text); }
  .sub  { display: block; font-size: 0.8rem; margin-top: 0.25rem; }
</style>
```

**Step 2: Write ImageGallery.svelte**

```svelte
<!-- packages/svelte-media/src/lib/components/ImageGallery.svelte -->
<script lang="ts">
  import type { StoredMedia, ImageSize } from '../core/types.js';
  import { getMediaUrl } from '../core/process.js';

  interface Props {
    images: StoredMedia[];
    size?: ImageSize;
    onremove?: (filename: string) => void;
  }

  let { images, size = 'thumbnail', onremove }: Props = $props();
  let lightbox: string | null = $state(null);
</script>

{#if lightbox}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="lightbox-backdrop" onclick={() => lightbox = null}>
    <img src={lightbox} alt="Full size" class="lightbox-img" />
  </div>
{/if}

<div class="gallery">
  {#each images as media (media.filename)}
    <div class="thumb-wrap">
      <button
        class="thumb-btn"
        onclick={() => lightbox = getMediaUrl(media.prefix, media.entityId, media.filename, 'large')}
        title="View full size"
      >
        <img
          src={getMediaUrl(media.prefix, media.entityId, media.filename, size)}
          alt={media.originalName}
          class="thumb"
          loading="lazy"
        />
      </button>
      {#if onremove}
        <button
          class="remove-btn"
          onclick={() => onremove?.(media.filename)}
          aria-label="Remove image"
          title="Remove"
        >×</button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .thumb-wrap {
    position: relative;
    display: inline-block;
  }
  .thumb-btn {
    border: none;
    padding: 0;
    cursor: pointer;
    border-radius: var(--asini-radius-sm);
    overflow: hidden;
    display: block;
    background: var(--asini-surface-raised);
  }
  .thumb {
    width: 100px;
    height: 100px;
    object-fit: cover;
    display: block;
  }
  .remove-btn {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: none;
    background: var(--asini-danger);
    color: #fff;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .lightbox-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    cursor: zoom-out;
  }
  .lightbox-img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: var(--asini-radius);
  }
</style>
```

**Step 3: Check**

```bash
pnpm --filter @nomideusz/svelte-media check
```

Expected: zero errors.

**Step 4: Commit**

```bash
git add packages/svelte-media/src/lib/components/
git commit -m "feat(svelte-media): add ImageUpload and ImageGallery components"
```

---

### Task 6: Wire index exports + package

**Files:**
- Modify: `packages/svelte-media/src/lib/index.ts`

**Step 1: Write index**

```ts
// packages/svelte-media/src/lib/index.ts
export type { StorageAdapter, S3Config, StoredMedia, ImageSize, MediaValidation } from './core/types.js';
export { DEFAULT_MAX_SIZE, DEFAULT_ALLOWED_TYPES } from './core/types.js';
export { createS3Adapter } from './core/adapter.js';
export {
  validateMediaFile,
  generateMediaFilename,
  getStorageKey,
  processAndStore,
  deleteMedia,
  getMediaUrl,
} from './core/process.js';
export { default as ImageUpload } from './components/ImageUpload.svelte';
export { default as ImageGallery } from './components/ImageGallery.svelte';
```

**Step 2: Run package**

```bash
pnpm --filter @nomideusz/svelte-media package
```

Expected: `packages/svelte-media/dist/` created with `index.js` and `.d.ts` files.

**Step 3: Commit**

```bash
git add packages/svelte-media/src/lib/index.ts packages/svelte-media/dist
git commit -m "feat(svelte-media): wire exports, build dist"
```

---

### Task 7: thebest — media client + env vars

**Files:**
- Modify: `apps/thebest/.env.example`
- Create: `apps/thebest/src/lib/server/media.ts`

**Step 1: Add env vars to .env.example**

Append to the bottom of `apps/thebest/.env.example`:

```
# S3-compatible image storage (Cloudflare R2 / MinIO / AWS S3)
# Cloudflare R2: endpoint = https://<account_id>.r2.cloudflarestorage.com
# MinIO: endpoint = http://localhost:9000
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=thebest-media
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
# Public base URL for serving images (CDN URL or public bucket URL)
S3_PUBLIC_URL=
```

**Step 2: Create media singleton**

```ts
// apps/thebest/src/lib/server/media.ts
import { createS3Adapter } from '@nomideusz/svelte-media';
import type { StorageAdapter } from '@nomideusz/svelte-media';
import { env } from '$env/dynamic/private';

let _adapter: StorageAdapter | null = null;

export function getMediaAdapter(): StorageAdapter {
  if (!_adapter) {
    const required = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_URL'];
    for (const key of required) {
      if (!env[key]) throw new Error(`${key} env var not set`);
    }
    _adapter = createS3Adapter({
      endpoint: env.S3_ENDPOINT!,
      region: env.S3_REGION ?? 'auto',
      bucket: env.S3_BUCKET!,
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      publicUrl: env.S3_PUBLIC_URL!,
    });
  }
  return _adapter;
}
```

**Step 3: Add `@nomideusz/svelte-media` to thebest package.json**

In `apps/thebest/package.json`, add to `dependencies`:

```json
"@nomideusz/svelte-media": "workspace:*"
```

**Step 4: Install**

```bash
pnpm install
```

**Step 5: Check**

```bash
pnpm --filter thebest check
```

Expected: zero errors.

**Step 6: Commit**

```bash
git add apps/thebest/.env.example apps/thebest/src/lib/server/media.ts apps/thebest/package.json pnpm-lock.yaml
git commit -m "feat(thebest): add S3 media adapter singleton + env vars"
```

---

### Task 8: thebest — avatar column migration

**Files:**
- Modify: `apps/thebest/src/lib/server/db/schema.ts`
- Run: Drizzle generate + migrate

**Step 1: Add avatar column to guides table**

In `apps/thebest/src/lib/server/db/schema.ts`, in the `guides` table definition, add after `stripeOnboardingComplete`:

```ts
/** Avatar image filename — use getMediaUrl('avatars', id, avatar, size) */
avatar: text('avatar'),
```

**Step 2: Generate migration**

```bash
pnpm --filter thebest db:generate
```

Expected: new file created in `apps/thebest/drizzle/` with SQL like `ALTER TABLE guides ADD COLUMN avatar text;`

**Step 3: Apply migration**

```bash
pnpm --filter thebest db:migrate
```

Expected: migration applied successfully.

**Step 4: Check**

```bash
pnpm --filter thebest check
```

Expected: zero errors. `Guide` type now includes `avatar: string | null`.

**Step 5: Commit**

```bash
git add apps/thebest/src/lib/server/db/schema.ts apps/thebest/drizzle/
git commit -m "feat(thebest): add avatar column to guides table"
```

---

### Task 9: thebest — image proxy route

**Files:**
- Create: `apps/thebest/src/routes/api/images/[...path]/+server.ts`

**Step 1: Write proxy route**

This route fetches the image from S3 and streams it to the client with caching headers.

```ts
// apps/thebest/src/routes/api/images/[...path]/+server.ts
import type { RequestHandler } from './$types.js';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
  const key = params.path;
  if (!key) error(400, 'Missing path');

  const client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION ?? 'auto',
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });

  let response;
  try {
    response = await client.send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    );
  } catch {
    error(404, 'Image not found');
  }

  if (!response.Body) error(404, 'Image not found');

  const bytes = await response.Body.transformToByteArray();
  const contentType = response.ContentType ?? 'image/jpeg';

  return new Response(bytes, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
```

**Step 2: Check**

```bash
pnpm --filter thebest check
```

Expected: zero errors.

**Step 3: Commit**

```bash
git add apps/thebest/src/routes/api/images/
git commit -m "feat(thebest): add image proxy route /api/images/[...path]"
```

---

### Task 10: thebest — guide avatar upload in /guide/settings

**Files:**
- Modify: `apps/thebest/src/routes/guide/settings/+page.server.ts`
- Modify: `apps/thebest/src/routes/guide/settings/+page.svelte`

**Step 1: Add upload action to page.server.ts**

Add a `uploadAvatar` action. Read the file upload from `request.formData()`, call `processAndStore`, save the filename to DB.

```ts
// Full replacement of apps/thebest/src/routes/guide/settings/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { processAndStore, deleteMedia, getMediaUrl } from '@nomideusz/svelte-media';
import { getMediaAdapter } from '$lib/server/media.js';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, '/auth/login');
  const db = getDb();
  const guide = await db.query.guides.findFirst({ where: eq(guides.id, locals.user.id) });
  return {
    stripeConnected: guide?.stripeOnboardingComplete ?? false,
    stripeAccountId: guide?.stripeAccountId ?? null,
    avatarUrl: guide?.avatar
      ? getMediaUrl('avatars', locals.user.id, guide.avatar, 'medium')
      : null,
  };
};

export const actions: Actions = {
  uploadAvatar: async ({ request, locals }) => {
    if (!locals.user) redirect(302, '/auth/login');

    const formData = await request.formData();
    const file = formData.get('avatar');
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { error: 'No file provided' });
    }

    const db = getDb();
    const adapter = getMediaAdapter();

    // Delete old avatar if exists
    const [guide] = await db.select().from(guides).where(eq(guides.id, locals.user.id));
    if (guide?.avatar) {
      await deleteMedia(adapter, 'avatars', locals.user.id, guide.avatar).catch(() => {});
    }

    try {
      const stored = await processAndStore(adapter, file, 'avatars', locals.user.id);
      await db.update(guides).set({ avatar: stored.filename }).where(eq(guides.id, locals.user.id));
      return { success: true };
    } catch (e) {
      return fail(422, { error: String(e) });
    }
  },
};
```

**Step 2: Add avatar upload UI to +page.svelte**

Read the existing file first, then add the avatar section at the top of the page body. The form uses `method="POST" action="?/uploadAvatar" enctype="multipart/form-data"`.

```svelte
<!-- Add this section inside the existing page, above the Stripe section -->
<section>
  <h2>Profile photo</h2>
  {#if data.avatarUrl}
    <img src={data.avatarUrl} alt="Your avatar" style="width:80px;height:80px;border-radius:50%;object-fit:cover;" />
  {/if}
  <form method="POST" action="?/uploadAvatar" enctype="multipart/form-data">
    <label>
      Choose photo
      <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" required />
    </label>
    <button type="submit">Upload</button>
  </form>
</section>
```

**Step 3: Check**

```bash
pnpm --filter thebest check
```

Expected: zero errors.

**Step 4: Commit**

```bash
git add apps/thebest/src/routes/guide/settings/
git commit -m "feat(thebest): guide avatar upload in /guide/settings"
```

---

### Task 11: thebest — tour photo upload in /guide/tours/[tourId]

**Files:**
- Modify: `apps/thebest/src/routes/guide/tours/[tourId]/+page.server.ts`
- Modify: `apps/thebest/src/routes/guide/tours/[tourId]/+page.svelte`

**Step 1: Read the existing tour page server file first**

Use the Read tool on `apps/thebest/src/routes/guide/tours/[tourId]/+page.server.ts` before editing.

**Step 2: Add uploadPhoto and removePhoto actions**

```ts
// Add to existing actions in +page.server.ts
uploadPhoto: async ({ request, locals, params }) => {
  if (!locals.user) redirect(302, '/auth/login');
  const formData = await request.formData();
  const file = formData.get('photo');
  if (!(file instanceof File) || file.size === 0) return fail(400, { error: 'No file' });

  const db = getDb();
  const adapter = getMediaAdapter();

  // Verify guide owns this tour
  const [tour] = await db.select().from(tours).where(
    and(eq(tours.id, params.tourId), eq(tours.guideId, locals.user.id))
  );
  if (!tour) error(403, 'Forbidden');

  const stored = await processAndStore(adapter, file, 'tours', params.tourId);
  const newImages = [...(tour.images ?? []), stored.filename];
  await db.update(tours).set({ images: newImages }).where(eq(tours.id, params.tourId));
  return { success: true };
},

removePhoto: async ({ request, locals, params }) => {
  if (!locals.user) redirect(302, '/auth/login');
  const formData = await request.formData();
  const filename = formData.get('filename') as string;
  if (!filename) return fail(400, { error: 'Missing filename' });

  const db = getDb();
  const adapter = getMediaAdapter();

  const [tour] = await db.select().from(tours).where(
    and(eq(tours.id, params.tourId), eq(tours.guideId, locals.user.id))
  );
  if (!tour) error(403, 'Forbidden');

  await deleteMedia(adapter, 'tours', params.tourId, filename).catch(() => {});
  const newImages = (tour.images ?? []).filter((f) => f !== filename);
  await db.update(tours).set({ images: newImages }).where(eq(tours.id, params.tourId));
  return { success: true };
},
```

**Step 3: Add photo upload UI to tour edit page**

Add an `<ImageGallery>` showing existing photos and an upload form for new ones. The gallery `onremove` submits the `removePhoto` action via a hidden form.

**Step 4: Check**

```bash
pnpm --filter thebest check
```

Expected: zero errors.

**Step 5: Commit**

```bash
git add apps/thebest/src/routes/guide/tours/
git commit -m "feat(thebest): tour photo upload and gallery in guide/tours/[tourId]"
```

---

## PHASE 2 — @nomideusz/svelte-qr

---

### Task 12: Scaffold package directory

**Files:**
- Create: `packages/svelte-qr/package.json`
- Create: `packages/svelte-qr/tsconfig.json`
- Create: `packages/svelte-qr/svelte.config.js`
- Create: `packages/svelte-qr/vite.config.ts`
- Create: `packages/svelte-qr/vitest.config.ts`
- Create: `packages/svelte-qr/src/lib/index.ts`
- Create: `packages/svelte-qr/src/routes/+page.svelte`

**Step 1: Create package.json** — zero production dependencies.

```json
{
  "name": "@nomideusz/svelte-qr",
  "version": "0.1.0",
  "description": "Zero-dependency QR code SVG generation for Svelte 5 apps.",
  "type": "module",
  "license": "MIT",
  "svelte": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist", "!dist/**/*.test.*"],
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "package": "svelte-kit sync && svelte-package",
    "prepublishOnly": "npm run package",
    "prepare": "svelte-kit sync || echo ''",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "peerDependencies": {
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^7.0.0",
    "@sveltejs/kit": "^2.50.2",
    "@sveltejs/package": "^2.5.7",
    "svelte": "^5.51.0",
    "svelte-check": "^4.3.6",
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "vitest": "^4.0.18"
  },
  "keywords": ["svelte", "qr", "qr-code", "svg"]
}
```

**Step 2-7:** Same as Task 1 steps 2-10 (tsconfig, svelte.config.js, vite.config.ts, vitest.config.ts, empty index.ts, demo page, `pnpm install`, `pnpm check`).

**Step 8: Commit**

```bash
git add packages/svelte-qr
git commit -m "feat(svelte-qr): scaffold package"
```

---

### Task 13: QR types

**Files:**
- Create: `packages/svelte-qr/src/lib/core/types.ts`

**Step 1: Write types**

```ts
// packages/svelte-qr/src/lib/core/types.ts

export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

/** A 2D boolean matrix where true = dark module. */
export type QrMatrix = readonly (readonly boolean[])[];

export interface QrOptions {
  /** Error correction level. Default: 'M' (~15% damage tolerance). */
  errorCorrection?: ErrorCorrection;
  /** Quiet zone size in modules. Default: 4. */
  padding?: number;
  /** SVG foreground color. Default: '#000000'. */
  foreground?: string;
  /** SVG background color. Default: '#ffffff'. */
  background?: string;
  /** SVG width and height in px. Default: 256. */
  size?: number;
}
```

**Step 2: Commit**

```bash
git add packages/svelte-qr/src/lib/core/types.ts
git commit -m "feat(svelte-qr): add types"
```

---

### Task 14: QR encoder — pure TypeScript implementation

**Files:**
- Create: `packages/svelte-qr/src/lib/core/encoder.ts`

**Step 1: Overview**

This is a port of Nayuki's QR Code Generator (MIT license).
Reference: https://github.com/nayuki/QR-Code-generator/blob/master/typescript-javascript/qrcodegen.ts

The encoder takes a UTF-8 string and returns a `QrMatrix` (2D boolean array). It supports QR versions 1–40. Implement byte-mode encoding only (covers all UTF-8 strings).

The file has five logical sections — implement them top to bottom:

**Section A — Constants**

```ts
// Error correction codewords per block (version 1..10, ECC levels L/M/Q/H)
// Full table from the QR spec — paste the complete ECC_CODEWORDS_PER_BLOCK
// and NUM_ERROR_CORRECTION_BLOCKS tables from Nayuki's source.
```

**Section B — Reed-Solomon**

```ts
// reedSolomonComputeDivisor(degree: number): Uint8Array
// reedSolomonComputeRemainder(data, divisor): Uint8Array
// reedSolomonMultiply(x, y): number
```

**Section C — QR data encoding**

```ts
// getNumDataCodewords(version, ecl): number
// encodeData(text, ecl): { version, dataCodewords }
```

**Section D — Module placement**

```ts
// makeMatrix(version): boolean[][]  — allocate version × version grid
// drawFinderPattern, drawAlignmentPattern, drawTimingPatterns,
// drawFormatBits, drawCodewords
```

**Section E — Masking + penalty**

```ts
// applyMask(mask, modules, isFunction): boolean[][]
// getPenaltyScore(modules): number
// encode(text, options): QrMatrix  — try all 8 masks, pick best
```

**Implementation approach:** Paste the Nayuki TypeScript source (MIT-licensed) and adapt it:
1. Remove the class-based API — export plain functions.
2. Replace `Readonly<Array<...>>` with the `QrMatrix` type alias.
3. Remove the `QrSegment` class — add a `encodeText(text)` function that always uses byte mode.
4. Add `import type { ErrorCorrection, QrMatrix } from './types.js'` at top.

The final public export from this file is:

```ts
export function getQrMatrix(data: string, options?: QrOptions): QrMatrix
```

**Step 2: Commit after encoder is complete**

```bash
git add packages/svelte-qr/src/lib/core/encoder.ts
git commit -m "feat(svelte-qr): implement QR matrix encoder (Nayuki port)"
```

---

### Task 15: QR encoder tests

**Files:**
- Create: `packages/svelte-qr/src/lib/core/encoder.test.ts`

**Step 1: Write tests**

```ts
import { describe, it, expect } from 'vitest';
import { getQrMatrix } from './encoder.js';

describe('getQrMatrix', () => {
  it('returns a square matrix', () => {
    const m = getQrMatrix('hello');
    expect(m.length).toBe(m[0].length);
  });

  it('version 1 is 21×21', () => {
    // "0" encodes as version 1 at ECC M
    const m = getQrMatrix('0');
    expect(m.length).toBe(21);
  });

  it('finder pattern top-left is correct', () => {
    const m = getQrMatrix('A');
    // Top-left 7×7 finder — corners must be dark
    expect(m[0][0]).toBe(true);
    expect(m[0][6]).toBe(true);
    expect(m[6][0]).toBe(true);
    expect(m[6][6]).toBe(true);
    // Center module is dark
    expect(m[3][3]).toBe(true);
    // Inner white border (row 1, col 1)
    expect(m[1][1]).toBe(false);
  });

  it('handles longer strings without throwing', () => {
    expect(() => getQrMatrix('https://thebest.travel/verify/BK-ABCD1234')).not.toThrow();
  });

  it('respects error correction level', () => {
    const mL = getQrMatrix('hello world', { errorCorrection: 'L' });
    const mH = getQrMatrix('hello world', { errorCorrection: 'H' });
    // H needs more ECC codewords so version (and thus size) may be larger or equal
    expect(mH.length).toBeGreaterThanOrEqual(mL.length);
  });
});
```

**Step 2: Run tests**

```bash
pnpm --filter @nomideusz/svelte-qr test
```

Expected: all tests PASS.

**Step 3: Commit**

```bash
git add packages/svelte-qr/src/lib/core/encoder.test.ts
git commit -m "test(svelte-qr): add encoder unit tests"
```

---

### Task 16: SVG renderer

**Files:**
- Create: `packages/svelte-qr/src/lib/core/svg.ts`

**Step 1: Write SVG renderer**

```ts
// packages/svelte-qr/src/lib/core/svg.ts
import type { QrMatrix, QrOptions } from './types.js';

const DEFAULTS: Required<QrOptions> = {
  errorCorrection: 'M',
  padding: 4,
  foreground: '#000000',
  background: '#ffffff',
  size: 256,
};

/**
 * Render a QrMatrix to an inline SVG string.
 * The SVG uses a <rect> per dark module (simple, fast, no external deps).
 */
export function matrixToSvg(matrix: QrMatrix, options: QrOptions = {}): string {
  const { padding, foreground, background, size } = { ...DEFAULTS, ...options };
  const cells = matrix.length;
  const totalModules = cells + padding * 2;

  // Each module is 1 unit; viewBox covers totalModules × totalModules
  const rects: string[] = [];
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      if (matrix[row][col]) {
        rects.push(`<rect x="${col + padding}" y="${row + padding}" width="1" height="1"/>`);
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `  width="${size}" height="${size}"`,
    `  viewBox="0 0 ${totalModules} ${totalModules}"`,
    `  shape-rendering="crispEdges">`,
    `  <rect width="100%" height="100%" fill="${background}"/>`,
    `  <g fill="${foreground}">`,
    ...rects.map((r) => `    ${r}`),
    `  </g>`,
    `</svg>`,
  ].join('\n');
}
```

**Step 2: Check**

```bash
pnpm --filter @nomideusz/svelte-qr check
```

Expected: zero errors.

**Step 3: Commit**

```bash
git add packages/svelte-qr/src/lib/core/svg.ts
git commit -m "feat(svelte-qr): add SVG renderer"
```

---

### Task 17: Public API + QrCode component + wire exports

**Files:**
- Create: `packages/svelte-qr/src/lib/core/index.ts`
- Create: `packages/svelte-qr/src/lib/components/QrCode.svelte`
- Modify: `packages/svelte-qr/src/lib/index.ts`

**Step 1: Create core/index.ts (combines encoder + renderer)**

```ts
// packages/svelte-qr/src/lib/core/index.ts
export type { QrMatrix, QrOptions, ErrorCorrection } from './types.js';
export { getQrMatrix } from './encoder.js';
export { matrixToSvg } from './svg.js';

import { getQrMatrix } from './encoder.js';
import { matrixToSvg } from './svg.js';
import type { QrOptions } from './types.js';

/** Convenience: encode data and render to SVG in one call. */
export function generateQrSvg(data: string, options?: QrOptions): string {
  return matrixToSvg(getQrMatrix(data, options), options);
}
```

**Step 2: Create QrCode.svelte**

```svelte
<!-- packages/svelte-qr/src/lib/components/QrCode.svelte -->
<script lang="ts">
  import { generateQrSvg } from '../core/index.js';
  import type { QrOptions } from '../core/types.js';

  interface Props {
    data: string;
    options?: QrOptions;
    /** Accessible label for the QR code image. */
    label?: string;
  }

  let { data, options, label = 'QR code' }: Props = $props();

  let svg = $derived(generateQrSvg(data, options));
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
<span role="img" aria-label={label} style="display:inline-block;line-height:0">{@html svg}</span>
```

**Step 3: Wire index.ts**

```ts
// packages/svelte-qr/src/lib/index.ts
export type { QrMatrix, QrOptions, ErrorCorrection } from './core/types.js';
export { getQrMatrix, matrixToSvg, generateQrSvg } from './core/index.js';
export { default as QrCode } from './components/QrCode.svelte';
```

**Step 4: Run package**

```bash
pnpm --filter @nomideusz/svelte-qr package
```

Expected: `dist/` produced with no errors.

**Step 5: Run all tests**

```bash
pnpm --filter @nomideusz/svelte-qr test
```

Expected: all tests PASS.

**Step 6: Commit**

```bash
git add packages/svelte-qr/src/lib/
git commit -m "feat(svelte-qr): add generateQrSvg, QrCode component, wire exports"
```

---

### Task 18: thebest — integrate QrCode on confirmed booking page

**Files:**
- Identify: find the confirmed booking page (`/bookings/[ref]` or similar)
- Modify: that page's `.svelte` file
- Modify: its `+page.server.ts` to expose `bookingReference`

**Step 1: Find confirmed page**

```bash
find apps/thebest/src/routes/bookings -name "*.svelte" | head -10
```

**Step 2: Add `@nomideusz/svelte-qr` to thebest dependencies**

In `apps/thebest/package.json`, add to `dependencies`:

```json
"@nomideusz/svelte-qr": "workspace:*"
```

Run `pnpm install`.

**Step 3: Add QrCode to the confirmed page**

In the `.svelte` file, import and render the QR:

```svelte
<script lang="ts">
  import { QrCode } from '@nomideusz/svelte-qr';
  // ... existing imports

  // Booking verification URL — guests can scan to verify their ticket
  const verifyUrl = `${window?.location?.origin ?? 'https://thebest.travel'}/verify/${data.booking.bookingReference}`;
</script>

<!-- Add this block in the confirmed booking section -->
<div class="qr-ticket">
  <p>Your ticket QR code</p>
  <QrCode data={verifyUrl} options={{ size: 200 }} label="Booking ticket QR code" />
  <p style="font-family: monospace; font-size: 0.85rem">{data.booking.bookingReference}</p>
</div>
```

**Step 4: Check**

```bash
pnpm --filter thebest check
```

Expected: zero errors.

**Step 5: Commit**

```bash
git add apps/thebest/src/routes/bookings/ apps/thebest/package.json pnpm-lock.yaml
git commit -m "feat(thebest): show QR code on confirmed booking page"
```

---

### Task 19: thebest — add QR to booking confirmation email

**Files:**
- Modify: `packages/svelte-notify/src/lib/templates/booking-confirmation.ts`
- Modify: `packages/svelte-notify/src/lib/types.ts` (add optional qrSvg field)

**Step 1: Add optional `qrSvg` to `BookingNotificationData`**

Read `packages/svelte-notify/src/lib/types.ts` first. Add:

```ts
/** Pre-rendered SVG string for the booking QR ticket. Optional. */
qrSvg?: string;
```

**Step 2: Update booking-confirmation template to embed QR**

In the HTML, after the booking reference line, add:

```ts
${data.qrSvg ? `
  <div style="text-align:center;margin:24px 0">
    <p style="margin-bottom:8px;font-size:13px;color:#666">Scan to verify your ticket</p>
    <img
      src="data:image/svg+xml;base64,${Buffer.from(data.qrSvg).toString('base64')}"
      width="160" height="160"
      alt="Booking QR code"
      style="display:inline-block"
    />
  </div>` : ''}
```

**Step 3: Update webhook handler to generate QR before sending email**

In `apps/thebest/src/routes/api/webhooks/stripe/+server.ts`, before calling `sendBookingConfirmation`:

```ts
import { generateQrSvg } from '@nomideusz/svelte-qr';

// Generate QR SVG for email ticket
const verifyUrl = `${env.ORIGIN}/verify/${booking.bookingReference}`;
const qrSvg = generateQrSvg(verifyUrl, { size: 200, errorCorrection: 'M' });

const emailData = {
  // ... existing fields
  qrSvg,
};
```

**Step 4: Check all packages**

```bash
pnpm check
```

Expected: zero errors across all packages.

**Step 5: Commit**

```bash
git add packages/svelte-notify/src/lib/ apps/thebest/src/routes/api/webhooks/
git commit -m "feat: embed QR ticket SVG in booking confirmation email"
```

---

### Task 20: Final validation

**Step 1: Run all tests**

```bash
pnpm test
```

Expected: all tests pass.

**Step 2: Run check**

```bash
pnpm check
```

Expected: zero errors.

**Step 3: Package both new packages**

```bash
pnpm --filter @nomideusz/svelte-media package
pnpm --filter @nomideusz/svelte-qr package
```

Expected: `dist/` produced for both.

**Step 4: Update AGENTS.md build order** — mark Steps 10 and 11 as ✅ DONE.

**Step 5: Final commit**

```bash
git add .
git commit -m "docs: mark Steps 10 and 11 complete in build order"
```

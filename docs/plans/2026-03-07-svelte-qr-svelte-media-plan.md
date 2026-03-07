# svelte-media + svelte-qr Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `@nomideusz/svelte-media` (image upload/storage) and `@nomideusz/svelte-qr` (QR code generation) as publishable packages, fully integrated into `apps/thebest`.

**Architecture:** svelte-media uses a `StorageAdapter` interface with a built-in `createS3Adapter()` (works with R2/S3/MinIO), plus `sharp` for server-side processing and two Svelte 5 UI components. svelte-qr is a zero-dependency pure TypeScript QR encoder (Nayuki algorithm port) outputting SVG, with a `<QrCode>` Svelte component.

**Tech Stack:** Svelte 5 runes, TypeScript strict, SvelteKit packages, `sharp`, `@aws-sdk/client-s3`, `@paralleldrive/cuid2`, `vitest`, `pnpm` workspaces.

**Order:** svelte-media first (Step 10), then svelte-qr (Step 11) — matches AGENTS.md build order.

**Validation gates:**
- Each package: `pnpm check` zero errors, `pnpm test` all pass, `pnpm package` produces `dist/`
- After thebest integration: `pnpm --filter thebest check` + `pnpm --filter thebest build` pass

---

## PHASE 1: @nomideusz/svelte-media

---

### Task 1: Scaffold the package

**Files:**
- Create: `packages/svelte-media/package.json`
- Create: `packages/svelte-media/tsconfig.json`
- Create: `packages/svelte-media/vite.config.ts`
- Create: `packages/svelte-media/svelte.config.js`
- Create: `packages/svelte-media/src/routes/+page.svelte` (demo placeholder)
- Create: `packages/svelte-media/src/app.html`

**Step 1: Create `packages/svelte-media/package.json`**

```json
{
  "name": "@nomideusz/svelte-media",
  "version": "0.1.0",
  "description": "Image upload, processing, and S3-compatible storage for Svelte 5 apps.",
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
  "files": [
    "dist",
    "!dist/**/*.test.*",
    "!dist/**/*.spec.*"
  ],
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "package": "svelte-kit sync && svelte-package",
    "prepublishOnly": "npm run package",
    "preview": "vite preview",
    "prepare": "svelte-kit sync || echo ''",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest"
  },
  "peerDependencies": {
    "svelte": "^5.0.0"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.0.0",
    "@paralleldrive/cuid2": "^2.2.2",
    "sharp": "^0.34.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^7.0.0",
    "@sveltejs/kit": "^2.50.2",
    "@sveltejs/package": "^2.5.7",
    "@sveltejs/vite-plugin-svelte": "^6.2.4",
    "@types/node": "^25.0.0",
    "svelte": "^5.51.0",
    "svelte-check": "^4.3.6",
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "vitest": "^4.0.18"
  },
  "keywords": ["svelte", "image", "upload", "s3", "media", "sharp"]
}
```

**Step 2: Create `packages/svelte-media/svelte.config.js`**

Copy verbatim from `packages/svelte-notify/svelte.config.js`.

Run: `cp packages/svelte-notify/svelte.config.js packages/svelte-media/svelte.config.js`

**Step 3: Create `packages/svelte-media/vite.config.ts`**

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
  },
});
```

**Step 4: Create `packages/svelte-media/src/app.html`**

Copy from `packages/svelte-notify/src/app.html`.

Run: `cp packages/svelte-notify/src/app.html packages/svelte-media/src/app.html`

**Step 5: Create `packages/svelte-media/src/routes/+page.svelte`**

```svelte
<h1>@nomideusz/svelte-media demo</h1>
```

**Step 6: Install dependencies**

```bash
pnpm install
```

**Step 7: Run initial check (expect svelte-kit sync to generate tsconfig)**

```bash
pnpm --filter @nomideusz/svelte-media check
```

Expected: zero errors (empty package).

**Step 8: Commit**

```bash
git add packages/svelte-media
git commit -m "feat(svelte-media): scaffold package"
```

---

### Task 2: Types

**Files:**
- Create: `packages/svelte-media/src/lib/core/types.ts`

**Step 1: Create types**

```ts
// packages/svelte-media/src/lib/core/types.ts

export type ImageSize = 'original' | 'thumbnail' | 'medium' | 'large';

export interface StorageAdapter {
  put(key: string, buffer: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

export interface S3Config {
  /** e.g. https://xxx.r2.cloudflarestorage.com or http://localhost:9000 */
  endpoint: string;
  /** e.g. 'auto' for R2, 'us-east-1' for AWS */
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Base public URL for getUrl() — CDN or public bucket URL */
  publicUrl: string;
}

export interface StoredMedia {
  filename: string;
  originalName: string;
  /** Storage namespace prefix, e.g. 'tours' | 'avatars' */
  prefix: string;
  /** Entity this image belongs to, e.g. tourId | guideId */
  entityId: string;
  sizes: Record<ImageSize, string>; // storage keys
}

export interface MediaConfig {
  /** Max upload size in bytes. Default: 5 * 1024 * 1024 (5 MB) */
  maxFileSize?: number;
  /** Allowed MIME types. Default: ['image/jpeg', 'image/png', 'image/webp'] */
  allowedTypes?: string[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}
```

**Step 2: Commit**

```bash
git add packages/svelte-media/src/lib/core/types.ts
git commit -m "feat(svelte-media): add core types"
```

---

### Task 3: S3 adapter

**Files:**
- Create: `packages/svelte-media/src/lib/core/adapter.ts`

**Step 1: Create the adapter**

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
    // Required for path-style access (MinIO, some R2 setups)
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
        })
      );
    },

    async delete(key) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: key,
        })
      );
    },

    getUrl(key) {
      return `${config.publicUrl.replace(/\/$/, '')}/${key}`;
    },
  };
}
```

**Step 2: Run check**

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

### Task 4: Image processing core (TDD)

**Files:**
- Create: `packages/svelte-media/src/lib/core/process.ts`
- Create: `packages/svelte-media/src/lib/core/process.test.ts`

**Step 1: Write failing tests first**

```ts
// packages/svelte-media/src/lib/core/process.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateImageFile,
  generateMediaKey,
  getStorageKey,
  IMAGE_SIZES,
} from './process.js';

describe('validateImageFile', () => {
  it('rejects files over 5MB', () => {
    const file = new File(['x'.repeat(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too large/i);
  });

  it('rejects disallowed MIME types', () => {
    const file = new File(['x'], 'bad.gif', { type: 'image/gif' });
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/type/i);
  });

  it('accepts valid JPEG', () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
  });

  it('accepts valid PNG', () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    expect(validateImageFile(file).valid).toBe(true);
  });

  it('accepts valid WebP', () => {
    const file = new File(['x'], 'photo.webp', { type: 'image/webp' });
    expect(validateImageFile(file).valid).toBe(true);
  });

  it('respects custom maxFileSize', () => {
    const file = new File(['x'.repeat(1024 * 1024 + 1)], 'photo.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(file, { maxFileSize: 1024 * 1024 });
    expect(result.valid).toBe(false);
  });
});

describe('generateMediaKey', () => {
  it('produces a key with jpg extension for jpeg input', () => {
    const key = generateMediaKey('photo.jpg');
    expect(key).toMatch(/\.jpg$/);
  });

  it('produces a key with png extension for png input', () => {
    const key = generateMediaKey('photo.png');
    expect(key).toMatch(/\.png$/);
  });

  it('produces unique keys for same filename', () => {
    const a = generateMediaKey('photo.jpg');
    const b = generateMediaKey('photo.jpg');
    expect(a).not.toBe(b);
  });
});

describe('getStorageKey', () => {
  it('returns correct original key', () => {
    const key = getStorageKey('tours', 'tour-123', 'abc.jpg', 'original');
    expect(key).toBe('tours/tour-123/abc.jpg');
  });

  it('returns correct thumbnail key', () => {
    const key = getStorageKey('tours', 'tour-123', 'abc.jpg', 'thumbnail');
    expect(key).toBe('tours/tour-123/thumb_abc.jpg');
  });

  it('returns correct medium key', () => {
    const key = getStorageKey('avatars', 'user-1', 'x.jpg', 'medium');
    expect(key).toBe('avatars/user-1/med_x.jpg');
  });

  it('returns correct large key', () => {
    const key = getStorageKey('tours', 'id', 'x.jpg', 'large');
    expect(key).toBe('tours/id/large_x.jpg');
  });
});

describe('IMAGE_SIZES', () => {
  it('defines thumbnail as 300x300 cover', () => {
    expect(IMAGE_SIZES.thumbnail).toEqual({ width: 300, height: 300, fit: 'cover' });
  });
  it('defines medium as 800x600 inside', () => {
    expect(IMAGE_SIZES.medium).toEqual({ width: 800, height: 600, fit: 'inside' });
  });
  it('defines large as 1200x900 inside', () => {
    expect(IMAGE_SIZES.large).toEqual({ width: 1200, height: 900, fit: 'inside' });
  });
});
```

**Step 2: Run tests — verify they fail**

```bash
pnpm --filter @nomideusz/svelte-media test
```

Expected: FAIL — `process.js` not found.

**Step 3: Implement `process.ts`**

```ts
// packages/svelte-media/src/lib/core/process.ts
import sharp from 'sharp';
import { createId } from '@paralleldrive/cuid2';
import type {
  StorageAdapter,
  StoredMedia,
  ImageSize,
  MediaConfig,
  ValidationResult,
} from './types.js';

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const IMAGE_SIZES = {
  thumbnail: { width: 300, height: 300, fit: 'cover' as const },
  medium:    { width: 800, height: 600, fit: 'inside' as const },
  large:     { width: 1200, height: 900, fit: 'inside' as const },
};

const SIZE_PREFIXES: Record<ImageSize, string> = {
  original:  '',
  thumbnail: 'thumb_',
  medium:    'med_',
  large:     'large_',
};

const SIZE_QUALITY: Record<ImageSize, number> = {
  original:  95,
  thumbnail: 80,
  medium:    85,
  large:     90,
};

export function validateImageFile(file: File, config?: MediaConfig): ValidationResult {
  const maxSize  = config?.maxFileSize  ?? DEFAULT_MAX_SIZE;
  const allowed  = config?.allowedTypes ?? DEFAULT_ALLOWED_TYPES;

  if (file.size > maxSize) {
    const mb = Math.round(maxSize / 1024 / 1024);
    return { valid: false, error: `File too large (max ${mb}MB)` };
  }
  if (!allowed.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: JPEG, PNG, WebP` };
  }
  return { valid: true };
}

export function generateMediaKey(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() ?? 'jpg';
  return `${createId()}.${ext}`;
}

export function getStorageKey(
  prefix: string,
  entityId: string,
  filename: string,
  size: ImageSize
): string {
  const sizePrefix = SIZE_PREFIXES[size];
  return `${prefix}/${entityId}/${sizePrefix}${filename}`;
}

export async function processAndStore(
  adapter: StorageAdapter,
  file: File,
  prefix: string,
  entityId: string,
  config?: MediaConfig
): Promise<StoredMedia> {
  const validation = validateImageFile(file, config);
  if (!validation.valid) throw new Error(validation.error);

  const filename = generateMediaKey(file.name);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const sizes: Record<ImageSize, string> = {
    original:  getStorageKey(prefix, entityId, filename, 'original'),
    thumbnail: getStorageKey(prefix, entityId, filename, 'thumbnail'),
    medium:    getStorageKey(prefix, entityId, filename, 'medium'),
    large:     getStorageKey(prefix, entityId, filename, 'large'),
  };

  // Upload original (EXIF-rotated, high quality)
  const originalBuf = await sharp(buffer).rotate().jpeg({ quality: SIZE_QUALITY.original }).toBuffer();
  await adapter.put(sizes.original, originalBuf, 'image/jpeg');

  // Upload resized variants
  for (const size of ['thumbnail', 'medium', 'large'] as const) {
    const { width, height, fit } = IMAGE_SIZES[size];
    const resized = await sharp(buffer)
      .rotate()
      .resize(width, height, { fit, withoutEnlargement: true })
      .jpeg({ quality: SIZE_QUALITY[size] })
      .toBuffer();
    await adapter.put(sizes[size], resized, 'image/jpeg');
  }

  return { filename, originalName: file.name, prefix, entityId, sizes };
}

export async function deleteMedia(
  adapter: StorageAdapter,
  prefix: string,
  entityId: string,
  filename: string
): Promise<void> {
  const keys = (['original', 'thumbnail', 'medium', 'large'] as ImageSize[]).map((size) =>
    getStorageKey(prefix, entityId, filename, size)
  );
  await Promise.all(keys.map((key) => adapter.delete(key).catch(() => {})));
}

export function getMediaUrl(
  adapter: StorageAdapter,
  prefix: string,
  entityId: string,
  filename: string,
  size: ImageSize = 'medium'
): string {
  return adapter.getUrl(getStorageKey(prefix, entityId, filename, size));
}
```

**Step 4: Run tests — verify they pass**

```bash
pnpm --filter @nomideusz/svelte-media test
```

Expected: all pass.

**Step 5: Commit**

```bash
git add packages/svelte-media/src/lib/core/
git commit -m "feat(svelte-media): image processing core with tests"
```

---

### Task 5: Svelte components

**Files:**
- Create: `packages/svelte-media/src/lib/components/ImageUpload.svelte`
- Create: `packages/svelte-media/src/lib/components/ImageGallery.svelte`

**Step 1: Create `ImageUpload.svelte`**

```svelte
<!-- packages/svelte-media/src/lib/components/ImageUpload.svelte -->
<script lang="ts">
  import type { StoredMedia, MediaConfig } from '../core/types.js';

  interface Props {
    /** Called when upload succeeds. Provide your own upload handler. */
    onUpload: (file: File) => Promise<StoredMedia>;
    /** Called on validation or upload error. */
    onError?: (message: string) => void;
    /** Maximum number of files selectable at once. Default: 1 */
    maxFiles?: number;
    /** Config forwarded to file picker accept attribute */
    accept?: string;
    config?: MediaConfig;
  }

  let {
    onUpload,
    onError,
    maxFiles = 1,
    accept = 'image/jpeg,image/png,image/webp',
  }: Props = $props();

  let dragging = $state(false);
  let uploading = $state(false);
  let input: HTMLInputElement;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploading = true;
    try {
      for (const file of Array.from(files).slice(0, maxFiles)) {
        await onUpload(file);
      }
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      uploading = false;
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    handleFiles(e.dataTransfer?.files ?? null);
  }
</script>

<div
  class="asini-upload"
  class:asini-upload--drag={dragging}
  class:asini-upload--busy={uploading}
  role="region"
  aria-label="Image upload"
  ondragover={(e) => { e.preventDefault(); dragging = true; }}
  ondragleave={() => { dragging = false; }}
  ondrop={onDrop}
>
  {#if uploading}
    <span class="asini-upload__status">Uploading…</span>
  {:else}
    <button
      type="button"
      class="asini-upload__btn"
      onclick={() => input.click()}
      aria-label="Select image"
    >
      Choose image
    </button>
    <span class="asini-upload__hint">or drag and drop</span>
  {/if}
  <input
    bind:this={input}
    type="file"
    {accept}
    multiple={maxFiles > 1}
    style="display:none"
    onchange={(e) => handleFiles((e.target as HTMLInputElement).files)}
  />
</div>

<style>
  .asini-upload {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
    border: 2px dashed var(--asini-border);
    border-radius: var(--asini-radius);
    background: var(--asini-surface);
    color: var(--asini-text-2);
    transition: border-color 0.15s, background 0.15s;
    cursor: pointer;
  }
  .asini-upload--drag {
    border-color: var(--asini-accent);
    background: var(--asini-accent-muted);
  }
  .asini-upload--busy {
    opacity: 0.6;
    pointer-events: none;
  }
  .asini-upload__btn {
    padding: 0.5rem 1.25rem;
    border: 1px solid var(--asini-border);
    border-radius: var(--asini-radius-sm);
    background: var(--asini-bg);
    color: var(--asini-text);
    font-size: 0.875rem;
    cursor: pointer;
  }
  .asini-upload__btn:hover {
    border-color: var(--asini-accent);
    color: var(--asini-accent);
  }
  .asini-upload__hint {
    font-size: 0.8rem;
    color: var(--asini-text-3);
  }
  .asini-upload__status {
    font-size: 0.875rem;
    color: var(--asini-text-2);
  }
</style>
```

**Step 2: Create `ImageGallery.svelte`**

```svelte
<!-- packages/svelte-media/src/lib/components/ImageGallery.svelte -->
<script lang="ts">
  import type { StoredMedia } from '../core/types.js';

  interface Props {
    images: StoredMedia[];
    /** Adapter getUrl function — called to build display URLs */
    getUrl: (prefix: string, entityId: string, filename: string, size: 'thumbnail' | 'medium' | 'large') => string;
    onDelete?: (filename: string) => void;
    size?: 'thumbnail' | 'medium';
  }

  let { images, getUrl, onDelete, size = 'thumbnail' }: Props = $props();

  let expanded: StoredMedia | null = $state(null);
</script>

{#if images.length > 0}
  <div class="asini-gallery">
    {#each images as img (img.filename)}
      <div class="asini-gallery__item">
        <button
          type="button"
          class="asini-gallery__thumb-btn"
          onclick={() => { expanded = img; }}
          aria-label="View {img.originalName}"
        >
          <img
            src={getUrl(img.prefix, img.entityId, img.filename, size)}
            alt={img.originalName}
            class="asini-gallery__thumb"
            loading="lazy"
          />
        </button>
        {#if onDelete}
          <button
            type="button"
            class="asini-gallery__delete"
            onclick={() => onDelete?.(img.filename)}
            aria-label="Delete {img.originalName}"
          >×</button>
        {/if}
      </div>
    {/each}
  </div>
{/if}

{#if expanded}
  <!-- Lightbox -->
  <div
    class="asini-lightbox"
    role="dialog"
    aria-modal="true"
    aria-label="Image preview"
    onclick={() => { expanded = null; }}
    onkeydown={(e) => { if (e.key === 'Escape') expanded = null; }}
    tabindex="-1"
  >
    <img
      src={getUrl(expanded.prefix, expanded.entityId, expanded.filename, 'large')}
      alt={expanded.originalName}
      class="asini-lightbox__img"
      onclick|stopPropagation={() => {}}
    />
  </div>
{/if}

<style>
  .asini-gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .asini-gallery__item {
    position: relative;
    display: inline-block;
  }
  .asini-gallery__thumb-btn {
    display: block;
    border: none;
    padding: 0;
    cursor: pointer;
    border-radius: var(--asini-radius-sm);
    overflow: hidden;
  }
  .asini-gallery__thumb {
    display: block;
    width: 100px;
    height: 100px;
    object-fit: cover;
    border-radius: var(--asini-radius-sm);
    border: 1px solid var(--asini-border);
  }
  .asini-gallery__delete {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--asini-danger);
    color: #fff;
    border: none;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .asini-lightbox {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    cursor: pointer;
  }
  .asini-lightbox__img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: var(--asini-radius);
    cursor: default;
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

### Task 6: Package index + build

**Files:**
- Create: `packages/svelte-media/src/lib/index.ts`

**Step 1: Create index**

```ts
// packages/svelte-media/src/lib/index.ts
export type {
  StorageAdapter,
  S3Config,
  StoredMedia,
  ImageSize,
  MediaConfig,
  ValidationResult,
} from './core/types.js';

export { createS3Adapter } from './core/adapter.js';

export {
  validateImageFile,
  generateMediaKey,
  getStorageKey,
  processAndStore,
  deleteMedia,
  getMediaUrl,
  IMAGE_SIZES,
} from './core/process.js';

export { default as ImageUpload } from './components/ImageUpload.svelte';
export { default as ImageGallery } from './components/ImageGallery.svelte';
```

**Step 2: Run full check + test + package**

```bash
pnpm --filter @nomideusz/svelte-media check
pnpm --filter @nomideusz/svelte-media test
pnpm --filter @nomideusz/svelte-media package
```

Expected: zero errors, all tests pass, `dist/` created.

**Step 3: Commit**

```bash
git add packages/svelte-media/src/lib/index.ts
git commit -m "feat(svelte-media): wire public index, package gate passes"
```

---

### Task 7: thebest — media client + env

**Files:**
- Modify: `apps/thebest/.env.example`
- Create: `apps/thebest/src/lib/server/media.ts`

**Step 1: Add S3 env vars to `.env.example`**

Append to `apps/thebest/.env.example`:

```
# S3-compatible storage (Cloudflare R2, AWS S3, MinIO, etc.)
# Get from your storage provider dashboard
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=thebest-media
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_URL=https://media.thebest.travel
```

Also add matching keys to your real `apps/thebest/.env` with real values before testing.

**Step 2: Create `apps/thebest/src/lib/server/media.ts`**

```ts
// apps/thebest/src/lib/server/media.ts
import { createS3Adapter } from '@nomideusz/svelte-media';
import type { StorageAdapter } from '@nomideusz/svelte-media';
import { env } from '$env/dynamic/private';

let _adapter: StorageAdapter | null = null;

export function getMediaAdapter(): StorageAdapter {
  if (!_adapter) {
    if (!env.S3_ENDPOINT)       throw new Error('S3_ENDPOINT not set');
    if (!env.S3_BUCKET)         throw new Error('S3_BUCKET not set');
    if (!env.S3_ACCESS_KEY_ID)  throw new Error('S3_ACCESS_KEY_ID not set');
    if (!env.S3_SECRET_ACCESS_KEY) throw new Error('S3_SECRET_ACCESS_KEY not set');
    if (!env.S3_PUBLIC_URL)     throw new Error('S3_PUBLIC_URL not set');

    _adapter = createS3Adapter({
      endpoint:        env.S3_ENDPOINT,
      region:          env.S3_REGION ?? 'auto',
      bucket:          env.S3_BUCKET,
      accessKeyId:     env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      publicUrl:       env.S3_PUBLIC_URL,
    });
  }
  return _adapter;
}
```

**Step 3: Add @nomideusz/svelte-media dependency to thebest**

```bash
pnpm add @nomideusz/svelte-media --filter thebest
```

**Step 4: Check**

```bash
pnpm --filter thebest check
```

Expected: zero errors.

**Step 5: Commit**

```bash
git add apps/thebest/.env.example apps/thebest/src/lib/server/media.ts apps/thebest/package.json
git commit -m "feat(thebest): add media client singleton + S3 env vars"
```

---

### Task 8: thebest — guide avatar schema migration

**Files:**
- Modify: `apps/thebest/src/lib/server/db/schema.ts` — add `avatar` column to guides

**Step 1: Add avatar column to guides table in `schema.ts`**

In the `guides` pgTable definition, add after `stripeOnboardingComplete`:

```ts
/** Guide avatar filename — stored in S3 under avatars/{guideId}/ */
avatar: text('avatar'),
```

**Step 2: Generate migration**

```bash
pnpm --filter thebest db:generate
```

Expected: new file created in `drizzle/` migrations directory.

**Step 3: Apply migration**

```bash
pnpm --filter thebest db:migrate
```

Expected: migration applied successfully.

**Step 4: Check**

```bash
pnpm --filter thebest check
```

Expected: zero errors.

**Step 5: Commit**

```bash
git add apps/thebest/src/lib/server/db/schema.ts drizzle/
git commit -m "feat(thebest): add avatar column to guides table"
```

---

### Task 9: thebest — image proxy API route

**Files:**
- Create: `apps/thebest/src/routes/api/images/[...path]/+server.ts`

This route proxies S3 images to the browser. Required because S3 buckets may be private.

**Step 1: Create the route**

```ts
// apps/thebest/src/routes/api/images/[...path]/+server.ts
import type { RequestHandler } from './$types.js';
import { getMediaAdapter } from '$lib/server/media.js';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
  const key = params.path;
  if (!key) error(400, 'Missing path');

  const adapter = getMediaAdapter();

  // Build the public URL and redirect — simplest proxy pattern
  // If bucket is public, this is a simple redirect. If private, use presigned URL.
  const url = adapter.getUrl(key);
  return Response.redirect(url, 302);
};
```

> **Note:** If your S3 bucket is private (recommended), replace the redirect with a presigned URL fetch using `@aws-sdk/s3-request-presigner`. For now, redirect works with public buckets or CDN URLs.

**Step 2: Check**

```bash
pnpm --filter thebest check
```

Expected: zero errors.

**Step 3: Commit**

```bash
git add apps/thebest/src/routes/api/images/
git commit -m "feat(thebest): add image proxy API route"
```

---

### Task 10: thebest — guide avatar upload in /guide/settings

**Files:**
- Modify: `apps/thebest/src/routes/guide/settings/+page.server.ts`
- Modify: `apps/thebest/src/routes/guide/settings/+page.svelte`

**Step 1: Add avatar upload action to `+page.server.ts`**

Read the existing file first, then add an `actions` export:

```ts
// Add to existing imports at top:
import { processAndStore, deleteMedia } from '@nomideusz/svelte-media';
import { getMediaAdapter } from '$lib/server/media.js';
import { fail } from '@sveltejs/kit';

// Add after the existing load function:
export const actions = {
  uploadAvatar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const formData = await request.formData();
    const file = formData.get('avatar');
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { error: 'No file provided' });
    }

    const db = getDb();
    const adapter = getMediaAdapter();

    // Delete old avatar if exists
    const existing = await db.query.guides.findFirst({
      where: eq(guides.id, locals.user.id),
    });
    if (existing?.avatar) {
      await deleteMedia(adapter, 'avatars', locals.user.id, existing.avatar).catch(() => {});
    }

    const stored = await processAndStore(adapter, file, 'avatars', locals.user.id);

    await db
      .update(guides)
      .set({ avatar: stored.filename })
      .where(eq(guides.id, locals.user.id));

    return { success: true, filename: stored.filename };
  },
};
```

Also update the `load` function to return the avatar filename:

```ts
return {
  stripeConnected: guide?.stripeOnboardingComplete ?? false,
  stripeAccountId: guide?.stripeAccountId ?? null,
  avatar: guide?.avatar ?? null,  // ADD THIS
};
```

**Step 2: Add avatar UI to `+page.svelte`**

Add after the existing page content. Import `ImageUpload` from the package:

```svelte
<script lang="ts">
  // ADD to existing imports:
  import { ImageUpload } from '@nomideusz/svelte-media';
  import { enhance } from '$app/forms';

  // ... existing script content ...
</script>

<!-- ADD this section to the existing page template: -->
<section>
  <h2>Profile Photo</h2>

  {#if data.avatar}
    <img
      src="/api/images/avatars/{data.guide?.id}/{data.avatar}?size=thumbnail"
      alt="Your avatar"
      width="100"
      height="100"
      style="border-radius:50%;object-fit:cover;"
    />
  {/if}

  <form method="POST" action="?/uploadAvatar" enctype="multipart/form-data" use:enhance>
    <ImageUpload
      onUpload={async (file) => {
        const fd = new FormData();
        fd.append('avatar', file);
        await fetch('?/uploadAvatar', { method: 'POST', body: fd });
        location.reload();
        return {} as any; // form handles the upload
      }}
      maxFiles={1}
    />
  </form>
</section>
```

> **Note:** The `ImageUpload` component's `onUpload` callback handles the file. Adapt to SvelteKit form actions as fits the existing page pattern. The simplest approach is a hidden file input inside the form with `enctype="multipart/form-data"`.

**Step 3: Check**

```bash
pnpm --filter thebest check
```

Expected: zero errors.

**Step 4: Commit**

```bash
git add apps/thebest/src/routes/guide/settings/
git commit -m "feat(thebest): guide avatar upload via svelte-media"
```

---

### Task 11: thebest — tour photo upload in /guide/tours/[tourId]

**Files:**
- Modify: `apps/thebest/src/routes/guide/tours/[tourId]/+page.server.ts`
- Modify: `apps/thebest/src/routes/guide/tours/[tourId]/+page.svelte`

**Step 1: Read the existing `+page.server.ts`** to understand current structure, then add:

```ts
// Add to existing imports:
import { processAndStore, deleteMedia } from '@nomideusz/svelte-media';
import { getMediaAdapter } from '$lib/server/media.js';

// Add to existing actions object:
uploadPhoto: async ({ request, locals, params }) => {
  if (!locals.user) return fail(401, { error: 'Unauthorized' });

  const formData = await request.formData();
  const file = formData.get('photo');
  if (!(file instanceof File) || file.size === 0) {
    return fail(400, { error: 'No file provided' });
  }

  const db = getDb();
  const adapter = getMediaAdapter();

  // Verify tour belongs to this guide
  const [tour] = await db.select().from(tours).where(eq(tours.id, params.tourId));
  if (!tour || tour.guideId !== locals.user.id) return fail(403, { error: 'Forbidden' });

  const stored = await processAndStore(adapter, file, 'tours', params.tourId);

  await db
    .update(tours)
    .set({ images: [...(tour.images ?? []), stored.filename] })
    .where(eq(tours.id, params.tourId));

  return { success: true };
},

deletePhoto: async ({ request, locals, params }) => {
  if (!locals.user) return fail(401, { error: 'Unauthorized' });

  const formData = await request.formData();
  const filename = formData.get('filename') as string;
  if (!filename) return fail(400, { error: 'No filename' });

  const db = getDb();
  const adapter = getMediaAdapter();

  const [tour] = await db.select().from(tours).where(eq(tours.id, params.tourId));
  if (!tour || tour.guideId !== locals.user.id) return fail(403, { error: 'Forbidden' });

  await deleteMedia(adapter, 'tours', params.tourId, filename);

  await db
    .update(tours)
    .set({ images: (tour.images ?? []).filter((f) => f !== filename) })
    .where(eq(tours.id, params.tourId));

  return { success: true };
},
```

**Step 2: Add photo UI to `+page.svelte`**

Add an images section to the existing tour edit page:

```svelte
<script lang="ts">
  import { ImageUpload, ImageGallery } from '@nomideusz/svelte-media';
  import type { StoredMedia } from '@nomideusz/svelte-media';

  // ... existing script ...

  // Build StoredMedia objects from the flat filenames stored in DB
  const tourId = data.tour.id;
  const mediaItems: StoredMedia[] = (data.tour.images ?? []).map((filename) => ({
    filename,
    originalName: filename,
    prefix: 'tours',
    entityId: tourId,
    sizes: {
      original:  `tours/${tourId}/${filename}`,
      thumbnail: `tours/${tourId}/thumb_${filename}`,
      medium:    `tours/${tourId}/med_${filename}`,
      large:     `tours/${tourId}/large_${filename}`,
    },
  }));

  function getUrl(prefix: string, entityId: string, filename: string, size: 'thumbnail' | 'medium' | 'large') {
    const prefixMap = { thumbnail: 'thumb_', medium: 'med_', large: 'large_' };
    return `/api/images/${prefix}/${entityId}/${prefixMap[size]}${filename}`;
  }
</script>

<!-- Add to template: -->
<section>
  <h3>Tour Photos</h3>

  <ImageGallery images={mediaItems} {getUrl} onDelete={async (filename) => {
    const fd = new FormData();
    fd.append('filename', filename);
    await fetch('?/deletePhoto', { method: 'POST', body: fd });
    location.reload();
  }} />

  <form method="POST" action="?/uploadPhoto" enctype="multipart/form-data">
    <ImageUpload
      onUpload={async (file) => {
        const fd = new FormData();
        fd.append('photo', file);
        await fetch('?/uploadPhoto', { method: 'POST', body: fd });
        location.reload();
        return {} as any;
      }}
      maxFiles={5}
    />
  </form>
</section>
```

**Step 3: Check + build**

```bash
pnpm --filter thebest check
pnpm --filter thebest build
```

Expected: zero errors, build succeeds.

**Step 4: Commit**

```bash
git add apps/thebest/src/routes/guide/tours/
git commit -m "feat(thebest): tour photo upload and gallery via svelte-media"
```

---

## PHASE 2: @nomideusz/svelte-qr

---

### Task 12: Scaffold the package

**Files:**
- Create: `packages/svelte-qr/package.json`
- Create: `packages/svelte-qr/vite.config.ts`
- Create: `packages/svelte-qr/svelte.config.js`
- Create: `packages/svelte-qr/src/app.html`
- Create: `packages/svelte-qr/src/routes/+page.svelte`

**Step 1: Create `packages/svelte-qr/package.json`**

```json
{
  "name": "@nomideusz/svelte-qr",
  "version": "0.1.0",
  "description": "Zero-dependency QR code generation for Svelte 5 — pure TypeScript encoder, SVG output.",
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
  "files": [
    "dist",
    "!dist/**/*.test.*",
    "!dist/**/*.spec.*"
  ],
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "package": "svelte-kit sync && svelte-package",
    "prepublishOnly": "npm run package",
    "preview": "vite preview",
    "prepare": "svelte-kit sync || echo ''",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
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
    "@sveltejs/vite-plugin-svelte": "^6.2.4",
    "svelte": "^5.51.0",
    "svelte-check": "^4.3.6",
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "vitest": "^4.0.18"
  },
  "keywords": ["svelte", "qr", "qr-code", "svg", "zero-dependency"]
}
```

**Step 2: Copy boilerplate**

```bash
cp packages/svelte-notify/svelte.config.js packages/svelte-qr/svelte.config.js
cp packages/svelte-notify/src/app.html packages/svelte-qr/src/app.html
cp packages/svelte-media/vite.config.ts packages/svelte-qr/vite.config.ts
mkdir -p packages/svelte-qr/src/routes
echo '<h1>@nomideusz/svelte-qr demo</h1>' > packages/svelte-qr/src/routes/+page.svelte
```

**Step 3: Install + initial check**

```bash
pnpm install
pnpm --filter @nomideusz/svelte-qr check
```

Expected: zero errors.

**Step 4: Commit**

```bash
git add packages/svelte-qr
git commit -m "feat(svelte-qr): scaffold package"
```

---

### Task 13: QR types

**Files:**
- Create: `packages/svelte-qr/src/lib/core/types.ts`

**Step 1: Create types**

```ts
// packages/svelte-qr/src/lib/core/types.ts

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
```

**Step 2: Commit**

```bash
git add packages/svelte-qr/src/lib/core/types.ts
git commit -m "feat(svelte-qr): add QR types"
```

---

### Task 14: QR encoder (pure TypeScript, zero deps)

**Files:**
- Create: `packages/svelte-qr/src/lib/core/encoder.ts`

This is the core task. Implement a QR code matrix encoder in pure TypeScript — no npm dependencies. The implementation follows the ISO 18004 QR code specification. Use the TypeScript port of Nayuki's reference implementation as the algorithm guide: https://github.com/nayuki/QR-Code-generator/blob/master/typescript-javascript/qrcodegen.ts

**Step 1: Create `encoder.ts`**

The encoder must implement these components (in order — each builds on the previous):

**1. Constants and lookup tables**

```ts
// packages/svelte-qr/src/lib/core/encoder.ts

import type { ErrorCorrection, QrMatrix, QrOptions } from './types.js';

// ── Error correction code word counts per version (1–40) per EC level ────────
// Format: [L, M, Q, H] blocks and codewords — abbreviated to versions 1-7 for brevity.
// For a full implementation, include all 40 versions.
// Source: ISO 18004:2015 Table 9

const EC_CODEWORDS_PER_BLOCK: readonly (readonly number[])[] = [
  // Version 1: [L, M, Q, H]
  [7, 10, 13, 17],
  // Version 2
  [10, 16, 22, 28],
  // Version 3
  [15, 26, 18, 22],
  // Version 4
  [20, 18, 26, 16],
  // Version 5
  [26, 24, 18, 22],
  // Version 6
  [18, 16, 24, 28],
  // Version 7
  [20, 18, 18, 26],
  // ... continue through version 40
  // (Implementer: copy the full table from Nayuki's source, line ~1100)
];

const NUM_EC_CODEBLOCKS: readonly (readonly number[])[] = [
  [1, 1, 1, 1],   // v1
  [1, 1, 1, 1],   // v2
  [1, 1, 2, 2],   // v3
  [1, 2, 2, 4],   // v4
  [1, 2, 4, 4],   // v5
  [2, 4, 4, 4],   // v6
  [2, 4, 2, 4],   // v7
  // ... continue through version 40
];
```

> **Implementer note:** Copy the complete EC_CODEWORDS_PER_BLOCK and NUM_EC_CODEBLOCKS tables verbatim from Nayuki's TypeScript source (they are large lookup tables, not logic). The file is at the URL above, search for `ECC_CODEWORDS_PER_BLOCK`.

**2. Reed-Solomon error correction**

```ts
/** Multiply two GF(256) elements. */
function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

/** GF(256) exp and log tables (precomputed). */
const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);
(function buildGfTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x >= 256) x ^= 0x11D; // primitive polynomial
  }
  EXP_TABLE[255] = EXP_TABLE[0];
})();

/** Compute Reed-Solomon check bytes for data. */
function reedSolomonComputeDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 2);
  }
  return result;
}

function reedSolomonComputeRemainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[divisor.length - 1] = 0;
    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= gfMul(divisor[i], factor);
    }
  }
  return result;
}
```

**3. Data encoding (byte mode)**

```ts
function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Build the data bit stream for byte mode encoding. */
function buildDataBits(data: Uint8Array, version: number, ecLevel: number): boolean[] {
  const bits: boolean[] = [];
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push(((val >> i) & 1) === 1);
  };

  // Mode indicator: byte mode = 0100
  push(0b0100, 4);
  // Character count indicator
  const cciBits = version <= 9 ? 8 : 16;
  push(data.length, cciBits);
  // Data bytes
  for (const b of data) push(b, 8);
  // Terminator (up to 4 zero bits)
  const totalCapacityBits = getTotalDataCodewords(version, ecLevel) * 8;
  for (let i = 0; i < 4 && bits.length < totalCapacityBits; i++) bits.push(false);
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(false);
  // Pad bytes 0xEC, 0x11 alternating
  let padByte = 0xEC;
  while (bits.length < totalCapacityBits) {
    push(padByte, 8);
    padByte = padByte === 0xEC ? 0x11 : 0xEC;
  }
  return bits;
}
```

**4. Matrix construction and module placement**

The matrix construction follows the spec precisely. Implement these placement functions:

- `setFinderPattern(matrix, row, col)` — 7×7 pattern + separator
- `setTimingPatterns(matrix)` — alternating row 6 and col 6
- `setAlignmentPatterns(matrix, version)` — for version ≥ 2
- `setFormatInfo(matrix, ecLevel, mask)` — BCH-encoded format string
- `setVersionInfo(matrix, version)` — for version ≥ 7
- `placeDataBits(matrix, bits)` — zigzag upward column placement

> **Implementer note:** This is the most intricate section. Port directly from Nayuki's `QrCode` class methods `drawFunctionPatterns`, `drawFormatBits`, `drawCodewords`. The logic is well-tested and should not be reimagined — port it faithfully.

**5. Masking**

```ts
type MaskFn = (row: number, col: number) => boolean;

const MASK_PATTERNS: readonly MaskFn[] = [
  (r, c) => (r + c) % 2 === 0,
  (r, _) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(matrix: boolean[][], isFunction: boolean[][], maskIndex: number): boolean[][] {
  const size = matrix.length;
  const masked = matrix.map((row) => [...row]);
  const fn = MASK_PATTERNS[maskIndex];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c] && fn(r, c)) masked[r][c] = !masked[r][c];
    }
  }
  return masked;
}

function getPenaltyScore(matrix: boolean[][]): number {
  // Implement all 4 penalty rules per ISO 18004 §7.8.3
  // Port directly from Nayuki's getPenaltyScore method
  let score = 0;
  // Rule 1: Five or more consecutive same-color modules in row/col
  // Rule 2: 2×2 blocks of same color
  // Rule 3: Specific patterns resembling finder patterns
  // Rule 4: Proportion of dark modules
  return score;
}
```

**6. Public API functions**

```ts
export function getQrMatrix(data: string, options: QrOptions = {}): QrMatrix {
  const ecLevel = { L: 0, M: 1, Q: 2, H: 3 }[options.errorCorrection ?? 'M'];
  const bytes = encodeText(data);
  const version = findMinVersion(bytes.length, ecLevel);

  const size = version * 4 + 17;
  const matrix: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  drawFunctionPatterns(matrix, isFunction, version);
  const bits = buildDataBits(bytes, version, ecLevel);
  const codewords = bitsToCodewords(bits);
  const allCodewords = appendErrorCorrection(codewords, version, ecLevel);
  placeDataBits(matrix, isFunction, codewordsToBits(allCodewords));

  // Try all 8 masks, pick lowest penalty
  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let m = 0; m < 8; m++) {
    const candidate = applyMask(matrix, isFunction, m);
    setFormatInfo(candidate, ecLevel, m);
    const penalty = getPenaltyScore(candidate);
    if (penalty < bestPenalty) { bestPenalty = penalty; bestMask = m; }
  }

  const result = applyMask(matrix, isFunction, bestMask);
  setFormatInfo(result, ecLevel, bestMask);
  return result;
}

function findMinVersion(byteCount: number, ecLevel: number): number {
  for (let v = 1; v <= 40; v++) {
    if (getDataCapacityBytes(v, ecLevel) >= byteCount) return v;
  }
  throw new Error(`Data too long for QR code (${byteCount} bytes)`);
}
```

**Step 2: Commit**

```bash
git add packages/svelte-qr/src/lib/core/encoder.ts
git commit -m "feat(svelte-qr): implement pure TS QR encoder"
```

---

### Task 15: SVG renderer

**Files:**
- Create: `packages/svelte-qr/src/lib/core/svg.ts`

**Step 1: Create SVG renderer**

```ts
// packages/svelte-qr/src/lib/core/svg.ts
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
        rects.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${module.toFixed(2)}" height="${module.toFixed(2)}"/>`);
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
```

**Step 2: Commit**

```bash
git add packages/svelte-qr/src/lib/core/svg.ts
git commit -m "feat(svelte-qr): SVG renderer"
```

---

### Task 16: QR encoder tests (TDD verification)

**Files:**
- Create: `packages/svelte-qr/src/lib/core/encoder.test.ts`

**Step 1: Write tests**

```ts
// packages/svelte-qr/src/lib/core/encoder.test.ts
import { describe, it, expect } from 'vitest';
import { getQrMatrix } from './encoder.js';
import { matrixToSvg } from './svg.js';

describe('getQrMatrix', () => {
  it('returns a square matrix', () => {
    const matrix = getQrMatrix('Hello');
    expect(matrix.length).toBeGreaterThan(0);
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true);
  });

  it('version 1 matrix is 21×21', () => {
    // Version 1 encodes up to 17 bytes (L) / 7 bytes (H)
    const matrix = getQrMatrix('Hi', { errorCorrection: 'L' });
    expect(matrix.length).toBe(21);
  });

  it('produces consistent output for same input', () => {
    const a = getQrMatrix('test');
    const b = getQrMatrix('test');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('produces different output for different input', () => {
    const a = getQrMatrix('hello');
    const b = getQrMatrix('world');
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('handles empty string', () => {
    expect(() => getQrMatrix('')).not.toThrow();
  });

  it('handles URL data', () => {
    expect(() => getQrMatrix('https://thebest.travel/verify/BK-ABCD1234')).not.toThrow();
  });

  it('handles unicode (UTF-8 byte mode)', () => {
    expect(() => getQrMatrix('Zażółć gęślą jaźń')).not.toThrow();
  });

  it('throws for data exceeding max capacity', () => {
    const tooLong = 'x'.repeat(3000);
    expect(() => getQrMatrix(tooLong)).toThrow();
  });

  it('matrix contains true and false values only', () => {
    const matrix = getQrMatrix('test');
    const allBool = matrix.every((row) => row.every((v) => typeof v === 'boolean'));
    expect(allBool).toBe(true);
  });
});

describe('matrixToSvg', () => {
  it('returns a valid SVG string', () => {
    const matrix = getQrMatrix('test');
    const svg = matrixToSvg(matrix);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('applies custom foreground color', () => {
    const matrix = getQrMatrix('test');
    const svg = matrixToSvg(matrix, { foreground: '#ff0000' });
    expect(svg).toContain('fill="#ff0000"');
  });

  it('applies custom background color', () => {
    const matrix = getQrMatrix('test');
    const svg = matrixToSvg(matrix, { background: '#f5f5f5' });
    expect(svg).toContain('fill="#f5f5f5"');
  });

  it('respects size option', () => {
    const matrix = getQrMatrix('test');
    const svg = matrixToSvg(matrix, { size: 128 });
    expect(svg).toContain('width="128"');
    expect(svg).toContain('height="128"');
  });
});
```

**Step 2: Run tests**

```bash
pnpm --filter @nomideusz/svelte-qr test
```

Expected: all pass.

**Step 3: Commit**

```bash
git add packages/svelte-qr/src/lib/core/encoder.test.ts
git commit -m "test(svelte-qr): QR encoder and SVG renderer tests"
```

---

### Task 17: QrCode Svelte component + index

**Files:**
- Create: `packages/svelte-qr/src/lib/components/QrCode.svelte`
- Create: `packages/svelte-qr/src/lib/index.ts`

**Step 1: Create `QrCode.svelte`**

```svelte
<!-- packages/svelte-qr/src/lib/components/QrCode.svelte -->
<script lang="ts">
  import type { QrOptions } from '../core/types.js';
  import { getQrMatrix } from '../core/encoder.js';
  import { matrixToSvg } from '../core/svg.js';

  interface Props extends QrOptions {
    data: string;
    label?: string; // accessible label for screen readers
  }

  let { data, label, ...options }: Props = $props();

  const svg = $derived(matrixToSvg(getQrMatrix(data, options), options));
</script>

<div
  class="asini-qr"
  role="img"
  aria-label={label ?? `QR code for: ${data}`}
>
  {@html svg}
</div>

<style>
  .asini-qr {
    display: inline-block;
    line-height: 0;
  }
  .asini-qr :global(svg) {
    display: block;
  }
</style>
```

**Step 2: Create `index.ts`**

```ts
// packages/svelte-qr/src/lib/index.ts
export type { QrOptions, QrMatrix, ErrorCorrection } from './core/types.js';
export { getQrMatrix } from './core/encoder.js';
export { matrixToSvg } from './core/svg.js';
export { default as QrCode } from './components/QrCode.svelte';
```

**Step 3: Full check + test + package**

```bash
pnpm --filter @nomideusz/svelte-qr check
pnpm --filter @nomideusz/svelte-qr test
pnpm --filter @nomideusz/svelte-qr package
```

Expected: zero errors, all tests pass, `dist/` created.

**Step 4: Commit**

```bash
git add packages/svelte-qr/src/lib/
git commit -m "feat(svelte-qr): QrCode component + public index, package gate passes"
```

---

### Task 18: thebest — QrCode on confirmed booking page

**Files:**
- Modify: `apps/thebest/src/routes/bookings/[ref]/confirmed/+page.svelte`
- Modify: `apps/thebest/src/routes/bookings/[ref]/confirmed/+page.server.ts`

**Step 1: Add @nomideusz/svelte-qr dependency**

```bash
pnpm add @nomideusz/svelte-qr --filter thebest
```

**Step 2: Update `+page.server.ts` to return the app origin**

The QR should encode a verification URL. The `ORIGIN` env var is already in `.env.example`.

```ts
// Add to existing load return value:
import { env } from '$env/dynamic/private';

// In load function return:
return {
  booking,
  tour,
  verifyUrl: `${env.ORIGIN}/verify/${booking.bookingReference}`,
};
```

**Step 3: Update `+page.svelte` to show QR**

```svelte
<script lang="ts">
  import { QrCode } from '@nomideusz/svelte-qr';
  import type { PageData } from './$types.js';
  let { data }: { data: PageData } = $props();
</script>

<section class="max-w-xl mx-auto px-4 py-12 text-center">
  <div class="text-5xl mb-4">✓</div>
  <h1 class="text-2xl font-bold mb-2">Booking Confirmed!</h1>
  <p class="text-base-content/70 mb-6">
    Thank you for booking <strong>{data.tour?.name}</strong>.
    A confirmation email has been sent to <strong>{data.booking.guestEmail}</strong>.
  </p>
  <div class="stats shadow mb-6">
    <div class="stat">
      <div class="stat-title">Reference</div>
      <div class="stat-value text-lg">{data.booking.bookingReference}</div>
    </div>
  </div>

  <!-- QR ticket -->
  <div class="flex flex-col items-center gap-2 mb-6">
    <p class="text-sm text-base-content/60">Show this QR at the tour</p>
    <QrCode
      data={data.verifyUrl}
      size={200}
      errorCorrection="M"
      label="Booking QR code for {data.booking.bookingReference}"
    />
  </div>

  <a href="/tours" class="btn btn-outline">Browse more tours</a>
</section>
```

**Step 4: Check**

```bash
pnpm --filter thebest check
```

Expected: zero errors.

**Step 5: Commit**

```bash
git add apps/thebest/src/routes/bookings/ apps/thebest/package.json
git commit -m "feat(thebest): show QR code on booking confirmed page"
```

---

### Task 19: thebest — QR in booking confirmation email

**Files:**
- Modify: `packages/svelte-notify/src/lib/templates/booking-confirmation.ts`
- Modify: `packages/svelte-notify/src/lib/types.ts`

**Step 1: Add `verifyUrl` to `BookingNotificationData` type**

In `packages/svelte-notify/src/lib/types.ts`, add to `BookingNotificationData`:

```ts
/** Optional booking verification URL — if provided, a QR code is inlined. */
verifyUrl?: string;
```

**Step 2: Generate QR SVG in email template**

The email template runs in a Node environment, so we can call `getQrMatrix` + `matrixToSvg` directly. Add `@nomideusz/svelte-qr` as a dependency to `svelte-notify`:

```bash
pnpm add @nomideusz/svelte-qr --filter @nomideusz/svelte-notify
```

Update `booking-confirmation.ts`:

```ts
import { getQrMatrix, matrixToSvg } from '@nomideusz/svelte-qr';
import type { BookingNotificationData, EmailTemplate } from '../types.js';

// ... existing format helpers ...

export function bookingConfirmationTemplate(data: BookingNotificationData): EmailTemplate {
  const qrSection = data.verifyUrl
    ? (() => {
        const matrix = getQrMatrix(data.verifyUrl, { errorCorrection: 'M', size: 160 });
        const svg = matrixToSvg(matrix, { size: 160 });
        const b64 = btoa(svg);
        return `
          <div style="text-align:center;margin:24px 0;">
            <p style="font-size:13px;color:#666;margin-bottom:8px;">Show this QR code at your tour</p>
            <img src="data:image/svg+xml;base64,${b64}" width="160" height="160" alt="Booking QR code" style="display:block;margin:0 auto;"/>
          </div>`;
      })()
    : '';

  return {
    subject: `Booking confirmed: ${data.tourName} — Ref ${data.bookingReference}`,
    html: `
      <h2>Your booking is confirmed</h2>
      <p>Hi ${data.guestName},</p>
      <p>Your booking for <strong>${data.tourName}</strong> is confirmed.</p>
      <ul>
        <li>Date: ${formatDate(data.slotStartTime)}</li>
        <li>Participants: ${data.participants}</li>
        <li>Total paid: ${formatMoney(data.totalAmount, data.currency)}</li>
        <li>Reference: <strong>${data.bookingReference}</strong></li>
      </ul>
      ${qrSection}
      <p>See you there!</p>
      <hr/>
      <p style="font-size:12px;color:#666">thebest.travel</p>
    `,
  };
}
```

**Step 3: Pass `verifyUrl` from the webhook handler**

In `apps/thebest/src/routes/api/webhooks/stripe/+server.ts`, update the `sendBookingConfirmation` call to pass `verifyUrl`:

```ts
// Add to existing emailData object:
const emailData = {
  // ... existing fields ...
  verifyUrl: `${env.ORIGIN}/verify/${booking.bookingReference}`,
};
```

**Step 4: Check all affected packages**

```bash
pnpm --filter @nomideusz/svelte-notify check
pnpm --filter @nomideusz/svelte-notify test
pnpm --filter thebest check
pnpm --filter thebest build
```

Expected: zero errors, build succeeds.

**Step 5: Commit**

```bash
git add packages/svelte-notify/ apps/thebest/src/routes/api/webhooks/
git commit -m "feat: embed QR code in booking confirmation email"
```

---

### Task 20: Final validation

**Step 1: Run full monorepo check**

```bash
pnpm check
```

Expected: zero errors across all packages.

**Step 2: Run all tests**

```bash
pnpm test
```

Expected: all pass.

**Step 3: Package both new packages**

```bash
pnpm --filter @nomideusz/svelte-media package
pnpm --filter @nomideusz/svelte-qr package
```

Expected: `dist/` produced in both.

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: svelte-media and svelte-qr — Step 10 + 11 complete"
```

---

## Summary

| Step | Package | Gate |
|------|---------|------|
| 1–6 | svelte-media scaffold + core + components | `pnpm check` + `pnpm test` pass |
| 7–11 | thebest media integration | `pnpm --filter thebest check` + `build` pass |
| 12–17 | svelte-qr scaffold + encoder + component | `pnpm check` + `pnpm test` pass |
| 18–19 | thebest QR integration + email | All checks pass |
| 20 | Full monorepo | `pnpm check` + `pnpm test` both pass |

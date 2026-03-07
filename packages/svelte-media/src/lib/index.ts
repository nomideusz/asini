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

import { createS3Adapter } from '@nomideusz/svelte-media';
import type { StorageAdapter } from '@nomideusz/svelte-media';
import { env } from '$env/dynamic/private';

let _adapter: StorageAdapter | null = null;

export function getMediaAdapter(): StorageAdapter {
  if (!_adapter) {
    if (!env.S3_ENDPOINT)          throw new Error('S3_ENDPOINT not set');
    if (!env.S3_BUCKET)            throw new Error('S3_BUCKET not set');
    if (!env.S3_ACCESS_KEY_ID)     throw new Error('S3_ACCESS_KEY_ID not set');
    if (!env.S3_SECRET_ACCESS_KEY) throw new Error('S3_SECRET_ACCESS_KEY not set');
    if (!env.S3_PUBLIC_URL)        throw new Error('S3_PUBLIC_URL not set');

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

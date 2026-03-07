import type { RequestHandler } from './$types.js';
import { getMediaAdapter } from '$lib/server/media.js';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
  const key = params.path;
  if (!key) error(400, 'Missing path');

  const adapter = getMediaAdapter();
  const url = adapter.getUrl(key);
  return Response.redirect(url, 302);
};

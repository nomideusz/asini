import { e as error } from './index-CoD1IJuy.js';
import { c as createDrizzleAdapter, g as getDb } from './drizzle-adapter-CjwMp0mZ.js';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm';
import 'drizzle-orm/pg-core';

const load = async ({ params }) => {
  const adapter = createDrizzleAdapter(getDb());
  const slot = await adapter.getSlotById(params.slotId);
  if (!slot) {
    error(404, "Slot not found");
  }
  const tour = await adapter.getTourById(slot.tourId);
  if (!tour) {
    error(404, "Tour not found");
  }
  return { slot, tour };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 4;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-CEI-eAF8.js')).default;
const server_id = "src/routes/book/[slotId]/+page.server.ts";
const imports = ["_app/immutable/nodes/4.D4l86B7X.js","_app/immutable/chunks/CSfnKIZ1.js","_app/immutable/chunks/CKDDdjhn.js","_app/immutable/chunks/BHUPHd30.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=4-B6tE_z4K.js.map

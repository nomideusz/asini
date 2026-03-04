import { e as error } from './index-CoD1IJuy.js';
import { c as createDrizzleAdapter, g as getDb } from './drizzle-adapter-CjwMp0mZ.js';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm';
import 'drizzle-orm/pg-core';

const load = async ({ params }) => {
  const adapter = createDrizzleAdapter(getDb());
  const tour = await adapter.getTourById(params.tourId);
  if (!tour) {
    error(404, "Tour not found");
  }
  const now = /* @__PURE__ */ new Date();
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
  const slots = await adapter.getSlots(tour.id, { start: now, end: rangeEnd });
  return { tour, slots };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 6;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-Cnxrv2mv.js')).default;
const server_id = "src/routes/guide/tours/[tourId]/+page.server.ts";
const imports = ["_app/immutable/nodes/6._-T8XvQt.js","_app/immutable/chunks/CSfnKIZ1.js","_app/immutable/chunks/CKDDdjhn.js","_app/immutable/chunks/BHUPHd30.js","_app/immutable/chunks/DquMxK2B.js","_app/immutable/chunks/CiPV2evY.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=6-Djk5ftwT.js.map

import { c as createDrizzleAdapter, g as getDb } from './drizzle-adapter-CjwMp0mZ.js';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm';
import 'drizzle-orm/pg-core';

const load = async () => {
  const adapter = createDrizzleAdapter(getDb());
  const tours = await adapter.getTours();
  return { tours };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 5;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-37srSHrt.js')).default;
const server_id = "src/routes/guide/tours/+page.server.ts";
const imports = ["_app/immutable/nodes/5.Cu3ujN9K.js","_app/immutable/chunks/CSfnKIZ1.js","_app/immutable/chunks/CKDDdjhn.js","_app/immutable/chunks/BHUPHd30.js","_app/immutable/chunks/DquMxK2B.js","_app/immutable/chunks/CiPV2evY.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=5-_4mBdaGY.js.map

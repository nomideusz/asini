import { a8 as ensure_array_like } from './index-Z2M4v9pU.js';
import { e as escape_html } from './escaping-CqgfEcN3.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    $$renderer2.push(`<section><h1>${escape_html(data.tour.name)}</h1> <p>${escape_html(data.tour.description)}</p> <dl><dt>Duration</dt> <dd>${escape_html(data.tour.duration)} minutes</dd> <dt>Capacity</dt> <dd>${escape_html(data.tour.minCapacity)}–${escape_html(data.tour.maxCapacity)} participants</dd> <dt>Status</dt> <dd>${escape_html(data.tour.status)}</dd></dl> <h2>Upcoming slots</h2> `);
    if (data.slots.length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p>No persisted slots in the next 3 months.</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<ul><!--[-->`);
      const each_array = ensure_array_like(data.slots);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let slot = each_array[$$index];
        $$renderer2.push(`<li>${escape_html(slot.startTime.toLocaleString())} — ${escape_html(slot.status)}
					(${escape_html(slot.bookedSpots)}/${escape_html(slot.availableSpots)} booked)</li>`);
      }
      $$renderer2.push(`<!--]--></ul>`);
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-Cnxrv2mv.js.map

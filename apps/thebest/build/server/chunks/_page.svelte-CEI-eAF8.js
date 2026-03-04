import { e as escape_html } from './escaping-CqgfEcN3.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    $$renderer2.push(`<section><h1>Book: ${escape_html(data.tour.name)}</h1> <dl><dt>Date</dt> <dd>${escape_html(data.slot.startTime.toLocaleString())}</dd> <dt>Available spots</dt> <dd>${escape_html(data.slot.availableSpots - data.slot.bookedSpots)}</dd></dl> <p>Booking form coming soon.</p></section>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-CEI-eAF8.js.map

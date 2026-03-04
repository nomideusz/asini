import { a8 as ensure_array_like, a9 as attr, aa as stringify } from './index-Z2M4v9pU.js';
import { e as escape_html } from './escaping-CqgfEcN3.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    $$renderer2.push(`<section><h1>My Tours</h1> `);
    if (data.tours.length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p>No tours yet. Create your first tour to get started.</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<ul><!--[-->`);
      const each_array = ensure_array_like(data.tours);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let tour = each_array[$$index];
        $$renderer2.push(`<li><a${attr("href", `/guide/tours/${stringify(tour.id)}`)}>${escape_html(tour.name)}</a> <span>${escape_html(tour.status)}</span></li>`);
      }
      $$renderer2.push(`<!--]--></ul>`);
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-37srSHrt.js.map

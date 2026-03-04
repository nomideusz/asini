/**
 * Widget entry point — registers <day-calendar> as a custom element.
 *
 * This file is the entry point for the standalone widget bundle (widget.js).
 * Import it via a <script> tag on any HTML page.
 */
import { asClassComponent } from 'svelte/legacy';
import CalendarWidget from './CalendarWidget.svelte';

const CalendarWidgetClass = asClassComponent(CalendarWidget);

type WidgetProps = {
	api?: string;
	events?: string;
	theme?: string;
	view?: string;
	height?: string;
	locale?: string;
	dir?: string;
	mondaystart?: string;
	headers?: string;
};

type WidgetInstance = {
	$set: (props: Partial<WidgetProps>) => void;
	$destroy: () => void;
};

class DayCalendarElement extends HTMLElement {
	private instance: WidgetInstance | null = null;

	static get observedAttributes(): string[] {
		return ['api', 'events', 'theme', 'view', 'height', 'locale', 'dir', 'mondaystart', 'headers'];
	}

	connectedCallback(): void {
		if (this.instance) return;
		this.instance = new CalendarWidgetClass({
			target: this,
			props: this.readProps(),
		}) as unknown as WidgetInstance;
	}

	disconnectedCallback(): void {
		this.instance?.$destroy();
		this.instance = null;
	}

	attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
		if (!this.instance) return;
		this.instance.$set({
			[name]: newValue ?? undefined,
		} as Partial<WidgetProps>);
	}

	private readProps(): WidgetProps {
		return {
			api: this.getAttribute('api') ?? undefined,
			events: this.getAttribute('events') ?? undefined,
			theme: this.getAttribute('theme') ?? undefined,
			view: this.getAttribute('view') ?? undefined,
			height: this.getAttribute('height') ?? undefined,
			locale: this.getAttribute('locale') ?? undefined,
			dir: this.getAttribute('dir') ?? undefined,
			mondaystart: this.getAttribute('mondaystart') ?? undefined,
			headers: this.getAttribute('headers') ?? undefined,
		};
	}
}

if (!customElements.get('day-calendar')) {
	customElements.define('day-calendar', DayCalendarElement);
}

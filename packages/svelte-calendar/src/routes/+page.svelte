<script lang="ts">
	import { onMount } from "svelte";
	import {
		Calendar,
		createMemoryAdapter,
		createRecurringAdapter,
		createCompositeAdapter,
		generatePalette,
		auto,
		neutral,
		presets,
	} from "$lib/index.js";
	import type { PresetName } from "$lib/index.js";
	import Settings from "./_components/Settings.svelte";
	import type { SettingsField } from "./_components/Settings.svelte";
	import type { CalendarView, TimelineEvent } from "$lib/index.js";
	import { themeStore, demoThemes } from "./theme.svelte.js";
	import { createDemoEvents, createDemoRecurring } from "./demo-events.js";

	let isMobile = $state(false);
	onMount(() => {
		const mql = window.matchMedia("(max-width: 600px)");
		isMobile = mql.matches;
		function onChange(e: MediaQueryListEvent) {
			isMobile = e.matches;
		}
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	});

	const calendarHeight = $derived(isMobile ? 500 : 700);
	const calendarRadius = $derived(isMobile ? 0 : 12);

	let settingsValues = $state<Record<string, string | number | boolean>>({
		readOnly: false,
		mondayStart: true,
		showModePills: true,
		showNavigation: true,
		equalDays: false,
		activeView: "week-planner",
		locale: "en-US",
		showDates: true,
		calendarPreset: "auto",
	});

	const readOnly = $derived(Boolean(settingsValues.readOnly));
	const mondayStart = $derived(Boolean(settingsValues.mondayStart));
	const showModePills = $derived(
		Boolean(settingsValues.showModePills ?? true),
	);
	const showNavigation = $derived(
		Boolean(settingsValues.showNavigation ?? true),
	);
	const equalDays = $derived(Boolean(settingsValues.equalDays));
	const showDates = $derived(Boolean(settingsValues.showDates ?? true));
	const activeView = $derived(
		(settingsValues.activeView as CalendarView["id"]) ?? "week-planner",
	);
	const locale = $derived((settingsValues.locale as string) ?? "en-US");
	const dir = $derived<"ltr" | "rtl">(settingsValues.rtl ? "rtl" : "ltr");

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const settingsFields: SettingsField[] = [
		{
			key: "activeView",
			label: "View",
			group: "",
			type: "select",
			options: [
				{ value: "week-planner", label: "Week Planner" },
				{ value: "day-planner", label: "Day Planner" },
				{ value: "week-agenda", label: "Week Agenda" },
				{ value: "day-agenda", label: "Day Agenda" },
			],
		},
		{
			key: "calendarPreset",
			label: "Theme",
			group: "",
			type: "select",
			options: [
				{ value: "auto", label: "Auto (adapt to page)" },
				{ value: "neutral", label: "Neutral (light)" },
				{ value: "midnight", label: "Midnight (dark)" },
			],
		},
		{
			key: "locale",
			label: "Locale",
			group: "",
			type: "select",
			options: [
				{ value: "en-US", label: "en-US" },
				{ value: "pl-PL", label: "pl-PL" },
				{ value: "de-DE", label: "de-DE" },
				{ value: "fr-FR", label: "fr-FR" },
				{ value: "ar-SA", label: "ar-SA" },
			],
		},

		{
			key: "mondayStart",
			label: "Monday Start",
			group: "",
			type: "toggle",
		},
		{ key: "readOnly", label: "Read Only", group: "", type: "toggle" },
		{
			key: "showModePills",
			label: "Mode Pills",
			group: "",
			type: "toggle",
		},
		{
			key: "showNavigation",
			label: "Navigation",
			group: "",
			type: "toggle",
		},
		{ key: "equalDays", label: "Equal Days", group: "", type: "toggle" },
		{ key: "showDates", label: "Show Dates", group: "", type: "toggle" },
		{ key: "rtl", label: "RTL", group: "", type: "toggle" },
	];

	// ── Seed data (auto-generated relative to today) ──────
	const seed: TimelineEvent[] = createDemoEvents(today);
	const recurring = createDemoRecurring();

	// ── Adapter (palette adapts to demo theme accent) ─────────
	// Composite: one-off events (memory) + recurring schedule
	const accent = $derived(demoThemes[themeStore.current].accent);
	const palette = $derived(generatePalette(accent));
	const adapter = $derived(
		createCompositeAdapter([
			createMemoryAdapter(seed, { palette }),
			createRecurringAdapter(recurring, { palette }),
		]),
	);

	// ── Calendar preset theme (from Settings panel) ───────
	const selectedPreset = $derived(
		(settingsValues.calendarPreset as string) ?? "auto",
	);
	const calendarTheme = $derived(
		presets[selectedPreset as PresetName] ?? auto,
	);
	// Enable smart auto-probe only when the "auto" preset is selected.
	// For explicit presets (neutral, midnight), disable auto-probing.
	const autoThemeProp = $derived(selectedPreset === "auto" ? {} : false);

	// ── Callbacks ──────────────────────────────────────────
	let lastAction = $state("");
	function handleClick(ev: TimelineEvent) {
		lastAction = `Clicked: ${ev.title}`;
	}
	function handleCreate(range: { start: Date; end: Date }) {
		lastAction = `Create: ${range.start.toLocaleTimeString()} – ${range.end.toLocaleTimeString()}`;
	}
	function handleMove(event: TimelineEvent, start: Date, end: Date) {
		lastAction = `Moved: ${event.title} → ${start.toLocaleTimeString()} – ${end.toLocaleTimeString()}`;
	}
	function handleViewChange(viewId: CalendarView["id"]) {
		if (activeView !== viewId) {
			settingsValues = { ...settingsValues, activeView: viewId };
		}
	}
</script>

<svelte:head>
	<title>svelte-calendar – Demo</title>
</svelte:head>

<main>
	<Settings fields={settingsFields} bind:values={settingsValues} />

	<div style="height: 28px; padding: 0 10px;">
		{#if lastAction}
			<div class="action">
				<span class="dot"></span>
				{lastAction}
			</div>
		{/if}
	</div>

	<Calendar
		{adapter}
		view={activeView}
		theme={calendarTheme}
		autoTheme={autoThemeProp}
		height={calendarHeight}
		borderRadius={calendarRadius}
		{readOnly}
		{mondayStart}
		{showModePills}
		{showNavigation}
		{equalDays}
		{showDates}
		{locale}
		{dir}
		blockedSlots={[
			{ start: 12, end: 13, label: "Lunch" },
			{ day: 6, start: 0, end: 9, label: "Sat morning" },
			{ day: 7, start: 0, end: 9, label: "Sun morning" },
		]}
		disabledDates={[
			new Date(today.getTime() + 2 * 86_400_000),
			new Date(today.getTime() + 4 * 86_400_000),
		]}
		onviewchange={handleViewChange}
		oneventclick={handleClick}
		oneventcreate={handleCreate}
		oneventmove={handleMove}
	/>
</main>

<style>
	main {
		max-width: 1100px;
		margin: 0 auto;
		padding: 48px 24px 64px;
		background: var(--dt-stage-bg, #080a0f);
		transition:
			background 300ms ease,
			color 300ms ease;
	}

	@media (max-width: 600px) {
		main {
			padding: 16px 0 32px;
		}
	}

	.action {
		font: 400 11px/1.2 var(--dt-sans, "Outfit", system-ui, sans-serif);
		color: var(--dt-text-2, rgba(226, 232, 240, 0.6));
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 0 10px;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--dt-success, #34d399);
		flex-shrink: 0;
	}
</style>

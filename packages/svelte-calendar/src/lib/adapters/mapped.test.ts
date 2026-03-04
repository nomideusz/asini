import { describe, it, expect } from 'vitest';
import { createMappedAdapter, type FieldMapping } from './mapped.js';
import type { DateRange } from './types.js';

// ── Yoga school schedule fixture (from real crawl) ──────

const yogaEvents = [
	{
		date: '2026-03-03',
		start_time: '07:00',
		end_time: '08:15',
		starts_at_iso: '2026-03-03T07:00:00+01:00',
		ends_at_iso: '2026-03-03T08:15:00+01:00',
		class_name: 'Dynamiczna Vinyasa - PL',
		teacher: 'Piotr Szewczyk',
		room: 'Joga Centrum Kazimierz',
		total_capacity: 16,
		online_capacity: 16,
		waiting_list_capacity: 20,
		is_free: false,
		is_cancelled: false,
		is_bookable_online: true,
		color: 'rgb(62, 101, 255)',
		reference_id: 'abc123',
	},
	{
		date: '2026-03-03',
		start_time: '07:00',
		end_time: '08:15',
		starts_at_iso: '2026-03-03T07:00:00+01:00',
		ends_at_iso: '2026-03-03T08:15:00+01:00',
		class_name: 'NeuroJoga',
		teacher: 'Asia Tarkowska-Stukan',
		room: 'Joga Centrum Nowa Huta',
		total_capacity: 18,
		online_capacity: 18,
		waiting_list_capacity: 20,
		is_free: false,
		is_cancelled: false,
		is_bookable_online: true,
		color: 'rgb(239, 105, 80)',
		reference_id: 'def456',
	},
	{
		date: '2026-03-03',
		start_time: '08:00',
		end_time: '09:15',
		starts_at_iso: '2026-03-03T08:00:00+01:00',
		ends_at_iso: '2026-03-03T09:15:00+01:00',
		class_name: 'Vinyasa Krama',
		teacher: 'Monika Jaglarz',
		room: 'Joga Centrum Bronowice',
		total_capacity: 18,
		online_capacity: 18,
		waiting_list_capacity: 20,
		is_free: false,
		is_cancelled: true,
		is_bookable_online: true,
		color: 'rgb(68, 197, 23)',
		reference_id: 'ghi789',
	},
];

const MARCH_3: DateRange = {
	start: new Date('2026-03-03T00:00:00+01:00'),
	end: new Date('2026-03-04T00:00:00+01:00'),
};

const MARCH_5: DateRange = {
	start: new Date('2026-03-05T00:00:00+01:00'),
	end: new Date('2026-03-06T00:00:00+01:00'),
};

// ── Tests ───────────────────────────────────────────────

describe('createMappedAdapter', () => {
	describe('field mapping with yoga schedule data', () => {
		const fields: FieldMapping = {
			title: 'class_name',
			start: 'starts_at_iso',
			end: 'ends_at_iso',
			subtitle: 'teacher',
			location: 'room',
			color: 'color',
			externalId: 'reference_id',
			status: 'is_cancelled',
			tags: ['is_free', 'is_bookable_online'],
		};

		it('maps all events correctly', async () => {
			const adapter = createMappedAdapter(yogaEvents, { fields });
			const events = await adapter.fetchEvents(MARCH_3);

			expect(events).toHaveLength(3);
		});

		it('maps title from class_name', async () => {
			const adapter = createMappedAdapter(yogaEvents, { fields });
			const events = await adapter.fetchEvents(MARCH_3);

			expect(events[0].title).toBe('Dynamiczna Vinyasa - PL');
			expect(events[1].title).toBe('NeuroJoga');
		});

		it('maps start/end from ISO timestamps', async () => {
			const adapter = createMappedAdapter(yogaEvents, { fields });
			const events = await adapter.fetchEvents(MARCH_3);

			expect(events[0].start).toBeInstanceOf(Date);
			expect(events[0].end).toBeInstanceOf(Date);
			expect(events[0].start.getHours()).toBe(7);
			expect(events[0].end.getHours()).toBe(8);
			expect(events[0].end.getMinutes()).toBe(15);
		});

		it('maps subtitle from teacher', async () => {
			const adapter = createMappedAdapter(yogaEvents, { fields });
			const events = await adapter.fetchEvents(MARCH_3);

			expect(events[0].subtitle).toBe('Piotr Szewczyk');
			expect(events[1].subtitle).toBe('Asia Tarkowska-Stukan');
		});

		it('maps location from room', async () => {
			const adapter = createMappedAdapter(yogaEvents, { fields });
			const events = await adapter.fetchEvents(MARCH_3);

			expect(events[0].location).toBe('Joga Centrum Kazimierz');
			expect(events[2].location).toBe('Joga Centrum Bronowice');
		});

		it('auto-assigns palette colors by default (ignores source colors)', async () => {
			const adapter = createMappedAdapter(yogaEvents, { fields });
			const events = await adapter.fetchEvents(MARCH_3);

			// Source had rgb(62,101,255) but autoColor is true by default
			// → palette color assigned instead
			expect(events[0].color).toBeTruthy();
			expect(events[0].color).not.toBe('#3e65ff');
			expect(events[1].color).not.toBe('#ef6950');
		});

		it('preserves source colors when autoColor is false', async () => {
			const adapter = createMappedAdapter(yogaEvents, { fields, autoColor: false });
			const events = await adapter.fetchEvents(MARCH_3);

			expect(events[0].color).toBe('#3e65ff');
			expect(events[1].color).toBe('#ef6950');
		});

		it('maps externalId from reference_id', async () => {
			const adapter = createMappedAdapter(yogaEvents, { fields });
			const events = await adapter.fetchEvents(MARCH_3);

			expect(events[0].externalId).toBe('abc123');
			expect(events[2].externalId).toBe('ghi789');
		});

		it('coerces is_cancelled boolean to EventStatus', async () => {
			const adapter = createMappedAdapter(yogaEvents, { fields });
			const events = await adapter.fetchEvents(MARCH_3);

			// First two are not cancelled → status omitted (confirmed)
			expect(events[0].status).toBeUndefined();
			// Third is cancelled
			expect(events[2].status).toBe('cancelled');
		});

		it('collects boolean fields as tags', async () => {
			const adapter = createMappedAdapter(yogaEvents, { fields });
			const events = await adapter.fetchEvents(MARCH_3);

			// is_free is false → not included; is_bookable_online is true → included
			expect(events[0].tags).toContain('bookable online');
			expect(events[0].tags).not.toContain('free');
		});

		it('stores unmapped fields in data', async () => {
			const adapter = createMappedAdapter(yogaEvents, { fields });
			const events = await adapter.fetchEvents(MARCH_3);

			expect(events[0].data).toBeDefined();
			expect(events[0].data!['total_capacity']).toBe(16);
			expect(events[0].data!['online_capacity']).toBe(16);
			expect(events[0].data!['waiting_list_capacity']).toBe(20);
		});

		it('returns empty for non-overlapping range', async () => {
			const adapter = createMappedAdapter(yogaEvents, { fields });
			const events = await adapter.fetchEvents(MARCH_5);

			expect(events).toHaveLength(0);
		});
	});

	describe('auto-detection (no explicit field mapping)', () => {
		it('auto-detects starts_at_iso / ends_at_iso', async () => {
			const adapter = createMappedAdapter(yogaEvents, {
				fields: { title: 'class_name' },
			});
			const events = await adapter.fetchEvents(MARCH_3);

			expect(events).toHaveLength(3);
			expect(events[0].start).toBeInstanceOf(Date);
		});

		it('auto-detects room as location', async () => {
			const adapter = createMappedAdapter(yogaEvents, {
				fields: { title: 'class_name' },
			});
			const events = await adapter.fetchEvents(MARCH_3);

			expect(events[0].location).toBe('Joga Centrum Kazimierz');
		});

		it('auto-detects reference_id as externalId', async () => {
			const adapter = createMappedAdapter(yogaEvents, {
				fields: { title: 'class_name' },
			});
			const events = await adapter.fetchEvents(MARCH_3);

			expect(events[0].externalId).toBe('abc123');
		});
	});

	describe('date + time string mode', () => {
		const simpleEvents = [
			{
				name: 'Morning Class',
				day: '2026-03-03',
				from: '09:00',
				to: '10:30',
				instructor: 'John',
			},
			{
				name: 'Evening Class',
				day: '2026-03-03',
				from: '18:00',
				to: '19:30',
				instructor: 'Jane',
			},
		];

		it('combines date + startTime/endTime', async () => {
			const adapter = createMappedAdapter(simpleEvents, {
				fields: {
					title: 'name',
					date: 'day',
					startTime: 'from',
					endTime: 'to',
					subtitle: 'instructor',
				},
			});
			const events = await adapter.fetchEvents(MARCH_3);

			expect(events).toHaveLength(2);
			expect(events[0].title).toBe('Morning Class');
			expect(events[0].start.getHours()).toBe(9);
			expect(events[0].end.getHours()).toBe(10);
			expect(events[0].end.getMinutes()).toBe(30);
			expect(events[0].subtitle).toBe('John');
		});
	});

	describe('custom mapper function', () => {
		it('uses mapEvent instead of field mapping', async () => {
			const rawData = [
				{ uid: 'x1', label: 'Custom Event', ts: '2026-03-03T10:00:00Z', dur: 90 },
			];

			const adapter = createMappedAdapter(rawData, {
				mapEvent: (raw) => ({
					id: String(raw.uid),
					title: String(raw.label),
					start: new Date(String(raw.ts)),
					end: new Date(new Date(String(raw.ts)).getTime() + Number(raw.dur) * 60000),
					data: { duration_min: raw.dur },
				}),
			});
			const events = await adapter.fetchEvents(MARCH_3);

			expect(events).toHaveLength(1);
			expect(events[0].title).toBe('Custom Event');
			expect(events[0].data?.duration_min).toBe(90);
		});
	});

	describe('color handling', () => {
		it('auto-assigns palette colors by default (ignores source rgb)', async () => {
			const adapter = createMappedAdapter(
				[{ title: 'Test', starts_at_iso: '2026-03-03T10:00:00Z', ends_at_iso: '2026-03-03T11:00:00Z', color: 'rgb(255, 0, 128)' }],
				{ fields: {} },
			);
			const events = await adapter.fetchEvents(MARCH_3);
			// autoColor: true → palette color, not source
			expect(events[0].color).toBeTruthy();
			expect(events[0].color).not.toBe('#ff0080');
		});

		it('preserves rgb() source colors with autoColor: false', async () => {
			const adapter = createMappedAdapter(
				[{ title: 'Test', starts_at_iso: '2026-03-03T10:00:00Z', ends_at_iso: '2026-03-03T11:00:00Z', color: 'rgb(255, 0, 128)' }],
				{ fields: {}, autoColor: false },
			);
			const events = await adapter.fetchEvents(MARCH_3);
			expect(events[0].color).toBe('#ff0080');
		});

		it('preserves hex colors with autoColor: false', async () => {
			const adapter = createMappedAdapter(
				[{ title: 'Test', starts_at_iso: '2026-03-03T10:00:00Z', ends_at_iso: '2026-03-03T11:00:00Z', color: '#abcdef' }],
				{ fields: {}, autoColor: false },
			);
			const events = await adapter.fetchEvents(MARCH_3);
			expect(events[0].color).toBe('#abcdef');
		});

		it('groups auto-colors by title — same title gets same color', async () => {
			const adapter = createMappedAdapter(
				[
					{ title: 'A', starts_at_iso: '2026-03-03T10:00:00Z', ends_at_iso: '2026-03-03T11:00:00Z' },
					{ title: 'B', starts_at_iso: '2026-03-03T12:00:00Z', ends_at_iso: '2026-03-03T13:00:00Z' },
					{ title: 'A', starts_at_iso: '2026-03-03T14:00:00Z', ends_at_iso: '2026-03-03T15:00:00Z' },
				],
				{ fields: {} },
			);
			const events = await adapter.fetchEvents(MARCH_3);
			expect(events[0].color).toBeTruthy();
			expect(events[1].color).toBeTruthy();
			expect(events[0].color).not.toBe(events[1].color);
			// Same title gets same color
			expect(events[2].color).toBe(events[0].color);
		});
	});

	describe('read-only mode', () => {
		it('throws on createEvent by default', async () => {
			const adapter = createMappedAdapter([], {});

			await expect(
				adapter.createEvent({ title: 'New', start: new Date(), end: new Date() }),
			).rejects.toThrow('read-only');
		});

		it('throws on updateEvent by default', async () => {
			const adapter = createMappedAdapter(yogaEvents, {
				fields: { title: 'class_name', start: 'starts_at_iso', end: 'ends_at_iso' },
			});

			await expect(
				adapter.updateEvent('abc123', { title: 'Updated' }),
			).rejects.toThrow('read-only');
		});

		it('throws on deleteEvent by default', async () => {
			const adapter = createMappedAdapter([], {});

			await expect(adapter.deleteEvent('xyz')).rejects.toThrow('read-only');
		});
	});

	describe('medical appointments (different domain)', () => {
		const appointments = [
			{
				appointment_id: 'apt-001',
				procedure_name: 'Dental Cleaning',
				scheduled_at: '2026-03-03T09:00:00Z',
				scheduled_end: '2026-03-03T09:45:00Z',
				doctor_name: 'Dr. Smith',
				doctor_id: 'doc-42',
				office: 'Room 3A',
				patient_count: 1,
				status: 'confirmed',
			},
			{
				appointment_id: 'apt-002',
				procedure_name: 'Root Canal',
				scheduled_at: '2026-03-03T10:00:00Z',
				scheduled_end: '2026-03-03T11:30:00Z',
				doctor_name: 'Dr. Jones',
				doctor_id: 'doc-17',
				office: 'Room 5B',
				patient_count: 1,
				status: 'tentative',
			},
		];

		it('maps medical fields correctly', async () => {
			const adapter = createMappedAdapter(appointments, {
				fields: {
					id: 'appointment_id',
					title: 'procedure_name',
					start: 'scheduled_at',
					end: 'scheduled_end',
					subtitle: 'doctor_name',
					location: 'office',
					resourceId: 'doctor_id',
					status: 'status',
				},
			});

			const events = await adapter.fetchEvents(MARCH_3);

			expect(events).toHaveLength(2);
			expect(events[0].title).toBe('Dental Cleaning');
			expect(events[0].subtitle).toBe('Dr. Smith');
			expect(events[0].location).toBe('Room 3A');
			expect(events[0].resourceId).toBe('doc-42');
			expect(events[0].id).toBe('apt-001');

			expect(events[1].status).toBe('tentative');
		});
	});

	describe('school timetable (another domain)', () => {
		const classes = [
			{
				subject: 'Mathematics',
				day: '2026-03-03',
				begin: '08:00',
				finish: '09:30',
				lecturer: 'Prof. Kowalski',
				classroom: 'B-204',
				group: 'CS-2A',
			},
		];

		it('maps school timetable fields', async () => {
			const adapter = createMappedAdapter(classes, {
				fields: {
					title: 'subject',
					date: 'day',
					startTime: 'begin',
					endTime: 'finish',
					subtitle: 'lecturer',
					location: 'classroom',
					category: 'group',
				},
			});

			const events = await adapter.fetchEvents(MARCH_3);

			expect(events).toHaveLength(1);
			expect(events[0].title).toBe('Mathematics');
			expect(events[0].subtitle).toBe('Prof. Kowalski');
			expect(events[0].location).toBe('B-204');
			expect(events[0].category).toBe('CS-2A');
		});
	});
});

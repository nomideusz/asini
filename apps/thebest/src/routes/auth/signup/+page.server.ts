import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { getLucia } from '$lib/server/auth.js';
import { getDb } from '$lib/server/db/index.js';
import { guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { Argon2id } from 'oslo/password';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/guide/tours');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');

		if (!name || !email || !password) {
			return fail(400, { error: 'All fields are required.' });
		}

		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters.' });
		}

		const db = getDb();

		const passwordHash = await new Argon2id().hash(password);
		const id = crypto.randomUUID();

		const [created] = await db
			.insert(guides)
			.values({ id, email, name, passwordHash })
			.onConflictDoNothing({ target: guides.email })
			.returning({ id: guides.id });

		if (!created) {
			return fail(400, { error: 'An account with this email already exists.' });
		}

		const lucia = getLucia();
		const session = await lucia.createSession(created.id, {});
		const sessionCookie = lucia.createSessionCookie(session.id);
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes,
		});

		redirect(302, '/guide/tours');
	},
};

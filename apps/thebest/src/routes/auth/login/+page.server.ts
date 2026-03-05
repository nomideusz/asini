import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { getLucia } from '$lib/server/auth.js';
import { getDb } from '$lib/server/db/index.js';
import { guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { Argon2id } from 'oslo/password';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, '/guide/tours');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required.' });
		}

		const db = getDb();
		const [guide] = await db.select().from(guides).where(eq(guides.email, email)).limit(1);

		if (!guide || !guide.passwordHash) {
			return fail(400, { error: 'Invalid email or password.' });
		}

		const valid = await new Argon2id().verify(guide.passwordHash, password);
		if (!valid) {
			return fail(400, { error: 'Invalid email or password.' });
		}

		const lucia = getLucia();
		const session = await lucia.createSession(guide.id, {});
		const sessionCookie = lucia.createSessionCookie(session.id);
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes,
		});

		throw redirect(302, '/guide/tours');
	},
};

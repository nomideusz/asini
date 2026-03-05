import type { Handle } from '@sveltejs/kit';
import { getLucia } from '$lib/server/auth.js';
import { getDb } from '$lib/server/db/index.js';
import { guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const handle: Handle = async ({ event, resolve }) => {
	const lucia = getLucia();
	const sessionId = event.cookies.get(lucia.sessionCookieName);

	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await lucia.validateSession(sessionId);

	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes,
		});
	}

	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes,
		});
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	// Fetch full guide record from DB so locals.user matches the Guide type
	const db = getDb();
	const [guide] = await db.select().from(guides).where(eq(guides.id, user.id)).limit(1);

	// Avoid storing sensitive fields like passwordHash in locals
	const safeUser = guide ? { ...guide, passwordHash: null } : null;

	event.locals.user = safeUser ?? null;
	event.locals.session = session;

	return resolve(event);
};

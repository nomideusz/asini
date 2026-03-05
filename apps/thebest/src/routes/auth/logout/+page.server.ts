import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { getLucia } from '$lib/server/auth.js';

export const load: PageServerLoad = async () => {
	throw redirect(302, '/');
};
export const actions: Actions = {
	default: async ({ locals, cookies }) => {
		if (!locals.session) {
			redirect(302, '/');
		}

		const lucia = getLucia();
		await lucia.invalidateSession(locals.session.id);

		const sessionCookie = lucia.createBlankSessionCookie();
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes,
		});

		redirect(302, '/');
	},
};

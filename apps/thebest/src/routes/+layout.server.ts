import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { user: null };
	}

	return {
		user: {
			id: locals.user.id,
			name: locals.user.name,
			email: locals.user.email,
		},
	};
};

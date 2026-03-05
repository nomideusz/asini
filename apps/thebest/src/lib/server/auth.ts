import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { getDb } from './db/index.js';
import { sessions, guides } from './db/schema.js';

function buildLucia() {
	const db = getDb();
	const adapter = new DrizzlePostgreSQLAdapter(db, sessions, guides);

	return new Lucia(adapter, {
		sessionCookie: {
			attributes: {
				secure: process.env.NODE_ENV === 'production',
			},
		},
		getUserAttributes(attributes) {
			return {
				email: attributes.email,
				name: attributes.name,
			};
		},
	});
}

// Lazy singleton — initialized on first use so DATABASE_URL errors surface at
// request time rather than at module load (which would break the build).
let _lucia: ReturnType<typeof buildLucia> | undefined;

export function getLucia() {
	if (!_lucia) {
		_lucia = buildLucia();
	}
	return _lucia;
}

declare module 'lucia' {
	interface Register {
		Lucia: ReturnType<typeof buildLucia>;
		DatabaseUserAttributes: {
			email: string;
			name: string;
		};
	}
}

export type { Session, User } from 'lucia';

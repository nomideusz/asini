import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
	if (!_stripe) {
		if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set');
		_stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover', typescript: true });
	}
	return _stripe;
}

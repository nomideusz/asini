import { error, fail, redirect } from '@sveltejs/kit';
import { getListingById } from '$lib/server/db/queries';
import { db } from '$lib/server/db';
import { claimRequests } from '$lib/server/db/schema';
import { sendClaimNotification } from '$lib/server/email';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const listing = await getListingById(params.id);

  if (!listing) {
    throw error(404, 'Nie znaleziono szkoły');
  }

  if (listing.source === 'manual') {
    throw redirect(302, `/listing/${params.id}`);
  }

  return { listing };
};

export const actions: Actions = {
  default: async ({ request, params }) => {
    const data = await request.formData();
    const name = data.get('name')?.toString().trim();
    const email = data.get('email')?.toString().trim();
    const phone = data.get('phone')?.toString().trim() || null;
    const role = data.get('role')?.toString().trim();
    const message = data.get('message')?.toString().trim() || null;

    if (!name || !email || !role) {
      return fail(400, {
        error: 'Wypełnij wymagane pola: imię, e-mail i rola.',
        name, email, phone, role, message,
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(400, {
        error: 'Podaj poprawny adres e-mail.',
        name, email, phone, role, message,
      });
    }

    const listing = await getListingById(params.id);

    await db.insert(claimRequests).values({
      schoolId: params.id,
      name,
      email,
      phone,
      role,
      message,
    });

    try {
      await sendClaimNotification({
        schoolName: listing?.name ?? params.id,
        schoolId: params.id,
        claimantName: name,
        claimantEmail: email,
        claimantPhone: phone,
        claimantRole: role,
        message,
      });
    } catch {
      // Email failure should not block the claim submission
    }

    return { success: true };
  },
};

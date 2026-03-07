<script lang="ts">
  import type { ActionData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";

  let { form }: { form: ActionData } = $props();
  const t = i18n.t;
</script>

<div class="flex min-h-screen items-center justify-center bg-base-200">
  <div class="card w-full max-w-sm bg-base-100 shadow-lg">
    <div class="card-body">
      <h1 class="card-title text-2xl">{t("auth_signup_title")}</h1>

      {#if form?.error}
        <div role="alert" class="alert alert-error">
          <span>{form.error}</span>
        </div>
      {/if}

      <form method="POST">
        <fieldset class="fieldset">
          <label class="fieldset-label" for="name"
            >{t("auth_signup_name")}</label
          >
          <input
            id="name"
            name="name"
            type="text"
            class="input input-bordered w-full"
            required
            autocomplete="name"
          />
        </fieldset>

        <fieldset class="fieldset mt-2">
          <label class="fieldset-label" for="email"
            >{t("auth_signup_email")}</label
          >
          <input
            id="email"
            name="email"
            type="email"
            class="input input-bordered w-full"
            required
            autocomplete="email"
          />
        </fieldset>

        <fieldset class="fieldset mt-2">
          <label class="fieldset-label" for="password"
            >{t("auth_signup_password")}</label
          >
          <input
            id="password"
            name="password"
            type="password"
            class="input input-bordered w-full"
            required
            minlength="8"
            autocomplete="new-password"
          />
        </fieldset>

        <div class="mt-4">
          <button type="submit" class="btn btn-primary w-full"
            >{t("auth_signup_submit")}</button
          >
        </div>
      </form>

      <p class="mt-2 text-center text-sm">
        {t("auth_signup_has_account")}
        <a href="/auth/login" class="link link-primary"
          >{t("auth_signup_login_link")}</a
        >
      </p>

      <!-- TODO: Google OAuth -->
      <!-- TODO: email verification flow -->
    </div>
  </div>
</div>

<script lang="ts">
  import type { ActionData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";

  let { form }: { form: ActionData } = $props();
  const t = i18n.t;
</script>

<div class="flex min-h-screen items-center justify-center bg-base-200">
  <div class="card w-full max-w-sm bg-base-100 shadow-lg">
    <div class="card-body">
      <h1 class="card-title text-2xl">{t("auth_login_title")}</h1>

      {#if form?.error}
        <div role="alert" class="alert alert-error">
          <span>{form.error}</span>
        </div>
      {/if}

      <form method="POST">
        <fieldset class="fieldset">
          <label class="fieldset-label" for="email"
            >{t("auth_login_email")}</label
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
            >{t("auth_login_password")}</label
          >
          <input
            id="password"
            name="password"
            type="password"
            class="input input-bordered w-full"
            required
            autocomplete="current-password"
          />
        </fieldset>

        <div class="mt-4">
          <button type="submit" class="btn btn-primary w-full"
            >{t("auth_login_submit")}</button
          >
        </div>
      </form>

      <p class="mt-2 text-center text-sm">
        {t("auth_login_no_account")}
        <a href="/auth/signup" class="link link-primary"
          >{t("auth_login_signup_link")}</a
        >
      </p>

      <!-- TODO: password reset -->
    </div>
  </div>
</div>

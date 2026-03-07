<script lang="ts">
  import type { ActionData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";

  let { form }: { form: ActionData } = $props();
  const t = i18n.t;
</script>

<div class="flex min-h-screen items-center justify-center bg-(--asini-bg-subtle)">
  <div class="w-full max-w-sm rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-bg) p-6" style="box-shadow: var(--asini-shadow);">
      <h1 class="text-base font-semibold mb-4" style="color: var(--asini-text);">{t("auth_signup_title")}</h1>

      {#if form?.error}
        <div role="alert" class="flex items-center gap-2 px-3 py-2 text-sm rounded-(--asini-radius) bg-red-50 text-red-700 border border-red-200 mb-4">
          <span>{form.error}</span>
        </div>
      {/if}

      <form method="POST">
        <div class="space-y-1">
          <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="name"
            >{t("auth_signup_name")}</label
          >
          <input
            id="name"
            name="name"
            type="text"
            class="asini-input"
            required
            autocomplete="name"
          />
        </div>

        <div class="space-y-1 mt-2">
          <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="email"
            >{t("auth_signup_email")}</label
          >
          <input
            id="email"
            name="email"
            type="email"
            class="asini-input"
            required
            autocomplete="email"
          />
        </div>

        <div class="space-y-1 mt-2">
          <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="password"
            >{t("auth_signup_password")}</label
          >
          <input
            id="password"
            name="password"
            type="password"
            class="asini-input"
            required
            minlength="8"
            autocomplete="new-password"
          />
        </div>

        <div class="mt-4">
          <button type="submit" class="asini-btn asini-btn-primary w-full"
            >{t("auth_signup_submit")}</button
          >
        </div>
      </form>

      <p class="mt-2 text-center text-sm">
        {t("auth_signup_has_account")}
        <a href="/auth/login" class="hover:underline" style="color: var(--asini-accent);"
          >{t("auth_signup_login_link")}</a
        >
      </p>

      <!-- TODO: Google OAuth -->
      <!-- TODO: email verification flow -->
  </div>
</div>

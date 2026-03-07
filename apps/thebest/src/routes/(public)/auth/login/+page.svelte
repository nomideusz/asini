<script lang="ts">
  import type { ActionData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";

  let { form }: { form: ActionData } = $props();
  const t = i18n.t;
</script>

<div class="flex min-h-screen items-center justify-center bg-(--asini-bg-subtle)">
  <div class="w-full max-w-sm rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-bg) p-6" style="box-shadow: var(--asini-shadow);">
      <h1 class="text-base font-semibold mb-4" style="color: var(--asini-text);">{t("auth_login_title")}</h1>

      {#if form?.error}
        <div role="alert" class="asini-alert asini-alert-danger mb-4">
          <span>{form.error}</span>
        </div>
      {/if}

      <form method="POST">
        <div class="space-y-1">
          <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="email"
            >{t("auth_login_email")}</label
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
            >{t("auth_login_password")}</label
          >
          <input
            id="password"
            name="password"
            type="password"
            class="asini-input"
            required
            autocomplete="current-password"
          />
        </div>

        <div class="mt-4">
          <button type="submit" class="asini-btn asini-btn-primary w-full"
            >{t("auth_login_submit")}</button
          >
        </div>
      </form>

      <p class="mt-2 text-center text-sm">
        {t("auth_login_no_account")}
        <a href="/auth/signup" class="hover:underline" style="color: var(--asini-accent);"
          >{t("auth_login_signup_link")}</a
        >
      </p>

      <!-- TODO: password reset -->
  </div>
</div>

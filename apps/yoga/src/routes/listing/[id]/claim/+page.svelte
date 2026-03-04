<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let listing = $derived(data.listing);
</script>

<svelte:head>
  <title>Przejmij profil — {listing.name} | szkolyjogi.pl</title>
  <meta name="description" content="Przejmij profil studia {listing.name} w katalogu szkolyjogi.pl." />
</svelte:head>

<div class="sf-page-shell">
  <Breadcrumbs crumbs={[
    { label: "Wszystkie szkoły", href: "/" },
    { label: listing.city, href: `/${listing.city.toLowerCase()}` },
    { label: listing.name, href: `/listing/${listing.id}` },
    { label: "Przejmij profil" },
  ]} />

  <div class="claim-layout">
    <div class="claim-main">
      {#if form?.success}
        <div class="success-card sf-card">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="var(--sf-accent)" stroke-width="1.5"/>
            <path d="M8 12.5l2.5 2.5L16 9.5" stroke="var(--sf-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h1 class="success-title">Zgłoszenie wysłane</h1>
          <p class="success-text">
            Dziękujemy! Twoje zgłoszenie dotyczące studia <strong>{listing.name}</strong> zostało zapisane.
            Skontaktujemy się z Tobą w ciągu 2 dni roboczych, aby potwierdzić tożsamość.
          </p>
          <a href="/listing/{listing.id}" class="back-link">← Wróć do profilu studia</a>
        </div>
      {:else}
        <header class="claim-header">
          <h1 class="claim-title">Przejmij profil</h1>
          <p class="claim-subtitle">
            Wypełnij formularz, aby przejąć zarządzanie profilem studia <strong>{listing.name}</strong>.
            Zweryfikujemy Twoją tożsamość i skontaktujemy się w ciągu 2 dni roboczych.
          </p>
        </header>

        {#if form?.error}
          <div class="form-error">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.5V8.5M8 10.5V11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            {form.error}
          </div>
        {/if}

        <form method="POST" class="claim-form">
          <div class="field">
            <label for="name" class="field-label">Imię i nazwisko <span class="required">*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              value={form?.name ?? ''}
              class="field-input"
              placeholder="Jan Kowalski"
            />
          </div>

          <div class="field">
            <label for="email" class="field-label">E-mail <span class="required">*</span></label>
            <input
              type="text"
              id="email"
              name="email"
              value={form?.email ?? ''}
              class="field-input"
              placeholder="jan@studio.pl"
            />
          </div>

          <div class="field">
            <label for="phone" class="field-label">Telefon</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={form?.phone ?? ''}
              class="field-input"
              placeholder="+48 123 456 789"
            />
          </div>

          <div class="field">
            <label for="role" class="field-label">Rola w studiu <span class="required">*</span></label>
            <select id="role" name="role" class="field-input">
              <option value="" disabled selected={!form?.role}>Wybierz...</option>
              <option value="owner" selected={form?.role === 'owner'}>Właściciel/ka</option>
              <option value="manager" selected={form?.role === 'manager'}>Manager/ka</option>
              <option value="instructor" selected={form?.role === 'instructor'}>Instruktor/ka</option>
            </select>
          </div>

          <div class="field">
            <label for="message" class="field-label">Dodatkowa wiadomość</label>
            <textarea
              id="message"
              name="message"
              rows="3"
              class="field-input field-textarea"
              placeholder="Np. link do strony studia potwierdzający powiązanie..."
            >{form?.message ?? ''}</textarea>
          </div>

          <button type="submit" class="submit-btn">Wyślij zgłoszenie</button>
        </form>
      {/if}
    </div>

    <aside class="claim-sidebar">
      <div class="sf-card panel studio-preview">
        <span class="panel-label">Studio</span>
        <h2 class="preview-name">{listing.name}</h2>
        <p class="preview-address">{listing.address}, {listing.city}</p>
        {#if listing.styles.length > 0}
          <p class="preview-styles">{listing.styles.join(', ')}</p>
        {/if}
      </div>

      <div class="sf-card panel info-panel">
        <span class="panel-label">Jak to działa?</span>
        <ol class="info-steps">
          <li>Wypełnij formularz obok</li>
          <li>Zweryfikujemy Twoją tożsamość</li>
          <li>Otrzymasz pełną kontrolę nad profilem</li>
        </ol>
        <p class="info-note">
          Przejęcie profilu jest bezpłatne i nie wymaga zobowiązań.
        </p>
      </div>
    </aside>
  </div>
</div>

<style>
  .claim-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 40px;
    align-items: start;
    padding-bottom: var(--spacing-xl);
  }

  /* ── Header ── */
  .claim-header {
    margin-bottom: var(--spacing-md);
  }

  .claim-title {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    font-weight: 400;
    color: var(--sf-dark);
    letter-spacing: -0.02em;
    margin-bottom: 12px;
  }

  .claim-subtitle {
    font-size: 0.95rem;
    line-height: 1.7;
    color: var(--sf-muted);
    max-width: 50ch;
  }
  .claim-subtitle strong { color: var(--sf-dark); }

  /* ── Form ── */
  .claim-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 480px;
  }

  .field-label {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sf-muted);
    font-weight: 600;
    margin-bottom: 6px;
  }

  .required { color: var(--sf-warm); }

  .field-input {
    display: block;
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-sm);
    background: var(--sf-card);
    color: var(--sf-dark);
    font-family: var(--font-body);
    font-size: 0.9rem;
    transition: border-color var(--dur-fast) ease;
  }
  .field-input:focus {
    outline: none;
    border-color: var(--sf-accent);
  }
  .field-input::placeholder { color: var(--sf-ice); }

  .field-textarea { resize: vertical; min-height: 80px; }

  select.field-input { cursor: pointer; }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 28px;
    background: var(--sf-accent);
    color: #fff;
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background var(--dur-fast) ease;
    align-self: flex-start;
  }
  .submit-btn:hover { background: var(--sf-accent-hover); }

  /* ── Error ── */
  .form-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    margin-bottom: 8px;
    border: 1px solid var(--sf-danger);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--sf-danger) 8%, transparent);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--sf-danger);
  }

  /* ── Success ── */
  .success-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 48px 32px;
    gap: 16px;
  }

  .success-title {
    font-family: var(--font-display);
    font-size: 1.6rem;
    font-weight: 400;
    color: var(--sf-dark);
  }

  .success-text {
    font-size: 0.95rem;
    line-height: 1.7;
    color: var(--sf-muted);
    max-width: 40ch;
  }
  .success-text strong { color: var(--sf-dark); }

  .back-link {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-accent);
    text-decoration: none;
    margin-top: 8px;
  }
  .back-link:hover { text-decoration: underline; text-underline-offset: 3px; }

  /* ── Sidebar ── */
  .claim-sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: sticky;
    top: 24px;
  }

  .panel { padding: var(--spacing-md); }
  .panel:hover { transform: none; box-shadow: none; }

  .panel-label {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--sf-accent);
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
  }

  .preview-name {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 500;
    color: var(--sf-dark);
    margin-bottom: 4px;
  }

  .preview-address {
    font-size: 0.85rem;
    color: var(--sf-muted);
    margin-bottom: 4px;
  }

  .preview-styles {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-accent);
  }

  .info-steps {
    padding-left: 18px;
    margin-bottom: 12px;
  }

  .info-steps li {
    font-size: 0.88rem;
    line-height: 1.7;
    color: var(--sf-text);
    margin-bottom: 4px;
  }

  .info-note {
    font-size: 0.8rem;
    color: var(--sf-muted);
    line-height: 1.6;
  }

  @media (max-width: 860px) {
    .claim-layout {
      grid-template-columns: 1fr;
      gap: 24px;
    }
    .claim-sidebar { position: static; }
  }
</style>

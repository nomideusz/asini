<script lang="ts">
	import type { ActionData } from './$types.js';

	let { form }: { form: ActionData } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-base-200">
	<div class="card w-full max-w-sm bg-base-100 shadow-lg">
		<div class="card-body">
			<h1 class="card-title text-2xl">Guide login</h1>

			{#if form?.error}
				<div role="alert" class="alert alert-error">
					<span>{form.error}</span>
				</div>
			{/if}

			<form method="POST">
				<fieldset class="fieldset">
					<label class="fieldset-label" for="email">Email</label>
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
					<label class="fieldset-label" for="password">Password</label>
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
					<button type="submit" class="btn btn-primary w-full">Log in</button>
				</div>
			</form>

			<p class="mt-2 text-center text-sm">
				No account yet?
				<a href="/auth/signup" class="link link-primary">Sign up</a>
			</p>

			<!-- TODO: password reset -->
		</div>
	</div>
</div>

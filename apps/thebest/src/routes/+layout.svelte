<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<!-- Mobile drawer wrapper -->
<div class="drawer">
	<input id="main-drawer" type="checkbox" class="drawer-toggle" />

	<div class="drawer-content flex flex-col min-h-screen">
		<!-- Navbar -->
		<header class="navbar bg-base-100 border-b border-base-200 sticky top-0 z-50">
			<div class="navbar-start">
				<!-- Mobile hamburger -->
				<label for="main-drawer" class="btn btn-ghost drawer-button lg:hidden">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</label>
				<a href="/" class="btn btn-ghost text-xl font-bold">thebest.travel</a>
			</div>

			<div class="navbar-center hidden lg:flex">
				<ul class="menu menu-horizontal px-1 gap-1">
					<li><a href="/">Home</a></li>
					<li><a href="/tours">Explore</a></li>
				</ul>
			</div>

			<div class="navbar-end gap-2">
				<a href="/auth/login" class="btn btn-ghost btn-sm">Login</a>
				<a href="/auth/signup" class="btn btn-primary btn-sm">Sign up</a>
			</div>
		</header>

		<!-- Main content -->
		<main class="flex-1">
			{@render children()}
		</main>

		<!-- Footer -->
		<footer class="footer footer-center bg-base-200 border-t border-base-300 p-6 text-base-content/70">
			<p class="text-sm">thebest.travel — Find Your Next Adventure</p>
		</footer>
	</div>

	<!-- Mobile drawer sidebar -->
	<div class="drawer-side z-50">
		<label for="main-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
		<ul class="menu bg-base-100 min-h-full w-64 p-4 gap-1">
			<li class="menu-title text-lg font-bold mb-2">
				<a href="/">thebest.travel</a>
			</li>
			<li><a href="/">Home</a></li>
			<li><a href="/tours">Explore</a></li>
			<div class="divider"></div>
			<li><a href="/auth/login" class="btn btn-ghost btn-sm justify-start">Login</a></li>
			<li><a href="/auth/signup" class="btn btn-primary btn-sm justify-start">Sign up</a></li>
		</ul>
	</div>
</div>

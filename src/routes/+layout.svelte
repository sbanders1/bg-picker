<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { init as initProfile } from '$lib/state/profile.svelte';
	import { init as initGames } from '$lib/state/games.svelte';
	import { init as initGroup } from '$lib/state/group.svelte';
	import { init as initSwipes } from '$lib/state/swipes.svelte';

	let { children } = $props();

	$effect(() => {
		initProfile();
		initGames();
		initGroup();
		initSwipes();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

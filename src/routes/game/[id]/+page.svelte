<script lang="ts">
	import { page } from '$app/state';
	import GameProfile from '$lib/components/GameProfile.svelte';

	const id = $derived(parseInt(page.params.id ?? '0', 10));
</script>

<GameProfile {id} />

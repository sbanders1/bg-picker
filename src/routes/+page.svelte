<script lang="ts">
	import { profile } from '$lib/state/profile.svelte';
	import ProfilePicker from '$lib/components/ProfilePicker.svelte';
	import PlayerHome from '$lib/components/PlayerHome.svelte';
</script>

{#if profile.id}
	<PlayerHome />
{:else}
	<ProfilePicker />
{/if}

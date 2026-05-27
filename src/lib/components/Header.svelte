<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		leading,
		trailing
	}: {
		title?: string;
		leading?: Snippet;
		trailing?: Snippet;
	} = $props();
</script>

<header class="hdr">
	<div class="hdr__slot">
		{#if leading}{@render leading()}{/if}
	</div>
	{#if title}
		<h1 class="hdr__title">{title}</h1>
	{:else}
		<div class="hdr__title"></div>
	{/if}
	<div class="hdr__slot hdr__slot--trailing">
		{#if trailing}{@render trailing()}{/if}
	</div>
</header>

<style>
	.hdr {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 80px;
		padding: 0 40px;
		border-bottom: 1px solid var(--border-subtle);
		background: var(--surface-primary);
	}
	.hdr__title {
		flex: 1;
		margin: 0;
		text-align: center;
		font-family: var(--font-heading);
		font-size: var(--text-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.hdr__slot {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 140px;
	}
	.hdr__slot--trailing {
		justify-content: flex-end;
	}
</style>

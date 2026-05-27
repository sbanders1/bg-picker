<script lang="ts">
	let { items }: { items: string[] } = $props();
</script>

<div class="stats">
	{#each items as item, i (i)}
		<span class="stats__item">{item}</span>
		{#if i < items.length - 1}
			<span class="stats__sep" aria-hidden="true">·</span>
		{/if}
	{/each}
</div>

<style>
	.stats {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-family: var(--font-caption);
		font-size: var(--text-sm);
		color: var(--foreground-tertiary);
	}
	.stats__sep {
		color: var(--foreground-tertiary);
		opacity: 0.6;
	}
</style>

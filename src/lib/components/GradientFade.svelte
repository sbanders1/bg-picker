<script lang="ts">
	let {
		position = 'bottom',
		height = 80
	}: {
		position?: 'top' | 'bottom';
		height?: number;
	} = $props();
</script>

<div
	class="fade"
	class:fade--top={position === 'top'}
	style:height="{height}px"
	aria-hidden="true"
></div>

<style>
	.fade {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		pointer-events: none;
		background: linear-gradient(to top, var(--surface-primary), rgba(255, 255, 255, 0));
	}
	.fade--top {
		top: 0;
		bottom: auto;
		background: linear-gradient(to bottom, var(--surface-primary), rgba(255, 255, 255, 0));
	}
</style>

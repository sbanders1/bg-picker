<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Size = 'md' | 'lg';

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		type = 'button',
		onclick,
		children
	}: {
		variant?: Variant;
		size?: Size;
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	} = $props();
</script>

<button class="btn btn--{variant} btn--{size}" {disabled} {type} {onclick}>
	{@render children()}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		border: none;
		border-radius: var(--radius-pill);
		font-family: var(--font-body);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
		transition:
			opacity 0.15s ease,
			transform 0.05s ease,
			background 0.15s ease;
	}
	.btn:active:not(:disabled) {
		transform: scale(0.98);
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn--md {
		padding: 10px 18px;
		font-size: var(--text-sm);
	}
	.btn--lg {
		padding: 14px 26px;
		font-size: var(--text-base);
	}

	.btn--primary {
		background: var(--accent-primary);
		color: var(--accent-on);
		box-shadow: 0 2px 8px rgba(74, 159, 216, 0.25);
	}
	.btn--primary:hover:not(:disabled) {
		opacity: 0.92;
	}

	.btn--secondary {
		background: var(--surface-tertiary);
		color: var(--foreground-primary);
	}
	.btn--secondary:hover:not(:disabled) {
		background: var(--border-subtle);
	}

	.btn--ghost {
		background: transparent;
		color: var(--foreground-primary);
	}
	.btn--ghost:hover:not(:disabled) {
		background: var(--surface-secondary);
	}

	.btn--danger {
		background: var(--danger);
		color: var(--accent-on);
	}
	.btn--danger:hover:not(:disabled) {
		opacity: 0.92;
	}
</style>

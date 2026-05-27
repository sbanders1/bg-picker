const KEY = 'gm.settings';

export const settings = $state<{
	/** When true, BGG calls return canned data instead of hitting the live API. */
	useMockBgg: boolean;
}>({
	useMockBgg: true
});

export function setUseMockBgg(v: boolean) {
	settings.useMockBgg = v;
	persist();
}

function persist() {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(KEY, JSON.stringify(settings));
}

export function init() {
	if (typeof localStorage === 'undefined') return;
	const raw = localStorage.getItem(KEY);
	if (!raw) return;
	try {
		Object.assign(settings, JSON.parse(raw));
	} catch {
		/* corrupt entry — ignore */
	}
}

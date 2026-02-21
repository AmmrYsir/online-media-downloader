import { createSignal, onMount, Show, For } from 'solid-js'

// ── Types ────────────────────────────────────────────────────────────────────

type AppStatus = 'idle' | 'loading' | 'success' | 'error'

interface DownloadResult {
	status: string
	message: string
	filename: string
	download_url: string
}

// ── Constants ────────────────────────────────────────────────────────────────

// Read from the Vite env – falls back to localhost for local development.
// Set VITE_API_BASE in a .env file when deploying to a different host.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'

const PLATFORMS = [
	{ name: 'YouTube', pattern: /youtube\.com|youtu\.be/i },
	{ name: 'Instagram', pattern: /instagram\.com/i },
	{ name: 'TikTok', pattern: /tiktok\.com/i },
	{ name: 'Facebook', pattern: /facebook\.com|fb\.watch/i },
	{ name: 'Generic', pattern: /^https?:\/\//i },
]

function detectPlatform(url: string): string | null {
	const matched = PLATFORMS.find(p => p.pattern.test(url))
	return matched?.name ?? null
}

// ── Component ────────────────────────────────────────────────────────────────

const App = () => {
	const [url, setUrl] = createSignal('')
	const [status, setStatus] = createSignal<AppStatus>('idle')
	const [result, setResult] = createSignal<DownloadResult | null>(null)
	const [errorMsg, setErrorMsg] = createSignal('')

	// ── Theme ──────────────────────────────────────────────────────────────────
	const [isDark, setIsDark] = createSignal(true)

	onMount(() => {
		const saved = localStorage.getItem('theme')
		const dark = saved ? saved === 'dark' : true
		setIsDark(dark)
		document.documentElement.classList.toggle('light', !dark)
	})

	const toggleTheme = () => {
		const next = !isDark()
		setIsDark(next)
		document.documentElement.classList.toggle('light', !next)
		localStorage.setItem('theme', next ? 'dark' : 'light')
	}

	const platform = () => (url() ? detectPlatform(url()) : null)
	const isLoading = () => status() === 'loading'

	const handleDownload = async (e: SubmitEvent) => {
		e.preventDefault()
		const trimmed = url().trim()
		if (!trimmed) return

		// Client-side scheme guard — block javascript:, data:, file:, etc.
		try {
			const parsed = new URL(trimmed)
			if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
				setErrorMsg(`Unsupported URL scheme "${parsed.protocol}". Only http and https are allowed.`)
				setStatus('error')
				return
			}
		} catch {
			setErrorMsg('Invalid URL. Please enter a valid http or https URL.')
			setStatus('error')
			return
		}

		setStatus('loading')
		setResult(null)
		setErrorMsg('')

		try {
			const res = await fetch(`${API_BASE}/api/download`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: trimmed }),
			})

			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				throw new Error(data.detail ?? `Server error ${res.status}`)
			}

			const data: DownloadResult = await res.json()
			setResult(data)
			setStatus('success')
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Unknown error occurred'
			setErrorMsg(msg)
			setStatus('error')
		}
	}

	const reset = () => {
		setUrl('')
		setStatus('idle')
		setResult(null)
		setErrorMsg('')
	}

	return (
		<div class="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-16">

			{/* ── Theme toggle ── */}
			<button
				type="button"
				onClick={toggleTheme}
				aria-label="Toggle light/dark mode"
				class="fixed top-4 right-4 w-9 h-9 flex items-center justify-center border transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan"
				style={{
					background: 'var(--color-surface)',
					'border-color': 'var(--color-border)',
					color: 'var(--color-muted)',
				}}
			>
				{/* Sun icon (light mode) / Moon icon (dark mode) */}
				<Show
					when={isDark()}
					fallback={
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<circle cx="12" cy="12" r="5" />
							<line x1="12" y1="1" x2="12" y2="3" />
							<line x1="12" y1="21" x2="12" y2="23" />
							<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
							<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
							<line x1="1" y1="12" x2="3" y2="12" />
							<line x1="21" y1="12" x2="23" y2="12" />
							<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
							<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
						</svg>
					}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
				</Show>
			</button>

			{/* ── Header ── */}
			<header class="mb-14 text-center select-none">
				<div class="flex items-center justify-center gap-3 mb-3">
					{/* Accent bar — the differentiation anchor */}
					<span
						class="inline-block w-[3px] h-10 bg-cyan"
						style={{ 'box-shadow': '0 0 12px var(--color-cyan)' }}
					/>
					<h1
						class="text-[2.75rem] font-bold text-text tracking-[-0.03em] leading-none uppercase"
						style={{ 'font-family': 'var(--font-display)' }}
					>
						MediaDL
					</h1>
				</div>
				<p class="text-xs text-muted tracking-[0.25em] uppercase">
					Video Download Utility
				</p>
			</header>

			{/* ── Main card ── */}
			<main class="w-full max-w-[520px]">

				<form onSubmit={handleDownload}>
					{/* URL input block */}
					<div
						class="border transition-colors duration-200"
						style={{
							'border-color': url()
								? 'color-mix(in srgb, var(--color-cyan) 40%, transparent)'
								: 'var(--color-border)',
							'background': 'var(--color-surface)',
						}}
					>
						{/* Field label */}
						<label
							for="video-url"
							class="block px-4 pt-3 pb-0.5 text-[9px] tracking-[0.3em] text-muted uppercase"
						>
							Video URL
						</label>

						{/* Input row */}
						<div class="flex items-center">
							<span class="pl-4 pr-2 text-cyan/50 select-none text-sm pb-3 pt-1">›</span>
							<input
								id="video-url"
								type="url"
								value={url()}
								onInput={e => setUrl(e.currentTarget.value)}
								placeholder="https://youtube.com/watch?v=..."
								class="flex-1 bg-transparent pb-3 pr-4 text-sm text-text placeholder-dim outline-none"
								style={{ 'font-family': 'var(--font-mono)' }}
								required
								autocomplete="off"
								spellcheck={false}
								disabled={isLoading()}
							/>
							{/* Detected platform chip */}
							<Show when={platform()}>
								<span
									class="mr-3 text-[9px] px-2 py-0.5 border tracking-[0.15em] uppercase shrink-0 self-center"
									style={{
										color: 'var(--color-cyan)',
										'border-color': 'color-mix(in srgb, var(--color-cyan) 35%, transparent)',
										background: 'color-mix(in srgb, var(--color-cyan) 7%, transparent)',
									}}
								>
									{platform()}
								</span>
							</Show>
						</div>
					</div>

					{/* Scanning progress bar */}
					<div
						class="h-[2px] overflow-hidden"
						style={{ background: 'var(--color-border-dim, #1a1a1a)' }}
					>
						<Show when={isLoading()}>
							<div
								class="h-full w-1/4 animate-scan"
								style={{ background: 'var(--color-cyan)' }}
							/>
						</Show>
					</div>

					{/* CTA button */}
					<button
						type="submit"
						disabled={isLoading()}
						class="w-full py-3.5 text-sm font-bold uppercase tracking-[0.25em] transition-all duration-150 mt-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan"
						style={
							isLoading()
								? { background: 'var(--color-surface-2)', color: 'var(--color-dim)', cursor: 'not-allowed' }
								: { background: 'var(--color-cyan)', color: 'var(--color-bg)' }
						}
					>
						{isLoading() ? 'Fetching…' : 'Download'}
					</button>
				</form>

				{/* ── Platform support tags ── */}
				<div class="flex items-center gap-3 mt-4 px-0.5">
					<span class="text-[9px] text-dim tracking-[0.25em] uppercase shrink-0">Supports</span>
					<div class="flex gap-1.5 flex-wrap">
						<For each={PLATFORMS}>
							{(p) => (
								<span
									class="text-[9px] px-2 py-0.5 border tracking-wider uppercase transition-colors duration-150"
									style={
										platform() === p.name
											? {
												color: 'var(--color-cyan)',
												'border-color': 'color-mix(in srgb, var(--color-cyan) 40%, transparent)',
												background: 'color-mix(in srgb, var(--color-cyan) 8%, transparent)',
											}
											: {
												color: 'var(--color-dim)',
												'border-color': 'var(--color-border)',
											}
									}
								>
									{p.name}
								</span>
							)}
						</For>
					</div>
				</div>

				{/* ── Success state ── */}
				<Show when={status() === 'success' && result()}>
					{(res) => (
						<div
							class="mt-5 p-5 animate-slidein"
							style={{
								border: '1px solid color-mix(in srgb, var(--color-green) 25%, transparent)',
								background: 'color-mix(in srgb, var(--color-green) 5%, transparent)',
							}}
						>
							<div class="flex items-center gap-2 mb-4">
								<span
									class="inline-block w-1.5 h-1.5 rounded-full"
									style={{ background: 'var(--color-green)' }}
								/>
								<span
									class="text-[9px] tracking-[0.3em] uppercase"
									style={{ color: 'var(--color-green)' }}
								>
									Ready to save
								</span>
							</div>

							<p class="text-[10px] text-muted uppercase tracking-widest mb-1">Filename</p>
							<p
								class="text-sm text-text break-all mb-5 leading-relaxed"
								style={{ 'font-family': 'var(--font-mono)' }}
							>
								{res().filename}
							</p>

							<div class="flex gap-3">
								<a
									href={`${API_BASE}${res().download_url}`}
									download={res().filename}
									rel="noopener noreferrer"
									class="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] px-4 py-2.5 font-medium transition-colors duration-150"
									style={{
										border: '1px solid color-mix(in srgb, var(--color-green) 40%, transparent)',
										color: 'var(--color-green)',
									}}
								>
									<span aria-hidden="true">↓</span>
									Save file
								</a>
								<button
									type="button"
									onClick={reset}
									class="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] px-4 py-2.5 font-medium transition-colors duration-150"
									style={{ border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
								>
									New download
								</button>
							</div>
						</div>
					)}
				</Show>

				{/* ── Error state ── */}
				<Show when={status() === 'error'}>
					<div
						class="mt-5 p-5 animate-slidein"
						style={{
							border: '1px solid color-mix(in srgb, var(--color-red) 25%, transparent)',
							background: 'color-mix(in srgb, var(--color-red) 5%, transparent)',
						}}
					>
						<div class="flex items-center gap-2 mb-3">
							<span
								class="inline-block w-1.5 h-1.5 rounded-full"
								style={{ background: 'var(--color-red)' }}
							/>
							<span
								class="text-[9px] tracking-[0.3em] uppercase"
								style={{ color: 'var(--color-red)' }}
							>
								Download failed
							</span>
						</div>
						<p
							class="text-sm leading-relaxed"
							style={{ color: 'color-mix(in srgb, var(--color-red) 70%, var(--color-text))', 'font-family': 'var(--font-mono)' }}
						>
							{errorMsg()}
						</p>
						<button
							type="button"
							onClick={reset}
							class="mt-4 text-[10px] uppercase tracking-[0.2em] transition-colors duration-150"
							style={{ color: 'var(--color-muted)' }}
						>
							← Try again
						</button>
					</div>
				</Show>

			</main>

			{/* ── Footer ── */}
			<footer class="mt-16 text-[9px] tracking-[0.3em] uppercase" style={{ color: 'var(--color-border)' }}>
				Powered by yt-dlp
			</footer>
		</div>
	)
}

export default App


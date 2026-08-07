/**
 * The application shell — the ambient frame every screen sits inside.
 *
 * Phase 4 composes the header, the active tab view, the modals and the toast into this
 * frame. What is here today is the frame itself: the foundry ground, the blueprint grid the
 * studio is laid out on, and the drifting glow behind it.
 */
export function App() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-foundry-900 text-ink">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />
      <div
        aria-hidden="true"
        className="animate-float-orb pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />

      <main
        id="main-content"
        className="animate-fade-in relative mx-auto flex min-h-dvh max-w-6xl flex-col items-center justify-center gap-4 px-6"
      >
        <img
          src="/icon-192.png"
          alt=""
          width={72}
          height={72}
          className="rounded-2xl [image-rendering:pixelated]"
        />
        <h1 className="font-mono text-3xl font-semibold tracking-tight">Sprite Gubbins</h1>
        <p className="max-w-prose text-center text-ink-muted">
          Prompt studio for game sprite sheets and texture atlases.
        </p>
      </main>
    </div>
  );
}

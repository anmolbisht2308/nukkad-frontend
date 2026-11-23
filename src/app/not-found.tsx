import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[80svh] max-w-xl flex-col items-center justify-center px-5 pt-24 text-center">
      <p className="text-6xl" aria-hidden>
        🛺
      </p>
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">This corner is empty</h1>
      <p className="mt-3 text-ink/70">We couldn&apos;t find that page. It may have moved, or the link has a typo.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/pulse" className="btn-primary">
          See what&apos;s on today
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-2xl px-5 py-3 font-semibold ring-1 ring-ink/15 hover:bg-ink/5">
          Go home
        </Link>
      </div>
    </main>
  );
}

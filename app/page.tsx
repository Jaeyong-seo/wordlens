import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 p-6 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">
          Word<span className="text-red-500">Lens</span>
        </h1>
        <p className="mt-3 text-slate-400">
          Underline words in red while you read.
          <br />
          Definitions appear on your tablet in real time.
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
        <Link
          href="/viewer"
          className="rounded-2xl bg-red-600 px-6 py-5 text-xl font-semibold text-white shadow-lg transition hover:bg-red-500"
        >
          📖 Start on tablet (Viewer)
        </Link>
        <Link
          href="/camera"
          className="rounded-2xl bg-slate-800 px-6 py-5 text-xl font-semibold text-white shadow-lg transition hover:bg-slate-700"
        >
          📷 Connect phone (Camera)
        </Link>
        <Link
          href="/words"
          className="rounded-2xl border border-slate-700 px-6 py-4 text-lg text-slate-300 transition hover:bg-slate-900"
        >
          📚 My vocabulary
        </Link>
      </div>

      <ol className="text-left text-sm leading-6 text-slate-500">
        <li>1. Open the viewer on your tablet — it shows a room code.</li>
        <li>2. On your phone, open the camera page and enter the code.</li>
        <li>3. Mount the phone above your book and underline in red.</li>
      </ol>
    </main>
  );
}

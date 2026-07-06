import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 p-6 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">
          Word<span className="text-red-500">Lens</span>
        </h1>
        <p className="mt-3 text-slate-400">
          책에 빨간 펜으로 밑줄만 치세요.
          <br />
          태블릿에 단어 뜻이 실시간으로 나타납니다.
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
        <Link
          href="/viewer"
          className="rounded-2xl bg-red-600 px-6 py-5 text-xl font-semibold text-white shadow-lg transition hover:bg-red-500"
        >
          📖 태블릿에서 시작 (뷰어)
        </Link>
        <Link
          href="/camera"
          className="rounded-2xl bg-slate-800 px-6 py-5 text-xl font-semibold text-white shadow-lg transition hover:bg-slate-700"
        >
          📷 폰에서 연결 (카메라)
        </Link>
        <Link
          href="/words"
          className="rounded-2xl border border-slate-700 px-6 py-4 text-lg text-slate-300 transition hover:bg-slate-900"
        >
          📚 내 단어장
        </Link>
      </div>

      <ol className="text-left text-sm leading-6 text-slate-500">
        <li>1. 태블릿에서 뷰어를 열면 방 코드가 나옵니다.</li>
        <li>2. 폰 카메라 페이지에서 코드를 입력하거나 QR을 스캔합니다.</li>
        <li>3. 폰을 책 위에 거치하고 빨간 펜으로 밑줄을 치세요.</li>
      </ol>
    </main>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#12131A] text-[#F1EEE6] flex items-center justify-center px-6">
      <div className="text-center">
        <p className="mb-6 text-xs tracking-[0.35em] text-[#8B8D98]">
          VEEREEL.TV
        </p>

        <h1 className="text-6xl md:text-8xl font-black tracking-tight">
          VEEREEL
        </h1>

        <p className="mt-6 text-lg md:text-xl text-[#8B8D98]">
          Vertical stories. Made for the way we watch now.
        </p>

        <a
          href="/kilig"
          className="inline-block mt-10 rounded-full bg-[#E8A33D] px-8 py-4 text-sm font-bold tracking-wide text-[#12131A] transition-transform hover:scale-105"
        >
          ENTER KILIG →
        </a>
      </div>
    </main>
  );
}

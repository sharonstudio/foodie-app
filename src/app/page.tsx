import { getPlaces } from "@/lib/places";
import PlaceList from "@/components/place-list";

export default async function Home() {
  const places = await getPlaces();

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">
              Foodie Runs The World
            </h1>
            <p className="text-xs text-stone-400">Sharon&apos;s picks</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div>
          <h2 className="text-2xl font-semibold leading-snug text-stone-900">
            Where are you eating?
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Pick a vibe and I&apos;ll point you somewhere good.
          </p>
        </div>

        <PlaceList places={places} />
      </main>
    </div>
  );
}

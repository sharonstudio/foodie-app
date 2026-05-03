import { NextRequest, NextResponse } from "next/server";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://www.google.com/maps",
};

// ---------------------------------------------------------------------------
// Extract list ID from any Google Maps list URL
// ---------------------------------------------------------------------------

async function extractListId(inputUrl: string): Promise<string | null> {
  // Already a full placelists URL: /placelists/list/LIST_ID
  const directMatch = inputUrl.match(/placelists\/list\/([a-zA-Z0-9_-]+)/);
  if (directMatch) return directMatch[1];

  // Short URL (maps.app.goo.gl) or @/data= URL — follow redirect
  try {
    const res = await fetch(inputUrl, { redirect: "follow", headers: HEADERS });
    const finalUrl = res.url;

    // Pattern in redirected URL: !2sLIST_ID!3e3
    const match = finalUrl.match(/!2s([a-zA-Z0-9_+/=-]{20,})!3e3/);
    if (match) return match[1];
  } catch {
    return null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Fetch and parse the list
// ---------------------------------------------------------------------------

interface ImportedPlace {
  name: string;
  note: string;
  lat: number | null;
  lng: number | null;
  googleMapsUrl: string;
}

async function fetchList(
  listId: string
): Promise<{ listName: string; places: ImportedPlace[] }> {
  const pb = encodeURIComponent(
    `!1m4!1s${listId}!2e1!3m1!1e1!2e2!3e2!4i500!6m3!1sjKL3aa_8GovywPAPvdqC2As!15i204459!28e2!16b1`
  );
  const url = `https://www.google.com/maps/preview/entitylist/getlist?authuser=0&hl=en&gl=en&pb=${pb}`;

  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  const text = await res.text();

  // Strip Google's anti-XSS prefix: )]}'\n
  const json = text.replace(/^\)\]\}'\n/, "");
  const data = JSON.parse(json);

  const inner = data[0];
  const listName: string = inner[4] ?? "Imported list";
  const rawPlaces: unknown[] = inner[8] ?? [];

  const places: ImportedPlace[] = rawPlaces
    .map((p: unknown) => {
      const place = p as unknown[];
      const meta = place[1] as unknown[];
      const name = place[2] as string;
      const note = (place[3] as string) ?? "";
      const coords = meta?.[5] as unknown[];
      const lat = coords?.[2] as number | null;
      const lng = coords?.[3] as number | null;

      const mapsUrl =
        lat && lng
          ? `https://www.google.com/maps/place/${encodeURIComponent(name)}/@${lat},${lng},17z`
          : "";

      return { name, note, lat: lat ?? null, lng: lng ?? null, googleMapsUrl: mapsUrl };
    })
    .filter((p) => p.name);

  return { listName, places };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  const listId = await extractListId(url);
  if (!listId) {
    return NextResponse.json(
      { error: "Could not find a list ID in that URL. Make sure the list is public." },
      { status: 400 }
    );
  }

  const { listName, places } = await fetchList(listId);
  return NextResponse.json({ listName, places });
}

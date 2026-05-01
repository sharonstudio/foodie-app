import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.SHEET_URL;

  if (!url) {
    return NextResponse.json({ error: "SHEET_URL is not set" });
  }

  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    return NextResponse.json({
      urlSet: true,
      urlPreview: url.slice(0, 60) + "...",
      status: res.status,
      csvPreview: text.slice(0, 200),
    });
  } catch (e) {
    return NextResponse.json({ urlSet: true, error: String(e) });
  }
}

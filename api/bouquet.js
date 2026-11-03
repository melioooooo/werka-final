// Pixel-art bouquet pictures: Pollinations rejects browser Origin headers, so the browser calls this route (spec v5 §8).
export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const prompt = q.get('prompt') ?? '', seed = Number(q.get('seed'));
  if (!prompt || prompt.length > 1500 || !Number.isInteger(seed)) return new Response('Bad request', { status: 400 });
  const r = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}`);
  const type = r.headers.get('content-type') ?? '';
  if (!r.ok || !type.startsWith('image/')) return new Response('Upstream failed', { status: 502 });
  return new Response(r.body, { headers: { 'content-type': type, 'cache-control': 'public, max-age=31536000, immutable' } });
}

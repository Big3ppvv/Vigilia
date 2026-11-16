/*
 * Recursos de la edición completa. Si el HTML trae cartas ilustradas y música
 * incrustadas (en base64, dentro de <script type="text/plain">), se
 * descodifican cuando hacen falta y se guardan en caché. En la edición normal
 * no hay ninguno: has() devuelve false y el juego sigue igual.
 */
let manifest = null;
try { manifest = JSON.parse(document.getElementById('vigilia-recursos')?.textContent || 'null'); } catch { manifest = null; }

const images = new Map();
const buffers = new Map();
const pending = new Map();
const MAX_BUFFERS = 4;

function text(entry) { return document.getElementById(entry.id)?.textContent || ''; }

function bytesOf(b64) {
  const bin = atob(b64), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const Assets = {
  get available() { return !!manifest; },
  get info() { return manifest ? {count: Object.keys(manifest.items).length, bytes: manifest.bytes} : null; },
  has(key) { return !!manifest?.items?.[key]; },
  meta(key) { return manifest?.items?.[key] || null; },

  /* Imagen lista para un <img>: URL de blob creada la primera vez. */
  image(key) {
    if (images.has(key)) return images.get(key);
    const entry = manifest?.items?.[key];
    if (!entry) return null;
    try {
      const url = URL.createObjectURL(new Blob([bytesOf(text(entry))], {type: entry.mime}));
      images.set(key, url);
      // La imagen ya vive en el blob: el texto base64 deja de hacer falta.
      document.getElementById(entry.id)?.remove();
      return url;
    } catch {
      return null;
    }
  },

  /* Audio descodificado para un contexto; se guardan los últimos usados. */
  async buffer(ctx, key) {
    if (buffers.has(key)) { const b = buffers.get(key); buffers.delete(key); buffers.set(key, b); return b; }
    if (pending.has(key)) return pending.get(key);
    const entry = manifest?.items?.[key];
    if (!entry || !ctx) return null;
    const job = (async () => {
      const data = bytesOf(text(entry)).buffer;
      const decoded = await ctx.decodeAudioData(data);
      buffers.set(key, decoded);
      while (buffers.size > MAX_BUFFERS) buffers.delete(buffers.keys().next().value);
      return decoded;
    })().catch(() => null).finally(() => pending.delete(key));
    pending.set(key, job);
    return job;
  }
};

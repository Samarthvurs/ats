import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const MAX_PAGES = 8;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Maps an item-index concatenation of a page's text so multi-word terms
// (e.g. "REST API", "Node.js") that pdf.js splits across separate text
// items can still be located and mapped back to the items that cover them.
function buildPageIndex(items) {
  let concat = '';
  const ranges = [];
  items.forEach((it, idx) => {
    const s = it.str || '';
    const start = concat.length;
    concat += s;
    ranges.push({ start, end: concat.length, idx });
    concat += ' ';
  });
  return { concat, ranges };
}

function findItemIndicesForTerm(pageIndex, term) {
  const { concat, ranges } = pageIndex;
  const pattern = escapeRegExp(term.trim()).replace(/\s+/g, '\\s+');
  if (!pattern) return [];
  let re;
  try { re = new RegExp(pattern, 'ig'); } catch (e) { return []; }
  const hits = new Set();
  let m;
  let guard = 0;
  while ((m = re.exec(concat)) && guard++ < 200) {
    const s = m.index, e = m.index + m[0].length;
    ranges.forEach(r => { if (r.end > s && r.start < e) hits.add(r.idx); });
    if (m[0].length === 0) re.lastIndex++;
  }
  return [...hits];
}

const PdfHighlightViewer = ({ file, explicitTerms = [], semanticChunks = [] }) => {
  const [pages, setPages] = useState([]); // [{canvasDataUrl, width, height, boxes}]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setPages([]);
      try {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        const numPages = Math.min(pdf.numPages, MAX_PAGES);
        const rendered = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.4 });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;

          const textContent = await page.getTextContent();
          const items = textContent.items;
          const pageIndex = buildPageIndex(items);

          const explicitIdx = new Set();
          explicitTerms.forEach(term => findItemIndicesForTerm(pageIndex, term).forEach(i => explicitIdx.add(i)));

          const semanticIdx = new Set();
          if (!explicitTerms.length || semanticChunks.length) {
            const normalizedChunks = semanticChunks.map(c => c.toLowerCase());
            items.forEach((it, idx) => {
              if (explicitIdx.has(idx)) return;
              const s = (it.str || '').trim();
              if (s.length < 3) return;
              const sLower = s.toLowerCase();
              if (normalizedChunks.some(c => c.includes(sLower))) semanticIdx.add(idx);
            });
          }

          const boxes = [];
          items.forEach((it, idx) => {
            if (!explicitIdx.has(idx) && !semanticIdx.has(idx)) return;
            const tx = pdfjs.Util.transform(viewport.transform, it.transform);
            const fontHeight = Math.hypot(tx[2], tx[3]);
            const width = (it.width || 0) * viewport.scale;
            boxes.push({
              left: tx[4],
              top: tx[5] - fontHeight,
              width: Math.max(width, 4),
              height: fontHeight * 1.15,
              type: explicitIdx.has(idx) ? 'explicit' : 'semantic',
            });
          });

          rendered.push({
            dataUrl: canvas.toDataURL('image/png'),
            width: viewport.width,
            height: viewport.height,
            boxes,
          });
        }

        if (!cancelled) setPages(rendered);
      } catch (e) {
        console.error('PDF render failed:', e);
        if (!cancelled) setError('Could not render this PDF — showing plain text instead may work better.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (file) run();
    return () => { cancelled = true; };
    // Depend on content, not array identity — a caller passing a fresh []
    // literal every render must never restart this (expensive, async) effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, explicitTerms.join(''), semanticChunks.join('')]);

  if (!file) return null;

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {loading && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="spin" style={{ width: 28, height: 28, border: '3px solid var(--s2)', borderTopColor: 'var(--ind)', borderRadius: '50%', margin: '0 auto 14px' }} />
          <p style={{ fontSize: '.82rem', color: 'var(--ts)' }}>Rendering PDF…</p>
        </div>
      )}
      {error && <p style={{ fontSize: '.82rem', color: 'var(--red)', padding: 20 }}>{error}</p>}
      {pages.map((p, i) => (
        <div key={i} style={{ position: 'relative', width: '100%', maxWidth: p.width, boxShadow: '0 2px 12px rgba(0,0,0,.08)', borderRadius: 4, overflow: 'hidden' }}>
          <img src={p.dataUrl} alt={`Page ${i + 1}`} style={{ display: 'block', width: '100%', height: 'auto' }} />
          <div style={{ position: 'absolute', inset: 0 }}>
            {p.boxes.map((b, bi) => (
              <div
                key={bi}
                style={{
                  position: 'absolute',
                  left: `${(b.left / p.width) * 100}%`,
                  top: `${(b.top / p.height) * 100}%`,
                  width: `${(b.width / p.width) * 100}%`,
                  height: `${(b.height / p.height) * 100}%`,
                  background: b.type === 'explicit' ? 'rgba(48,209,88,.35)' : 'rgba(94,92,230,.35)',
                  borderRadius: 2,
                  pointerEvents: 'none',
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PdfHighlightViewer;

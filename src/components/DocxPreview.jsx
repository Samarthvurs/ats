import { useEffect, useRef, useState } from 'react';
import mammoth from 'mammoth';

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function highlightContainer(container, explicitTerms, semanticChunks) {
  if (!container) return;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  const normalizedChunks = (semanticChunks || []).map(c => c.toLowerCase());

  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    if (!text || !text.trim()) return;

    const matches = [];
    (explicitTerms || []).forEach(term => {
      const t = term.trim();
      if (!t) return;
      let re;
      try { re = new RegExp(escapeRegExp(t).replace(/\s+/g, '\\s+'), 'ig'); } catch (e) { return; }
      let m;
      let guard = 0;
      while ((m = re.exec(text)) && guard++ < 50) {
        matches.push({ start: m.index, end: m.index + m[0].length, type: 'explicit' });
        if (m[0].length === 0) re.lastIndex++;
      }
    });

    if (matches.length === 0) {
      const trimmed = text.trim();
      if (trimmed.length >= 4 && normalizedChunks.some(c => c.includes(trimmed.toLowerCase()))) {
        matches.push({ start: 0, end: text.length, type: 'semantic' });
      }
    }
    if (!matches.length) return;

    matches.sort((a, b) => a.start - b.start);
    const frag = document.createDocumentFragment();
    let cursor = 0;
    matches.forEach(m => {
      if (m.start < cursor) return;
      if (m.start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, m.start)));
      const mark = document.createElement('mark');
      mark.style.background = m.type === 'explicit' ? 'rgba(48,209,88,.35)' : 'rgba(94,92,230,.35)';
      mark.style.borderRadius = '2px';
      mark.style.color = 'inherit';
      mark.textContent = text.slice(m.start, m.end);
      frag.appendChild(mark);
      cursor = m.end;
    });
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    textNode.parentNode.replaceChild(frag, textNode);
  });
}

const DocxPreview = ({ file, explicitTerms = [], semanticChunks = [] }) => {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      setHtml('');
      try {
        const buf = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        if (!cancelled) setHtml(result.value);
      } catch (e) {
        console.error('DOCX render failed:', e);
        if (!cancelled) setError('Could not render this document.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (file) run();
    return () => { cancelled = true; };
  }, [file]);

  useEffect(() => {
    if (containerRef.current && html) {
      highlightContainer(containerRef.current, explicitTerms, semanticChunks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  if (!file) return null;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {loading && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="spin" style={{ width: 28, height: 28, border: '3px solid var(--s2)', borderTopColor: 'var(--ind)', borderRadius: '50%', margin: '0 auto 14px' }} />
          <p style={{ fontSize: '.82rem', color: 'var(--ts)' }}>Rendering document…</p>
        </div>
      )}
      {error && <p style={{ fontSize: '.82rem', color: 'var(--red)', padding: 20 }}>{error}</p>}
      {!loading && !error && (
        <div
          ref={containerRef}
          className="docx-preview"
          style={{
            background: '#fff', color: '#1a1a1a', padding: '48px 56px', borderRadius: 4,
            boxShadow: '0 2px 12px rgba(0,0,0,.08)', fontSize: '.92rem', lineHeight: 1.7,
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
};

export default DocxPreview;

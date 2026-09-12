import { useMemo } from 'react';
import { Modal, ModalHeader } from './Modal';
import PdfHighlightViewer from './PdfHighlightViewer';
import DocxPreview from './DocxPreview';

function renderHighlightedText(text, highlights) {
  if (!text) return null;
  if (!highlights || !highlights.length) return text;
  const nodes = [];
  let cursor = 0;
  highlights.forEach((h, i) => {
    if (h.start > cursor) nodes.push(text.slice(cursor, h.start));
    const seg = text.slice(h.start, h.end);
    const explicit = h.type === 'explicit';
    nodes.push(
      <mark
        key={i}
        title={`${explicit ? 'Explicit keyword match' : 'Inferred semantic match'}: ${h.skill}`}
        style={{
          background: explicit ? 'rgba(48,209,88,.28)' : 'rgba(94,92,230,.28)',
          borderBottom: `2px solid ${explicit ? '#15803D' : 'var(--ind)'}`,
          padding: '0 1px', borderRadius: 2, color: 'inherit',
        }}
      >
        {seg}
      </mark>
    );
    cursor = h.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

// candidate: any object with { name, filename, text_preview, highlights,
// matched_skills, matched_preferred_skills }. file: the original browser
// File object if still in memory (undefined after a reload).
const ResumeViewerModal = ({ candidate, file, onClose }) => {
  const lower = candidate.filename.toLowerCase();
  const isPdf = lower.endsWith('.pdf');
  const isDocx = lower.endsWith('.docx');
  // Memoized by candidate.id — PdfHighlightViewer/DocxPreview key their
  // expensive async render effect off these arrays by reference, so a fresh
  // [] / .map() literal on every unrelated parent re-render was restarting
  // (and sometimes never finishing) the PDF render, which is why the PDF
  // view intermittently fell back to plain text and highlights sometimes
  // never appeared.
  const explicitTerms = useMemo(
    () => [...(candidate.matched_skills || []), ...(candidate.matched_preferred_skills || [])],
    [candidate.id] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const semanticChunks = useMemo(
    () => (candidate.highlights || []).filter(h => h.type === 'semantic').map(h => (candidate.text_preview || '').slice(h.start, h.end)),
    [candidate.id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <Modal onClose={onClose} maxWidth={780}>
      <ModalHeader title={candidate.name} subtitle={candidate.filename} onClose={onClose} />
      <div style={{ padding: '12px 24px', display: 'flex', gap: 16, flexWrap: 'wrap', borderBottom: '.5px solid var(--bl)', flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.76rem', color: 'var(--ts)', fontWeight: 600 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(48,209,88,.5)', display: 'inline-block' }} /> Explicit keyword match
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.76rem', color: 'var(--ts)', fontWeight: 600 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(94,92,230,.5)', display: 'inline-block' }} /> Inferred semantic match
        </span>
      </div>
      <div style={{ padding: file ? 20 : '20px 24px', overflowY: 'auto', background: file ? 'var(--s1)' : 'transparent' }}>
        {file && isPdf && <PdfHighlightViewer file={file} explicitTerms={explicitTerms} semanticChunks={semanticChunks} />}
        {file && isDocx && <DocxPreview file={file} explicitTerms={explicitTerms} semanticChunks={semanticChunks} />}
        {!file && (
          <div style={{ fontSize: '.86rem', lineHeight: 1.75, whiteSpace: 'pre-wrap', color: 'var(--tp)' }}>
            <p style={{ fontSize: '.76rem', color: 'var(--tt)', marginBottom: 12, fontStyle: 'italic' }}>
              Original file no longer in memory (e.g. after a page reload) — showing extracted text instead.
            </p>
            {renderHighlightedText(candidate.text_preview, candidate.highlights)}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ResumeViewerModal;

import { jsPDF } from 'jspdf';

const MARGIN = 15;
const PAGE_W = 210;
const MAX_W = PAGE_W - MARGIN * 2;

function addWrapped(doc, text, y, opts = {}) {
  const { size = 10, style = 'normal', color = [20, 20, 20], lineHeight = 5.2 } = opts;
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, MAX_W);
  lines.forEach(line => {
    if (y > 280) { doc.addPage(); y = MARGIN; }
    doc.text(line, MARGIN, y);
    y += lineHeight;
  });
  return y;
}

function sectionHeading(doc, text, y) {
  if (y > 270) { doc.addPage(); y = MARGIN; }
  y += 4;
  doc.setDrawColor(220, 220, 225);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 7;
  return addWrapped(doc, text, y, { size: 13, style: 'bold', color: [10, 10, 10] });
}

export function buildShortlistSummaryPdf(program, result) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(10, 10, 10);
  doc.text('Shortlisting Summary', MARGIN, y);
  y += 8;
  y = addWrapped(doc, program.name, y, { size: 12, style: 'bold', color: [90, 90, 96] });
  y = addWrapped(doc, `Generated ${new Date().toLocaleString()}`, y, { size: 9, color: [140, 140, 145] });

  y = sectionHeading(doc, 'Scoring configuration', y);
  const cfg = result.config || {};
  y = addWrapped(
    doc,
    `Final score = ${Math.round((cfg.semantic_weight ?? 0.5) * 100)}% semantic similarity + ` +
    `${Math.round((1 - (cfg.semantic_weight ?? 0.5)) * 100)}% skill coverage. ` +
    `Required skill = ${(cfg.required_weight ?? 1).toFixed(1)}pt, preferred = ${(cfg.preferred_weight ?? 0.5).toFixed(1)}pt, ` +
    `inferred-match credit = ${Math.round((cfg.semantic_credit ?? 0.6) * 100)}%. ` +
    `Semantic engine: ${result.semantic_backend_label || 'n/a'}.`,
    y
  );

  y = sectionHeading(doc, 'Skills detected in JD', y);
  y = addWrapped(doc, `Required: ${result.jd_skills.required.join(', ') || 'none detected'}`, y);
  y = addWrapped(doc, `Preferred: ${result.jd_skills.preferred.join(', ') || 'none'}`, y);
  if (result.jd_skills.custom?.length) {
    y = addWrapped(doc, `Custom must-haves added by recruiter: ${result.jd_skills.custom.join(', ')}`, y);
  }

  if (result.bias_flags?.length) {
    y = sectionHeading(doc, 'JD bias / narrow-phrasing flags', y);
    result.bias_flags.forEach(f => {
      y = addWrapped(doc, `• ${f.type}: ${f.detail}`, y);
    });
  }

  const ranked = result.candidates.filter(c => !c.parse_error);
  y = sectionHeading(doc, `Ranked shortlist (${ranked.length} candidates)`, y);
  ranked.forEach(c => {
    y = addWrapped(doc, `#${c.rank}  ${c.name}  —  ${Math.round(c.final_score)}/100`, y, { style: 'bold', size: 10.5 });
    y = addWrapped(
      doc,
      `Semantic ${c.semantic_score}% · Keyword ${c.keyword_score}% · ${c.email || 'no email found'} · ${c.phone || 'no phone found'}`,
      y, { size: 8.5, color: [110, 110, 115] }
    );
    y += 1;
  });

  const top3 = ranked.slice(0, 3);
  if (top3.length) {
    y = sectionHeading(doc, 'Top 3 — why they ranked there', y);
    top3.forEach(c => {
      const explanation = result.explanations[c.id];
      if (explanation) y = addWrapped(doc, `${c.name}: ${explanation}`, y, { size: 9.5 });
      y += 2;
    });
  }

  doc.save(`${program.name.replace(/[^\w-]+/g, '_')}_summary.pdf`);
}

export function buildOfferLetterPdf(fields, candidate) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(fields.companyName || 'Your Company', MARGIN, y);
  y += 10;

  y = addWrapped(doc, new Date().toLocaleDateString(), y, { size: 10, color: [110, 110, 115] });
  y += 4;
  y = addWrapped(doc, `Dear ${candidate.name},`, y, { size: 11 });
  y += 2;

  const body = fields.body || '';
  y = addWrapped(doc, body, y, { size: 10.5, lineHeight: 6 });

  y += 8;
  y = addWrapped(doc, 'Sincerely,', y, { size: 10.5 });
  y = addWrapped(doc, fields.signerName || 'Hiring Team', y, { size: 10.5, style: 'bold' });
  if (fields.companyName) y = addWrapped(doc, fields.companyName, y, { size: 10, color: [110, 110, 115] });

  doc.save(`Offer_Letter_${candidate.name.replace(/[^\w-]+/g, '_')}.pdf`);
}

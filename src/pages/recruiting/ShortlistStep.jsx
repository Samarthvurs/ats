import { useState, useMemo } from 'react';
import Icon from '../../components/Icon';
import Btn from '../../components/Btn';
import Badge from '../../components/Badge';
import ResumeViewerModal from '../../components/ResumeViewerModal';
import RecruiterChatWidget from '../../components/RecruiterChatWidget';
import { buildShortlistSummaryPdf } from '../../utils/reportPdf';

const PAGE_SIZE = 10;

function scoreColor(score) {
  if (score >= 70) return 'var(--green)';
  if (score >= 45) return 'var(--amber)';
  return 'var(--red)';
}

const MiniBar = ({ label, value, color }) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <span style={{ fontSize: '.7rem', color: 'var(--ts)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '.7rem', fontWeight: 800, color }}>{value}%</span>
    </div>
    <div className="pb-track" style={{ height: 4 }}>
      <div className="pb-fill" style={{ width: `${Math.max(2, value)}%`, background: color }} />
    </div>
  </div>
);

const SkillChip = ({ label, kind }) => {
  const styles = {
    matched:  { bg: 'rgba(48,209,88,.1)',  color: '#15803D', icon: 'check' },
    semantic: { bg: 'rgba(94,92,230,.1)',  color: 'var(--ind)', icon: 'brain' },
    missing:  { bg: 'rgba(255,59,48,.08)', color: '#C0392B', icon: 'x' },
  }[kind];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: styles.bg, color: styles.color, fontSize: '.72rem', fontWeight: 700, padding: '3px 9px 3px 7px', borderRadius: 100 }}>
      <Icon id={styles.icon} size={9} color={styles.color} sw={2.4} />
      {label}
    </span>
  );
};

const ShortlistStep = ({ result, program, setStage, filesByName, onProceed, onBack }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState(() => new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [topN, setTopN] = useState(10);
  const [previewCandidate, setPreviewCandidate] = useState(null);

  const ranked = useMemo(() => (result?.candidates || []).filter(c => !c.parse_error), [result]);
  const failed = useMemo(() => (result?.candidates || []).filter(c => c.parse_error), [result]);
  const visible = ranked.slice(0, visibleCount);

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectTopN = () => setSelected(new Set(ranked.slice(0, topN).map(c => c.id)));

  const proceed = () => {
    // Selected candidates move to Interview; everyone else in this batch is
    // explicitly rejected (not left in limbo) so the Tracker cleanly shows
    // who's advancing vs. who isn't.
    ranked.forEach(c => setStage(c.id, selected.has(c.id) ? 'interview' : 'rejected'));
    onProceed();
  };

  if (!result) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontWeight: 800, marginBottom: 8 }}>No screening run yet</p>
        <Btn v="dark" onClick={onBack}>Go to Resumes</Btn>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <p style={{ fontSize: '.82rem', color: 'var(--ts)', fontWeight: 600 }}>
          {ranked.length} ranked · engine: <b style={{ color: 'var(--tp)' }}>{result.semantic_backend_label}</b>
        </p>
        <Btn v="ghost" sz="sm" onClick={() => buildShortlistSummaryPdf(program, result)}>
          <Icon id="file" size={13} /> Export summary PDF
        </Btn>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 18, position: 'sticky', top: 62, zIndex: 20, background: 'var(--s0)' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '.82rem', fontWeight: 700 }}>{selected.size} selected</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '.78rem', color: 'var(--ts)' }}>Select top</span>
            <input type="number" min={1} max={ranked.length} value={topN} onChange={e => setTopN(parseInt(e.target.value) || 1)}
                   style={{ width: 54, padding: '5px 6px', fontSize: '.78rem', border: '.5px solid var(--bl)', borderRadius: 8, textAlign: 'center' }} />
            <Btn v="ghost" sz="sm" onClick={selectTopN}>Apply</Btn>
          </div>
          <Btn v="dark" sz="sm" onClick={proceed} style={{ marginLeft: 'auto', opacity: selected.size ? 1 : .4 }}>
            Proceed to next round <Icon id="arrow" size={13} color="#fff" />
          </Btn>
        </div>
        {selected.size > 0 && (
          <p style={{ fontSize: '.72rem', color: 'var(--tt)', marginTop: 10 }}>
            The {selected.size} selected move to Interview; the remaining {ranked.length - selected.size} will be marked Rejected.
          </p>
        )}
      </div>

      {visible.map(c => {
        const isSelected = selected.has(c.id);
        return (
          <div key={c.id} className="card" style={{ padding: 18, marginBottom: 10, border: isSelected ? '1.5px solid var(--ind)' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <input type="checkbox" checked={isSelected} onChange={() => toggle(c.id)} style={{ width: 18, height: 18, accentColor: 'var(--ind)', cursor: 'pointer' }} />
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: c.rank <= 10 ? 'var(--near-black)' : 'var(--s1)', color: c.rank <= 10 ? '#fff' : 'var(--ts)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '.88rem',
              }}>
                {c.rank}
              </div>
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpandedId(p => p === c.id ? null : c.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <p style={{ fontWeight: 800, fontSize: '.94rem' }}>{c.name}</p>
                  {c.meets_criteria?.years_experience === false && <Badge type="amber">Below YoE</Badge>}
                  {c.meets_criteria?.cgpa === false && <Badge type="amber">Below CGPA</Badge>}
                  {c.meets_criteria?.education === false && <Badge type="amber">Below education</Badge>}
                </div>
                <p style={{ fontSize: '.76rem', color: 'var(--tt)', marginTop: 2 }}>
                  {c.email || 'no email'} · {c.years_experience != null ? `${c.years_experience}y exp` : 'YoE N/A'} · {c.cgpa ? `CGPA ${c.cgpa.value_10}/10` : 'CGPA N/A'}
                </p>
              </div>
              <div className="hide-mobile" style={{ width: 110 }}>
                <MiniBar label="Semantic" value={c.semantic_score} color="var(--ind)" />
                <MiniBar label="Keyword" value={c.keyword_score} color="var(--amber)" />
              </div>
              <div style={{ textAlign: 'center', width: 56 }}>
                <p style={{ fontSize: '1.3rem', fontWeight: 900, color: scoreColor(c.final_score) }}>{Math.round(c.final_score)}</p>
              </div>
            </div>

            {expandedId === c.id && (
              <div className="si" style={{ marginTop: 14, paddingTop: 14, borderTop: '.5px solid var(--bl)' }}>
                {result.explanations[c.id] && (
                  <p style={{ fontSize: '.84rem', color: 'var(--tp)', lineHeight: 1.6, marginBottom: 12, background: 'var(--s1)', padding: 12, borderRadius: 10 }}>{result.explanations[c.id]}</p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
                  {c.matched_skills.map(s => <SkillChip key={s} label={s} kind="matched" />)}
                  {c.semantic_matched_skills.map(s => <SkillChip key={s} label={`${s} · inferred`} kind="semantic" />)}
                  {c.missing_required_skills.map(s => <SkillChip key={s} label={s} kind="missing" />)}
                </div>
                <Btn v="ghost" sz="sm" onClick={() => setPreviewCandidate(c)}><Icon id="file" size={13} /> View resume</Btn>
              </div>
            )}
          </div>
        );
      })}

      {visibleCount < ranked.length && (
        <Btn v="ghost" sz="md" full onClick={() => setVisibleCount(v => v + PAGE_SIZE)} style={{ marginBottom: 16 }}>
          Show next {Math.min(PAGE_SIZE, ranked.length - visibleCount)} (of {ranked.length - visibleCount} remaining)
        </Btn>
      )}

      {failed.length > 0 && (
        <div className="card" style={{ padding: 18, marginTop: 10 }}>
          <p style={{ fontWeight: 800, fontSize: '.86rem', marginBottom: 10 }}>{failed.length} file(s) couldn't be parsed</p>
          {failed.map(c => <p key={c.id} style={{ fontSize: '.8rem', color: 'var(--red)', marginBottom: 4 }}>{c.filename} — {c.parse_error}</p>)}
        </div>
      )}

      <RecruiterChatWidget ranked={ranked} explanations={result.explanations} />

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <Btn v="ghost" sz="lg" onClick={onBack}>Back to analytics</Btn>
      </div>

      {previewCandidate && <ResumeViewerModal candidate={previewCandidate} file={filesByName[previewCandidate.filename]} onClose={() => setPreviewCandidate(null)} />}
    </div>
  );
};

export default ShortlistStep;

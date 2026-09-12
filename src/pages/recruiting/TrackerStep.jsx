import { useState, useMemo } from 'react';
import Icon from '../../components/Icon';
import Btn from '../../components/Btn';
import ResumeViewerModal from '../../components/ResumeViewerModal';
import { googleCalendarLink } from '../../utils/calendar';
import { downloadFile } from '../../utils/download';

const STAGES = [
  { id: 'interview', label: 'Interview', color: 'var(--ind)' },
  { id: 'offer', label: 'Offer', color: 'var(--amber)' },
  { id: 'hired', label: 'Hired', color: 'var(--green)' },
  { id: 'rejected', label: 'Rejected', color: 'var(--red)' },
];

function scoreColor(score) {
  if (score >= 70) return 'var(--green)';
  if (score >= 45) return 'var(--amber)';
  return 'var(--red)';
}

const TrackerStep = ({ result, program, stages, setStage, meetings, setMeeting, filesByName, onGoOffer, onBack }) => {
  const [filter, setFilter] = useState('active');
  const [previewCandidate, setPreviewCandidate] = useState(null);

  const candidates = useMemo(() => {
    if (!result) return [];
    return result.candidates
      .filter(c => !c.parse_error)
      .filter(c => {
        const stage = stages[c.id];
        if (filter === 'active') return ['interview', 'offer', 'hired'].includes(stage);
        if (filter === 'all') return !!stage && stage !== 'screening';
        return stage === filter;
      })
      .sort((a, b) => a.final_score < b.final_score ? 1 : -1);
  }, [result, stages, filter]);

  if (!result) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontWeight: 800, marginBottom: 8 }}>No candidates in the pipeline yet</p>
        <Btn v="dark" onClick={onBack}>Go to Shortlist</Btn>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {[['active', 'Active'], ['all', 'All advanced'], ['interview', 'Interview'], ['offer', 'Offer'], ['hired', 'Hired'], ['rejected', 'Rejected']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            padding: '7px 14px', borderRadius: 100, cursor: 'pointer', fontSize: '.78rem', fontWeight: 700,
            background: filter === id ? 'var(--near-black)' : 'var(--s0)', color: filter === id ? '#fff' : 'var(--ts)',
            border: '.5px solid var(--bl)',
          }}>
            {label}
          </button>
        ))}
      </div>

      {candidates.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--ts)', fontSize: '.88rem' }}>No candidates in this view yet — move some forward from the Shortlist step.</p>
        </div>
      )}

      {candidates.map(c => {
        const meeting = meetings[c.id] || {};
        const calLink = meeting.datetime ? googleCalendarLink({
          title: `Interview: ${c.name} — ${program.name}`,
          start: meeting.datetime,
          details: `Fit score ${Math.round(c.final_score)}/100. ${meeting.notes || ''}`,
          guestEmail: c.email,
        }) : null;
        const file = filesByName[c.filename];

        return (
          <div key={c.id} className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontWeight: 800, fontSize: '1rem' }}>{c.name}</p>
                  <span style={{ fontSize: '.68rem', fontWeight: 800, color: STAGES.find(s => s.id === stages[c.id])?.color, background: 'var(--s1)', padding: '3px 9px', borderRadius: 100 }}>
                    {STAGES.find(s => s.id === stages[c.id])?.label || stages[c.id]}
                  </span>
                  <span style={{ fontSize: '.9rem', fontWeight: 900, color: scoreColor(c.final_score) }}>{Math.round(c.final_score)}</span>
                </div>
                <p style={{ fontSize: '.78rem', color: 'var(--tt)', marginTop: 2 }}>{c.email || c.filename} · fit {Math.round(c.final_score)}/100</p>
              </div>
              <select className="inp" style={{ width: 'auto', padding: '6px 10px', fontSize: '.78rem' }} value={stages[c.id] || 'interview'} onChange={e => setStage(c.id, e.target.value)}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="rb-label">Interview date &amp; time</label>
                <input
                  type="datetime-local" className="inp"
                  value={meeting.datetime || ''}
                  onChange={e => setMeeting(c.id, { ...meeting, datetime: e.target.value })}
                />
              </div>
              <div>
                <label className="rb-label">Notes</label>
                <input
                  className="inp" placeholder="Interviewer, focus areas…"
                  value={meeting.notes || ''}
                  onChange={e => setMeeting(c.id, { ...meeting, notes: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {calLink && (
                <Btn v="dark" sz="sm" onClick={() => window.open(calLink, '_blank')}>
                  <Icon id="briefcase" size={13} /> Schedule on Google Calendar / Meet
                </Btn>
              )}
              {file && (
                <Btn v="ghost" sz="sm" onClick={() => downloadFile(file, c.filename)}>
                  <Icon id="file" size={13} /> Resume for invite
                </Btn>
              )}
              <Btn v="ghost" sz="sm" onClick={() => setPreviewCandidate(c)}><Icon id="file" size={13} /> View resume</Btn>
              {stages[c.id] === 'offer' && (
                <Btn v="ghost" sz="sm" onClick={onGoOffer}><Icon id="award" size={13} /> Go to offer step</Btn>
              )}
            </div>
            {!calLink && (
              <p style={{ fontSize: '.72rem', color: 'var(--tt)', marginTop: 10 }}>
                Set a date/time to generate a one-click Google Calendar invite (add Meet + attach the resume from Google's own scheduling UI).
              </p>
            )}
          </div>
        );
      })}

      <Btn v="ghost" sz="lg" onClick={onBack} style={{ marginTop: 8 }}>Back to shortlist</Btn>

      {previewCandidate && <ResumeViewerModal candidate={previewCandidate} file={filesByName[previewCandidate.filename]} onClose={() => setPreviewCandidate(null)} />}
    </div>
  );
};

export default TrackerStep;

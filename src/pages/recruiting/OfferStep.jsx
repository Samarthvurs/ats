import { useState, useMemo } from 'react';
import Icon from '../../components/Icon';
import Btn from '../../components/Btn';
import Badge from '../../components/Badge';
import OfferLetterModal from '../../components/OfferLetterModal';
import EmailModal from '../../components/EmailModal';

const OfferStep = ({ result, program, stages, setStage, offersSent, markOfferSent, onBack }) => {
  const [offerCandidate, setOfferCandidate] = useState(null);
  const [emailCandidate, setEmailCandidate] = useState(null);

  const candidates = useMemo(() => {
    if (!result) return [];
    return result.candidates.filter(c => !c.parse_error && ['offer', 'hired'].includes(stages[c.id]));
  }, [result, stages]);

  if (!result) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontWeight: 800, marginBottom: 8 }}>No candidates ready for an offer yet</p>
        <Btn v="dark" onClick={onBack}>Go to Tracker</Btn>
      </div>
    );
  }

  return (
    <div>
      {candidates.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center', marginBottom: 16 }}>
          <p style={{ color: 'var(--ts)', fontSize: '.88rem' }}>No candidates marked "Offer" yet — move them there from the Tracker step.</p>
        </div>
      )}

      {candidates.map(c => (
        <div key={c.id} className="card" style={{ padding: 20, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontWeight: 800, fontSize: '1rem' }}>{c.name}</p>
                {stages[c.id] === 'hired' && <Badge type="green">Hired</Badge>}
                {offersSent[c.id] && stages[c.id] !== 'hired' && <Badge type="amber">Offer sent</Badge>}
              </div>
              <p style={{ fontSize: '.78rem', color: 'var(--tt)', marginTop: 2 }}>{c.email || c.filename} · fit {Math.round(c.final_score)}/100</p>
            </div>
            <select className="inp" style={{ width: 'auto', padding: '6px 10px', fontSize: '.78rem' }} value={stages[c.id]} onChange={e => setStage(c.id, e.target.value)}>
              <option value="offer">Offer</option>
              <option value="hired">Hired</option>
              <option value="rejected">Withdrawn / Rejected</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn v="dark" sz="sm" onClick={() => setOfferCandidate(c)}>
              <Icon id="award" size={13} /> Create offer letter
            </Btn>
            <Btn v="ghost" sz="sm" onClick={() => setEmailCandidate(c)}>
              <Icon id="mail" size={13} /> Send offer email
            </Btn>
          </div>
        </div>
      ))}

      <Btn v="ghost" sz="lg" onClick={onBack} style={{ marginTop: 8 }}>Back to tracker</Btn>

      {offerCandidate && (
        <OfferLetterModal
          candidate={offerCandidate} program={program}
          onSent={() => markOfferSent(offerCandidate.id)}
          onClose={() => setOfferCandidate(null)}
        />
      )}
      {emailCandidate && (
        <EmailModal
          candidate={emailCandidate} program={program} defaultType="offer"
          onSent={() => markOfferSent(emailCandidate.id)}
          onAttachOfferLetter={() => { setOfferCandidate(emailCandidate); setEmailCandidate(null); }}
          onClose={() => setEmailCandidate(null)}
        />
      )}
    </div>
  );
};

export default OfferStep;

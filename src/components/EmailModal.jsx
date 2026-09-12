import { useState, useEffect, useMemo } from 'react';
import { Modal, ModalHeader } from './Modal';
import Btn from './Btn';
import Icon from './Icon';
import { generateEmailDraft, mailtoLink } from '../utils/emailTemplates';
import { googleCalendarLink } from '../utils/calendar';
import { downloadFile } from '../utils/download';

// file: the candidate's original resume File (undefined if no longer in
// memory). onAttachOfferLetter: optional callback to open the offer-letter
// builder for this candidate (offer type only).
const EmailModal = ({ candidate, program, defaultType = 'interview', file, initialDatetime, onAttachOfferLetter, onSent, onClose }) => {
  const [type, setType] = useState(defaultType);
  const [datetime, setDatetime] = useState(initialDatetime || '');
  const [draft, setDraft] = useState(() => generateEmailDraft(defaultType, candidate, program));
  const [inserted, setInserted] = useState(false);

  const calLink = useMemo(() => (
    type === 'interview' && datetime
      ? googleCalendarLink({ title: `Interview: ${candidate.name} — ${program.name}`, start: datetime, guestEmail: candidate.email })
      : null
  ), [type, datetime, candidate, program]);

  useEffect(() => {
    setDraft(generateEmailDraft(type, candidate, program));
    setInserted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const insertCalLink = () => {
    if (!calLink) return;
    setDraft(d => ({ ...d, body: `${d.body}\n\nPick a time and join via Google Meet: ${calLink}` }));
    setInserted(true);
  };

  const copy = () => navigator.clipboard?.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
  const open = () => {
    window.location.href = mailtoLink(candidate.email, draft.subject, draft.body);
    if (onSent) onSent(type);
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Draft an email" subtitle={`${candidate.name} · ${candidate.email || 'no email detected — add one manually'}`} onClose={onClose} />
      <div style={{ padding: 24, overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['interview', 'rejection', 'offer'].map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              padding: '7px 14px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: '.78rem', fontWeight: 700,
              background: type === t ? 'var(--near-black)' : 'var(--s1)', color: type === t ? '#fff' : 'var(--ts)',
              textTransform: 'capitalize',
            }}>
              {t}
            </button>
          ))}
        </div>

        {type === 'interview' && (
          <div className="card-tint" style={{ padding: 14, borderRadius: 12, marginBottom: 16 }}>
            <label className="rb-label">Proposed interview time (adds a Google Meet scheduling link)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input type="datetime-local" className="inp" style={{ flex: 1, minWidth: 200 }} value={datetime} onChange={e => setDatetime(e.target.value)} />
              <Btn v="ghost" sz="sm" onClick={insertCalLink} style={{ opacity: calLink ? 1 : .4 }}>
                {inserted ? 'Inserted ✓' : 'Insert into email'}
              </Btn>
            </div>
          </div>
        )}

        <label className="rb-label">Subject</label>
        <input className="inp" style={{ marginBottom: 14 }} value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))} />
        <label className="rb-label">Body</label>
        <textarea className="inp" rows={12} style={{ lineHeight: 1.6, fontSize: '.86rem', marginBottom: 16 }} value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))} />

        {(type === 'interview' || type === 'offer') && (
          <div style={{ background: 'var(--s1)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <p style={{ fontSize: '.76rem', color: 'var(--ts)', marginBottom: 10 }}>
              A <code>mailto:</code> link can't carry attachments — download the file below and attach it in your mail app before sending.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {type === 'interview' && (
                file
                  ? <Btn v="ghost" sz="sm" onClick={() => downloadFile(file, candidate.filename)}><Icon id="file" size={13} /> Download resume to attach</Btn>
                  : <span style={{ fontSize: '.76rem', color: 'var(--tt)' }}>Resume file not in memory (reload since upload?) — can't offer a download.</span>
              )}
              {type === 'offer' && onAttachOfferLetter && (
                <Btn v="ghost" sz="sm" onClick={onAttachOfferLetter}><Icon id="award" size={13} /> Generate offer letter PDF to attach</Btn>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn v="dark" sz="md" onClick={open}>
            <Icon id="mail" size={14} /> Open in mail app
          </Btn>
          <Btn v="ghost" sz="md" onClick={copy}>Copy text</Btn>
        </div>
        <p style={{ fontSize: '.74rem', color: 'var(--tt)', marginTop: 14 }}>
          Opens your own mail client with this pre-filled — nothing is sent automatically.
        </p>
      </div>
    </Modal>
  );
};

export default EmailModal;

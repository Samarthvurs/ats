import { useState } from 'react';
import { Modal, ModalHeader } from './Modal';
import Btn from './Btn';
import Icon from './Icon';
import { buildOfferLetterPdf } from '../utils/reportPdf';

const OfferLetterModal = ({ candidate, program, onSent, onClose }) => {
  const [fields, setFields] = useState({
    companyName: '', roleTitle: program.name, salary: '', startDate: '', signerName: '',
    body: `We are pleased to offer you the position of ${program.name} with our organization. This letter confirms the terms of your offer:\n\n- Start date: [start date]\n- Compensation: [compensation]\n- Reporting to: [manager name]\n\nPlease reply by [deadline] to confirm your acceptance. We're excited to have you join the team.`,
  });

  const download = () => {
    buildOfferLetterPdf(fields, candidate);
    if (onSent) onSent();
  };

  return (
    <Modal onClose={onClose} maxWidth={620}>
      <ModalHeader title="Offer letter" subtitle={candidate.name} onClose={onClose} />
      <div style={{ padding: 24, overflowY: 'auto' }}>
        <div className="rb-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label className="rb-label">Company name</label>
            <input className="inp" value={fields.companyName} onChange={e => setFields(f => ({ ...f, companyName: e.target.value }))} placeholder="TechNova Solutions" />
          </div>
          <div>
            <label className="rb-label">Signed by</label>
            <input className="inp" value={fields.signerName} onChange={e => setFields(f => ({ ...f, signerName: e.target.value }))} placeholder="Hiring Manager name" />
          </div>
        </div>
        <label className="rb-label">Letter body</label>
        <textarea className="inp" rows={10} style={{ lineHeight: 1.6, fontSize: '.86rem', marginBottom: 16 }} value={fields.body} onChange={e => setFields(f => ({ ...f, body: e.target.value }))} />
        <Btn v="dark" sz="md" onClick={download}>
          <Icon id="file" size={13} /> Export as PDF
        </Btn>
      </div>
    </Modal>
  );
};

export default OfferLetterModal;

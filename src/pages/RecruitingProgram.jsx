import { useState, useMemo } from 'react';
import Icon from '../components/Icon';
import JobDescriptionStep from './recruiting/JobDescriptionStep';
import ResumeUploadStep from './recruiting/ResumeUploadStep';
import AnalyticsStep from './recruiting/AnalyticsStep';
import ShortlistStep from './recruiting/ShortlistStep';
import TrackerStep from './recruiting/TrackerStep';
import OfferStep from './recruiting/OfferStep';

const DEFAULT_CONFIG = {
  semantic_weight: 0.5,
  required_weight: 1.0,
  preferred_weight: 0.5,
  semantic_credit: 0.6,
  semantic_threshold: 0.42,
};

const STEPS = [
  { id: 'jd', label: 'Job Description', icon: 'briefcase' },
  { id: 'resumes', label: 'Resumes', icon: 'upload' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
  { id: 'shortlist', label: 'Shortlist', icon: 'target' },
  { id: 'tracker', label: 'Tracker', icon: 'user' },
  { id: 'offer', label: 'Offer', icon: 'award' },
];

function loadJson(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
}
function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota — non-fatal */ }
}

const RecruitingProgram = ({ go, program, onUpdateProgram, result, onSetResult, onNotify }) => {
  const [step, setStep] = useState(result ? 'shortlist' : 'jd');

  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdTextState] = useState(program?.jdText || '');
  const [detectedSkills, setDetectedSkills] = useState(null);
  const [customSkills, setCustomSkillsState] = useState(program?.customSkills || []);
  const [skillWeights, setSkillWeightsState] = useState(program?.skillWeights || {});
  const [criteria, setCriteriaState] = useState(program?.criteria || {
    min_years_experience: null, min_cgpa: null, min_education_level: null, required_field_of_study: '',
  });
  const [config, setConfigState] = useState(program?.config || DEFAULT_CONFIG);
  const [files, setFiles] = useState([]);

  const [stages, setStagesState] = useState(() => (program ? loadJson(`resumeeit_stages_${program.id}`, {}) : {}));
  const [meetings, setMeetingsState] = useState(() => (program ? loadJson(`resumeeit_meetings_${program.id}`, {}) : {}));
  const [offersSent, setOffersSentState] = useState(() => (program ? loadJson(`resumeeit_offers_${program.id}`, {}) : {}));

  const setJdText = (v) => { setJdTextState(v); onUpdateProgram({ jdText: v }); };
  const setCustomSkills = (v) => { setCustomSkillsState(v); onUpdateProgram({ customSkills: v }); };
  const setSkillWeights = (v) => { setSkillWeightsState(v); onUpdateProgram({ skillWeights: v }); };
  const setConfig = (fnOrVal) => {
    setConfigState(prev => {
      const next = typeof fnOrVal === 'function' ? fnOrVal(prev) : fnOrVal;
      onUpdateProgram({ config: next });
      return next;
    });
  };
  const setCriteria = (fnOrVal) => {
    setCriteriaState(prev => {
      const next = typeof fnOrVal === 'function' ? fnOrVal(prev) : fnOrVal;
      onUpdateProgram({ criteria: next });
      return next;
    });
  };
  const setStage = (id, stageId) => setStagesState(prev => {
    const next = { ...prev, [id]: stageId };
    if (program) saveJson(`resumeeit_stages_${program.id}`, next);
    return next;
  });
  const setMeeting = (id, meeting) => setMeetingsState(prev => {
    const next = { ...prev, [id]: meeting };
    if (program) saveJson(`resumeeit_meetings_${program.id}`, next);
    return next;
  });
  const markOfferSent = (id) => setOffersSentState(prev => {
    const next = { ...prev, [id]: new Date().toISOString() };
    if (program) saveJson(`resumeeit_offers_${program.id}`, next);
    return next;
  });

  const filesByName = useMemo(() => Object.fromEntries(files.map(f => [f.name, f])), [files]);

  const handleScreened = (screenResult) => {
    onSetResult(screenResult);
    onUpdateProgram({ lastRunAt: new Date().toISOString(), lastCandidateCount: screenResult.candidates.length });
    screenResult.candidates.forEach(c => {
      if (!c.parse_error && !stages[c.id]) setStage(c.id, 'screening');
    });
    if (onNotify) onNotify(`Screened ${screenResult.candidates.length} candidates.`);
    setStep('analytics');
  };

  if (!program) {
    return (
      <div style={{ minHeight: '100vh', paddingTop: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={() => go('recruiting')} style={{ background: 'var(--near-black)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 100, cursor: 'pointer' }}>Back to Recruiting</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingTop: 52, background: 'var(--s1)' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 20px 100px' }}>

        <button onClick={() => go('recruiting')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ts)', fontSize: '.82rem', fontWeight: 700, marginBottom: 16 }}>
          <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><Icon id="chevron" size={13} color="var(--ts)" /></span> All programs
        </button>

        <p className="eyebrow ru" style={{ marginBottom: 8 }}>Recruiting Program</p>
        <h1 className="ru d1" style={{ fontSize: 'clamp(1.6rem,3.4vw,2.2rem)', fontWeight: 800, letterSpacing: '-.05em', marginBottom: 20 }}>
          {program.name}
        </h1>

        {/* Step nav — free movement between steps at any time */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 26, overflowX: 'auto', paddingBottom: 4 }}>
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 100, whiteSpace: 'nowrap',
                border: '.5px solid var(--bl)', cursor: 'pointer', fontSize: '.8rem', fontWeight: 700,
                background: step === s.id ? 'var(--near-black)' : 'var(--s0)', color: step === s.id ? '#fff' : 'var(--ts)',
              }}
            >
              <span style={{ opacity: .6 }}>{i + 1}</span>
              <Icon id={s.icon} size={13} color={step === s.id ? '#fff' : 'var(--ts)'} />
              {s.label}
            </button>
          ))}
        </div>

        {step === 'jd' && (
          <JobDescriptionStep
            jdFile={jdFile} setJdFile={setJdFile}
            jdText={jdText} setJdText={setJdText}
            detectedSkills={detectedSkills} setDetectedSkills={setDetectedSkills}
            customSkills={customSkills} setCustomSkills={setCustomSkills}
            skillWeights={skillWeights} setSkillWeights={setSkillWeights}
            criteria={criteria} setCriteria={setCriteria}
            config={config} setConfig={setConfig}
            onNext={() => setStep('resumes')}
          />
        )}

        {step === 'resumes' && (
          <ResumeUploadStep
            jdText={jdText} customSkills={customSkills} skillWeights={skillWeights} criteria={criteria} config={config}
            files={files} setFiles={setFiles}
            onScreened={handleScreened}
            onBack={() => setStep('jd')}
          />
        )}

        {step === 'analytics' && (
          <AnalyticsStep result={result} stages={stages} onViewShortlist={() => setStep('shortlist')} onBack={() => setStep('resumes')} />
        )}

        {step === 'shortlist' && (
          <ShortlistStep
            result={result} program={program} stages={stages} setStage={setStage} filesByName={filesByName}
            onProceed={() => setStep('tracker')} onBack={() => setStep('analytics')}
          />
        )}

        {step === 'tracker' && (
          <TrackerStep
            result={result} program={program} stages={stages} setStage={setStage}
            meetings={meetings} setMeeting={setMeeting} filesByName={filesByName}
            onGoOffer={() => setStep('offer')} onBack={() => setStep('shortlist')}
          />
        )}

        {step === 'offer' && (
          <OfferStep
            result={result} program={program} stages={stages} setStage={setStage}
            offersSent={offersSent} markOfferSent={markOfferSent}
            onBack={() => setStep('tracker')}
          />
        )}
      </div>
    </div>
  );
};

export default RecruitingProgram;

import { useMemo } from 'react';
import Icon from '../../components/Icon';
import Btn from '../../components/Btn';

const StatCard = ({ label, value, sub, color }) => (
  <div className="card" style={{ padding: '20px 18px' }}>
    <p style={{ fontSize: '1.9rem', fontWeight: 900, letterSpacing: '-.03em', color: color || 'var(--tp)', lineHeight: 1 }}>{value}</p>
    <p style={{ fontSize: '.76rem', color: 'var(--ts)', fontWeight: 700, marginTop: 6 }}>{label}</p>
    {sub && <p style={{ fontSize: '.7rem', color: 'var(--tt)', marginTop: 2 }}>{sub}</p>}
  </div>
);

const BarRow = ({ label, count, total, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
    <span style={{ width: 110, fontSize: '.8rem', fontWeight: 700, flexShrink: 0 }}>{label}</span>
    <div className="pb-track" style={{ flex: 1, height: 8 }}>
      <div className="pb-fill" style={{ width: `${total ? (count / total) * 100 : 0}%`, background: color }} />
    </div>
    <span style={{ fontSize: '.76rem', color: 'var(--ts)', fontWeight: 700, width: 46, textAlign: 'right', flexShrink: 0 }}>{count}</span>
  </div>
);

const AnalyticsStep = ({ result, onViewShortlist, onBack }) => {
  const stats = useMemo(() => {
    if (!result) return null;
    const ranked = result.candidates.filter(c => !c.parse_error);
    const failed = result.candidates.filter(c => c.parse_error);
    const avgFinal = ranked.length ? ranked.reduce((s, c) => s + c.final_score, 0) / ranked.length : 0;
    const avgSemantic = ranked.length ? ranked.reduce((s, c) => s + c.semantic_score, 0) / ranked.length : 0;
    const avgKeyword = ranked.length ? ranked.reduce((s, c) => s + c.keyword_score, 0) / ranked.length : 0;

    const scoreBuckets = [
      { label: '0–20', min: 0, max: 20, count: 0 },
      { label: '20–40', min: 20, max: 40, count: 0 },
      { label: '40–60', min: 40, max: 60, count: 0 },
      { label: '60–80', min: 60, max: 80, count: 0 },
      { label: '80–100', min: 80, max: 101, count: 0 },
    ];
    ranked.forEach(c => {
      const b = scoreBuckets.find(b => c.final_score >= b.min && c.final_score < b.max);
      if (b) b.count++;
    });
    const maxScoreBucket = Math.max(1, ...scoreBuckets.map(b => b.count));

    const yoeBuckets = [
      { label: '0–1y', min: 0, max: 1.001, count: 0 },
      { label: '1–3y', min: 1.001, max: 3.001, count: 0 },
      { label: '3–5y', min: 3.001, max: 5.001, count: 0 },
      { label: '5y+', min: 5.001, max: 999, count: 0 },
    ];
    let yoeUnknown = 0;
    ranked.forEach(c => {
      if (c.years_experience == null) { yoeUnknown++; return; }
      const b = yoeBuckets.find(b => c.years_experience >= b.min && c.years_experience < b.max);
      if (b) b.count++;
    });

    const gapCounts = {};
    ranked.forEach(c => c.missing_required_skills.forEach(s => { gapCounts[s] = (gapCounts[s] || 0) + 1; }));
    const topGaps = Object.entries(gapCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const strengthCounts = {};
    ranked.forEach(c => [...c.matched_skills, ...c.semantic_matched_skills].forEach(s => { strengthCounts[s] = (strengthCounts[s] || 0) + 1; }));
    const topStrengths = Object.entries(strengthCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const educationCounts = {};
    ranked.forEach(c => {
      const level = c.education?.level || 'unknown';
      educationCounts[level] = (educationCounts[level] || 0) + 1;
    });

    const cgpaBuckets = [
      { label: '<6', min: 0, max: 6, count: 0 },
      { label: '6–7', min: 6, max: 7, count: 0 },
      { label: '7–8', min: 7, max: 8, count: 0 },
      { label: '8–9', min: 8, max: 9, count: 0 },
      { label: '9–10', min: 9, max: 10.001, count: 0 },
    ];
    let cgpaUnknown = 0;
    ranked.forEach(c => {
      if (!c.cgpa) { cgpaUnknown++; return; }
      const b = cgpaBuckets.find(b => c.cgpa.value_10 >= b.min && c.cgpa.value_10 < b.max);
      if (b) b.count++;
    });

    const locationCounts = {};
    ranked.forEach(c => {
      const loc = c.location || 'Not stated';
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    const topLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const belowCriteria = ranked.filter(c => Object.values(c.meets_criteria || {}).includes(false)).length;
    const naCriteria = ranked.filter(c => (c.years_experience == null) || (c.cgpa == null) || !c.education).length;

    return {
      ranked, failed, avgFinal, avgSemantic, avgKeyword, scoreBuckets, maxScoreBucket,
      yoeBuckets, yoeUnknown, topGaps, topStrengths, educationCounts, cgpaBuckets, cgpaUnknown,
      topLocations, belowCriteria, naCriteria,
    };
  }, [result]);

  if (!result || !stats) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontWeight: 800, marginBottom: 8 }}>No screening run yet</p>
        <p style={{ fontSize: '.86rem', color: 'var(--ts)', marginBottom: 20 }}>Run screening from the Resumes step first.</p>
        <Btn v="dark" onClick={onBack}>Go to Resumes</Btn>
      </div>
    );
  }

  const maxYoeBucket = Math.max(1, ...stats.yoeBuckets.map(b => b.count));
  const educationLabels = { bachelor: "Bachelor's", master: "Master's", phd: 'PhD', diploma: 'Diploma', high_school: 'High School', unknown: 'Unknown / N/A' };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 22 }}>
        <StatCard label="Candidates screened" value={result.candidates.length} />
        <StatCard label="Avg fit score" value={Math.round(stats.avgFinal)} color={stats.avgFinal >= 60 ? 'var(--green)' : 'var(--amber)'} />
        <StatCard label="Avg semantic / keyword" value={`${Math.round(stats.avgSemantic)} / ${Math.round(stats.avgKeyword)}`} />
        <StatCard label="Parse failures" value={stats.failed.length} color={stats.failed.length ? 'var(--red)' : 'var(--tp)'} />
        <StatCard label="Below any criteria" value={stats.belowCriteria} sub={`${stats.naCriteria} unverifiable (N/A)`} color={stats.belowCriteria ? 'var(--amber)' : 'var(--tp)'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        <div className="card" style={{ padding: 22 }}>
          <p style={{ fontWeight: 800, fontSize: '.9rem', marginBottom: 16 }}>Score distribution</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {stats.scoreBuckets.map(b => (
              <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <span style={{ fontSize: '.7rem', fontWeight: 800, marginBottom: 4 }}>{b.count}</span>
                <div style={{ width: '70%', height: `${(b.count / stats.maxScoreBucket) * 100}%`, minHeight: b.count ? 4 : 0, background: 'var(--ind)', borderRadius: '5px 5px 0 0' }} />
                <span style={{ fontSize: '.64rem', color: 'var(--tt)', marginTop: 6 }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <p style={{ fontWeight: 800, fontSize: '.9rem', marginBottom: 16 }}>Years of experience</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {stats.yoeBuckets.map(b => (
              <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <span style={{ fontSize: '.7rem', fontWeight: 800, marginBottom: 4 }}>{b.count}</span>
                <div style={{ width: '70%', height: `${(b.count / maxYoeBucket) * 100}%`, minHeight: b.count ? 4 : 0, background: 'var(--amber)', borderRadius: '5px 5px 0 0' }} />
                <span style={{ fontSize: '.64rem', color: 'var(--tt)', marginTop: 6 }}>{b.label}</span>
              </div>
            ))}
          </div>
          {stats.yoeUnknown > 0 && <p style={{ fontSize: '.7rem', color: 'var(--tt)', marginTop: 10 }}>{stats.yoeUnknown} resume(s) — YoE not stated (N/A)</p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        <div className="card" style={{ padding: 22 }}>
          <p style={{ fontWeight: 800, fontSize: '.9rem', marginBottom: 16 }}>CGPA distribution (/10)</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {stats.cgpaBuckets.map(b => {
              const maxCgpaBucket = Math.max(1, ...stats.cgpaBuckets.map(x => x.count));
              return (
                <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <span style={{ fontSize: '.7rem', fontWeight: 800, marginBottom: 4 }}>{b.count}</span>
                  <div style={{ width: '70%', height: `${(b.count / maxCgpaBucket) * 100}%`, minHeight: b.count ? 4 : 0, background: 'var(--green)', borderRadius: '5px 5px 0 0' }} />
                  <span style={{ fontSize: '.64rem', color: 'var(--tt)', marginTop: 6 }}>{b.label}</span>
                </div>
              );
            })}
          </div>
          {stats.cgpaUnknown > 0 && <p style={{ fontSize: '.7rem', color: 'var(--tt)', marginTop: 10 }}>{stats.cgpaUnknown} resume(s) — CGPA not stated (N/A)</p>}
        </div>

        <div className="card" style={{ padding: 22 }}>
          <p style={{ fontWeight: 800, fontSize: '.9rem', marginBottom: 14 }}>Education level</p>
          {Object.entries(stats.educationCounts).sort((a, b) => b[1] - a[1]).map(([level, count]) => (
            <BarRow key={level} label={educationLabels[level] || level} count={count} total={stats.ranked.length} color="var(--ind)" />
          ))}
        </div>
      </div>

      {stats.topLocations.length > 0 && (
        <div className="card" style={{ padding: 22, marginBottom: 18 }}>
          <p style={{ fontWeight: 800, fontSize: '.9rem', marginBottom: 14 }}>Candidate locations</p>
          {stats.topLocations.map(([loc, count]) => <BarRow key={loc} label={loc} count={count} total={stats.ranked.length} color="var(--ind)" />)}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        {stats.topStrengths.length > 0 && (
          <div className="card" style={{ padding: 22 }}>
            <p style={{ fontWeight: 800, fontSize: '.9rem', marginBottom: 14 }}>Most common strengths</p>
            {stats.topStrengths.map(([skill, count]) => <BarRow key={skill} label={skill} count={count} total={stats.ranked.length} color="var(--green)" />)}
          </div>
        )}
        {stats.topGaps.length > 0 && (
          <div className="card" style={{ padding: 22 }}>
            <p style={{ fontWeight: 800, fontSize: '.9rem', marginBottom: 14 }}>Most common skill gaps</p>
            {stats.topGaps.map(([skill, count]) => <BarRow key={skill} label={skill} count={count} total={stats.ranked.length} color="var(--red)" />)}
          </div>
        )}
      </div>

      {result.bias_flags.length > 0 && (
        <div className="card" style={{ padding: 18, marginBottom: 18, borderLeft: '3px solid var(--amber)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon id="warn" size={16} color="var(--amber)" />
            <p style={{ fontWeight: 800, fontSize: '.9rem' }}>JD bias / narrow-phrasing flags</p>
          </div>
          {result.bias_flags.map((f, i) => (
            <p key={i} style={{ fontSize: '.83rem', color: 'var(--ts)', lineHeight: 1.6, marginBottom: i < result.bias_flags.length - 1 ? 8 : 0 }}>
              <b style={{ color: 'var(--tp)' }}>{f.type}:</b> {f.detail}
            </p>
          ))}
        </div>
      )}

      <Btn v="dark" sz="xl" full onClick={onViewShortlist}>
        View ranked shortlist <Icon id="arrow" size={16} color="#fff" />
      </Btn>
    </div>
  );
};

export default AnalyticsStep;

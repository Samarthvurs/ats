// Fully offline recruiter chat — no LLM, no network call. Every answer is
// assembled from data the shortlisting engine already computed (scores,
// matched/missing skills, criteria). This is deliberate: it's a rule-based
// NLU layer (intent + entity extraction via string matching), not a model
// guessing at an answer.

const norm = (s) => (s || '').toLowerCase().trim();

function findMentionedCandidates(query, candidates) {
  const q = norm(query);
  const found = [];
  candidates.forEach((c) => {
    const full = norm(c.name);
    if (!full) return;
    const parts = full.split(/\s+/).filter((p) => p.length > 2);
    const fullHit = q.includes(full);
    const partHit = parts.some((p) => new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(q));
    if (fullHit || partHit) found.push(c);
  });
  // Longest-name-first dedupe: if "Jane Smith" and "Smith" both matched the
  // same person only once, this is already deduped since it's one object;
  // just dedupe by id in case of odd overlaps.
  const seen = new Set();
  return found.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

function resolveRankMention(query, ranked) {
  const q = norm(query);
  let m = q.match(/\b(?:rank(?:ed)?|candidate|#)\s*(\d+)\b/);
  if (!m) m = q.match(/\b(\d+)(?:st|nd|rd|th)\b/);
  if (m) {
    const rank = parseInt(m[1], 10);
    const c = ranked.find((x) => x.rank === rank);
    if (c) return [c];
  }
  return [];
}

function skillSummary(c) {
  const parts = [];
  const matched = [...c.matched_skills, ...c.matched_preferred_skills];
  if (matched.length) parts.push(`explicitly shows ${matched.join(', ')}`);
  if (c.semantic_matched_skills.length) parts.push(`context suggests ${c.semantic_matched_skills.join(', ')} even though those exact words aren't used`);
  if (c.missing_required_skills.length) parts.push(`is missing ${c.missing_required_skills.join(', ')}`);
  return parts;
}

function explainCandidate(c, existingExplanations) {
  if (existingExplanations && existingExplanations[c.id]) return existingExplanations[c.id];
  const parts = [
    `${c.name} ranks #${c.rank} with a fit score of ${Math.round(c.final_score)}/100 ` +
    `(semantic similarity ${c.semantic_score}%, keyword coverage ${c.keyword_score}%).`,
  ];
  const skillParts = skillSummary(c);
  if (skillParts.length) parts.push(skillParts.map((p) => p[0].toUpperCase() + p.slice(1)).join('. ') + '.');
  if (!c.missing_required_skills.length) parts.push('No required skills appear to be missing.');
  return parts.join(' ');
}

function compareCandidates(a, b) {
  const [winner, loser] = a.final_score >= b.final_score ? [a, b] : [b, a];
  const winnerSkills = new Set([...winner.matched_skills, ...winner.semantic_matched_skills]);
  const loserSkills = new Set([...loser.matched_skills, ...loser.semantic_matched_skills]);
  const winnerAdvantage = [...winnerSkills].filter((s) => !loserSkills.has(s));
  const loserAdvantage = [...loserSkills].filter((s) => !winnerSkills.has(s));

  let text = `${winner.name} (${Math.round(winner.final_score)}) ranks above ${loser.name} (${Math.round(loser.final_score)}) — `;
  text += `a ${Math.round(winner.final_score - loser.final_score)}-point gap. Semantic similarity is ${winner.semantic_score}% vs ${loser.semantic_score}%, `;
  text += `and keyword coverage is ${winner.keyword_score}% vs ${loser.keyword_score}%. `;
  if (winnerAdvantage.length) text += `${winner.name} shows evidence of ${winnerAdvantage.join(', ')}, which ${loser.name}'s resume doesn't. `;
  if (loserAdvantage.length) text += `That said, ${loser.name} does show ${loserAdvantage.join(', ')} — something ${winner.name} lacks. `;
  if (winner.missing_required_skills.length) text += `Even ${winner.name} is still missing: ${winner.missing_required_skills.join(', ')}.`;
  return text;
}

const HELP_TEXT =
  'I can answer questions like:\n' +
  '• "Why is Jane ranked above Bob?"\n' +
  '• "Why did Jane rank #1?"\n' +
  '• "What skills does Bob have?"\n' +
  '• "Who is the top candidate?"\n' +
  '• "How many candidates were ranked?"\n' +
  'Use a name from the shortlist, or "top"/"#1"/"rank 3".';

export function answerQuery(query, ranked, explanations) {
  if (!ranked || ranked.length === 0) return "There's no ranked shortlist to answer questions about yet.";
  const q = norm(query);
  if (!q) return HELP_TEXT;

  if (/how many|count|number of/.test(q)) {
    return `${ranked.length} candidates were ranked. The top score is ${Math.round(ranked[0].final_score)}, ` +
      `the lowest is ${Math.round(ranked[ranked.length - 1].final_score)}.`;
  }

  let mentioned = [
    ...findMentionedCandidates(query, ranked),
    ...resolveRankMention(query, ranked),
  ];
  mentioned = [...new Map(mentioned.map((c) => [c.id, c])).values()];

  if (mentioned.length === 0 && /\btop\b|\bbest\b|\bfirst\b|recommend|who should i hire/.test(q)) {
    mentioned = [ranked[0]];
  }
  if (mentioned.length === 0 && /\bworst\b|\blowest\b|\blast\b|weakest/.test(q)) {
    mentioned = [ranked[ranked.length - 1]];
  }

  if (mentioned.length >= 2) {
    return compareCandidates(mentioned[0], mentioned[1]);
  }

  if (mentioned.length === 1) {
    const c = mentioned[0];
    if (/skill|know|experience with|good at/.test(q)) {
      const parts = skillSummary(c);
      return parts.length
        ? `${c.name}: ${parts.map((p) => p[0].toUpperCase() + p.slice(1)).join('. ')}.`
        : `${c.name} doesn't explicitly or contextually match any of the JD's tracked skills.`;
    }
    if (/email|phone|contact|reach/.test(q)) {
      return `${c.name} — email: ${c.email || 'not found'}, phone: ${c.phone || 'not found'}.`;
    }
    if (/education|degree|cgpa|gpa|college|university/.test(q)) {
      const edu = c.education ? `${c.education.level}${c.education.field ? ` in ${c.education.field}` : ''}` : 'not stated';
      const cgpa = c.cgpa ? `${c.cgpa.value_10}/10` : 'not stated';
      return `${c.name} — education: ${edu}, CGPA: ${cgpa}.`;
    }
    return explainCandidate(c, explanations);
  }

  return "I couldn't find a candidate name (or rank) in that question. " + HELP_TEXT;
}

export { HELP_TEXT };

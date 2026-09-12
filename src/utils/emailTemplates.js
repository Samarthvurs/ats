// Personalized email drafts. These are DRAFTS the recruiter reviews and
// sends from their own mail client (mailto:) or copies elsewhere — nothing
// here sends mail on the user's behalf.

export function generateEmailDraft(type, candidate, program, extra = {}) {
  const role = extra.roleTitle || program.name;
  const sender = extra.senderName || 'The Hiring Team';

  if (type === 'interview') {
    return {
      subject: `Interview invitation — ${role}`,
      body:
`Hi ${candidate.name},

Thanks for applying for the ${role} position. Your background stood out to us${candidate.matched_skills?.length ? ` — particularly your experience with ${candidate.matched_skills.slice(0, 3).join(', ')}` : ''}, and we'd like to invite you to the next stage: an interview.

Could you share a few times that work for you over the next week? We expect the conversation to run about 45 minutes.

Looking forward to speaking with you.

Best,
${sender}`,
    };
  }

  if (type === 'rejection') {
    return {
      subject: `Update on your application — ${role}`,
      body:
`Hi ${candidate.name},

Thank you for taking the time to apply for the ${role} position and for sharing your background with us.

After careful review, we've decided to move forward with other candidates whose experience more closely matches what we need right now${candidate.missing_required_skills?.length ? ` — particularly around ${candidate.missing_required_skills.slice(0, 2).join(' and ')}` : ''}. This isn't a reflection of your overall potential, and we'd encourage you to apply again for roles that fit your profile in the future.

We wish you the best in your search.

Best,
${sender}`,
    };
  }

  // offer
  return {
    subject: `Offer — ${role}`,
    body:
`Hi ${candidate.name},

We're delighted to offer you the ${role} position. Your interview and background — especially your experience with ${(candidate.matched_skills || []).slice(0, 3).join(', ') || 'the skills we discussed'} — made this an easy decision for the team.

We'll follow up shortly with a formal offer letter covering compensation, start date, and next steps. In the meantime, please let us know if you have any questions.

Congratulations, and welcome!

Best,
${sender}`,
  };
}

export function mailtoLink(to, subject, body) {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${to || ''}?${params.toString()}`;
}

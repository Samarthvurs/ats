// Google Calendar "quick add" links need no OAuth/API credentials — they
// open Google's own event-creation UI pre-filled, where the recruiter adds
// Google Meet with one click and Calendar handles sending the invite.

function toGCalUTC(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function googleCalendarLink({ title, start, durationMinutes = 45, details, guestEmail }) {
  const startDate = new Date(start);
  if (isNaN(startDate)) return null;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toGCalUTC(startDate)}/${toGCalUTC(endDate)}`,
    details: details || '',
  });
  if (guestEmail) params.append('add', guestEmail);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

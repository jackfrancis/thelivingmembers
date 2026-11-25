const { renderCalendar } = require('./show-calendar.cjs');
const { escapeText, renderLettering } = require('./show-lettering.cjs');

function ordinal(day) {
  const ending = day % 100;
  if (ending >= 11 && ending <= 13) return `${day}th`;
  return day + ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th');
}

function showDate(startsAt) {
  // The poster uses the venue's wall clock. The calendar uses the same timestamp's offset.
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::00)?(?:Z|[+-]\d{2}:\d{2})$/.exec(startsAt);
  if (!match || !Number.isFinite(Date.parse(startsAt))) {
    throw new Error(`Expected a show start with a date, time and UTC offset: ${startsAt}`);
  }
  const wall = new Date(match[1] + ':00Z');
  if (wall.toISOString().slice(0, 16) !== match[1]) throw new Error(`Invalid show date: ${startsAt}`);
  const weekday = wall.toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const month = wall.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const hour = wall.getUTCHours();
  const minutes = wall.getUTCMinutes() ? ':' + match[1].slice(-2) : '';
  return {
    date: `${weekday} ${month} ${ordinal(wall.getUTCDate())}`,
    time: `${hour % 12 || 12}${minutes} ${hour < 12 ? 'a.m.' : 'p.m.'}`,
  };
}

function renderShows(shows) {
  const announcements = [];
  const calendars = new Map();
  const timestamp = new Date();
  for (const show of shows) {
    if (typeof show.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(show.id)) {
      throw new Error(`Invalid show id: ${show.id}`);
    }
    const file = `shows/${show.id}.ics`;
    if (calendars.has(file)) throw new Error(`Duplicate show id: ${show.id}`);
    for (const key of ['leadIn', 'venue', 'admission']) {
      if (typeof show[key] !== 'string' || !show[key].trim()) {
        throw new Error(`Missing ${key} for show ${show.id}`);
      }
    }
    const { date, time } = showDate(show.startsAt);
    const announcement = `${show.leadIn} ${show.venue} on ${date}.`;
    const details = `${time} ${show.admission.replace(/[.]$/, '')}.`;
    const description = `${announcement} ${details}`;
    calendars.set(file, renderCalendar(show, description, timestamp));
    announcements.push(`    <p class="introduction">
      <a class="calendar-link" href="${file}" title="Add to calendar">
        <span class="sr-only">${escapeText(description)} Add to calendar.</span>
        ${renderLettering(announcement, details)}
      </a>
    </p>`);
  }
  return { html: announcements.join('\n'), calendars };
}

module.exports = { renderShows };

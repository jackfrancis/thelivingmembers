function calendarText(value) {
  return value.replace(/[\\,;]/g, '\\$&').replace(/\r\n|\r|\n/g, '\\n');
}

function utcTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

// A folded iCalendar line fits in 75 UTF-8 bytes, including its leading space.
function foldLine(line) {
  let result = '';
  let bytes = 0;
  for (const character of line) {
    const size = Buffer.byteLength(character);
    if (bytes + size > 75) {
      result += '\r\n ';
      bytes = 1;
    }
    result += character;
    bytes += size;
  }
  return result;
}

function renderCalendar(show, description, timestamp) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Living Members//Shows//EN',
    'BEGIN:VEVENT',
    `UID:${calendarText(show.id)}@thelivingmembers.com`,
    `DTSTAMP:${utcTimestamp(timestamp)}`,
    `DTSTART:${utcTimestamp(new Date(show.startsAt))}`,
    `SUMMARY:The Living Members at ${calendarText(show.venue)}`,
    `LOCATION:${calendarText(show.venue)}`,
    `DESCRIPTION:${calendarText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].map(foldLine).join('\r\n') + '\r\n';
}

module.exports = { renderCalendar };

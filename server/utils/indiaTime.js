const timezone = 'Asia/Kolkata';

export function getIndiaNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const result = Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]));
  return { date: `${result.year}-${result.month}-${result.day}`, minutes: Number(result.hour) * 60 + Number(result.minute) };
}

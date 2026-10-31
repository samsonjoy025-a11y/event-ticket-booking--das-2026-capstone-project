export function searchEvents(events, normalizedQuery) {
  if (!normalizedQuery) return [...events];

  return events.filter((event) => (
    event.title.toLowerCase().includes(normalizedQuery)
    || event.city.toLowerCase().includes(normalizedQuery)
    || event.venue.toLowerCase().includes(normalizedQuery)
  ));
}
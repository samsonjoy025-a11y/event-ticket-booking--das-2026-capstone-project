export function filterEvents(events, options) {
  return events.filter((event) => {
    if (options.normalizedCity && event.city.toLowerCase() !== options.normalizedCity) return false;

    const eventTimestamp = Date.parse(event.eventDate);
    if (options.startTimestamp !== undefined && eventTimestamp < options.startTimestamp) return false;
    if (options.endTimestamp !== undefined && eventTimestamp > options.endTimestamp) return false;

    if (!options.requiresTicketData) return true;

    const ticketData = event.discovery;
    if (!ticketData) return false;
    if (options.availableOnly && ticketData.availableQuantity === 0) return false;

    const hasPriceFilter = options.minPriceMinor !== undefined || options.maxPriceMinor !== undefined;
    if (!hasPriceFilter) return true;
    const price = ticketData.minimumAvailablePriceMinor;
    if (price === null) return false;
    if (options.minPriceMinor !== undefined && price < options.minPriceMinor) return false;
    if (options.maxPriceMinor !== undefined && price > options.maxPriceMinor) return false;
    return true;
  });
}
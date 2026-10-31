import { performance } from 'node:perf_hooks';
import { createEventDiscoveryService } from '../src/services/event-discovery-service/discovery.service.js';

const DATASET_SIZES = [1_000, 5_000, 10_000];
const WARMUP_RUNS = 2;
const MEASURED_RUNS = 5;

function createBenchmarkServices(size) {
  const events = Array.from({ length: size }, (_, index) => ({
    id: `event_${index}`,
    title: index % 4 === 0 ? `Technology Summit ${index}` : `Community Event ${index}`,
    city: `City ${index % 10}`,
    venue: `Venue ${index % 25}`,
    eventDate: new Date(Date.UTC(2030, 0, 1) + index * 60_000).toISOString(),
    status: 'published',
    ticketTierIds: [`tier_${index}_a`, `tier_${index}_b`],
  }));
  const tiersByEventId = new Map(events.map((event, index) => [event.id, [
    {
      id: event.ticketTierIds[0], eventId: event.id, name: 'Standard',
      priceMinor: 1000 + (index % 200) * 100, currency: 'USD', capacity: 100,
      availableQuantity: index % 17 === 0 ? 0 : 25 + (index % 76),
    },
    {
      id: event.ticketTierIds[1], eventId: event.id, name: 'Premium',
      priceMinor: 5000 + (index % 400) * 100, currency: 'USD', capacity: 50,
      availableQuantity: 10 + (index % 41),
    },
  ]]));

  const discovery = createEventDiscoveryService({
    events: { listPublishedEvents: () => events },
    tickets: {
      getTicketTiersForEvents(eventIds) {
        return eventIds.map((eventId) => ({
          eventId,
          ticketTiers: tiersByEventId.get(eventId) ?? [],
        }));
      },
    },
  });
  return discovery;
}

function measure(operation) {
  let observedResults = 0;
  for (let run = 0; run < WARMUP_RUNS; run += 1) observedResults += operation().length;

  const start = performance.now();
  for (let run = 0; run < MEASURED_RUNS; run += 1) observedResults += operation().length;
  const elapsedMilliseconds = performance.now() - start;

  return {
    averageMilliseconds: elapsedMilliseconds / MEASURED_RUNS,
    observedResults,
  };
}

console.log(`Node.js ${process.version}; warm-up runs: ${WARMUP_RUNS}; measured runs: ${MEASURED_RUNS}`);
for (const size of DATASET_SIZES) {
  const discovery = createBenchmarkServices(size);
  const operations = [
    ['text search (expected O(n))', () => discovery.discoverEvents({ query: 'technology summit' })],
    ['combined filters (expected O(n+t))', () => discovery.discoverEvents({
      city: 'City 3', startDate: '2030-01-01', endDate: '2030-12-31',
      minPriceMinor: 5000, maxPriceMinor: 25000, currency: 'USD', availableOnly: true,
    })],
    ['date sort (expected O(n log n))', () => discovery.discoverEvents({ sortBy: 'date', sortDirection: 'desc' })],
    ['price sort (expected O(n+t+n log n))', () => discovery.discoverEvents({
      sortBy: 'price', sortDirection: 'asc', currency: 'USD',
    })],
    ['availability sort (expected O(n+t+n log n))', () => discovery.discoverEvents({
      sortBy: 'availability', sortDirection: 'desc',
    })],
  ];

  console.log(`\nDataset: ${size.toLocaleString()} events, ${(size * 2).toLocaleString()} ticket tiers`);
  for (const [label, operation] of operations) {
    const result = measure(operation);
    console.log(`${label}: average ${result.averageMilliseconds.toFixed(3)} ms/run; observed results ${result.observedResults}`);
  }
}
console.log('\nTimings vary with hardware, runtime, JIT warm-up, garbage collection, and data distribution; they do not prove Big O complexity.');
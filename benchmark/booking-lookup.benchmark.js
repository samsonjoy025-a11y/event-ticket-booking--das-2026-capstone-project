import { performance } from 'node:perf_hooks';

const DATASET_SIZE = 50_000;
const LOOKUPS_PER_ROUND = 1_000;
const ROUNDS = 5;

const bookings = Array.from({ length: DATASET_SIZE }, (_, index) => ({
  reference: `BK-${String(index).padStart(8, '0')}`,
  status: 'pending',
}));
const bookingsByReference = new Map(bookings.map((booking) => [booking.reference, booking]));
const queryReferences = Array.from({ length: LOOKUPS_PER_ROUND }, (_, index) => (
  bookings[(index * 7_919) % DATASET_SIZE].reference
));

function measureLookup(lookup) {
  let totalMilliseconds = 0;
  let checksum = 0;

  for (let round = 0; round < ROUNDS; round += 1) {
    const start = performance.now();
    for (const reference of queryReferences) {
      const booking = lookup(reference);
      if (!booking) throw new Error('Benchmark lookup failed to find a booking.');
      checksum += booking.reference.length;
    }
    totalMilliseconds += performance.now() - start;
  }

  return { averageMilliseconds: totalMilliseconds / ROUNDS, checksum };
}

for (const reference of queryReferences.slice(0, 20)) {
  bookings.find((booking) => booking.reference === reference);
  bookingsByReference.get(reference);
}

const arrayResult = measureLookup((reference) => (
  bookings.find((booking) => booking.reference === reference)
));
const mapResult = measureLookup((reference) => bookingsByReference.get(reference));

console.log(`Dataset size: ${DATASET_SIZE.toLocaleString()} bookings`);
console.log(`Lookups per round: ${LOOKUPS_PER_ROUND.toLocaleString()} (${ROUNDS} measured rounds)`);
console.log(`Array.find(): average ${arrayResult.averageMilliseconds.toFixed(3)} ms per round; expected O(n)`);
console.log(`Map.get(): average ${mapResult.averageMilliseconds.toFixed(3)} ms per round; expected average O(1)`);
console.log('Map uses a hash-based key lookup on average; Array.find scans entries until it finds a match.');
console.log('Timings depend on the runtime, hardware, JIT warm-up, data layout, and lookup distribution.');
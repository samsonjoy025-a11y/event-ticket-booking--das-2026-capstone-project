# Build 2 Algorithms and Performance

## Search and Filtering

Text search scans each published event once and checks title, city, and venue with case-insensitive literal substring comparisons. Its time cost is $O(n \cdot c)$, where $n$ is the event count and $c$ is the bounded text comparison work; for a fixed-size query and bounded fields this is $O(n)$. It uses $O(n)$ result space in the worst case and does not mutate the source snapshots.

City and date predicates are applied in one pass, $O(n)$ time and $O(n)$ worst-case result space. If ticket information is needed, Ticket Service batches all candidate event IDs in one call; its in-memory implementation groups tiers with a `Map` and scans tiers once, $O(e+t)$ time and output space, where $e$ is the candidate-event count and $t$ is the tier count. Discovery computes a `Map` summary per event in one further pass. Price and availability filtering are then $O(e)$; combined predicates remain linear rather than repeating service calls per event.

The ticket batch uses a `Map` for event-ID membership and grouping, with average $O(1)$ lookups; JavaScript does not guarantee constant-time behavior in every circumstance. Arrays preserve result order. A `Set` checks whether returned tier IDs agree with the event's published association list, with average $O(1)$ membership checks.

## Stable Merge Sort

`mergeSort` copies the input once, recursively divides index ranges in half, and merges sorted ranges into one reusable auxiliary array. When the comparator says values are equal, the merge selects the left value first, preserving original relative order. The caller's array is not changed.

- Time: $O(n \log n)$ for best, average, and worst cases.
- Auxiliary space: $O(n)$ for the merge buffer, plus $O(\log n)$ recursion stack.
- Stability: guaranteed for equal comparator values.

Merge Sort is appropriate here because the requirement is stable, deterministic ordering without mutating service snapshots. It avoids implementation-dependent stability details and mutation behavior of native sorting.

## Discovery Sorting

Discovery sorts the filtered results with the custom Merge Sort: $O(r \log r)$ time and $O(r)$ auxiliary space for $r$ results. Date compares parsed UTC instants. Price compares the minimum currently available tier price in the required currency; missing comparable prices are always last and never treated as zero. Availability compares the sum of current available quantities over all tiers, regardless of currency. Equal keys retain Event Service list order, which provides deterministic tie behavior for a given service snapshot.

## Benchmark

Run `npm run benchmark` to execute both the Build 1 booking lookup comparison and the Build 2 discovery benchmark. The discovery script measures search, combined filtering, date sorting, and price/availability sorting for multiple collection sizes with warm-up and repeated runs. It prints its own dataset size, iteration count, and measured averages. Measurements are affected by hardware, Node/V8 version, JIT warm-up, garbage collection, and data distribution; they illustrate this workload but do not establish theoretical complexity.

### Recorded Run

One run in this workspace on Node.js `v26.10.0` used two warm-up runs and five measured runs per discovery operation. Times are milliseconds per run:

| Events (tiers) | Text search | Combined filters | Date sort | Price sort | Availability sort |
|---:|---:|---:|---:|---:|---:|
| 1,000 (2,000) | 1.630 | 1.715 | 4.324 | 3.182 | 4.656 |
| 5,000 (10,000) | 5.097 | 5.193 | 23.252 | 14.694 | 13.454 |
| 10,000 (20,000) | 12.849 | 8.350 | 44.302 | 29.139 | 28.042 |

The same run measured the Build 1 50,000-booking lookup workload at 359.939 ms for `Array.find()` and 0.595 ms for `Map.get()` per 1,000 lookups. A rerun may produce different results.
import { mergeSort } from './merge-sort.js';

function compareNumbers(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sortEvents(events, options) {
  if (!options.sortBy) return [...events];

  const direction = options.sortDirection === 'desc' ? -1 : 1;
  return mergeSort(events, (left, right) => {
    if (options.sortBy === 'date') {
      return direction * compareNumbers(Date.parse(left.eventDate), Date.parse(right.eventDate));
    }

    if (options.sortBy === 'availability') {
      return direction * compareNumbers(left.discovery.availableQuantity, right.discovery.availableQuantity);
    }

    const leftPrice = left.discovery.minimumAvailablePriceMinor;
    const rightPrice = right.discovery.minimumAvailablePriceMinor;
    if (leftPrice === null || rightPrice === null) {
      if (leftPrice === rightPrice) return 0;
      return leftPrice === null ? 1 : -1;
    }
    return direction * compareNumbers(leftPrice, rightPrice);
  });
}
function defaultComparator(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function mergeSort(items, comparator = defaultComparator) {
  if (!Array.isArray(items)) throw new TypeError('mergeSort expects an array.');
  if (typeof comparator !== 'function') throw new TypeError('comparator must be a function.');

  const values = [...items];
  const buffer = new Array(values.length);

  function sortRange(start, end) {
    if (end - start < 2) return;

    const middle = start + Math.floor((end - start) / 2);
    sortRange(start, middle);
    sortRange(middle, end);

    let left = start;
    let right = middle;
    let output = start;
    while (left < middle && right < end) {
      if (comparator(values[left], values[right]) <= 0) {
        buffer[output] = values[left];
        left += 1;
      } else {
        buffer[output] = values[right];
        right += 1;
      }
      output += 1;
    }

    while (left < middle) {
      buffer[output] = values[left];
      left += 1;
      output += 1;
    }
    while (right < end) {
      buffer[output] = values[right];
      right += 1;
      output += 1;
    }

    for (let index = start; index < end; index += 1) values[index] = buffer[index];
  }

  sortRange(0, values.length);
  return values;
}
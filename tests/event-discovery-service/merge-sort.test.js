import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSort } from '../../src/services/event-discovery-service/merge-sort.js';

test('merge sort handles empty, single, ordered, reversed, and duplicate values', () => {
  assert.deepEqual(mergeSort([]), []);
  assert.deepEqual(mergeSort([7]), [7]);
  assert.deepEqual(mergeSort([1, 2, 3, 4]), [1, 2, 3, 4]);
  assert.deepEqual(mergeSort([4, 3, 2, 1]), [1, 2, 3, 4]);
  assert.deepEqual(mergeSort([3, 1, 2, 1, 3]), [1, 1, 2, 3, 3]);
});

test('merge sort is stable and does not mutate the caller array', () => {
  const records = [
    { key: 2, order: 'first-two' },
    { key: 1, order: 'one' },
    { key: 2, order: 'second-two' },
    { key: 1, order: 'second-one' },
  ];
  const original = [...records];
  const sorted = mergeSort(records, (left, right) => left.key - right.key);

  assert.deepEqual(sorted.map((record) => record.order), ['one', 'second-one', 'first-two', 'second-two']);
  assert.deepEqual(records, original);
  assert.notEqual(sorted, records);
});

test('merge sort orders a large collection without relying on native sort', () => {
  const values = Array.from({ length: 20_000 }, (_, index) => 20_000 - index);
  const sorted = mergeSort(values, (left, right) => left - right);

  assert.equal(sorted[0], 1);
  assert.equal(sorted[sorted.length - 1], 20_000);
  assert.equal(sorted.length, values.length);
  assert.equal(values[0], 20_000);
});
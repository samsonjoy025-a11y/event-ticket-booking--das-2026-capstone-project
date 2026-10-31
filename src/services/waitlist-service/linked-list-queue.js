export class LinkedListQueue {
  #head = null;
  #tail = null;
  #size = 0;

  enqueue(value) {
    const node = { value, next: null };
    if (this.#tail) {
      this.#tail.next = node;
    } else {
      this.#head = node;
    }

    this.#tail = node;
    this.#size += 1;
    return this.#size;
  }

  dequeue() {
    if (!this.#head) return null;

    const value = this.#head.value;
    this.#head = this.#head.next;
    this.#size -= 1;
    if (!this.#head) this.#tail = null;
    return value;
  }

  peek() {
    return this.#head?.value ?? null;
  }

  isEmpty() {
    return this.#size === 0;
  }

  get size() {
    return this.#size;
  }
}
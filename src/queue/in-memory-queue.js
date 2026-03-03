export function createInMemoryQueue({ maxSize }) {
  const items = [];

  return {
    enqueue(item) {
      if (items.length >= maxSize) {
        return false;
      }

      items.push(item);
      return true;
    },
    dequeue() {
      if (items.length === 0) return null;
      return items.shift() || null;
    },
    size() {
      return items.length;
    }
  };
}

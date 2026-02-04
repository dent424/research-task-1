/**
 * Fisher-Yates shuffle. Returns a new array with elements in random order.
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Fisher-Yates shuffle that preserves original indices.
 * Useful when you need to track which item was which after shuffling.
 */
export function shuffleWithIndex<T>(array: T[]): { item: T; originalIndex: number }[] {
  const indexed = array.map((item, originalIndex) => ({ item, originalIndex }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  return indexed;
}

import { shuffle, shuffleWithIndex } from "@/lib/shuffle";

describe("shuffle", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("returns a new array (not the same reference)", () => {
    const result = shuffle(input);
    expect(result).not.toBe(input);
  });

  it("has the same length as the input", () => {
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
  });

  it("contains all the same elements", () => {
    const result = shuffle(input);
    expect(result.sort((a, b) => a - b)).toEqual(
      [...input].sort((a, b) => a - b)
    );
  });

  it("does not mutate the original array", () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    shuffle(original);
    expect(original).toEqual(copy);
  });

  it("handles empty arrays", () => {
    const result = shuffle([]);
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("handles single-element arrays", () => {
    const result = shuffle([42]);
    expect(result).toEqual([42]);
    expect(result).toHaveLength(1);
  });

  it("produces different orderings across multiple runs", () => {
    const largeArray = Array.from({ length: 50 }, (_, i) => i);
    const results = Array.from({ length: 20 }, () => shuffle(largeArray));

    // At least one of the shuffled arrays should differ from the original order
    const atLeastOneDiffers = results.some(
      (result) => !result.every((val, idx) => val === largeArray[idx])
    );
    expect(atLeastOneDiffers).toBe(true);
  });
});

describe("shuffleWithIndex", () => {
  it("returns correct structure (array of {item, originalIndex})", () => {
    const input = ["a", "b", "c"];
    const result = shuffleWithIndex(input);

    expect(result).toHaveLength(input.length);
    for (const entry of result) {
      expect(entry).toHaveProperty("item");
      expect(entry).toHaveProperty("originalIndex");
    }
  });

  it("preserves all items", () => {
    const input = ["apple", "banana", "cherry", "date"];
    const result = shuffleWithIndex(input);

    const items = result.map((entry) => entry.item).sort();
    expect(items).toEqual([...input].sort());
  });

  it("has correct originalIndex values (0 through n-1, each appearing once)", () => {
    const input = [10, 20, 30, 40, 50];
    const result = shuffleWithIndex(input);

    const indices = result
      .map((entry) => entry.originalIndex)
      .sort((a, b) => a - b);
    expect(indices).toEqual([0, 1, 2, 3, 4]);
  });

  it("maps each originalIndex to the correct item from the input", () => {
    const input = ["x", "y", "z"];
    const result = shuffleWithIndex(input);

    for (const entry of result) {
      expect(entry.item).toBe(input[entry.originalIndex]);
    }
  });

  it("handles empty arrays", () => {
    const result = shuffleWithIndex([]);
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

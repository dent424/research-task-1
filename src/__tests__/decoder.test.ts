/**
 * Tests for the Base64 encoding/decoding round-trip used to pass study data
 * between the Vercel web study and the Python decoder (decoder.py).
 *
 * The web study encodes data using a Unicode-safe TextEncoder -> btoa approach
 * (see redirect.ts `toBase64`). The Python decoder uses base64.b64decode +
 * json.loads to recover the original JSON. Since we cannot run Python in
 * vitest, we verify the JavaScript round-trip: encode then decode using the
 * complementary approach (atob -> Uint8Array -> TextDecoder).
 */

// ---------------------------------------------------------------------------
// Replicate the encoder from redirect.ts (toBase64)
// ---------------------------------------------------------------------------

/**
 * Unicode-safe Base64 encoding, identical to redirect.ts `toBase64`.
 */
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Complementary decoder: Base64 -> bytes -> UTF-8 string.
 * This mirrors what Python's `base64.b64decode` + `.decode("utf-8")` does.
 */
function fromBase64(encoded: string): string {
  const binaryStr = atob(encoded);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Base64 encoding/decoding round-trip", () => {
  it("round-trips a simple ASCII string", () => {
    const original = "hello world";
    const encoded = toBase64(original);
    const decoded = fromBase64(encoded);
    expect(decoded).toBe(original);
  });

  it("round-trips a JSON object with ASCII-only data", () => {
    const data = {
      pid: "P001",
      cond: "treatment",
      dvOrder: ["appropriateness", "cringe"],
      block1CategoryOrder: ["Video games", "Snack foods"],
      block2CategoryOrder: ["Snack foods", "Video games"],
      ratings: {
        appropriateness: { video_games: 5, snack_foods: 3 },
        cringe: { video_games: 6, snack_foods: 2 },
      },
      timing: {
        totalMs: 120000,
        block1Ms: 60000,
        block2Ms: 55000,
      },
      completed: true,
    };

    const jsonString = JSON.stringify(data);
    const encoded = toBase64(jsonString);
    const decoded = fromBase64(encoded);
    const parsed = JSON.parse(decoded);

    expect(parsed).toEqual(data);
  });

  it("round-trips JSON with Unicode characters (accented category names)", () => {
    const data = {
      pid: "P999",
      cond: "control",
      dvOrder: ["appropriateness"],
      block1CategoryOrder: ["Cafe\u0301", "Nai\u0308ve", "Cre\u0300me bru\u0302le\u0301e"],
      block2CategoryOrder: [],
      ratings: {
        appropriateness: {
          cafe_: 4,
          nai_ve: 7,
          cre_me_bru_le_e: 2,
        },
      },
      timing: { totalMs: 50000, block1Ms: 50000, block2Ms: 0 },
      completed: true,
    };

    const jsonString = JSON.stringify(data);
    const encoded = toBase64(jsonString);
    const decoded = fromBase64(encoded);
    const parsed = JSON.parse(decoded);

    expect(parsed).toEqual(data);
    // Verify the specific Unicode strings survived
    expect(parsed.block1CategoryOrder[0]).toBe("Cafe\u0301");
    expect(parsed.block1CategoryOrder[1]).toBe("Nai\u0308ve");
  });

  it("round-trips JSON with emoji characters", () => {
    const data = {
      pid: "test",
      note: "Rating: \ud83d\ude0a\ud83d\udc4d\ud83c\udf1f",
    };

    const jsonString = JSON.stringify(data);
    const encoded = toBase64(jsonString);
    const decoded = fromBase64(encoded);
    const parsed = JSON.parse(decoded);

    expect(parsed).toEqual(data);
  });

  it("round-trips JSON with CJK characters", () => {
    const data = {
      pid: "P500",
      categories: ["\u4f60\u597d", "\u4e16\u754c", "\u30c6\u30b9\u30c8"],
    };

    const jsonString = JSON.stringify(data);
    const encoded = toBase64(jsonString);
    const decoded = fromBase64(encoded);
    const parsed = JSON.parse(decoded);

    expect(parsed).toEqual(data);
  });

  it("round-trips an empty JSON object", () => {
    const data = {};
    const jsonString = JSON.stringify(data);
    const encoded = toBase64(jsonString);
    const decoded = fromBase64(encoded);
    const parsed = JSON.parse(decoded);

    expect(parsed).toEqual(data);
  });

  it("round-trips nested structures with arrays and nulls", () => {
    const data = {
      pid: "",
      cond: null,
      ratings: {},
      dvOrder: [],
      nested: { a: { b: { c: [1, 2, 3] } } },
    };

    const jsonString = JSON.stringify(data);
    const encoded = toBase64(jsonString);
    const decoded = fromBase64(encoded);
    const parsed = JSON.parse(decoded);

    expect(parsed).toEqual(data);
  });

  it("produces valid Base64 output (only Base64 chars)", () => {
    const data = { pid: "P001", value: 42 };
    const encoded = toBase64(JSON.stringify(data));

    // Base64 alphabet: A-Z, a-z, 0-9, +, /, and = for padding
    expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

describe("decoder.py compatibility (structural verification)", () => {
  it("encoded data matches the structure decoder.py expects", () => {
    // This mirrors exactly what study-client.tsx builds in studyDataRef
    const studyData = {
      pid: "P001",
      cond: "treatment",
      dvOrder: ["appropriateness", "cringe"],
      block1CategoryOrder: ["Video games", "Snack foods"],
      block2CategoryOrder: ["Snack foods", "Video games"],
      ratings: {
        appropriateness: { video_games: 5, snack_foods: 3 },
        cringe: { video_games: 6, snack_foods: 2 },
      },
      timing: {
        totalMs: 120000,
        block1Ms: 60000,
        block2Ms: 55000,
      },
      completed: true,
    };

    const jsonString = JSON.stringify(studyData);
    const encoded = toBase64(jsonString);
    const decoded = fromBase64(encoded);
    const data = JSON.parse(decoded);

    // Verify all fields that decoder.py's decode_row() accesses:
    // data.get("pid", "")
    expect(data).toHaveProperty("pid");
    // data.get("cond", "")
    expect(data).toHaveProperty("cond");
    // data.get("dvOrder", []) -> joined with "|"
    expect(Array.isArray(data.dvOrder)).toBe(true);
    // data.get("block1CategoryOrder", [])
    expect(Array.isArray(data.block1CategoryOrder)).toBe(true);
    // data.get("block2CategoryOrder", [])
    expect(Array.isArray(data.block2CategoryOrder)).toBe(true);
    // data.get("completed", False)
    expect(data).toHaveProperty("completed");
    // data.get("timing", {}) -> timing.get("totalMs", "") etc.
    expect(data.timing).toHaveProperty("totalMs");
    expect(data.timing).toHaveProperty("block1Ms");
    expect(data.timing).toHaveProperty("block2Ms");
    // data.get("ratings", {}) -> nested dv_id -> category_key -> value
    expect(typeof data.ratings).toBe("object");
    for (const [dvId, categoryRatings] of Object.entries(data.ratings)) {
      expect(typeof dvId).toBe("string");
      expect(typeof categoryRatings).toBe("object");
      for (const [catKey, value] of Object.entries(
        categoryRatings as Record<string, number>
      )) {
        expect(typeof catKey).toBe("string");
        expect(typeof value).toBe("number");
      }
    }
  });

  it("decoder.py flattening logic can be replicated from encoded data", () => {
    // Replicate decode_row() from decoder.py in JS to verify structural compatibility
    const studyData = {
      pid: "P001",
      cond: "treatment",
      dvOrder: ["appropriateness", "cringe"],
      block1CategoryOrder: ["Video games", "Snack foods"],
      block2CategoryOrder: ["Snack foods", "Video games"],
      ratings: {
        appropriateness: { video_games: 5, snack_foods: 3 },
        cringe: { video_games: 6, snack_foods: 2 },
      },
      timing: {
        totalMs: 120000,
        block1Ms: 60000,
        block2Ms: 55000,
      },
      completed: true,
    };

    const encoded = toBase64(JSON.stringify(studyData));
    const decoded = JSON.parse(fromBase64(encoded));

    // Replicate Python decoder.py decode_row logic
    const flat: Record<string, unknown> = {
      pid: decoded.pid ?? "",
      cond: decoded.cond ?? "",
      dvOrder: (decoded.dvOrder ?? []).join("|"),
      block1_order: (decoded.block1CategoryOrder ?? []).join("|"),
      block2_order: (decoded.block2CategoryOrder ?? []).join("|"),
      completed: decoded.completed ?? false,
    };

    const timing = decoded.timing ?? {};
    flat["timing_total_ms"] = timing.totalMs ?? "";
    flat["timing_block1_ms"] = timing.block1Ms ?? "";
    flat["timing_block2_ms"] = timing.block2Ms ?? "";

    const ratings = decoded.ratings ?? {};
    for (const dvId of Object.keys(ratings).sort()) {
      const categoryRatings = ratings[dvId];
      for (const catKey of Object.keys(categoryRatings).sort()) {
        flat[`${dvId}_${catKey}`] = categoryRatings[catKey];
      }
    }

    // Verify flattened output matches expected decoder.py output
    expect(flat.pid).toBe("P001");
    expect(flat.cond).toBe("treatment");
    expect(flat.dvOrder).toBe("appropriateness|cringe");
    expect(flat.block1_order).toBe("Video games|Snack foods");
    expect(flat.block2_order).toBe("Snack foods|Video games");
    expect(flat.completed).toBe(true);
    expect(flat.timing_total_ms).toBe(120000);
    expect(flat.timing_block1_ms).toBe(60000);
    expect(flat.timing_block2_ms).toBe(55000);
    expect(flat["appropriateness_snack_foods"]).toBe(3);
    expect(flat["appropriateness_video_games"]).toBe(5);
    expect(flat["cringe_snack_foods"]).toBe(2);
    expect(flat["cringe_video_games"]).toBe(6);
  });
});

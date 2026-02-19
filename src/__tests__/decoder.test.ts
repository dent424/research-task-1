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

describe("Study 2 decoder.py compatibility", () => {
  /** Replicate Study 2 decoder.py decode_row logic in JS. */
  function flattenStudy2Row(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const flat: Record<string, unknown> = {
      pid: data.pid ?? "",
      cond: data.cond ?? "",
      traitOrder: ((data.dvOrder as string[]) ?? []).join("|"),
      trait1_order: ((data.block1CategoryOrder as string[]) ?? []).join("|"),
      trait2_order: ((data.block2CategoryOrder as string[]) ?? []).join("|"),
      completed: data.completed ?? false,
      age: data.age ?? "",
      gender: data.gender ?? "",
    };

    const timing = (data.timing as Record<string, number>) ?? {};
    flat.timing_total_ms = timing.totalMs ?? "";
    flat.timing_block1_ms = timing.block1Ms ?? "";
    flat.timing_block2_ms = timing.block2Ms ?? "";

    const ratings =
      (data.ratings as Record<string, Record<string, number>>) ?? {};
    for (const traitId of Object.keys(ratings).sort()) {
      const categoryRatings = ratings[traitId];
      for (const catKey of Object.keys(categoryRatings).sort()) {
        flat[`${traitId}_${catKey}`] = categoryRatings[catKey];
      }
    }

    return flat;
  }

  const STUDY2_CATEGORIES = [
    "video_games",
    "amusement_park",
    "snack_foods",
    "gym",
    "car",
    "wedding_planning",
    "home_renovation",
    "public_transit",
    "airline",
    "insurance",
    "tax_preparation",
    "financial_services",
    "healthcare",
    "funeral_services",
  ];

  const META_COLUMNS = [
    "pid",
    "cond",
    "traitOrder",
    "trait1_order",
    "trait2_order",
    "timing_total_ms",
    "timing_block1_ms",
    "timing_block2_ms",
    "completed",
    "age",
    "gender",
  ];

  it("structure test: traitOrder, trait orders, age, gender, 28 rating columns", () => {
    // Build ratings for 2 traits (young, active) × 14 categories
    const youngRatings: Record<string, number> = {};
    const activeRatings: Record<string, number> = {};
    STUDY2_CATEGORIES.forEach((cat, i) => {
      youngRatings[cat] = (i % 7) + 1;
      activeRatings[cat] = ((i + 3) % 7) + 1;
    });

    const studyData = {
      pid: "P100",
      cond: "0,4",
      dvOrder: ["young", "active"],
      block1CategoryOrder: STUDY2_CATEGORIES,
      block2CategoryOrder: [...STUDY2_CATEGORIES].reverse(),
      ratings: {
        young: youngRatings,
        active: activeRatings,
      },
      timing: {
        totalMs: 180000,
        block1Ms: 90000,
        block2Ms: 85000,
      },
      completed: true,
      age: "22",
      gender: "Woman",
    };

    const encoded = toBase64(JSON.stringify(studyData));
    const decoded = JSON.parse(fromBase64(encoded));
    const flat = flattenStudy2Row(decoded);

    // Verify renamed column: dvOrder → traitOrder
    expect(flat.traitOrder).toBe("young|active");

    // Verify renamed columns: block orders → trait1_order / trait2_order
    expect(flat.trait1_order).toBe(STUDY2_CATEGORIES.join("|"));
    expect(flat.trait2_order).toBe([...STUDY2_CATEGORIES].reverse().join("|"));

    // Verify age and gender come from blob (not separate CSV columns)
    expect(flat.age).toBe("22");
    expect(flat.gender).toBe("Woman");

    // Verify 28 rating columns (2 traits × 14 categories)
    const ratingKeys = Object.keys(flat).filter(
      (k) => !META_COLUMNS.includes(k)
    );
    expect(ratingKeys).toHaveLength(28);

    // Spot-check rating values
    expect(flat.young_video_games).toBe(youngRatings.video_games);
    expect(flat.active_funeral_services).toBe(activeRatings.funeral_services);
    expect(flat.young_snack_foods).toBe(youngRatings.snack_foods);
    expect(flat.active_airline).toBe(activeRatings.airline);
  });

  it("sparse between-subjects: two participants produce 56 union columns", () => {
    // Participant 1: young + active (cond="0,4")
    const p1Ratings: Record<string, Record<string, number>> = {
      young: {},
      active: {},
    };
    STUDY2_CATEGORIES.forEach((cat, i) => {
      p1Ratings.young[cat] = (i % 7) + 1;
      p1Ratings.active[cat] = ((i + 3) % 7) + 1;
    });

    const p1Data = {
      pid: "P200",
      cond: "0,4",
      dvOrder: ["young", "active"],
      block1CategoryOrder: STUDY2_CATEGORIES,
      block2CategoryOrder: STUDY2_CATEGORIES,
      ratings: p1Ratings,
      timing: { totalMs: 100000, block1Ms: 50000, block2Ms: 45000 },
      completed: true,
      age: "22",
      gender: "Man",
    };

    // Participant 2: trendy + stable (cond="1,3")
    const p2Ratings: Record<string, Record<string, number>> = {
      trendy: {},
      stable: {},
    };
    STUDY2_CATEGORIES.forEach((cat, i) => {
      p2Ratings.trendy[cat] = ((i + 1) % 7) + 1;
      p2Ratings.stable[cat] = ((i + 5) % 7) + 1;
    });

    const p2Data = {
      pid: "P201",
      cond: "1,3",
      dvOrder: ["trendy", "stable"],
      block1CategoryOrder: STUDY2_CATEGORIES,
      block2CategoryOrder: STUDY2_CATEGORIES,
      ratings: p2Ratings,
      timing: { totalMs: 110000, block1Ms: 55000, block2Ms: 50000 },
      completed: true,
      age: "30",
      gender: "Woman",
    };

    // Flatten both rows (replicating decoder.py)
    const flat1 = flattenStudy2Row(p1Data);
    const flat2 = flattenStudy2Row(p2Data);

    // Collect rating keys (non-meta columns) from each row
    const ratingKeys1 = Object.keys(flat1).filter(
      (k) => !META_COLUMNS.includes(k)
    );
    const ratingKeys2 = Object.keys(flat2).filter(
      (k) => !META_COLUMNS.includes(k)
    );
    const union = new Set([...ratingKeys1, ...ratingKeys2]);

    // 4 traits × 14 categories = 56 total rating columns
    expect(union.size).toBe(56);

    // Each participant has 28 populated columns
    expect(ratingKeys1).toHaveLength(28);
    expect(ratingKeys2).toHaveLength(28);

    // P1 has young/active columns but not trendy/stable
    expect(flat1).toHaveProperty("young_video_games");
    expect(flat1).toHaveProperty("active_video_games");
    expect(flat1).not.toHaveProperty("trendy_video_games");
    expect(flat1).not.toHaveProperty("stable_video_games");

    // P2 has trendy/stable columns but not young/active
    expect(flat2).toHaveProperty("trendy_video_games");
    expect(flat2).toHaveProperty("stable_video_games");
    expect(flat2).not.toHaveProperty("young_video_games");
    expect(flat2).not.toHaveProperty("active_video_games");

    // No overlap: intersection should be empty
    const intersection = ratingKeys1.filter((k) => ratingKeys2.includes(k));
    expect(intersection).toHaveLength(0);
  });
});

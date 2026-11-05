import { NudgeFacts } from '../engine/types';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  numbersFound: number[];
  allowedNumbers: number[];
}

function extractNumbersFromObject(obj: any, set: Set<number>) {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'number') {
    set.add(obj);
    return;
  }
  if (typeof obj === 'string') {
    // extract any standalone or decimal numbers
    const matches = obj.match(/-?\d+(\.\d+)?/g);
    if (matches) {
      matches.forEach((m) => {
        const n = parseFloat(m);
        if (!isNaN(n)) set.add(n);
      });
    }
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item) => extractNumbersFromObject(item, set));
    return;
  }
  if (typeof obj === 'object') {
    Object.values(obj).forEach((val) => extractNumbersFromObject(val, set));
  }
}

export function validateNudgeOutput(
  text: string,
  facts: NudgeFacts
): ValidationResult {
  if (!text || text.trim().length === 0) {
    return { valid: false, reason: 'Empty output', numbersFound: [], allowedNumbers: [] };
  }

  // Word count check: max 45 words
  const words = text.trim().split(/\s+/);
  if (words.length > 45) {
    return {
      valid: false,
      reason: `Word count exceeded (${words.length} > 45)`,
      numbersFound: [],
      allowedNumbers: [],
    };
  }

  // Extract allowed numbers from facts
  const allowedSet = new Set<number>();
  extractNumbersFromObject(facts, allowedSet);

  // Common cricket standard numbers that may legitimately appear in phrasing
  // (e.g. 1st, 2nd, 3, 4, 6 for boundary/six, 10 for balls, 11 for XI)
  [1, 2, 3, 4, 6, 11].forEach((n) => allowedSet.add(n));

  // Extract numbers from generated text
  // Matches integers and floats like 57, 1.5, -2, 182
  const textMatches = text.match(/\b\d+(\.\d+)?\b/g) || [];
  const numbersFound: number[] = textMatches.map((m) => parseFloat(m)).filter((n) => !isNaN(n));

  for (const num of numbersFound) {
    // Check if num is close to any allowed number (handling float precision)
    let found = false;
    for (const allowed of allowedSet) {
      if (Math.abs(num - allowed) < 0.001) {
        found = true;
        break;
      }
    }
    if (!found) {
      return {
        valid: false,
        reason: `Disallowed number in output: ${num}`,
        numbersFound,
        allowedNumbers: Array.from(allowedSet),
      };
    }
  }

  return {
    valid: true,
    numbersFound,
    allowedNumbers: Array.from(allowedSet),
  };
}


/** Checks house number and street structure only, not whether an address exists. */
export function isRoomStreetAddress(value: string): boolean {
  return /^\d+\p{L}?(?:[/-]\d+\p{L}?)*(?:\s+|,\s*)\p{L}[\p{L}\p{N}\s.,/'’()-]*$/u.test(value.trim())
    && (value.trim().match(/\p{L}/gu)?.length ?? 0) >= 2;
}


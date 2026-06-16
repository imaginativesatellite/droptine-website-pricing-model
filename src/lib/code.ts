import { customAlphabet } from "nanoid";

// Human-friendly, unambiguous access codes for the private proposal page.
// Excludes easily-confused characters (0/O, 1/I/L). 8 chars ≈ very low collision risk.
const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generate = customAlphabet(alphabet, 8);

export function generateAccessCode(): string {
  return generate();
}

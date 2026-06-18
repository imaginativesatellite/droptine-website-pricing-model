import { customAlphabet } from "nanoid";

// Human-friendly, unambiguous access codes for the private proposal page.
// Excludes easily-confused characters (0/O, 1/I/L). 8 chars ≈ very low collision risk.
const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generate = customAlphabet(alphabet, 8);

export function generateAccessCode(): string {
  return generate();
}

// Long, hard-to-guess code for the public proposal URL (full alphanumeric, 15 chars).
const publicAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const generatePublic = customAlphabet(publicAlphabet, 15);

export function generatePublicCode(): string {
  return generatePublic();
}

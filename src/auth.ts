import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Simple in-memory brute-force guard (per email). Resets on redeploy; fine for a
// single-instance internal app. Locks an account for WINDOW after MAX failures.
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; first: number }>();

function lockedOut(email: string): boolean {
  const a = attempts.get(email);
  if (!a) return false;
  if (Date.now() - a.first > WINDOW_MS) {
    attempts.delete(email);
    return false;
  }
  return a.count >= MAX_ATTEMPTS;
}
function recordFailure(email: string) {
  const a = attempts.get(email);
  if (!a || Date.now() - a.first > WINDOW_MS) attempts.set(email, { count: 1, first: Date.now() });
  else a.count += 1;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Stay signed in for 90 days without re-entering the password.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 90 },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        // Too many recent failures — reject without checking the password.
        if (lockedOut(email)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          recordFailure(email);
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          recordFailure(email);
          return null;
        }

        attempts.delete(email); // success clears the counter
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as "STAFF" | "ADMIN";
      }
      return session;
    },
  },
});

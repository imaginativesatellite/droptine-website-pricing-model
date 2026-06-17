import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "STAFF" | "ADMIN";
  }
  interface Session {
    user: {
      id: string;
      role: "STAFF" | "ADMIN";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "STAFF" | "ADMIN";
  }
}

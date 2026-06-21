import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "MEMBER" | "ADMIN";
  }
  interface Session {
    user: {
      id: string;
      role: "MEMBER" | "ADMIN";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "MEMBER" | "ADMIN";
  }
}

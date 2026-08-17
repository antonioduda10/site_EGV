import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    invalidated?: boolean;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      roles: string[];
      permissions: string[];
      superAdmin: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: string[];
    userId?: string | null;
    permissions?: string[];
    superAdmin?: boolean;
    sessionVersion?: number;
    invalidated?: boolean;
  }
}

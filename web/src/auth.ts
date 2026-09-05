import { TENANT_SLUG_HEADER } from "backend-library";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";

declare module "next-auth" {
  interface User {
    role?: string;
    accessToken?: string;
  }
  interface Session {
    accessToken?: string;
    user: { role?: string } & DefaultSession["user"];
  }
}

function decodeJwtPayload(token: string): { sub: string; email: string; role?: string } {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const gatewayUrl = process.env.GATEWAY_URL;
        if (!gatewayUrl) {
          throw new Error("Missing GATEWAY_URL environment variable.");
        }

        const tenantSlug = request.headers.get(TENANT_SLUG_HEADER);

        const response = await fetch(`${gatewayUrl}/platform-auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(tenantSlug ? { [TENANT_SLUG_HEADER]: tenantSlug } : {}),
          },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password,
          }),
        });

        if (!response.ok) {
          return null;
        }

        const { accessToken } = (await response.json()) as { accessToken: string };
        const { sub, email, role } = decodeJwtPayload(accessToken);

        return { id: sub, email, role, accessToken };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    session({ session, token }) {
      // `token.role` reads as `unknown` (JWT's own index signature) — augmenting
      // "next-auth/jwt" isn't resolvable for ambient augmentation under this
      // pnpm layout (@auth/core is nested inside next-auth, not hoisted to web).
      session.user.role = token.role as string | undefined;
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
});

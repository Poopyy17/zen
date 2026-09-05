import { getSession, signIn, signOut } from "next-auth/react";

export type LoginResult = { ok: true; email: string; role?: string } | { ok: false };

export async function loginWithCredentials(email: string, password: string): Promise<LoginResult> {
  const result = await signIn("credentials", { email, password, redirect: false });
  if (!result || result.error) {
    return { ok: false };
  }

  const session = await getSession();
  return { ok: true, email: session?.user?.email ?? email, role: session?.user?.role };
}

export async function logout(): Promise<void> {
  await signOut({ redirect: false });
}

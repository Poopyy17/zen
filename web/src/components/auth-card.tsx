"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "ui-library";
import { loginWithCredentials, logout } from "@/lib/auth-client";
import { FormStatus } from "@/lib/form-status";
import { useState } from "react";
import type { FormEvent } from "react";

function preventDefault(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
}

type LoginState =
  | { status: typeof FormStatus.Idle | typeof FormStatus.Loading }
  | { status: typeof FormStatus.Error }
  | { status: typeof FormStatus.Success; email: string; role?: string };

export function AuthCard({ tenantSlug }: { tenantSlug: string | null }) {
  const [loginState, setLoginState] = useState<LoginState>({ status: FormStatus.Idle });

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginState({ status: FormStatus.Loading });

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const result = await loginWithCredentials(email, password);
    if (!result.ok) {
      setLoginState({ status: FormStatus.Error });
      return;
    }

    setLoginState({ status: FormStatus.Success, email: result.email, role: result.role });
  }

  async function handleLogout() {
    await logout();
    setLoginState({ status: FormStatus.Idle });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          {tenantSlug ? `Zen · ${tenantSlug}` : "Zen"}
        </p>
        <CardTitle className="text-2xl tracking-tight text-balance">Sign in to your workspace</CardTitle>
        <CardDescription>Use your work email to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login">
          <TabsList>
            <TabsTrigger value="login">Log in</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            {loginState.status === FormStatus.Success ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-foreground">
                  Logged in as <span className="font-medium">{loginState.email}</span>
                  {loginState.role ? ` (${loginState.role})` : ""}.
                </p>
                <Button type="button" variant="outline" onClick={handleLogout}>
                  Log out
                </Button>
              </div>
            ) : (
              <form className="flex flex-col gap-5" onSubmit={handleLogin}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" required placeholder="you@example.com" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" name="password" type="password" required />
                </div>
                {loginState.status === FormStatus.Error ? (
                  <p className="text-sm text-destructive">Invalid email or password.</p>
                ) : null}
                <Button type="submit" className="mt-1" disabled={loginState.status === FormStatus.Loading}>
                  {loginState.status === FormStatus.Loading ? "Logging in…" : "Log in"}
                </Button>
              </form>
            )}
          </TabsContent>
          <TabsContent value="register">
            <form className="flex flex-col gap-5" onSubmit={preventDefault}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="register-name">Full name</Label>
                <Input id="register-name" name="name" required placeholder="Jane Doe" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="register-password">Password</Label>
                <Input id="register-password" name="password" type="password" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="register-confirm-password">Confirm password</Label>
                <Input id="register-confirm-password" name="confirmPassword" type="password" required />
              </div>
              <p className="text-sm text-muted-foreground">Registration isn&apos;t available yet.</p>
              <Button type="submit" className="mt-1" disabled>
                Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

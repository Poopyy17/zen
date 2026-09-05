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
import type { FormEvent } from "react";

function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
}

export function AuthCard() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">Zen</p>
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
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" name="email" type="email" required placeholder="you@example.com" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" name="password" type="password" required />
              </div>
              <Button type="submit" className="mt-1">
                Log in
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="register">
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
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
              <Button type="submit" className="mt-1">
                Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

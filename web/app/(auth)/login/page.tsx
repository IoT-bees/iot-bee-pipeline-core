"use client";

import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { authApi } from "@/lib/api/endpoints/auth";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/schemas/auth";

type Mode = "loading" | "login" | "register";

function LoginInner() {
  const [mode, setMode] = useState<Mode>("loading");
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") ?? "/app";

  useEffect(() => {
    authApi
      .hasUsers()
      .then((r) => setMode(r.has_users ? "login" : "register"))
      .catch(() => setMode("login"));
  }, []);

  const loginForm = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onLogin(values: LoginInput) {
    setServerError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(values),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "login failed" }));
      setServerError(body.error ?? "login failed");
      return;
    }
    router.push(nextPath);
  }

  async function onRegister(values: RegisterInput) {
    setServerError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(values),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "register failed" }));
      setServerError(body.error ?? "register failed");
      return;
    }
    router.push(nextPath);
  }

  if (mode === "loading") {
    return <div className="t-mono">{"// "}loading…</div>;
  }

  if (mode === "register") {
    return (
      <form onSubmit={registerForm.handleSubmit(onRegister)}>
        <h1 className="t-title mb-1">create admin account</h1>
        <p className="t-mono mb-6">
          {"// "}no users yet — this account becomes the only admin.
        </p>
        <FormField label="EMAIL" error={registerForm.formState.errors.email?.message}>
          <Input {...registerForm.register("email")} placeholder="you@host" />
        </FormField>
        <FormField label="NAME" error={registerForm.formState.errors.name?.message}>
          <Input {...registerForm.register("name")} placeholder="ovidio" />
        </FormField>
        <FormField
          label="PASSWORD"
          error={registerForm.formState.errors.password?.message}
        >
          <Input
            type="password"
            {...registerForm.register("password")}
            placeholder="≥ 8 chars"
          />
        </FormField>
        {serverError && (
          <div className="text-[10px] text-[var(--color-danger)] mb-3">× {serverError}</div>
        )}
        <div className="flex gap-3 items-center">
          <Button type="submit" variant="primary">
            + CREATE ADMIN
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={loginForm.handleSubmit(onLogin)}>
      <h1 className="t-title mb-1">login</h1>
      <p className="t-mono mb-6">{"// "}$ auth login</p>
      <FormField label="EMAIL" error={loginForm.formState.errors.email?.message}>
        <Input {...loginForm.register("email")} placeholder="you@host" autoFocus />
      </FormField>
      <FormField label="PASSWORD" error={loginForm.formState.errors.password?.message}>
        <Input type="password" {...loginForm.register("password")} />
      </FormField>
      {serverError && (
        <div className="text-[10px] text-[var(--color-danger)] mb-3">× {serverError}</div>
      )}
      <div className="flex gap-3 items-center">
        <Button type="submit" variant="primary">
          ▸ LOGIN
        </Button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="t-mono">{"// "}loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}

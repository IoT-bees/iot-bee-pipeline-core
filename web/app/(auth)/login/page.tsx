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

const inputClass =
  "text-[15px] py-3 px-4 placeholder:text-[var(--color-fg-4)]";
const buttonClass = "text-[14px] py-3 px-6";
const fieldClass =
  "[&>div:first-child]:text-[12px] [&>div:first-child]:tracking-[2.5px] mb-5";

function LoginInner() {
  const [mode, setMode] = useState<Mode>("loading");
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/app";
  const nextPath =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app";

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
    return <div className="text-[13px] text-[var(--color-fg-3)]">{"// "}loading…</div>;
  }

  if (mode === "register") {
    return (
      <form onSubmit={registerForm.handleSubmit(onRegister)}>
        <h1 className="text-[28px] font-bold tracking-[-1px] text-[var(--color-fg-0)] mb-2">
          create admin account
        </h1>
        <p className="text-[13px] text-[var(--color-fg-3)] mb-8">
          {"// "}no users yet — this account becomes the only admin.
        </p>
        <FormField
          label="EMAIL"
          className={fieldClass}
          error={registerForm.formState.errors.email?.message}
        >
          <Input
            {...registerForm.register("email")}
            placeholder="you@host"
            className={inputClass}
          />
        </FormField>
        <FormField
          label="NAME"
          className={fieldClass}
          error={registerForm.formState.errors.name?.message}
        >
          <Input
            {...registerForm.register("name")}
            placeholder="ovidio"
            className={inputClass}
          />
        </FormField>
        <FormField
          label="PASSWORD"
          className={fieldClass}
          error={registerForm.formState.errors.password?.message}
        >
          <Input
            type="password"
            {...registerForm.register("password")}
            placeholder="≥ 8 characters"
            className={inputClass}
          />
        </FormField>
        {serverError && (
          <div className="text-[12px] text-[var(--color-danger)] mb-4">
            × {serverError}
          </div>
        )}
        <div className="flex gap-3 items-center mt-6">
          <Button type="submit" variant="primary" className={buttonClass}>
            + CREATE ADMIN
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={loginForm.handleSubmit(onLogin)}>
      <h1 className="text-[28px] font-bold tracking-[-1px] text-[var(--color-fg-0)] mb-2">
        login
      </h1>
      <p className="text-[13px] text-[var(--color-fg-3)] mb-8">
        {"// "}$ auth login
      </p>
      <FormField
        label="EMAIL"
        className={fieldClass}
        error={loginForm.formState.errors.email?.message}
      >
        <Input
          {...loginForm.register("email")}
          placeholder="you@host"
          autoFocus
          className={inputClass}
        />
      </FormField>
      <FormField
        label="PASSWORD"
        className={fieldClass}
        error={loginForm.formState.errors.password?.message}
      >
        <Input
          type="password"
          {...loginForm.register("password")}
          placeholder="••••••••"
          className={inputClass}
        />
      </FormField>
      {serverError && (
        <div className="text-[12px] text-[var(--color-danger)] mb-4">
          × {serverError}
        </div>
      )}
      <div className="flex gap-3 items-center mt-6">
        <Button type="submit" variant="primary" className={buttonClass}>
          ▸ LOGIN
        </Button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-[var(--color-fg-3)]">{"// "}loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}

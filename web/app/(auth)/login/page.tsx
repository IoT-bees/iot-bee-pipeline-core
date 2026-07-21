"use client";

import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { HoneycombLoader } from "@/components/ui/HoneycombLoader";
import { authApi } from "@/lib/api/endpoints/auth";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/schemas/auth";

type Mode = "loading" | "login" | "register";
type SessionState = "checking" | "authenticated" | "anonymous";

const inputClass =
  "text-[15px] py-3 px-4 placeholder:text-[var(--color-fg-4)]";
const buttonClass = "text-[14px] py-3 px-6";
const fieldClass =
  "[&>div:first-child]:text-[12px] mb-5";

function LoginInner() {
  const [mode, setMode] = useState<Mode>("loading");
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/app";
  const nextPath =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app";

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me")
      .then((response) => {
        if (!active) return;
        if (response.ok) {
          setSessionState("authenticated");
          router.replace(nextPath);
          return;
        }
        setSessionState("anonymous");
      })
      .catch(() => {
        if (active) setSessionState("anonymous");
      });

    return () => {
      active = false;
    };
  }, [nextPath, router]);

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
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "No fue posible ingresar" }));
        setServerError(
          res.status === 401 ? "El correo o la contraseña no son correctos." : body.error ?? "No fue posible ingresar",
        );
        setIsLoggingIn(false);
        return;
      }
      router.push(nextPath);
    } catch {
      setServerError("No fue posible conectar con la plataforma.");
      setIsLoggingIn(false);
    }
  }

  async function onRegister(values: RegisterInput) {
    setServerError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(values),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "No fue posible crear la cuenta" }));
      setServerError(body.error ?? "No fue posible crear la cuenta");
      return;
    }
    router.push(nextPath);
  }

  if (sessionState !== "anonymous" || mode === "loading") {
    return <HoneycombLoader label="" />;
  }

  if (mode === "register") {
    return (
      <form onSubmit={registerForm.handleSubmit(onRegister)}>
        <h1 className="text-[28px] font-bold text-[var(--color-fg-0)] mb-2">
          Crea la cuenta administradora
        </h1>
        <p className="text-[13px] text-[var(--color-fg-3)] mb-8">
          Esta será la cuenta principal para administrar la plataforma.
        </p>
        <FormField
          label="CORREO ELECTRÓNICO"
          className={fieldClass}
          error={registerForm.formState.errors.email?.message}
        >
          <Input
            {...registerForm.register("email")}
            placeholder="tu@empresa.com"
            className={inputClass}
          />
        </FormField>
        <FormField
          label="NOMBRE"
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
          label="CONTRASEÑA"
          className={fieldClass}
          error={registerForm.formState.errors.password?.message}
        >
          <Input
            type="password"
            {...registerForm.register("password")}
            placeholder="Mínimo 8 caracteres"
            className={inputClass}
          />
        </FormField>
        {serverError && (
          <div className="text-[12px] text-[var(--color-danger)] mb-4">
            × {serverError}
          </div>
        )}
        <div className="flex gap-3 items-center mt-6">
          <Button
            type="submit"
            variant="primary"
            className={buttonClass}
            disabled={registerForm.formState.isSubmitting}
            aria-busy={registerForm.formState.isSubmitting}
          >
            {registerForm.formState.isSubmitting ? "CREANDO CUENTA..." : "+ CREAR CUENTA ADMINISTRADORA"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={loginForm.handleSubmit(onLogin)}>
      <h1 className="text-[28px] font-bold text-[var(--color-fg-0)] mb-2">
        Ingresar
      </h1>
      <p className="text-[13px] text-[var(--color-fg-3)] mb-8">
        Accede a la plataforma con tu cuenta.
      </p>
      <FormField
        label="CORREO ELECTRÓNICO"
        className={fieldClass}
        error={loginForm.formState.errors.email?.message}
      >
        <Input
          {...loginForm.register("email")}
          placeholder="tu@empresa.com"
          autoFocus
          className={inputClass}
        />
      </FormField>
      <FormField
        label="CONTRASEÑA"
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
        <Button
          type="submit"
          variant="primary"
          className={buttonClass}
          disabled={loginForm.formState.isSubmitting || isLoggingIn}
          aria-busy={loginForm.formState.isSubmitting || isLoggingIn}
        >
          {loginForm.formState.isSubmitting || isLoggingIn ? "INGRESANDO..." : "▸ INGRESAR"}
        </Button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<HoneycombLoader label="" />}>
      <LoginInner />
    </Suspense>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { usePatchOrganization } from "@/lib/hooks/useOrganization";
import type { Organization } from "@/lib/api/types";

const SLUG_RE = /^[a-z0-9-]+$/;

export function OrgForm({ initial }: { initial: Organization }) {
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const patch = usePatchOrganization();

  useEffect(() => {
    setName(initial.name);
    setSlug(initial.slug);
  }, [initial.id, initial.name, initial.slug]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!SLUG_RE.test(slug)) {
      setSlugError("Usa solo minúsculas, números y guiones.");
      return;
    }
    setSlugError(null);
    patch.mutate(
      { name, slug },
      {
        onSuccess: (organization) => {
          setName(organization.name);
          setSlug(organization.slug);
        },
      },
    );
  }

  const dirty = name !== initial.name || slug !== initial.slug;

  return (
    <form onSubmit={submit} className="space-y-4 max-w-[480px]">
      <FormField label="nombre" hint="Nombre visible para las personas que usan este espacio de trabajo.">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </FormField>
      <FormField label="slug" hint="Sólo minúsculas, números y guiones. Cambiarlo puede afectar enlaces compartidos.">
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          className="font-mono"
        />
        {slugError && <div className="text-[12px] text-[var(--color-danger)] mt-1">{slugError}</div>}
      </FormField>
      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={!dirty || patch.isPending}
        >
          {patch.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

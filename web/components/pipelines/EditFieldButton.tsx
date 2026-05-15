"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { canStop } from "@/lib/status";

interface Props {
  label: string;
  currentId: number | undefined;
  options: { id: number; name: string }[];
  onChange: (newId: number) => Promise<void>;
  pipelineStatus: string | undefined;
}

export function EditFieldButton({
  label,
  currentId,
  options,
  onChange,
  pipelineStatus,
}: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number | undefined>(currentId);
  const [busy, setBusy] = useState(false);
  const blocked = canStop(pipelineStatus);

  function handleOpen() {
    setValue(currentId);
    setOpen(true);
  }

  async function handleApply() {
    if (value === undefined || value === currentId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await onChange(value);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="text-[11px] tracking-[1.5px] text-[var(--color-fg-3)] hover:text-[var(--color-accent)] underline-offset-2 hover:underline"
      >
        [edit]
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="p-5">
          <h3 className="t-section mb-3">{`// edit ${label}`}</h3>
          {blocked && (
            <div className="mb-3 text-[12px] text-[var(--color-danger)]">
              × pipeline is running — stop it first
            </div>
          )}
          <Select
            value={value === undefined ? "" : String(value)}
            onChange={(e) => setValue(Number(e.target.value))}
            disabled={blocked}
          >
            <option value="" disabled>
              -- choose --
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2 mt-4 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleApply}
              disabled={busy || blocked}
            >
              apply
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

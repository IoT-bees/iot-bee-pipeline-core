import { describe, expect, it } from "vitest";
import { encodePayload, decodePayload, matchesSlotKind, DND_MIME } from "@/components/pipelines/canvas/dnd";

function fakeDataTransfer(items: Record<string, string>): DataTransfer {
  return {
    getData: (k: string) => items[k] ?? "",
    setData: () => undefined,
    clearData: () => undefined,
    types: Object.keys(items),
  } as unknown as DataTransfer;
}

describe("dnd helpers", () => {
  it("round-trips an encoded payload", () => {
    const dt = fakeDataTransfer({ [DND_MIME]: encodePayload({ slotKind: "source", resourceType: "MQTT" }) });
    expect(decodePayload(dt)).toEqual({ slotKind: "source", resourceType: "MQTT" });
  });

  it("returns null when the mime type is missing", () => {
    expect(decodePayload(fakeDataTransfer({ "text/plain": "foo" }))).toBeNull();
  });

  it("returns null on malformed JSON", () => {
    expect(decodePayload(fakeDataTransfer({ [DND_MIME]: "{not json" }))).toBeNull();
  });

  it("returns null when payload is missing fields", () => {
    expect(decodePayload(fakeDataTransfer({ [DND_MIME]: JSON.stringify({ slotKind: "source" }) }))).toBeNull();
  });

  it("matchesSlotKind accepts matching kinds", () => {
    expect(matchesSlotKind({ slotKind: "source", resourceType: "MQTT" }, "source")).toBe(true);
  });

  it("matchesSlotKind rejects mismatched kinds", () => {
    expect(matchesSlotKind({ slotKind: "source", resourceType: "MQTT" }, "schema")).toBe(false);
  });
});

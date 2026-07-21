import { describe, expect, it } from "vitest";
import { shouldShowNavigationFeedback } from "@/lib/navigationFeedback";

const currentUrl = "http://localhost:3000/schemas";

function clickFor(href: string, attributes = "") {
  document.body.innerHTML = `<a href="${href}" ${attributes}><span>Ir</span></a>`;
  const target = document.querySelector("span");
  if (!target) throw new Error("No se pudo preparar el enlace de prueba.");
  const event = new MouseEvent("click", { bubbles: true, button: 0 });
  Object.defineProperty(event, "target", { value: target });
  return event;
}

describe("shouldShowNavigationFeedback", () => {
  it("activa la señal para enlaces internos hacia otra sección", () => {
    const event = clickFor("/schemas/new");
    expect(shouldShowNavigationFeedback(event, currentUrl)).toBe(true);
  });

  it("ignora anclas, enlaces externos y nuevas pestañas", () => {
    for (const [href, attributes] of [
      ["#campos", ""],
      ["https://example.com", ""],
      ["/pipelines", 'target="_blank"'],
    ]) {
      const event = clickFor(href, attributes);
      expect(shouldShowNavigationFeedback(event, currentUrl)).toBe(false);
    }
  });
});

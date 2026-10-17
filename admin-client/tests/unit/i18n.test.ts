import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

function loadLocale(file: string): Record<string, string> {
  return JSON.parse(
    readFileSync(new URL(`../../i18n/locales/${file}`, import.meta.url), "utf8")
  );
}

/**
 * Guards against locale drift: every key must exist in both languages with a
 * non-empty value.
 */
describe("i18n locale files", () => {
  const en = loadLocale("en.json");
  const vi = loadLocale("vi.json");

  it("have identical key sets (en/vi parity)", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
  });

  it("have no empty translations", () => {
    for (const [locale, messages] of Object.entries({ en, vi })) {
      for (const [key, value] of Object.entries(messages)) {
        expect(String(value).trim(), `${locale}:${key}`).not.toBe("");
      }
    }
  });
});

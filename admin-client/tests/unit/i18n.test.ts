import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

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

  it("resolve literal translation keys used by console screens and shared controls", () => {
    const root = fileURLToPath(new URL("../../", import.meta.url));
    for (const folder of ["pages", "components", "layouts", "composables"]) {
      for (const entry of readdirSync(`${root}${folder}`, { recursive: true })) {
        if (!/\.(vue|ts)$/.test(String(entry))) continue;
        const path = `${root}${folder}/${entry}`;
        const source = readFileSync(path, "utf8");
        for (const match of source.matchAll(/(?:\$t|\bt)\(\s*["']([^"'`]+)["']/g)) {
          const key = match[1]!;
          // Concatenated enum-key prefixes are checked by their data-specific tests.
          if (key.endsWith(".")) continue;
          expect(en[key], `${folder}/${entry}: ${key}`).toBeDefined();
        }
      }
    }
  });
});

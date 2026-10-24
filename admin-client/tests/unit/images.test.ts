import { describe, it, expect } from "vitest";
import { mediaImageUrl } from "../../utils/images";

describe("media image URLs", () => {
  it("resolves object keys against the public bucket, including leading/trailing slashes", () => {
    expect(
      mediaImageUrl("/room/one/photo.avif", "https://media.example/uploads/")
    ).toBe("https://media.example/uploads/room/one/photo.avif");
    expect(
      mediaImageUrl("hotel/photo.avif", "https://media.example/uploads")
    ).toBe("https://media.example/uploads/hotel/photo.avif");
  });
  it("preserves CDN and signed URLs without rewriting their query", () => {
    for (const source of [
      "https://cdn.example/a?signature=abc",
      "//cdn.example/a",
      "blob:local",
      "data:image/png;base64,abc",
    ])
      expect(mediaImageUrl(source, "https://media.example")).toBe(source);
  });
  it("does not request the admin HTML fallback when the base/key is missing", () => {
    expect(mediaImageUrl("room/one/a.avif", "")).toBe("");
    expect(mediaImageUrl(null, "https://media.example")).toBe("");
    expect(mediaImageUrl("javascript:alert(1)", "https://media.example")).toBe(
      ""
    );
  });
});

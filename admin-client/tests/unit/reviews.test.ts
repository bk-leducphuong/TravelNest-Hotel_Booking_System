import { describe, it, expect } from "vitest";
import {
  canReplyToReview,
  formatRating,
  reviewStatusTagType,
  reviewTransitions,
} from "../../utils/reviews";

describe("review helpers", () => {
  describe("reviewTransitions", () => {
    it("mirrors the server state machine", () => {
      expect(reviewTransitions("published").sort()).toEqual(["deleted", "hidden"]);
      expect(reviewTransitions("hidden").sort()).toEqual(["deleted", "published"]);
    });

    it("treats deleted as terminal", () => {
      expect(reviewTransitions("deleted")).toEqual([]);
    });
  });

  describe("canReplyToReview", () => {
    it("disallows replies on deleted reviews", () => {
      expect(canReplyToReview("published")).toBe(true);
      expect(canReplyToReview("hidden")).toBe(true);
      expect(canReplyToReview("deleted")).toBe(false);
    });
  });

  describe("presentation", () => {
    it("maps statuses to tag types", () => {
      expect(reviewStatusTagType("published")).toBe("success");
      expect(reviewStatusTagType("hidden")).toBe("warning");
      expect(reviewStatusTagType("deleted")).toBe("danger");
    });

    it("formats ratings to one decimal", () => {
      expect(formatRating("9.5")).toBe("9.5");
      expect(formatRating(8)).toBe("8.0");
      expect(formatRating(null)).toBe("—");
    });
  });
});

import { describe, expect, it } from "vitest";
import { splitLeaderboard, type ContentPerformance } from "@/lib/analytics/service";

function make(id: string, engagementRate: number): ContentPerformance {
  return { contentId: id, title: id, format: "POST", publishedAt: null, reach: 1000, engagementRate, likes: 0, comments: 0, saves: 0 };
}

describe("splitLeaderboard", () => {
  it("returns nothing for an empty sample", () => {
    const { topPerforming, lowPerforming } = splitLeaderboard([]);
    expect(topPerforming).toEqual([]);
    expect(lowPerforming).toEqual([]);
  });

  it("a single post is only ever the top performer, never flagged as needing attention", () => {
    const only = make("a", 12.7);
    const { topPerforming, lowPerforming } = splitLeaderboard([only]);
    expect(topPerforming).toEqual([only]);
    expect(lowPerforming).toEqual([]);
  });

  it("never shows the same post in both lists — this was a real bug found via smoke testing seed data", () => {
    // Regression: with 3 published posts, a naive slice(0,5) + slice(-5).reverse() put the BEST
    // performer at the bottom of the "needs attention" list.
    const sorted = [make("best", 12.69), make("mid", 6.57), make("worst", 2.46)];
    const { topPerforming, lowPerforming } = splitLeaderboard(sorted);

    const topIds = topPerforming.map((p) => p.contentId);
    const lowIds = lowPerforming.map((p) => p.contentId);
    const overlap = topIds.filter((id) => lowIds.includes(id));

    expect(overlap).toEqual([]);
    expect(topIds).toContain("best");
    expect(lowIds).not.toContain("best");
  });

  it("splits a larger sample into non-overlapping halves, capped at 5 each", () => {
    const sorted = Array.from({ length: 12 }, (_, i) => make(`p${i}`, 100 - i));
    const { topPerforming, lowPerforming } = splitLeaderboard(sorted);

    expect(topPerforming).toHaveLength(5);
    expect(lowPerforming).toHaveLength(5);
    expect(topPerforming.map((p) => p.contentId)).toEqual(["p0", "p1", "p2", "p3", "p4"]);
    expect(lowPerforming.map((p) => p.contentId)).toEqual(["p11", "p10", "p9", "p8", "p7"]);
  });
});

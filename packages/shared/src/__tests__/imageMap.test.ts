import { describe, expect, it } from "vitest";

import { CHALLENGE_CARD_BACK, getChallengeCardImage } from "../imageMap";

describe("challenge card image lookup", () => {
  it("maps prefixed challenge IDs to matching image files", () => {
    expect(getChallengeCardImage("challenge-value-5-0")).toBe("challenge_5.png");
    expect(getChallengeCardImage("challenge-value-10-12")).toBe("challenge_10.png");
  });

  it("maps plain numeric challenge IDs to matching image files", () => {
    expect(getChallengeCardImage("3")).toBe("challenge_3.png");
  });

  it("falls back to challenge_back for unknown IDs", () => {
    expect(getChallengeCardImage("challenge-value-11-0")).toBe(CHALLENGE_CARD_BACK);
    expect(getChallengeCardImage("hidden")).toBe(CHALLENGE_CARD_BACK);
  });
});

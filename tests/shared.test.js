const test = require("node:test");
const assert = require("node:assert/strict");
const shared = require("../src/shared.js");

test("parseAbbreviatedCount handles plain, comma, and abbreviated values", () => {
  assert.equal(shared.parseAbbreviatedCount("123"), 123);
  assert.equal(shared.parseAbbreviatedCount("1,234"), 1234);
  assert.equal(shared.parseAbbreviatedCount("1.2K"), 1200);
  assert.equal(shared.parseAbbreviatedCount("3.4M"), 3400000);
});

test("extractCountByLabel reads following and followers text", () => {
  const text = "Following 1,234 Followers 1.5K";
  assert.equal(shared.extractCountByLabel(text, "Following"), 1234);
  assert.equal(shared.extractCountByLabel(text, "Followers"), 1500);
});

test("evaluateProfile marks all mutual accounts and returns direct follow rate", () => {
  const matched = shared.evaluateProfile(
    {
      isFollowing: true,
      followsYou: true,
      followingCount: 1200,
      followerCount: 1000
    },
    30
  );

  const outOfRange = shared.evaluateProfile(
    {
      isFollowing: true,
      followsYou: true,
      followingCount: 1800,
      followerCount: 1000
    },
    30
  );

  const notMutual = shared.evaluateProfile(
    {
      isFollowing: true,
      followsYou: false,
      followingCount: 1100,
      followerCount: 1000
    },
    30
  );

  assert.equal(matched.shouldHighlight, true);
  assert.equal(matched.ratio, 1.2);
  assert.equal(outOfRange.shouldHighlight, true);
  assert.equal(outOfRange.reason, "matched");
  assert.equal(outOfRange.ratio, 1.8);
  assert.equal(notMutual.shouldHighlight, false);
  assert.equal(notMutual.reason, "not_mutual");
});

test("formatFollowRate renders following-to-followers decimal", () => {
  assert.equal(shared.formatFollowRate(1.2), "1.20");
  assert.equal(shared.formatFollowRate(0.875), "0.88");
});

test("evaluateProfile refuses to highlight when counts are missing", () => {
  const result = shared.evaluateProfile(
    {
      isFollowing: true,
      followsYou: true,
      followingCount: null,
      followerCount: 1000
    },
    30
  );

  assert.equal(result.shouldHighlight, false);
  assert.equal(result.reason, "missing_counts");
});

test("mergeConfig clamps ratio tolerance", () => {
  const config = shared.mergeConfig({
    language: "zh-CN",
    badgePosition: "nope",
    ratioTolerancePct: 31,
    highlightPosts: 0,
    showBadgeNumbers: 0
  });

  assert.equal(config.language, "zh_CN");
  assert.equal(config.badgePosition, "corner");
  assert.equal(config.ratioTolerancePct, 30);
  assert.equal(config.highlightPosts, false);
  assert.equal(config.showBadgeNumbers, false);
});

test("normalizeBadgePosition accepts top right", () => {
  assert.equal(shared.normalizeBadgePosition("top_right"), "top_right");
  assert.equal(shared.normalizeBadgePosition("header"), "header");
  assert.equal(shared.normalizeBadgePosition("other"), "corner");
});

test("mergeConfig defaults highlightPosts to false", () => {
  const config = shared.mergeConfig({});
  assert.equal(config.language, "en");
  assert.equal(config.highlightPosts, false);
});

test("normalizeLanguage supports english, chinese, and japanese", () => {
  assert.equal(shared.normalizeLanguage("en"), "en");
  assert.equal(shared.normalizeLanguage("zh-CN"), "zh_CN");
  assert.equal(shared.normalizeLanguage("ja-JP"), "ja");
  assert.equal(shared.normalizeLanguage("fr"), "en");
});

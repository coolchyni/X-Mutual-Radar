(function initShared(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.XMutualShared = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createShared() {
  const DEFAULT_CONFIG = {
    enabled: true,
    language: "en",
    badgePosition: "top_right",
    highlightPosts: false,
    showBadgeNumbers: true,
    ratioTolerancePct: 30,
    scanScope: "home_timeline"
  };
  const SUPPORTED_LANGUAGES = new Set(["en", "zh_CN", "ja"]);
  const LOCALE_TAGS = {
    en: "en-US",
    zh_CN: "zh-CN",
    ja: "ja-JP"
  };
  const MESSAGES = {
    en: {
      popupTitle: "X Mutual Radar",
      popupSubtitle: "Automatically label mutual and one-way follow relationships on x.com, with an optional following / followers rate.",
      authorLabel: "Author",
      plannerLabel: "Planner",
      authorLink: "@chyni",
      languageLabel: "Language",
      languageEnglish: "English",
      languageChinese: "中文",
      languageJapanese: "日本語",
      enabledTitle: "Extension",
      enabledHelp: "Turn off to hide page annotations",
      showBadgeNumbersTitle: "Show follow rate",
      showBadgeNumbersHelp: "Turn off to show labels only",
      highlightPostsTitle: "Highlight posts",
      highlightPostsHelp: "Turn off to remove background highlights",
      badgePositionTitle: "Badge position",
      badgePositionHelp: "Right of actions / Below author",
      badgePositionTopRight: "Top-right",
      badgePositionHeader: "Below author row",
      statsTitle: "Page status",
      pageStatusChecking: "Checking...",
      pageStatusDisconnected: "Open x.com",
      pageStatusConnected: "Connected",
      scannedPosts: "Scanned posts",
      highlightedPosts: "Matched badges",
      liveAuthors: "Resolved authors",
      insufficientData: "Insufficient data",
      notMutual: "Not mutual",
      badgeMutual: "Mutual",
      badgeFollowing: "Following",
      badgeFollowedBy: "Follows you",
      relationLabel: "Relation",
      followingLabel: "Following",
      followersLabel: "Followers",
      followRateLabel: "Follow rate",
      sourceLabel: "Source",
      updatedLabel: "Updated",
      relationMutual: "Mutual",
      relationFollowing: "Following",
      relationFollowedBy: "Follows you",
      relationNone: "None",
      reasonMatched: "Matched",
      reasonNotMutual: "Not mutual",
      reasonRatioOutOfRange: "Out of range",
      reasonMissingCounts: "Insufficient data",
      reasonPending: "Pending"
    },
    zh_CN: {
      popupTitle: "X互关雷达",
      popupSubtitle: "自动标记 x.com 上的互关和单向关注关系，并可选择显示 following / followers 关注率。",
      authorLabel: "作者",
      plannerLabel: "策划",
      authorLink: "@chyni",
      languageLabel: "语言",
      languageEnglish: "English",
      languageChinese: "中文",
      languageJapanese: "日本語",
      enabledTitle: "插件开关",
      enabledHelp: "关闭后隐藏页面标注",
      showBadgeNumbersTitle: "显示关注率",
      showBadgeNumbersHelp: "关闭后仅显示标签",
      highlightPostsTitle: "高亮帖子",
      highlightPostsHelp: "关闭后不高亮背景",
      badgePositionTitle: "标签位置",
      badgePositionHelp: "按钮右侧 / 作者下方",
      badgePositionTopRight: "右上角",
      badgePositionHeader: "作者信息下方",
      statsTitle: "当前页状态",
      pageStatusChecking: "检测中...",
      pageStatusDisconnected: "请打开 x.com",
      pageStatusConnected: "已连接",
      scannedPosts: "已扫描帖子",
      highlightedPosts: "命中标记",
      liveAuthors: "识别作者",
      insufficientData: "资料不足",
      notMutual: "不是互关",
      badgeMutual: "互关",
      badgeFollowing: "我关注",
      badgeFollowedBy: "关注我",
      relationLabel: "关系",
      followingLabel: "Following",
      followersLabel: "Followers",
      followRateLabel: "关注率",
      sourceLabel: "来源",
      updatedLabel: "更新时间",
      relationMutual: "互关",
      relationFollowing: "我关注",
      relationFollowedBy: "对方关注我",
      relationNone: "无关系",
      reasonMatched: "命中",
      reasonNotMutual: "不是互关",
      reasonRatioOutOfRange: "比例超范围",
      reasonMissingCounts: "资料不足",
      reasonPending: "待分析"
    },
    ja: {
      popupTitle: "X相互フォローレーダー",
      popupSubtitle: "x.com 上の相互フォローと片方向フォローを自動で表示し、following / followers 比率も任意で表示できます。",
      authorLabel: "作者",
      plannerLabel: "企画",
      authorLink: "@chyni",
      languageLabel: "言語",
      languageEnglish: "English",
      languageChinese: "中文",
      languageJapanese: "日本語",
      enabledTitle: "拡張機能",
      enabledHelp: "オフでページのラベルを非表示",
      showBadgeNumbersTitle: "比率を表示",
      showBadgeNumbersHelp: "オフでラベルのみ表示",
      highlightPostsTitle: "投稿をハイライト",
      highlightPostsHelp: "オフで背景ハイライトを解除",
      badgePositionTitle: "ラベル位置",
      badgePositionHelp: "操作ボタンの右 / 投稿者情報の下",
      badgePositionTopRight: "右上",
      badgePositionHeader: "投稿者情報の下",
      statsTitle: "現在のページ",
      pageStatusChecking: "確認中...",
      pageStatusDisconnected: "x.com を開いてください",
      pageStatusConnected: "接続済み",
      scannedPosts: "解析した投稿",
      highlightedPosts: "表示中のラベル",
      liveAuthors: "判定済み投稿者",
      insufficientData: "情報不足",
      notMutual: "相互フォローではない",
      badgeMutual: "相互",
      badgeFollowing: "フォロー中",
      badgeFollowedBy: "フォロー済",
      relationLabel: "関係",
      followingLabel: "フォロー中",
      followersLabel: "フォロワー",
      followRateLabel: "フォロー率",
      sourceLabel: "ソース",
      updatedLabel: "更新",
      relationMutual: "相互フォロー",
      relationFollowing: "こちらがフォロー",
      relationFollowedBy: "相手がフォロー",
      relationNone: "関係なし",
      reasonMatched: "一致",
      reasonNotMutual: "相互フォローではない",
      reasonRatioOutOfRange: "範囲外",
      reasonMissingCounts: "情報不足",
      reasonPending: "解析待ち"
    }
  };
  const KNOWN_RESERVED_PATHS = new Set([
    "home",
    "explore",
    "search",
    "notifications",
    "messages",
    "compose",
    "settings",
    "i",
    "tos",
    "privacy",
    "about",
    "download",
    "jobs",
    "login",
    "signup"
  ]);

  function clampRatioTolerance(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return DEFAULT_CONFIG.ratioTolerancePct;
    }

    return Math.min(50, Math.max(10, Math.round(numeric / 5) * 5));
  }

  function normalizeBadgePosition(value) {
    if (value === "header") {
      return "header";
    }

    if (value === "top_right" || value === "corner") {
      return "top_right";
    }

    return "top_right";
  }

  function normalizeLanguage(value) {
    if (typeof value !== "string") {
      return DEFAULT_CONFIG.language;
    }

    const normalized = value.replace("-", "_");
    if (SUPPORTED_LANGUAGES.has(normalized)) {
      return normalized;
    }

    if (normalized.toLowerCase().startsWith("zh")) {
      return "zh_CN";
    }

    if (normalized.toLowerCase().startsWith("ja")) {
      return "ja";
    }

    return "en";
  }

  function getLocaleTag(language) {
    return LOCALE_TAGS[normalizeLanguage(language)] || LOCALE_TAGS.en;
  }

  function getMessages(language) {
    const normalizedLanguage = normalizeLanguage(language);
    return MESSAGES[normalizedLanguage] || MESSAGES.en;
  }

  function t(language, key, replacements) {
    const messages = getMessages(language);
    let template = messages[key] || MESSAGES.en[key] || key;
    if (!replacements) {
      return template;
    }

    for (const [replacementKey, replacementValue] of Object.entries(replacements)) {
      template = template.replaceAll(`{${replacementKey}}`, String(replacementValue));
    }

    return template;
  }

  function mergeConfig(overrides) {
    return {
      ...DEFAULT_CONFIG,
      ...overrides,
      language: normalizeLanguage(
        overrides && Object.prototype.hasOwnProperty.call(overrides, "language")
          ? overrides.language
          : DEFAULT_CONFIG.language
      ),
      badgePosition: normalizeBadgePosition(
        overrides && Object.prototype.hasOwnProperty.call(overrides, "badgePosition")
          ? overrides.badgePosition
          : DEFAULT_CONFIG.badgePosition
      ),
      highlightPosts: overrides && Object.prototype.hasOwnProperty.call(overrides, "highlightPosts")
        ? Boolean(overrides.highlightPosts)
        : DEFAULT_CONFIG.highlightPosts,
      showBadgeNumbers: overrides && Object.prototype.hasOwnProperty.call(overrides, "showBadgeNumbers")
        ? Boolean(overrides.showBadgeNumbers)
        : DEFAULT_CONFIG.showBadgeNumbers,
      ratioTolerancePct: clampRatioTolerance(
        overrides && Object.prototype.hasOwnProperty.call(overrides, "ratioTolerancePct")
          ? overrides.ratioTolerancePct
          : DEFAULT_CONFIG.ratioTolerancePct
      )
    };
  }

  function parseAbbreviatedCount(rawValue) {
    if (rawValue == null) {
      return null;
    }

    const compact = String(rawValue)
      .trim()
      .replace(/,/g, "")
      .replace(/\s+/g, "")
      .toUpperCase();

    if (!compact) {
      return null;
    }

    const match = compact.match(/^(\d+(?:\.\d+)?)([KMBT])?$/);
    if (!match) {
      return null;
    }

    const value = Number(match[1]);
    if (!Number.isFinite(value)) {
      return null;
    }

    const unit = match[2];
    const multiplier =
      unit === "K" ? 1_000 :
      unit === "M" ? 1_000_000 :
      unit === "B" ? 1_000_000_000 :
      unit === "T" ? 1_000_000_000_000 :
      1;

    return Math.round(value * multiplier);
  }

  function extractCountByLabel(text, label) {
    if (!text) {
      return null;
    }

    const normalizedText = String(text).replace(/\u00a0/g, " ");
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`${escapedLabel}\\s+([\\d.,]+(?:\\s?[KMBT])?)`, "i"),
      new RegExp(`([\\d.,]+(?:\\s?[KMBT])?)\\s+${escapedLabel}`, "i")
    ];

    for (const pattern of patterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        const parsed = parseAbbreviatedCount(match[1]);
        if (parsed != null) {
          return parsed;
        }
      }
    }

    return null;
  }

  function formatCount(value, language) {
    if (!Number.isFinite(value)) {
      return "N/A";
    }

    return new Intl.NumberFormat(getLocaleTag(language)).format(value);
  }

  function formatRatio(ratio) {
    if (!Number.isFinite(ratio)) {
      return "N/A";
    }

    return ratio.toFixed(2) + "x";
  }

  function formatFollowRate(ratio) {
    if (!Number.isFinite(ratio)) {
      return "N/A";
    }

    return ratio.toFixed(2);
  }

  function evaluateProfile(profile, ratioTolerancePct) {
    const followingCount = Number(profile && profile.followingCount);
    const followerCount = Number(profile && profile.followerCount);
    const isFollowing = Boolean(profile && profile.isFollowing);
    const followsYou = Boolean(profile && profile.followsYou);
    const isMutual = isFollowing && followsYou;

    if (!Number.isFinite(followingCount) || !Number.isFinite(followerCount) || followingCount <= 0 || followerCount <= 0) {
      return {
        isMutual,
        ratio: null,
        withinTolerance: false,
        shouldHighlight: false,
        reason: "missing_counts"
      };
    }

    const ratio = followingCount / followerCount;

    return {
      isMutual,
      ratio,
      withinTolerance: true,
      shouldHighlight: isMutual,
      reason: isMutual ? "matched" : "not_mutual"
    };
  }

  function getTopPathSegment(urlLike) {
    if (!urlLike) {
      return null;
    }

    let pathname;
    try {
      pathname = new URL(urlLike, "https://x.com").pathname;
    } catch (error) {
      return null;
    }

    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return null;
    }

    return segments[0];
  }

  function isReservedPathSegment(segment) {
    if (!segment) {
      return true;
    }

    return KNOWN_RESERVED_PATHS.has(segment.toLowerCase());
  }

  function normalizeHandle(handle) {
    if (!handle) {
      return null;
    }

    return String(handle).replace(/^@+/, "").trim().toLowerCase() || null;
  }

  return {
    DEFAULT_CONFIG,
    SUPPORTED_LANGUAGES: Array.from(SUPPORTED_LANGUAGES),
    normalizeLanguage,
    getLocaleTag,
    getMessages,
    t,
    normalizeBadgePosition,
    clampRatioTolerance,
    mergeConfig,
    parseAbbreviatedCount,
    extractCountByLabel,
    formatCount,
    formatRatio,
    formatFollowRate,
    evaluateProfile,
    getTopPathSegment,
    isReservedPathSegment,
    normalizeHandle
  };
});

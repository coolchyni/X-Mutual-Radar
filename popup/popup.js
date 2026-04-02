(function initPopup(root) {
  const shared = root.XMutualShared;
  const els = {
    popupTitle: document.getElementById("popup-title"),
    popupSubtitle: document.getElementById("popup-subtitle"),
    authorLabel: document.getElementById("author-label"),
    authorLink: document.getElementById("author-link"),
    plannerLabel: document.getElementById("planner-label"),
    plannerLink: document.getElementById("planner-link"),
    languageLabel: document.getElementById("language-label"),
    languageSelect: document.getElementById("language-select"),
    enabledToggle: document.getElementById("enabled-toggle"),
    enabledTitle: document.getElementById("enabled-title"),
    showBadgeNumbersToggle: document.getElementById("show-badge-numbers-toggle"),
    showBadgeNumbersTitle: document.getElementById("show-badge-numbers-title"),
    showBadgeLabelToggle: document.getElementById("show-badge-label-toggle"),
    showBadgeLabelTitle: document.getElementById("show-badge-label-title"),
    highlightPostsToggle: document.getElementById("highlight-posts-toggle"),
    highlightPostsTitle: document.getElementById("highlight-posts-title"),
    badgePositionSelect: document.getElementById("badge-position-select"),
    badgePositionTitle: document.getElementById("badge-position-title"),
    badgePositionTopRightOption: document.getElementById("badge-position-top-right-option"),
    badgePositionHeaderOption: document.getElementById("badge-position-header-option"),
    badgeFontSizeSelect: document.getElementById("badge-font-size-select"),
    badgeFontSizeTitle: document.getElementById("badge-font-size-title"),
    statsTitle: document.getElementById("stats-title"),
    pageStatus: document.getElementById("page-status"),
    scannedLabel: document.getElementById("scanned-label"),
    scannedCount: document.getElementById("scanned-count"),
    liveAuthorsLabel: document.getElementById("live-authors-label"),
    liveCount: document.getElementById("live-count"),
    notMutualLabel: document.getElementById("not-mutual-label"),
    notMutualCount: document.getElementById("not-mutual-count")
  };

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  async function sendToActiveTab(message) {
    const tab = await getActiveTab();
    if (!tab || !tab.id || !tab.url || !tab.url.startsWith("https://x.com/")) {
      return null;
    }

    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
      return null;
    }
  }

  function renderTexts(language) {
    document.documentElement.lang = shared.getLocaleTag(language);
    document.title = shared.t(language, "popupTitle");
    els.popupTitle.textContent = shared.t(language, "popupTitle");
    els.popupSubtitle.textContent = shared.t(language, "popupSubtitle");
    els.authorLabel.textContent = shared.t(language, "authorLabel");
    els.authorLink.textContent = shared.t(language, "authorLink");
    els.plannerLabel.textContent = shared.t(language, "plannerLabel");
    els.plannerLink.textContent = "@lihuaizhi"; // Static link text
    els.languageLabel.textContent = shared.t(language, "languageLabel");
    els.enabledTitle.textContent = shared.t(language, "enabledTitle");
    els.showBadgeNumbersTitle.textContent = shared.t(language, "showBadgeNumbersTitle");
    els.showBadgeLabelTitle.textContent = shared.t(language, "showBadgeLabelTitle");
    els.highlightPostsTitle.textContent = shared.t(language, "highlightPostsTitle");
    els.badgePositionTitle.textContent = shared.t(language, "badgePositionTitle");
    els.badgePositionTopRightOption.textContent = shared.t(language, "badgePositionTopRight");
    els.badgePositionHeaderOption.textContent = shared.t(language, "badgePositionHeader");
    els.badgeFontSizeTitle.textContent = shared.t(language, "badgeFontSizeTitle");
    els.statsTitle.textContent = shared.t(language, "statsTitle");
    els.scannedLabel.textContent = shared.t(language, "scannedPosts");
    els.liveAuthorsLabel.textContent = shared.t(language, "liveAuthors");
    els.notMutualLabel.textContent = shared.t(language, "notMutual");

    els.languageSelect.options[0].textContent = shared.t(language, "languageEnglish");
    els.languageSelect.options[1].textContent = shared.t(language, "languageChinese");
    els.languageSelect.options[2].textContent = shared.t(language, "languageJapanese");
  }

  function renderConfig(config) {
    renderTexts(config.language);
    els.languageSelect.value = shared.normalizeLanguage(config.language);
    els.enabledToggle.checked = Boolean(config.enabled);
    els.showBadgeNumbersToggle.checked = Boolean(config.showBadgeNumbers);
    els.badgeFontSizeSelect.value = config.badgeFontSize || "12";
    els.showBadgeLabelToggle.checked = Boolean(config.showBadgeLabel);
    els.highlightPostsToggle.checked = Boolean(config.highlightPosts);
    els.badgePositionSelect.value = shared.normalizeBadgePosition(config.badgePosition);
  }

  function renderStats(payload, language) {
    if (!payload || !payload.ok || !payload.supported) {
      els.pageStatus.textContent = shared.t(language, "pageStatusDisconnected");
      els.scannedCount.textContent = "-";
      els.liveCount.textContent = "-";
      els.notMutualCount.textContent = "-";
      return;
    }

    els.pageStatus.textContent = shared.t(language, "pageStatusConnected");
    els.scannedCount.textContent = String(payload.stats.scannedArticles || 0);
    els.liveCount.textContent = String(payload.stats.liveAuthors || 0);
    els.notMutualCount.textContent = String(payload.stats.notMutualArticles || 0);
  }

  async function refreshStats() {
    const config = shared.mergeConfig(await chrome.storage.sync.get(shared.DEFAULT_CONFIG));
    const payload = await sendToActiveTab({ type: "GET_SCAN_STATS" });
    renderStats(payload, config.language);
  }

  async function saveConfig(patch) {
    const current = shared.mergeConfig(await chrome.storage.sync.get(shared.DEFAULT_CONFIG));
    const next = shared.mergeConfig({ ...current, ...patch });
    await chrome.storage.sync.set(next);
    renderConfig(next);
    return next;
  }

  els.enabledToggle.addEventListener("change", async () => {
    const next = await saveConfig({ enabled: els.enabledToggle.checked });
    await sendToActiveTab({ type: "SET_ENABLED", enabled: next.enabled });
    await refreshStats();
  });

  els.languageSelect.addEventListener("change", async () => {
    await saveConfig({ language: els.languageSelect.value });
    await refreshStats();
  });

  els.showBadgeNumbersToggle.addEventListener("change", async () => {
    await saveConfig({ showBadgeNumbers: els.showBadgeNumbersToggle.checked });
    await refreshStats();
  });

  els.showBadgeLabelToggle.addEventListener("change", async () => {
    await saveConfig({ showBadgeLabel: els.showBadgeLabelToggle.checked });
    await refreshStats();
  });

  els.highlightPostsToggle.addEventListener("change", async () => {
    await saveConfig({ highlightPosts: els.highlightPostsToggle.checked });
    await refreshStats();
  });

  els.badgePositionSelect.addEventListener("change", async () => {
    await saveConfig({ badgePosition: els.badgePositionSelect.value });
    await refreshStats();
  });

  els.badgeFontSizeSelect.addEventListener("change", async () => {
    await saveConfig({ badgeFontSize: els.badgeFontSizeSelect.value });
    await refreshStats();
  });

  async function boot() {
    const config = shared.mergeConfig(await chrome.storage.sync.get(shared.DEFAULT_CONFIG));
    renderConfig(config);
    els.pageStatus.textContent = shared.t(config.language, "pageStatusChecking");
    await refreshStats();
  }

  void boot();
})(globalThis);

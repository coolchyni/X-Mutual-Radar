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
    showAllFollowRatesToggle: document.getElementById("show-all-follow-rates-toggle"),
    showAllFollowRatesTitle: document.getElementById("show-all-follow-rates-title"),
    showBadgeLabelToggle: document.getElementById("show-badge-label-toggle"),
    showBadgeLabelTitle: document.getElementById("show-badge-label-title"),
    badgePositionSelect: document.getElementById("badge-position-select"),
    badgePositionTitle: document.getElementById("badge-position-title"),
    badgePositionTopRightOption: document.getElementById("badge-position-top-right-option"),
    badgePositionHeaderOption: document.getElementById("badge-position-header-option"),
    badgeFontSizeSelect: document.getElementById("badge-font-size-select"),
    badgeFontSizeTitle: document.getElementById("badge-font-size-title")
  };

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
    els.showAllFollowRatesTitle.textContent = shared.t(language, "showAllFollowRatesTitle");
    els.showBadgeLabelTitle.textContent = shared.t(language, "showBadgeLabelTitle");
    els.badgePositionTitle.textContent = shared.t(language, "badgePositionTitle");
    els.badgePositionTopRightOption.textContent = shared.t(language, "badgePositionTopRight");
    els.badgePositionHeaderOption.textContent = shared.t(language, "badgePositionHeader");
    els.badgeFontSizeTitle.textContent = shared.t(language, "badgeFontSizeTitle");

    els.languageSelect.options[0].textContent = shared.t(language, "languageEnglish");
    els.languageSelect.options[1].textContent = shared.t(language, "languageChinese");
    els.languageSelect.options[2].textContent = shared.t(language, "languageJapanese");
  }

  function renderConfig(config) {
    renderTexts(config.language);
    els.languageSelect.value = shared.normalizeLanguage(config.language);
    els.enabledToggle.checked = Boolean(config.enabled);
    els.showBadgeNumbersToggle.checked = Boolean(config.showBadgeNumbers);
    els.showAllFollowRatesToggle.checked = Boolean(config.showAllFollowRates);
    els.badgeFontSizeSelect.value = config.badgeFontSize || "12";
    els.showBadgeLabelToggle.checked = Boolean(config.showBadgeLabel);
    els.badgePositionSelect.value = shared.normalizeBadgePosition(config.badgePosition);
  }

  async function saveConfig(patch) {
    const current = shared.mergeConfig(await chrome.storage.sync.get(shared.DEFAULT_CONFIG));
    const next = shared.mergeConfig({ ...current, ...patch });
    await chrome.storage.sync.set(next);
    renderConfig(next);
    return next;
  }

  els.enabledToggle.addEventListener("change", async () => {
    await saveConfig({ enabled: els.enabledToggle.checked });
  });

  els.languageSelect.addEventListener("change", async () => {
    await saveConfig({ language: els.languageSelect.value });
  });

  els.showBadgeNumbersToggle.addEventListener("change", async () => {
    await saveConfig({ showBadgeNumbers: els.showBadgeNumbersToggle.checked });
  });

  els.showAllFollowRatesToggle.addEventListener("change", async () => {
    await saveConfig({ showAllFollowRates: els.showAllFollowRatesToggle.checked });
  });

  els.showBadgeLabelToggle.addEventListener("change", async () => {
    await saveConfig({ showBadgeLabel: els.showBadgeLabelToggle.checked });
  });

  els.badgePositionSelect.addEventListener("change", async () => {
    await saveConfig({ badgePosition: els.badgePositionSelect.value });
  });

  els.badgeFontSizeSelect.addEventListener("change", async () => {
    await saveConfig({ badgeFontSize: els.badgeFontSizeSelect.value });
  });

  async function boot() {
    const config = shared.mergeConfig(await chrome.storage.sync.get(shared.DEFAULT_CONFIG));
    renderConfig(config);
  }

  void boot();
})(globalThis);

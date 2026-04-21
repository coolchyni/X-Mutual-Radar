const DEFAULT_CONFIG = {
  enabled: true,
  language: "en",
  badgePosition: "corner",
  showBadgeNumbers: true,
  showBadgeLabel: true,
  showAllFollowRates: false,
  badgeFontSize: "12",
  ratioTolerancePct: 30,
  scanScope: "home_timeline"
};

async function ensureDefaults() {
  const existing = await chrome.storage.sync.get(Object.keys(DEFAULT_CONFIG));
  const updates = {};

  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    if (typeof existing[key] === "undefined") {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.sync.set(updates);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureDefaults();
});

void ensureDefaults();

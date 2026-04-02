(function installXMutualPageBridge() {
  if (window.__xMutualPageBridgeInstalled) {
    return;
  }

  window.__xMutualPageBridgeInstalled = true;

  const REQUEST_SOURCE = "x-mutual-content";
  const RESPONSE_SOURCE = "x-mutual-bridge";
  const LOOKUP_USERS_TYPE = "LOOKUP_USERS";
  const LOOKUP_USERS_RESULT_TYPE = "LOOKUP_USERS_RESULT";
  const ARTICLE_SELECTOR = 'article[data-testid="tweet"]';
  const USERS_MODULE_ID = "897618";

  let webpackRequire = null;
  let storeRef = null;

  function normalizeHandle(handle) {
    if (!handle) {
      return null;
    }

    return String(handle).replace(/^@+/, "").trim().toLowerCase() || null;
  }

  function getWebpackRequire() {
    if (webpackRequire) {
      return webpackRequire;
    }

    const chunkName = Object.keys(window).find((key) => key.startsWith("webpackChunk"));
    if (!chunkName || !Array.isArray(window[chunkName])) {
      return null;
    }

    window[chunkName].push([[Symbol("x-mutual-bridge")], {}, (req) => {
      webpackRequire = req;
    }]);

    return webpackRequire;
  }

  function findStoreFromElement(element) {
    if (!element) {
      return null;
    }

    const fiberKey = Object.getOwnPropertyNames(element).find((key) => key.startsWith("__reactFiber$"));
    let fiber = fiberKey ? element[fiberKey] : null;
    let depth = 0;

    while (fiber && depth < 40) {
      if (fiber.tag === 10) {
        const value = fiber.memoizedProps && fiber.memoizedProps.value;
        if (value && value.store && typeof value.store.getState === "function") {
          return value.store;
        }
      }

      fiber = fiber.return;
      depth += 1;
    }

    return null;
  }

  function getStore() {
    if (storeRef && typeof storeRef.getState === "function") {
      return storeRef;
    }

    const candidates = document.querySelectorAll(ARTICLE_SELECTOR);
    for (const candidate of candidates) {
      const store = findStoreFromElement(candidate);
      if (store) {
        storeRef = store;
        return store;
      }
    }

    return null;
  }

  function getUsersModule() {
    const req = getWebpackRequire();
    if (!req) {
      return null;
    }

    try {
      const module = req(USERS_MODULE_ID);
      return module && module.ZP ? module.ZP : null;
    } catch (error) {
      return null;
    }
  }

  function buildProfile(handle, user) {
    const normalizedHandle = normalizeHandle(handle || user && user.screen_name);
    if (!normalizedHandle || !user) {
      return null;
    }

    return {
      handle: normalizedHandle,
      isFollowing: Boolean(user.following),
      followsYou: Boolean(user.followed_by),
      followingCount: Number.isFinite(Number(user.friends_count)) ? Number(user.friends_count) : null,
      followerCount: Number.isFinite(Number(user.followers_count)) ? Number(user.followers_count) : null,
      source: "page_store_selector",
      fetchedAt: Date.now()
    };
  }

  function lookupProfiles(handles) {
    const usersModule = getUsersModule();
    const store = getStore();
    if (!usersModule || !store || typeof usersModule.selectByScreenName !== "function") {
      return [];
    }

    const state = store.getState();
    return handles
      .map((handle) => normalizeHandle(handle))
      .filter(Boolean)
      .map((handle) => {
        try {
          return buildProfile(handle, usersModule.selectByScreenName(state, handle));
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== REQUEST_SOURCE) {
      return;
    }

    if (event.data.type !== LOOKUP_USERS_TYPE) {
      return;
    }

    const handles = Array.isArray(event.data.handles) ? event.data.handles : [];
    const requestId = event.data.requestId || "";
    const profiles = lookupProfiles(handles);

    window.postMessage(
      {
        source: RESPONSE_SOURCE,
        type: LOOKUP_USERS_RESULT_TYPE,
        requestId,
        handles,
        profiles
      },
      window.location.origin
    );
  });
})();

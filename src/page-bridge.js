(function installXMutualPageBridge() {
  if (window.__xMutualPageBridgeInstalled) {
    return;
  }

  window.__xMutualPageBridgeInstalled = true;

  const REQUEST_SOURCE = "x-mutual-content";
  const RESPONSE_SOURCE = "x-mutual-bridge";
  const LOOKUP_USERS_TYPE = "LOOKUP_USERS";
  const LOOKUP_USERS_RESULT_TYPE = "LOOKUP_USERS_RESULT";
  const NAVIGATION_CHANGED_TYPE = "NAVIGATION_CHANGED";
  const STORE_HOST_SELECTOR = 'article[data-testid="tweet"], [data-testid="UserCell"], [data-testid="cellInnerDiv"]';
  const USERS_MODULE_ID = "897618";
  const STATE_SCAN_NODE_LIMIT = 30000;

  let webpackRequire = null;
  let storeRef = null;
  let usersModuleRef = null;
  let lastNavigationUrl = window.location.href;

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

    const candidates = document.querySelectorAll(STORE_HOST_SELECTOR);
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
    if (usersModuleRef && typeof usersModuleRef.selectByScreenName === "function") {
      return usersModuleRef;
    }

    const req = getWebpackRequire();
    if (!req) {
      return null;
    }

    try {
      const module = req(USERS_MODULE_ID);
      if (module && module.ZP && typeof module.ZP.selectByScreenName === "function") {
        usersModuleRef = module.ZP;
        return usersModuleRef;
      }
    } catch (error) {
      // X deploys can change module ids, so fall through to cache discovery.
    }

    const cache = req.c || {};
    for (const cacheEntry of Object.values(cache)) {
      const exports = cacheEntry && cacheEntry.exports;
      const candidates = [
        exports,
        exports && exports.ZP,
        exports && exports.default
      ];

      for (const candidate of candidates) {
        if (candidate && typeof candidate.selectByScreenName === "function") {
          usersModuleRef = candidate;
          return usersModuleRef;
        }
      }
    }

    return null;
  }

  function pickUserValue(user, flatKey, legacyKey) {
    if (!user || typeof user !== "object") {
      return undefined;
    }

    if (typeof user[flatKey] !== "undefined" && user[flatKey] !== null) {
      return user[flatKey];
    }

    if (user.legacy && typeof user.legacy[legacyKey || flatKey] !== "undefined" && user.legacy[legacyKey || flatKey] !== null) {
      return user.legacy[legacyKey || flatKey];
    }

    return undefined;
  }

  function buildProfile(handle, user) {
    const relationship = user && (user.relationship_perspectives || user.relationship_perspective || {});
    const normalizedHandle = normalizeHandle(handle || pickUserValue(user, "screen_name"));
    if (!normalizedHandle || !user) {
      return null;
    }

    const followingCount = pickUserValue(user, "friends_count");
    const followerCount = pickUserValue(user, "followers_count");

    return {
      handle: normalizedHandle,
      isFollowing: Boolean(user.following ?? relationship.following),
      followsYou: Boolean(user.followed_by ?? relationship.followed_by),
      followingCount: Number.isFinite(Number(followingCount)) ? Number(followingCount) : null,
      followerCount: Number.isFinite(Number(followerCount)) ? Number(followerCount) : null,
      source: "page_store_selector",
      fetchedAt: Date.now()
    };
  }

  function findUsersInState(state, handles) {
    const targets = new Set(handles.map((handle) => normalizeHandle(handle)).filter(Boolean));
    const found = new Map();
    const seen = new WeakSet();
    let visited = 0;

    function visit(node) {
      if (!node || typeof node !== "object" || found.size >= targets.size || visited >= STATE_SCAN_NODE_LIMIT) {
        return;
      }

      if (seen.has(node)) {
        return;
      }

      seen.add(node);
      visited += 1;

      const handle = normalizeHandle(pickUserValue(node, "screen_name"));
      if (handle && targets.has(handle) && !found.has(handle)) {
        found.set(handle, node);
      }

      if (Array.isArray(node)) {
        for (const item of node) {
          visit(item);
        }
        return;
      }

      for (const value of Object.values(node)) {
        visit(value);
      }
    }

    visit(state);
    return found;
  }

  function lookupProfiles(handles) {
    const usersModule = getUsersModule();
    const store = getStore();
    if (!store) {
      return [];
    }

    const state = store.getState();
    const normalizedHandles = handles
      .map((handle) => normalizeHandle(handle))
      .filter(Boolean)
      .filter((handle, index, array) => array.indexOf(handle) === index);

    const profiles = [];
    const missingHandles = [];

    for (const handle of normalizedHandles) {
      let profile = null;
      if (usersModule && typeof usersModule.selectByScreenName === "function") {
        try {
          profile = buildProfile(handle, usersModule.selectByScreenName(state, handle));
        } catch (error) {
          profile = null;
        }
      }

      if (profile) {
        profiles.push(profile);
      } else {
        missingHandles.push(handle);
      }
    }

    if (missingHandles.length > 0) {
      const stateUsers = findUsersInState(state, missingHandles);
      for (const handle of missingHandles) {
        const profile = buildProfile(handle, stateUsers.get(handle));
        if (profile) {
          profiles.push({
            ...profile,
            source: "page_store_scan"
          });
        }
      }
    }

    return profiles;
  }

  function dispatchNavigationChanged(reason) {
    const nextUrl = window.location.href;
    if (nextUrl === lastNavigationUrl) {
      return;
    }

    lastNavigationUrl = nextUrl;
    window.postMessage(
      {
        source: RESPONSE_SOURCE,
        type: NAVIGATION_CHANGED_TYPE,
        url: nextUrl,
        reason
      },
      window.location.origin
    );
  }

  const originalPushState = history.pushState.bind(history);
  history.pushState = function patchedPushState(...args) {
    const result = originalPushState(...args);
    dispatchNavigationChanged("pushState");
    return result;
  };

  const originalReplaceState = history.replaceState.bind(history);
  history.replaceState = function patchedReplaceState(...args) {
    const result = originalReplaceState(...args);
    dispatchNavigationChanged("replaceState");
    return result;
  };

  window.addEventListener("popstate", () => {
    dispatchNavigationChanged("popstate");
  });

  window.addEventListener("hashchange", () => {
    dispatchNavigationChanged("hashchange");
  });

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

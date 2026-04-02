(function initContent(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./shared.js"));
    return;
  }

  const api = factory(root.XMutualShared);
  root.XMutualContent = api;

  if (root.chrome && root.document) {
    api.boot();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createContent(shared) {
  const ITEM_SELECTOR = 'article[data-testid="tweet"], [data-testid="UserCell"]';
  const ARTICLE_SELECTOR = ITEM_SELECTOR; // Global alias
  const BADGE_SELECTOR = ".x-mutual-badge";
  const BADGE_ROW_SELECTOR = ".x-mutual-badge-row";
  const TOP_RIGHT_ANCHOR_CLASS = "x-mutual-top-right-anchor";
  const USER_CELL_ACTION_ANCHOR_CLASS = "x-mutual-user-cell-anchor";
  const USER_CELL_BADGE_ROW_CLASS = "x-mutual-user-cell-badge-row";
  const ACTION_CONTROL_SELECTOR = [
    '[data-testid="reply"]',
    '[data-testid="retweet"]',
    '[data-testid="unretweet"]',
    '[data-testid="like"]',
    '[data-testid="unlike"]',
    '[data-testid="bookmark"]',
    '[data-testid="removeBookmark"]',
    '[data-testid="share"]'
  ].join(", ");
  const TOP_RIGHT_GROUP_BUTTON_LIMIT = 3;
  const TOP_RIGHT_BUTTON_SELECTOR = [
    '[data-testid="caret"]',
    'button[aria-label="More"]',
    'button[aria-label="更多"]',
    'button[aria-label="さらに表示"]'
  ].join(", ");
  const BUTTON_TEXTS = new Set(["following", "正在关注", "フォロー中"]);
  const HOVER_CARD_SELECTOR = '[data-testid="HoverCard"], [data-testid="hoverCard"], div[role="dialog"]';
  const BRIDGE_MESSAGE_SOURCE = "x-mutual-bridge";
  const BRIDGE_REQUEST_SOURCE = "x-mutual-content";
  const LOOKUP_USERS_TYPE = "LOOKUP_USERS";
  const LOOKUP_USERS_RESULT_TYPE = "LOOKUP_USERS_RESULT";
  const NAVIGATION_CHANGED_TYPE = "NAVIGATION_CHANGED";
  const FOLLOWING_LABELS = ["Following", "正在关注", "フォロー中"];
  const FOLLOWER_LABELS = ["Followers", "关注者", "フォロワー"];
  const FOLLOWS_YOU_REGEX = /Follows you|关注了你|あなたをフォロー/i;
  const USER_CELL_SELECTOR = '[data-testid="UserCell"], [data-testid="cellInnerDiv"]';
  const RELATION_ACTION_REGEX = /关注|正在关注|回关|フォロー|フォロー中|Follow|Following|Follow back/i;
  const RETRY_LIMIT = 8;
  const RELATION_LIST_PATH_REGEX = /\/(followers|following|verified[_-]followers|search|members|followers_you_follow)(?:\/|$)/i;

  function createPointerLikeEvent(win, eventName, init) {
    const PointerCtor = win.PointerEvent || win.MouseEvent;
    return new PointerCtor(eventName, {
      ...init,
      composed: true,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true
    });
  }

  function createMouseLikeEvent(win, eventName, init) {
    return new win.MouseEvent(eventName, {
      ...init,
      composed: true
    });
  }

  function dispatchHoverSequence(anchor) {
    if (!anchor || !anchor.isConnected) {
      return;
    }

    anchor.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "instant"
    });

    const rect = anchor.getBoundingClientRect();
    const win = anchor.ownerDocument.defaultView;
    const init = {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + Math.min(rect.width / 2, 16),
      clientY: rect.top + Math.min(rect.height / 2, 16),
      screenX: rect.left + Math.min(rect.width / 2, 16),
      screenY: rect.top + Math.min(rect.height / 2, 16),
      view: win
    };

    anchor.dispatchEvent(createPointerLikeEvent(win, "pointerover", init));
    anchor.dispatchEvent(createPointerLikeEvent(win, "pointerenter", { ...init, bubbles: false }));
    anchor.dispatchEvent(createPointerLikeEvent(win, "pointermove", init));
    anchor.dispatchEvent(createMouseLikeEvent(win, "mouseover", init));
    anchor.dispatchEvent(createMouseLikeEvent(win, "mouseenter", { ...init, bubbles: false }));
    anchor.dispatchEvent(createMouseLikeEvent(win, "mousemove", init));
  }

  function dispatchHoverExit(anchor) {
    if (!anchor || !anchor.isConnected) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const win = anchor.ownerDocument.defaultView;
    const init = {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width + 12,
      clientY: rect.top + rect.height + 12,
      screenX: rect.left + rect.width + 12,
      screenY: rect.top + rect.height + 12,
      view: win
    };

    anchor.dispatchEvent(createPointerLikeEvent(win, "pointerout", init));
    anchor.dispatchEvent(createPointerLikeEvent(win, "pointerleave", { ...init, bubbles: false }));
    anchor.dispatchEvent(createMouseLikeEvent(win, "mouseout", init));
    anchor.dispatchEvent(createMouseLikeEvent(win, "mouseleave", { ...init, bubbles: false }));
  }

  function isSupportedXPath(locationLike) {
    try {
      const url = new URL(String(locationLike), "https://x.com");
      return url.hostname === "x.com";
    } catch (error) {
      return false;
    }
  }

  function getProfileCandidateUrls(article) {
    const urls = [];
    const statusLink = article.querySelector('a[href*="/status/"]');
    if (statusLink && statusLink.href) {
      urls.push(statusLink.href);
    }

    for (const anchor of article.querySelectorAll('a[href^="/"], a[href^="https://x.com/"]')) {
      if (anchor.href) {
        urls.push(anchor.href);
      }
    }

    return urls;
  }

  function extractHandleFromUrl(urlLike) {
    const normalized = shared.normalizeHandle(shared.getTopPathSegment(urlLike));
    if (!normalized || shared.isReservedPathSegment(normalized)) {
      return null;
    }

    return normalized;
  }

  function extractUserIdFromText(value) {
    if (!value) {
      return null;
    }

    const text = String(value);
    const queryMatch = text.match(/[?&](?:user_id|rest_id)=([0-9]{6,})/i);
    if (queryMatch) {
      return queryMatch[1];
    }

    const imageMatch = text.match(/\/profile_(?:images|banners)\/([0-9]{6,})\//i);
    if (imageMatch) {
      return imageMatch[1];
    }

    const genericMatch = text.match(/\b([0-9]{10,})\b/);
    return genericMatch ? genericMatch[1] : null;
  }

  function extractUserIdFromArticle(article) {
    if (!article) {
      return null;
    }

    const directCandidates = [
      article.getAttribute("data-user-id"),
      article.getAttribute("data-rest-id"),
      article.dataset && article.dataset.userId,
      article.dataset && article.dataset.restId
    ];

    for (const candidate of directCandidates) {
      const userId = extractUserIdFromText(candidate);
      if (userId) {
        return userId;
      }
    }

    for (const node of article.querySelectorAll("[data-user-id], [data-rest-id], a[href], img[src]")) {
      const candidates = [
        node.getAttribute && node.getAttribute("data-user-id"),
        node.getAttribute && node.getAttribute("data-rest-id"),
        node.getAttribute && node.getAttribute("href"),
        node.getAttribute && node.getAttribute("src")
      ];

      for (const candidate of candidates) {
        const userId = extractUserIdFromText(candidate);
        if (userId) {
          return userId;
        }
      }
    }

    return null;
  }

  function extractHandleFromArticle(article) {
    if (!article) {
      return null;
    }

    for (const url of getProfileCandidateUrls(article)) {
      const normalized = extractHandleFromUrl(url);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  function findProfileAnchor(article, handle) {
    if (!article || !handle) {
      return null;
    }

    const direct = article.querySelector(`a[href="/${handle}"], a[href="https://x.com/${handle}"]`);
    if (direct) {
      return direct;
    }

    for (const anchor of article.querySelectorAll('a[href*="/status/"], a[href^="/"], a[href^="https://x.com/"]')) {
      const candidateHandle = extractHandleFromUrl(anchor.href);
      if (candidateHandle === handle) {
        return anchor;
      }
    }

    return null;
  }

  function createTooltipText(profile, match, language) {
    const lines = [
      `${shared.t(language, "relationLabel")}: ${formatRelationLabel(profile, language)}`,
      `${shared.t(language, "followingLabel")}: ${shared.formatCount(profile.followingCount, language)}`,
      `${shared.t(language, "followersLabel")}: ${shared.formatCount(profile.followerCount, language)}`,
      `${shared.t(language, "followRateLabel")}: ${shared.formatFollowRate(match.ratio)}`
    ];

    return lines.join("\n");
  }

  function getFloatingTooltipState(doc) {
    if (!doc.__xMutualFloatingTooltipState) {
      doc.__xMutualFloatingTooltipState = {
        element: null,
        activeBadge: null,
        listenersBound: false
      };
    }

    return doc.__xMutualFloatingTooltipState;
  }

  function positionFloatingTooltip(badge) {
    if (!badge || !badge.isConnected) {
      return;
    }

    const doc = badge.ownerDocument;
    const win = doc.defaultView;
    const state = getFloatingTooltipState(doc);
    const tooltip = state.element;
    if (!tooltip) {
      return;
    }

    const margin = 8;
    const gap = 8;
    const badgeRect = badge.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = badgeRect.right - tooltipRect.width;
    left = Math.max(margin, Math.min(left, win.innerWidth - tooltipRect.width - margin));

    let top = badgeRect.bottom + gap;
    if (top + tooltipRect.height > win.innerHeight - margin) {
      const aboveTop = badgeRect.top - tooltipRect.height - gap;
      if (aboveTop >= margin) {
        top = aboveTop;
      } else {
        top = Math.max(margin, win.innerHeight - tooltipRect.height - margin);
      }
    }

    tooltip.style.left = `${Math.round(left + win.scrollX)}px`;
    tooltip.style.top = `${Math.round(top + win.scrollY)}px`;
  }

  function ensureFloatingTooltip(doc) {
    const state = getFloatingTooltipState(doc);
    if (!state.element || !state.element.isConnected) {
      const tooltip = doc.createElement("div");
      tooltip.className = "x-mutual-floating-tooltip";
      tooltip.hidden = true;
      (doc.body || doc.documentElement).appendChild(tooltip);
      state.element = tooltip;
    }

    if (!state.listenersBound) {
      const win = doc.defaultView;
      const reposition = () => {
        if (!state.activeBadge || !state.activeBadge.isConnected || !state.element || state.element.hidden) {
          return;
        }

        positionFloatingTooltip(state.activeBadge);
      };

      win.addEventListener("scroll", reposition, true);
      win.addEventListener("resize", reposition);
      state.listenersBound = true;
    }

    return state.element;
  }

  function showFloatingTooltip(badge) {
    if (!badge || !badge.isConnected) {
      return;
    }

    const text = badge.dataset.tooltip || "";
    if (!text) {
      return;
    }

    const doc = badge.ownerDocument;
    const state = getFloatingTooltipState(doc);
    const tooltip = ensureFloatingTooltip(doc);
    state.activeBadge = badge;
    tooltip.textContent = text;
    tooltip.hidden = false;
    tooltip.style.visibility = "hidden";
    positionFloatingTooltip(badge);
    tooltip.style.visibility = "visible";
  }

  function hideFloatingTooltip(doc, badge) {
    if (!doc) {
      return;
    }

    const state = getFloatingTooltipState(doc);
    if (badge && state.activeBadge && state.activeBadge !== badge) {
      return;
    }

    state.activeBadge = null;
    if (state.element) {
      state.element.hidden = true;
    }
  }

  function attachTooltipHandlers(badge) {
    if (!badge) {
      return;
    }

    const doc = badge.ownerDocument;
    badge.addEventListener("mouseenter", () => {
      showFloatingTooltip(badge);
    });
    badge.addEventListener("mouseleave", () => {
      hideFloatingTooltip(doc, badge);
    });
    badge.addEventListener("focus", () => {
      showFloatingTooltip(badge);
    });
    badge.addEventListener("blur", () => {
      hideFloatingTooltip(doc, badge);
    });
  }

  function removeAnnotation(article) {
    if (!article) {
      return;
    }

    article.classList.remove("x-mutual-has-corner-badge");
    delete article.dataset.xMutualReason;
    delete article.dataset.xMutualVariant;
    const badge = article.querySelector(BADGE_SELECTOR);
    if (badge) {
      hideFloatingTooltip(article.ownerDocument, badge);
      badge.remove();
    }

    const badgeRow = article.querySelector(BADGE_ROW_SELECTOR);
    if (badgeRow && badgeRow.childElementCount === 0) {
      badgeRow.remove();
    }

    const topRightAnchors = article.querySelectorAll(`.${TOP_RIGHT_ANCHOR_CLASS}, .${USER_CELL_ACTION_ANCHOR_CLASS}`);
    for (const anchor of topRightAnchors) {
      anchor.classList.remove(TOP_RIGHT_ANCHOR_CLASS);
      anchor.classList.remove(USER_CELL_ACTION_ANCHOR_CLASS);
    }
  }

  function getAnnotationVariant(profile, match) {
    if (match && match.shouldHighlight) {
      return "mutual";
    }

    if (profile && profile.isFollowing && !profile.followsYou) {
      return "one_way_following";
    }

    if (profile && !profile.isFollowing && profile.followsYou) {
      return "one_way_followed_by";
    }

    return null;
  }

  function getAnnotationLabel(variant, match, showBadgeNumbers, showBadgeLabel, language) {
    if (!showBadgeLabel && !showBadgeNumbers) {
      return "";
    }

    const labelWithRate = (label) => {
      const rateHtml = (showBadgeNumbers && match && Number.isFinite(match.ratio))
        ? `<span class="x-mutual-badge-rate">${shared.formatFollowRate(match.ratio)}</span>`
        : "";
      
      if (!showBadgeLabel) {
        return rateHtml || "";
      }

      if (!rateHtml) {
        return label;
      }

      return `${label} ${rateHtml}`;
    };

    switch (variant) {
      case "mutual":
        return labelWithRate(shared.t(language, "badgeMutual"));
      case "one_way_following":
        return labelWithRate(shared.t(language, "badgeFollowing"));
      case "one_way_followed_by":
        return labelWithRate(shared.t(language, "badgeFollowedBy"));
      default:
        return "";
    }
  }

  function isRelationshipListItem(article) {
    if (!article || !(article.matches && article.matches(USER_CELL_SELECTOR))) {
      return false;
    }

    const pathname = article.ownerDocument && article.ownerDocument.defaultView
      ? article.ownerDocument.defaultView.location.pathname || ""
      : "";

    return RELATION_LIST_PATH_REGEX.test(pathname);
  }

  function scheduleArticleRetry(annotator, article, delay) {
    const retryCount = Number(article.dataset.xMutualRetryCount || "0");
    if (retryCount >= RETRY_LIMIT) {
      article.dataset.xMutualProcessed = "true";
      return false;
    }

    article.dataset.xMutualProcessed = "pending";
    article.dataset.xMutualRetryCount = String(retryCount + 1);
    const retryId = annotator.window.setTimeout(() => {
      if (!article.isConnected) {
        return;
      }

      delete article.dataset.xMutualProcessed;
      annotator.articleQueue.add(article);
      void annotator.flushQueue();
    }, delay);
    if (retryId && typeof retryId === "object" && typeof retryId.unref === "function") {
      retryId.unref();
    }

    return true;
  }

  function findTopRightActionGroup(article) {
    if (!article) {
      return null;
    }

    const moreButton = article.querySelector(TOP_RIGHT_BUTTON_SELECTOR);
    if (!moreButton) {
      return null;
    }

    let bestGroup = moreButton.parentElement || moreButton;
    let current = bestGroup;
    while (current && current !== article) {
      const buttonCount = current.querySelectorAll("button").length;
      const hasMoreButton = Boolean(current.querySelector(TOP_RIGHT_BUTTON_SELECTOR));
      const hasActionControls = Boolean(current.querySelector(ACTION_CONTROL_SELECTOR));
      if (!hasMoreButton || hasActionControls) {
        break;
      }

      if (buttonCount >= 2 && buttonCount <= TOP_RIGHT_GROUP_BUTTON_LIMIT) {
        bestGroup = current;
        break;
      }

      if (buttonCount > TOP_RIGHT_GROUP_BUTTON_LIMIT) {
        break;
      }

      current = current.parentElement;
    }

    return bestGroup;
  }

  function findTopRightInsertTarget(group) {
    if (!group) {
      return null;
    }

    const moreButton = group.querySelector(TOP_RIGHT_BUTTON_SELECTOR);
    if (!moreButton) {
      return null;
    }

    let current = moreButton;
    while (current && current.parentElement && current.parentElement !== group) {
      current = current.parentElement;
    }

    return current && current !== group ? current : moreButton;
  }

  function findUserCellActionAnchor(article) {
    if (!isRelationshipListItem(article)) {
      return null;
    }

    const actionButtons = Array.from(article.querySelectorAll("button[aria-label]"));
    const actionButton = actionButtons.find((button) => {
      const label = button.getAttribute("aria-label") || "";
      return RELATION_ACTION_REGEX.test(label);
    });

    if (!actionButton || !actionButton.parentElement) {
      return null;
    }

    const moreButton = actionButtons.find((button) => {
      const label = button.getAttribute("aria-label") || "";
      return /更多|More|さらに表示/i.test(label);
    });

    let actionContainer = actionButton.parentElement;
    let current = actionContainer;
    while (current && current !== article && current.parentElement) {
      const buttonCount = current.parentElement.querySelectorAll("button").length;
      if (buttonCount >= 2 && buttonCount <= TOP_RIGHT_GROUP_BUTTON_LIMIT) {
        actionContainer = current.parentElement;
        break;
      }
      if (buttonCount > TOP_RIGHT_GROUP_BUTTON_LIMIT) {
        break;
      }
      current = current.parentElement;
    }

    return {
      node: actionContainer,
      afterNode: actionButton.parentElement.parentElement === actionContainer
        ? actionButton.parentElement
        : actionButton.parentElement,
      beforeNode: moreButton && moreButton.parentElement && moreButton.parentElement.parentElement === actionContainer
        ? moreButton.parentElement
        : moreButton && moreButton.parentElement === actionContainer
          ? moreButton
          : null,
      anchorClass: USER_CELL_ACTION_ANCHOR_CLASS
    };
  }

  function findUserCellHeaderAnchor(article) {
    if (!isRelationshipListItem(article)) {
      return null;
    }

    const candidateLinks = Array.from(article.querySelectorAll('a[href^="/"][role="link"], a[href^="https://x.com/"][role="link"]'));
    const handleLink = candidateLinks.find((link) => /@/.test(link.textContent || ""));
    if (handleLink) {
      let bestContainer = handleLink.closest("div") || handleLink;
      let current = bestContainer;
      while (current && current !== article) {
        const links = Array.from(current.querySelectorAll('a[href^="/"][role="link"], a[href^="https://x.com/"][role="link"]'));
        const hasHandle = links.some((link) => /@/.test(link.textContent || ""));
        const hasName = links.some((link) => {
          const text = (link.textContent || "").trim();
          return Boolean(text) && !/@/.test(text);
        });
        const hasButtons = Boolean(current.querySelector("button"));
        const directChildren = Array.from(current.children || []);
        const hasButtonSibling = directChildren.some((child) => child !== bestContainer && Boolean(child.querySelector && child.querySelector("button")));
        if (hasHandle && hasName && !hasButtons) {
          bestContainer = current;
        }
        if (hasHandle && hasName && hasButtonSibling) {
          return current;
        }
        current = current.parentElement;
      }

      return bestContainer;
    }

    return null;
  }

  function findBadgeAnchor(article, preferredPlacement) {
    if (!article) {
      return null;
    }

    if (preferredPlacement === "top_right") {
      const userCellAnchor = findUserCellActionAnchor(article);
      if (userCellAnchor) {
        return {
          ...userCellAnchor,
          placement: "top_right"
        };
      }
    }

    const topRightGroup = findTopRightActionGroup(article);
    if (preferredPlacement === "top_right" && topRightGroup) {
      return {
        node: topRightGroup,
        afterNode: findTopRightInsertTarget(topRightGroup),
        placement: "top_right",
        anchorClass: TOP_RIGHT_ANCHOR_CLASS
      };
    }

    if (preferredPlacement === "top_right") {
      return {
        node: article,
        placement: "top_right"
      };
    }

    const actionControls = Array.from(article.querySelectorAll(ACTION_CONTROL_SELECTOR));
    if (preferredPlacement !== "header" && actionControls.length > 0) {
      const weightedParents = new Map();
      for (const control of actionControls) {
        const parent = control.closest('[role="group"]') || control.parentElement;
        if (!parent) {
          continue;
        }

        weightedParents.set(parent, (weightedParents.get(parent) || 0) + 1);
      }

      let bestParent = null;
      let bestScore = -1;
      for (const [parent, score] of weightedParents.entries()) {
        if (score > bestScore) {
          bestParent = parent;
          bestScore = score;
        }
      }

      if (bestParent) {
        return {
          node: bestParent,
          placement: "top_right"
        };
      }
    }

    const explicitHeader = article.querySelector('[data-testid="User-Name"]');
    if (explicitHeader) {
      return {
        node: explicitHeader,
        placement: "header"
      };
    }

    const userCellHeader = findUserCellHeaderAnchor(article);
    if (userCellHeader) {
      return {
        node: userCellHeader,
        placement: "header"
      };
    }

    // Specifically for items without User-Name testid
    const userLink = article.querySelector('a[href^="/"][role="link"], a[href^="https://x.com/"][role="link"]');
    if (userLink) {
      return {
        node: userLink.closest("div") || userLink,
        placement: "header"
      };
    }
    const statusLink = article.querySelector('a[href*="/status/"]');
    if (statusLink) {
      return {
        node: statusLink.closest("div") || statusLink,
        placement: "header"
      };
    }

    if (actionControls.length > 0) {
      const fallbackControl = actionControls[actionControls.length - 1];
      return {
        node: fallbackControl.closest('[role="group"]') || fallbackControl.parentElement,
        placement: "top_right"
      };
    }

    return {
      node: article.firstElementChild || null,
      placement: preferredPlacement === "header" ? "header" : "top_right"
    };
  }

  function ensureBadgeRow(article, preferredPlacement) {
    let row = article.querySelector(BADGE_ROW_SELECTOR);
    if (row && row.dataset.placement === preferredPlacement) {
      return row;
    }

    if (row) {
      row.remove();
    }

    row = article.ownerDocument.createElement("div");
    row.className = "x-mutual-badge-row";

    const anchor = findBadgeAnchor(article, preferredPlacement);
    const anchorNode = anchor && anchor.node;
    const anchorBeforeNode = anchor && anchor.beforeNode;
    const anchorAfterNode = anchor && anchor.afterNode;
    const anchorClass = anchor && anchor.anchorClass;
    const placement = anchor && anchor.placement ? anchor.placement : preferredPlacement;
    
    row.dataset.placement = placement;
    if (anchorClass === USER_CELL_ACTION_ANCHOR_CLASS) {
      row.classList.add(USER_CELL_BADGE_ROW_CLASS);
    }

    if (placement === "corner" || placement === "top_right") {
      if (placement === "top_right" && (!anchorNode || anchorNode === article)) {
        return null;
      }

      if (anchorNode && anchorNode !== article && anchorNode.parentNode) {
        anchorNode.classList.add(anchorClass || TOP_RIGHT_ANCHOR_CLASS);
        
        if (anchorClass === USER_CELL_ACTION_ANCHOR_CLASS) {
          if (anchorAfterNode && anchorAfterNode.parentNode === anchorNode) {
            anchorNode.insertBefore(row, anchorAfterNode);
          } else {
            anchorNode.prepend(row);
          }
        } else {
          if (anchorBeforeNode && anchorBeforeNode.parentNode === anchorNode) {
            anchorNode.insertBefore(row, anchorBeforeNode);
          } else if (anchorAfterNode && anchorAfterNode.parentNode === anchorNode) {
            anchorNode.insertBefore(row, anchorAfterNode);
          } else {
            anchorNode.prepend(row);
          }
        }
      } else {
        article.prepend(row);
      }
    } else if (anchorNode && anchorNode !== article && anchorNode.parentNode) {
      anchorNode.insertAdjacentElement("afterend", row);
    } else {
      article.prepend(row);
    }

    return row;
  }

  function applyAnnotation(article, profile, match, variant, showBadgeNumbers, showBadgeLabel, badgeFontSize, badgePosition, language) {
    removeAnnotation(article);

    if (badgePosition !== "header") {
      article.classList.add("x-mutual-has-corner-badge");
    }

    article.dataset.xMutualVariant = variant;
    const preferredPlacement = badgePosition === "header" ? "header" : shared.normalizeBadgePosition(badgePosition);
    const badgeRow = ensureBadgeRow(article, preferredPlacement);
    if (!badgeRow) {
      return false;
    }

    const badge = article.ownerDocument.createElement("span");
    badge.className = "x-mutual-badge";
    badge.dataset.variant = variant;
    const label = getAnnotationLabel(variant, match, showBadgeNumbers, showBadgeLabel, language);
    badge.innerHTML = label;
    if (label === "") {
      badge.classList.add("x-mutual-badge-dot-only");
    } else if (showBadgeLabel && showBadgeNumbers && match && Number.isFinite(match.ratio)) {
      badge.classList.add("has-label");
    }

    if (badgeFontSize) {
      badge.style.fontSize = `${badgeFontSize}px`;
      const rateSpan = badge.querySelector(".x-mutual-badge-rate");
      if (rateSpan) {
        rateSpan.style.fontSize = `${badgeFontSize}px`;
      }
    }
    badge.dataset.tooltip = createTooltipText(profile, match, language);
    attachTooltipHandlers(badge);
    badgeRow.appendChild(badge);
    return true;
  }

  function waitForDocumentBody(doc, win) {
    if (doc.body) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const done = () => {
        if (doc.body) {
          resolve();
        }
      };

      doc.addEventListener("DOMContentLoaded", done, { once: true });
      win.setTimeout(done, 0);
    });
  }

  function formatReasonLabel(reason, language) {
    switch (reason) {
      case "matched":
        return shared.t(language, "reasonMatched");
      case "not_mutual":
        return shared.t(language, "reasonNotMutual");
      case "ratio_out_of_range":
        return shared.t(language, "reasonRatioOutOfRange");
      case "missing_counts":
        return shared.t(language, "reasonMissingCounts");
      default:
        return shared.t(language, "reasonPending");
    }
  }

  function formatRelationLabel(profile, language) {
    if (profile && profile.isFollowing && profile.followsYou) {
      return shared.t(language, "relationMutual");
    }

    if (profile && profile.isFollowing) {
      return shared.t(language, "relationFollowing");
    }

    if (profile && profile.followsYou) {
      return shared.t(language, "relationFollowedBy");
    }

    return shared.t(language, "relationNone");
  }

  function parseButtonFollowing(rootNode) {
    const controls = rootNode.querySelectorAll('button, div[role="button"]');
    for (const control of controls) {
      const label = (control.textContent || control.getAttribute("aria-label") || "").trim().toLowerCase();
      if (BUTTON_TEXTS.has(label)) {
        return true;
      }
    }

    return false;
  }

  function collectTextChunks(rootNode) {
    if (!rootNode) {
      return [];
    }

    if (rootNode.childNodes.length === 0) {
      return [(rootNode.textContent || "").trim()].filter(Boolean);
    }

    const chunks = [];
    const nodeFilter = rootNode.ownerDocument.defaultView && rootNode.ownerDocument.defaultView.NodeFilter
      ? rootNode.ownerDocument.defaultView.NodeFilter
      : { SHOW_TEXT: 4 };
    const walker = rootNode.ownerDocument.createTreeWalker(rootNode, nodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();
    while (currentNode) {
      const value = (currentNode.textContent || "").trim();
      if (value) {
        chunks.push(value);
      }
      currentNode = walker.nextNode();
    }

    return chunks;
  }

  function collectReadableText(rootNode) {
    return collectTextChunks(rootNode).join(" ");
  }

  function findCountInChunks(chunks, label) {
    for (const chunk of chunks) {
      const exact = shared.extractCountByLabel(chunk, label);
      if (exact != null) {
        return exact;
      }
    }

    return null;
  }

  function parseProfileData(rootNode, handle, source) {
    const chunks = collectTextChunks(rootNode);
    const text = chunks.join(" ");
    const followingCount = FOLLOWING_LABELS
      .map((label) => findCountInChunks(chunks, label) ?? shared.extractCountByLabel(text, label))
      .find((value) => value != null) ?? null;
    const followerCount = FOLLOWER_LABELS
      .map((label) => findCountInChunks(chunks, label) ?? shared.extractCountByLabel(text, label))
      .find((value) => value != null) ?? null;
    const followsYou = FOLLOWS_YOU_REGEX.test(text);
    const isFollowing = parseButtonFollowing(rootNode);

    return {
      handle,
      isFollowing,
      followsYou,
      followingCount,
      followerCount,
      source,
      fetchedAt: Date.now()
    };
  }

  function getPathValue(rootNode, path) {
    let current = rootNode;
    for (const segment of path) {
      if (!current || typeof current !== "object") {
        return undefined;
      }

      current = current[segment];
    }

    return current;
  }

  function pickPathValue(rootNode, paths) {
    for (const path of paths) {
      const value = getPathValue(rootNode, path);
      if (typeof value !== "undefined" && value !== null && value !== "") {
        return value;
      }
    }

    return undefined;
  }

  function pickNumericValue(rootNode, paths) {
    const rawValue = pickPathValue(rootNode, paths);
    const numeric = Number(rawValue);
    if (Number.isFinite(numeric)) {
      return numeric;
    }

    return shared.parseAbbreviatedCount(rawValue);
  }

  function extractProfileFromStoreUser(user, source) {
    if (!user || typeof user !== "object") {
      return null;
    }

    const handle = shared.normalizeHandle(user.screen_name || (user.legacy && user.legacy.screen_name));
    if (!handle) {
      return null;
    }

    const followingCount = Number.isFinite(Number(user.friends_count ?? (user.legacy && user.legacy.friends_count)))
      ? Number(user.friends_count ?? (user.legacy && user.legacy.friends_count))
      : null;
    const followerCount = Number.isFinite(Number(user.followers_count ?? (user.legacy && user.legacy.followers_count)))
      ? Number(user.followers_count ?? (user.legacy && user.legacy.followers_count))
      : null;

    return {
      handle,
      isFollowing: Boolean(user.following ?? (user.relationship_perspectives && user.relationship_perspectives.following)),
      followsYou: Boolean(user.followed_by ?? (user.relationship_perspectives && user.relationship_perspectives.followed_by)),
      followingCount,
      followerCount,
      source: source || "page_store_selector",
      fetchedAt: Date.now()
    };
  }

  function collectConnectionFlags(rootNode) {
    const values = [
      pickPathValue(rootNode, [["connections"]]),
      pickPathValue(rootNode, [["connection"]]),
      pickPathValue(rootNode, [["relationship"]]),
      pickPathValue(rootNode, [["relationships"]]),
      pickPathValue(rootNode, [["relationship_perspectives"]]),
      pickPathValue(rootNode, [["relationship_perspective"]])
    ];

    const flags = new Set();
    function collectObjectFlags(obj) {
      if (!obj || typeof obj !== "object") {
        return;
      }

      for (const [key, value] of Object.entries(obj)) {
        if (value === true) {
          flags.add(String(key).toLowerCase());
          continue;
        }

        if (typeof value === "string" && value.toLowerCase() === "true") {
          flags.add(String(key).toLowerCase());
          continue;
        }

        if (value && typeof value === "object" && !Array.isArray(value)) {
          collectObjectFlags(value);
        }
      }
    }

    for (const value of values) {
      if (!value) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") {
            flags.add(item.toLowerCase());
          }
        }
        continue;
      }

      if (typeof value === "string") {
        flags.add(value.toLowerCase());
        continue;
      }

      if (typeof value === "object") {
        collectObjectFlags(value);
      }
    }

    return flags;
  }

  function extractProfileFromNetworkObject(rootNode, source) {
    if (!rootNode || typeof rootNode !== "object") {
      return null;
    }

    const handle = shared.normalizeHandle(
      pickPathValue(rootNode, [
        ["screen_name"],
        ["username"],
        ["handle"],
        ["legacy", "screen_name"],
        ["core", "screen_name"],
        ["core", "user_results", "result", "legacy", "screen_name"],
        ["relationship", "target", "screen_name"],
        ["relationship", "source", "screen_name"],
        ["user", "screen_name"],
        ["user", "legacy", "screen_name"],
        ["result", "legacy", "screen_name"],
        ["user_results", "result", "legacy", "screen_name"]
      ])
    );

    if (!handle) {
      return null;
    }

    const followingCount = pickNumericValue(rootNode, [
      ["friends_count"],
      ["following_count"],
      ["legacy", "friends_count"],
      ["legacy", "following_count"],
      ["core", "user_results", "result", "legacy", "friends_count"],
      ["user", "friends_count"],
      ["user", "legacy", "friends_count"],
      ["result", "legacy", "friends_count"],
      ["user_results", "result", "legacy", "friends_count"]
    ]);

    const followerCount = pickNumericValue(rootNode, [
      ["followers_count"],
      ["follower_count"],
      ["legacy", "followers_count"],
      ["legacy", "follower_count"],
      ["core", "user_results", "result", "legacy", "followers_count"],
      ["user", "followers_count"],
      ["user", "legacy", "followers_count"],
      ["result", "legacy", "followers_count"],
      ["user_results", "result", "legacy", "followers_count"]
    ]);

    const connectionFlags = collectConnectionFlags(rootNode);
    const isFollowing = Boolean(
      pickPathValue(rootNode, [
        ["following"],
        ["is_following"],
        ["relationship_perspectives", "following"],
        ["relationship_perspective", "following"],
        ["relationship", "following"],
        ["legacy", "following"],
        ["relationship", "source", "following"],
        ["relationship", "target", "following"],
        ["source", "following"],
        ["target", "following"]
      ])
    ) || connectionFlags.has("following");

    const followsYou = Boolean(
      pickPathValue(rootNode, [
        ["followed_by"],
        ["followedBy"],
        ["is_followed_by"],
        ["relationship_perspectives", "followed_by"],
        ["relationship_perspective", "followed_by"],
        ["relationship", "followed_by"],
        ["legacy", "followed_by"],
        ["relationship", "source", "followed_by"],
        ["relationship", "target", "followed_by"],
        ["source", "followed_by"],
        ["target", "followed_by"]
      ])
    ) || connectionFlags.has("followed_by") || connectionFlags.has("followedby");

    if (!isFollowing && !followsYou && !Number.isFinite(followingCount) && !Number.isFinite(followerCount)) {
      return null;
    }

    return {
      handle,
      isFollowing,
      followsYou,
      followingCount,
      followerCount,
      source,
      fetchedAt: Date.now()
    };
  }

  function guessNetworkSource(url) {
    if (/\/HomeTimeline\?/i.test(url)) {
      return "page_timeline";
    }

    if (/list\.json/i.test(url)) {
      return "page_list_json";
    }

    if (/lookup\.json/i.test(url)) {
      return "page_lookup_json";
    }

    return "page_network";
  }

  function getRequestUrl(urlLike) {
    try {
      return new URL(urlLike, "https://x.com");
    } catch (error) {
      return null;
    }
  }

  function extractProfileHintsFromNetworkPayload(payload, url, activeHoverHandle) {
    const requestUrl = getRequestUrl(url);
    if (!requestUrl || !payload || typeof payload !== "object") {
      return [];
    }

    const source = guessNetworkSource(url || "");
    const explicitHandle = shared.normalizeHandle(requestUrl.searchParams.get("screen_name"));
    const targetHandle = explicitHandle || shared.normalizeHandle(activeHoverHandle);
    if (!targetHandle) {
      return [];
    }

    const totalCount = pickNumericValue(payload, [["total_count"], ["count"], ["users_count"]]);
    if (!Number.isFinite(totalCount)) {
      return [];
    }

    const pathname = requestUrl.pathname;
    const profile = {
      handle: targetHandle,
      isFollowing: false,
      followsYou: false,
      followingCount: null,
      followerCount: null,
      source: `${source}_total_count`,
      fetchedAt: Date.now()
    };

    if (/\/friends\/(?:following\/)?list\.json$/i.test(pathname)) {
      profile.followingCount = totalCount;
      return [profile];
    }

    if (/\/followers\/list\.json$/i.test(pathname)) {
      profile.followerCount = totalCount;
      return [profile];
    }

    return [];
  }

  function extractProfilesFromNetworkPayload(payload, url) {
    const source = guessNetworkSource(url || "");
    const seen = new WeakSet();
    const merged = new Map();

    function visit(node) {
      if (!node || typeof node !== "object") {
        return;
      }

      if (seen.has(node)) {
        return;
      }
      seen.add(node);

      const profile = extractProfileFromNetworkObject(node, source);
      if (profile) {
        const existing = merged.get(profile.handle);
        merged.set(profile.handle, existing ? mergeProfileData(profile, existing) : profile);
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

    visit(payload);
    return Array.from(merged.values());
  }

  function mergeProfileData(primary, fallback) {
    if (!fallback) {
      return primary;
    }

    return {
      handle: primary.handle || fallback.handle,
      isFollowing: primary.isFollowing || fallback.isFollowing,
      followsYou: primary.followsYou || fallback.followsYou,
      followingCount: primary.followingCount ?? fallback.followingCount,
      followerCount: primary.followerCount ?? fallback.followerCount,
      source: primary.source === fallback.source ? primary.source : `${primary.source}+${fallback.source}`,
      fetchedAt: Math.max(primary.fetchedAt || 0, fallback.fetchedAt || 0)
    };
  }

  function isUsefulProfile(profile) {
    return Boolean(
      profile &&
      (profile.isFollowing || profile.followsYou || Number.isFinite(profile.followingCount) || Number.isFinite(profile.followerCount))
    );
  }

  function findMatchingHoverCard(doc, handle) {
    if (!doc) {
      return null;
    }

    const candidates = Array.from(doc.querySelectorAll(HOVER_CARD_SELECTOR));
    const normalizedHandle = shared.normalizeHandle(handle);
    if (candidates.length === 0) {
      return null;
    }

    const scored = candidates
      .map((node) => {
        const text = node.textContent || "";
        const hasCounts = /Following/i.test(text) && /Followers/i.test(text);
        const hasMutualHint = /Follows you/i.test(text);
        const handleInText = normalizedHandle ? text.toLowerCase().includes(normalizedHandle) : false;
        const handleInLinks = Array.from(node.querySelectorAll('a[href]')).some((anchor) => {
          const candidateHandle = shared.normalizeHandle(shared.getTopPathSegment(anchor.href));
          return candidateHandle === normalizedHandle;
        });
        const hasProfileSignals = hasCounts || hasMutualHint || parseButtonFollowing(node);
        const score =
          (handleInLinks ? 4 : 0) +
          (handleInText ? 2 : 0) +
          (hasCounts ? 2 : 0) +
          (hasMutualHint ? 1 : 0) +
          (parseButtonFollowing(node) ? 1 : 0);

        return {
          node,
          hasProfileSignals,
          score
        };
      })
      .filter((entry) => entry.hasProfileSignals)
      .sort((left, right) => right.score - left.score);

    if (scored.length === 0) {
      return null;
    }

    if (scored[0].score > 0) {
      return scored[0].node;
    }

    return scored.length === 1 ? scored[0].node : null;
  }

  class TimelineAnnotator {
    constructor(chromeApi, doc, win) {
      this.chrome = chromeApi;
      this.document = doc;
      this.window = win;
      this.config = shared.mergeConfig({});
      this.articleQueue = new Set();
      this.processing = false;
      this.profileStore = new Map();
      this.observer = null;
      this.boundWindowMessageHandler = this.handleWindowMessage.bind(this);
      this.boundLocationChangeHandler = this.handleLocationChange.bind(this);
      this.pendingBridgeLookups = new Map();
      this.inflightHandleLookups = new Map();
      this.lookupRequestId = 0;
      this.lastKnownUrl = win.location.href;
      this.pendingRescanTimeouts = new Set();
      this.stats = {
        liveAuthors: 0,
        timelineResponsesSeen: 0,
        timelineProfilesExtracted: 0,
        lastTimelineUrl: "",
        lastTimelineHandles: [],
        lastScanAt: null
      };
    }

    async init() {
      if (!isSupportedXPath(this.window.location.href)) {
        return;
      }

      this.installNetworkBridge();
      await waitForDocumentBody(this.document, this.window);
      this.config = shared.mergeConfig(await this.chrome.storage.sync.get(shared.DEFAULT_CONFIG));
      this.observeStorage();
      this.observeMessages();
      this.installNavigationObserver();
      this.installObserver();
      this.enqueueArticles(this.document.querySelectorAll(ITEM_SELECTOR), true);
    }

    installNetworkBridge() {
      this.window.addEventListener("message", this.boundWindowMessageHandler);
    }

    handleWindowMessage(event) {
      if (event.source !== this.window || !event.data || event.data.source !== BRIDGE_MESSAGE_SOURCE) {
        return;
      }

      if (event.data.type === LOOKUP_USERS_RESULT_TYPE) {
        const requestId = event.data.requestId || "";
        const pending = this.pendingBridgeLookups.get(requestId);
        if (!pending) {
          return;
        }

        this.pendingBridgeLookups.delete(requestId);
        this.window.clearTimeout(pending.timeoutId);

        const profiles = Array.isArray(event.data.profiles) ? event.data.profiles : [];
        this.stats.timelineResponsesSeen += 1;
        this.stats.timelineProfilesExtracted += profiles.length;
        this.stats.lastTimelineHandles = profiles.slice(0, 5).map((profile) => profile.handle);
        pending.resolve(profiles);
        return;
      }

      if (event.data.type === "TIMELINE_PAYLOAD") {
        void this.handleTimelinePayload(event.data);
        return;
      }

      if (event.data.type === NAVIGATION_CHANGED_TYPE) {
        this.handleLocationChange(event.data.url);
      }
    }

    requestProfilesFromBridge(handles) {
      const normalizedHandles = Array.from(new Set(handles.map((handle) => shared.normalizeHandle(handle)).filter(Boolean)));
      if (normalizedHandles.length === 0) {
        return Promise.resolve([]);
      }

      const requestId = `lookup-${Date.now()}-${++this.lookupRequestId}`;

      return new Promise((resolve) => {
        const timeoutId = this.window.setTimeout(() => {
          if (!this.pendingBridgeLookups.has(requestId)) {
            return;
          }

          this.pendingBridgeLookups.delete(requestId);
          resolve([]);
        }, 1200);

        this.pendingBridgeLookups.set(requestId, {
          resolve,
          timeoutId
        });

        this.window.postMessage(
          {
            source: BRIDGE_REQUEST_SOURCE,
            type: LOOKUP_USERS_TYPE,
            requestId,
            handles: normalizedHandles
          },
          this.window.location.origin
        );
      });
    }

    async handleTimelinePayload(message) {
      const url = typeof message.url === "string" ? message.url : "";
      const payload = message.payload;
      if (!url || !payload) {
        return;
      }

      this.stats.timelineResponsesSeen += 1;
      this.stats.lastTimelineUrl = url;

      const profiles = extractProfilesFromNetworkPayload(payload, url);
      this.stats.timelineProfilesExtracted += profiles.length;
      this.stats.lastTimelineHandles = profiles.slice(0, 5).map((profile) => profile.handle);

      const touchedHandles = new Set();
      for (const profile of profiles) {
        await this.persistProfile(profile.handle, profile);
        touchedHandles.add(profile.handle);
      }

      await this.refreshArticlesForHandles(touchedHandles);
    }

    async updateConfig(patch) {
      const next = shared.mergeConfig({ ...this.config, ...patch });
      this.config = next;
      await this.chrome.storage.sync.set(next);
      return next;
    }

    observeStorage() {
      this.chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "sync") {
          return;
        }

        const nextConfig = {};
        for (const key of Object.keys(shared.DEFAULT_CONFIG)) {
          if (changes[key]) {
            nextConfig[key] = changes[key].newValue;
          }
        }

        if (Object.keys(nextConfig).length === 0) {
          return;
        }

        this.config = shared.mergeConfig({ ...this.config, ...nextConfig });
        void this.rescan(false);
      });
    }

    observeMessages() {
      this.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message || !message.type) {
          return;
        }

        if (message.type === "SET_ENABLED") {
          this.config.enabled = Boolean(message.enabled);
          void this.rescan(false).then(() => sendResponse({ ok: true, stats: this.getStats() }));
          return true;
        }

        if (message.type === "SET_RATIO_TOLERANCE") {
          this.config.ratioTolerancePct = shared.clampRatioTolerance(message.ratioTolerancePct);
          void this.rescan(false).then(() => sendResponse({ ok: true, stats: this.getStats() }));
          return true;
        }

        if (message.type === "RESCAN_CURRENT_TAB") {
          void this.rescan(false).then(() => sendResponse({ ok: true, stats: this.getStats() }));
          return true;
        }
      });
    }

    installNavigationObserver() {
      this.window.addEventListener("popstate", this.boundLocationChangeHandler);
      this.window.addEventListener("hashchange", this.boundLocationChangeHandler);
    }

    handleLocationChange(nextUrlOverride) {
      const nextUrl = nextUrlOverride || this.window.location.href;
      if (nextUrl === this.lastKnownUrl) {
        return;
      }

      this.lastKnownUrl = nextUrl;
      if (!isSupportedXPath(nextUrl)) {
        return;
      }

      for (const timeoutId of this.pendingRescanTimeouts) {
        this.window.clearTimeout(timeoutId);
      }
      this.pendingRescanTimeouts.clear();

      const schedule = (delay) => {
        const timeoutId = this.window.setTimeout(() => {
          this.pendingRescanTimeouts.delete(timeoutId);
          void this.rescan(true);
        }, delay);
        if (timeoutId && typeof timeoutId === "object" && typeof timeoutId.unref === "function") {
          timeoutId.unref();
        }
        this.pendingRescanTimeouts.add(timeoutId);
      };

      schedule(80);
      schedule(420);
    }

    installObserver() {
      this.observer = new MutationObserver((records) => {
        const articles = [];
        for (const record of records) {
          for (const node of (record.type === "childList" ? record.addedNodes : [record.target])) {
            if (!(node instanceof this.window.Element)) {
              continue;
            }

            if (node.matches && node.matches(ITEM_SELECTOR)) {
              articles.push(node);
            }

            if (node.querySelectorAll) {
              articles.push(...node.querySelectorAll(ITEM_SELECTOR));
            }
          }
        }

        this.enqueueArticles(articles, false);
      });

      this.observer.observe(this.document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-testid", "class"]
      });
    }

    installHoverListeners() {
      return;
    }

    enqueueArticles(articles, force) {
      for (const article of articles) {
        if (!(article instanceof this.window.HTMLElement)) {
          continue;
        }

        if (force) {
          delete article.dataset.xMutualProcessed;
        }

        if (article.dataset.xMutualProcessed === "true") {
          continue;
        }

        this.articleQueue.add(article);
      }

      void this.flushQueue();
    }

    async flushQueue() {
      if (this.processing || this.articleQueue.size === 0) {
        return;
      }

      this.processing = true;

      while (this.articleQueue.size > 0) {
        const [article] = this.articleQueue;
        this.articleQueue.delete(article);
        await this.processArticle(article);
      }

      this.processing = false;
      this.stats.lastScanAt = Date.now();
    }

    async processArticle(article, forceRefresh) {
      // Avoid duplicate processing if this is a container (like cellInnerDiv) wrapping a UserCell
      if (article.matches('[data-testid="cellInnerDiv"]') && article.querySelector('[data-testid="UserCell"]')) {
        article.dataset.xMutualProcessed = "true";
        return;
      }

      const handle = extractHandleFromArticle(article);
      if (!handle) {
        if (scheduleArticleRetry(this, article, 180)) {
          return;
        }

        removeAnnotation(article);
        return;
      }

      const profile = await this.getAuthorProfile(handle, article, forceRefresh);
      const match = shared.evaluateProfile(profile, this.config.ratioTolerancePct);
      const annotationVariant = getAnnotationVariant(profile, match);

      if (this.config.enabled && annotationVariant) {
        const applied = applyAnnotation(
          article,
          profile,
          match,
          annotationVariant,
          this.config.showBadgeNumbers,
          this.config.showBadgeLabel,
          this.config.badgeFontSize,
          this.config.badgePosition,
          this.config.language
        );
        if (!applied) {
          scheduleArticleRetry(this, article, 120);
          return;
        }
      } else {
        removeAnnotation(article);
      }

      article.dataset.xMutualProcessed = "true";
      article.dataset.xMutualRetryCount = "0";
      article.dataset.xMutualHandle = handle;
      article.dataset.xMutualReason = match.reason || "";
    }

    async getAuthorProfile(handle, article, forceRefresh) {
      const normalizedHandle = shared.normalizeHandle(handle);
      let liveProfile = this.profileStore.get(normalizedHandle) || null;
      if (forceRefresh || !isUsefulProfile(liveProfile)) {
        const lookedUpProfile = await this.lookupHandleProfile(normalizedHandle);
        if (lookedUpProfile) {
          liveProfile = lookedUpProfile;
        }
      }
      const profile = await this.readAuthorProfile(normalizedHandle, article, liveProfile);
      return profile || {
        handle: normalizedHandle,
        isFollowing: false,
        followsYou: false,
        followingCount: null,
        followerCount: null,
        source: "unavailable",
        fetchedAt: Date.now()
      };
    }

    async lookupHandleProfile(handle) {
      const normalizedHandle = shared.normalizeHandle(handle);
      if (!normalizedHandle) {
        return null;
      }

      if (this.inflightHandleLookups.has(normalizedHandle)) {
        return this.inflightHandleLookups.get(normalizedHandle);
      }

      const request = (async () => {
        const profiles = await this.requestProfilesFromBridge([normalizedHandle]);
        const profile = profiles.find((entry) => shared.normalizeHandle(entry.handle) === normalizedHandle) || null;
        if (!profile) {
          return null;
        }

        return this.persistProfile(normalizedHandle, profile);
      })().finally(() => {
        this.inflightHandleLookups.delete(normalizedHandle);
      });

      this.inflightHandleLookups.set(normalizedHandle, request);
      return request;
    }

    async readAuthorProfile(handle, article, liveProfile) {
      const articleProfile = parseProfileData(article, handle, "article");
      if (liveProfile && isUsefulProfile(liveProfile)) {
        return mergeProfileData(liveProfile, articleProfile);
      }

      return articleProfile;
    }

    async persistProfile(handle, profile) {
      const normalizedHandle = shared.normalizeHandle(handle);
      if (!normalizedHandle) {
        return profile;
      }

      const existing = this.profileStore.get(normalizedHandle) || null;
      const mergedProfile = existing ? mergeProfileData(profile, existing) : profile;
      this.profileStore.set(normalizedHandle, mergedProfile);
      this.stats.liveAuthors = this.profileStore.size;
      return mergedProfile;
    }

    async refreshArticlesForHandles(handles) {
      if (!handles || handles.size === 0) {
        return;
      }

      const normalizedHandles = new Set(Array.from(handles, (handle) => shared.normalizeHandle(handle)).filter(Boolean));
      const matchingArticles = Array.from(this.document.querySelectorAll(ITEM_SELECTOR)).filter((article) => {
        const knownHandle = article.dataset.xMutualHandle || extractHandleFromArticle(article);
        return normalizedHandles.has(knownHandle);
      });

      for (const article of matchingArticles) {
        delete article.dataset.xMutualProcessed;
        removeAnnotation(article);
      }

      this.enqueueArticles(matchingArticles, false);
      await this.flushQueue();
    }

    getStats() {
      return {
        ...this.stats,
        config: this.config
      };
    }

    async rescan(forceRefresh, clearCaches) {
      const articles = this.document.querySelectorAll(ITEM_SELECTOR);
      for (const article of articles) {
        delete article.dataset.xMutualProcessed;
        removeAnnotation(article);
      }

      this.enqueueArticles(articles, forceRefresh);
      await this.flushQueue();
    }
  }

  async function boot() {
    const annotator = new TimelineAnnotator(chrome, document, window);
    await annotator.init();
    return annotator;
  }

  return {
    boot,
    __test: {
      TimelineAnnotator,
      isSupportedXPath,
      extractHandleFromArticle,
      extractUserIdFromArticle,
      findProfileAnchor,
      createTooltipText,
      ensureFloatingTooltip,
      showFloatingTooltip,
      hideFloatingTooltip,
      extractProfileFromStoreUser,
      getAnnotationVariant,
      applyAnnotation,
      removeAnnotation,
      parseProfileData,
      extractProfilesFromNetworkPayload,
      extractProfileHintsFromNetworkPayload,
      findUserCellActionAnchor,
      isRelationshipListItem
    }
  };
});

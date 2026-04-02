const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const content = require("../src/content.js");

function createChromeStub() {
  const localStore = {};
  return {
    storage: {
      sync: {
        get: async () => ({}),
        set: async () => {}
      },
      local: {
        get: async (key) => {
          if (key == null) {
            return { ...localStore };
          }

          if (typeof key === "string") {
            return { [key]: localStore[key] };
          }

          return {};
        },
        set: async (values) => {
          Object.assign(localStore, values);
        },
        remove: async (keys) => {
          for (const key of Array.isArray(keys) ? keys : [keys]) {
            delete localStore[key];
          }
        }
      },
      session: {
        get: async () => ({}),
        set: async () => {}
      },
      onChanged: {
        addListener() {}
      }
    },
    runtime: {
      getURL: (path) => `chrome-extension://test/${path}`,
      onMessage: {
        addListener() {}
      }
    }
  };
}

test("extractHandleFromArticle uses the tweet status link first", () => {
  const dom = new JSDOM(`
    <article data-testid="tweet">
      <a href="/someone_else">Else</a>
      <a href="/target_user/status/123"><time>now</time></a>
    </article>
  `);
  const article = dom.window.document.querySelector("article");

  assert.equal(content.__test.extractHandleFromArticle(article), "target_user");
});

test("isSupportedXPath only accepts x.com pages", () => {
  assert.equal(content.__test.isSupportedXPath("https://x.com/home"), true);
  assert.equal(content.__test.isSupportedXPath("https://x.com/Crypto_Boy666/status/2037540878513057998"), true);
  assert.equal(content.__test.isSupportedXPath("https://example.com/home"), false);
});

test("extractUserIdFromArticle reads user id from profile image urls", () => {
  const dom = new JSDOM(`
    <article data-testid="tweet">
      <img src="https://pbs.twimg.com/profile_images/1988525234568458240/avatar_normal.jpg">
    </article>
  `);
  const article = dom.window.document.querySelector("article");

  assert.equal(content.__test.extractUserIdFromArticle(article), "1988525234568458240");
});

test("applyAnnotation appends a badge with tooltip", () => {
  const dom = new JSDOM(`
    <article data-testid="tweet">
      <div data-testid="User-Name">author row</div>
      <div role="group">
        <button data-testid="reply"></button>
        <button data-testid="like"></button>
        <button data-testid="share"></button>
      </div>
      <div>body</div>
    </article>
  `);
  const article = dom.window.document.querySelector("article");

  content.__test.applyAnnotation(
    article,
    {
      isFollowing: true,
      followsYou: true,
      followingCount: 1000,
      followerCount: 1100,
      source: "hover_card",
      fetchedAt: Date.now()
    },
    {
      ratio: 1.1
    },
    "mutual",
    true, // showBadgeNumbers
    true, // showBadgeLabel
    "12", // badgeFontSize
    true, // highlightPosts
    "header", // badgePosition
    "en" // language
  );

  const badge = article.querySelector(".x-mutual-badge");
  const badgeRow = article.querySelector(".x-mutual-badge-row");
  assert.ok(badge);
  assert.ok(badgeRow);
  assert.equal(badge.parentElement, badgeRow);
  assert.equal(badgeRow.dataset.placement, "header");
  assert.equal(badge.textContent, "Mutual 1.10");
  assert.match(badge.dataset.tooltip, /Following:/);
  assert.match(badge.dataset.tooltip, /Relation: Mutual/);
  assert.match(badge.dataset.tooltip, /Follow rate: 1.10/);
  assert.equal(article.classList.contains("x-mutual-match"), true);
});

test("showFloatingTooltip mounts a body-level tooltip overlay", () => {
  const dom = new JSDOM(`
    <body>
      <article data-testid="tweet"></article>
    </body>
  `, { pretendToBeVisual: true });
  const article = dom.window.document.querySelector("article");

  content.__test.applyAnnotation(
    article,
    {
      isFollowing: true,
      followsYou: true,
      followingCount: 1000,
      followerCount: 1100,
      source: "hover_card",
      fetchedAt: Date.now()
    },
    {
      ratio: 1.1
    },
    "mutual",
    true,
    true,
    "12",
    true,
    "header",
    "en"
  );

  const badge = article.querySelector(".x-mutual-badge");
  content.__test.showFloatingTooltip(badge);

  const tooltip = dom.window.document.body.querySelector(".x-mutual-floating-tooltip");
  assert.ok(tooltip);
  assert.equal(tooltip.hidden, false);
  assert.match(tooltip.textContent, /Relation: Mutual/);

  content.__test.hideFloatingTooltip(dom.window.document, badge);
  assert.equal(tooltip.hidden, true);
});

test("applyAnnotation uses distinct variant styles for one-way following", () => {
  const dom = new JSDOM(`<article data-testid="tweet"></article>`);
  const article = dom.window.document.querySelector("article");

  content.__test.applyAnnotation(
    article,
    {
      isFollowing: true,
      followsYou: false,
      followingCount: 1000,
      followerCount: 900,
      source: "page_timeline",
      fetchedAt: Date.now()
    },
    {
      ratio: 1.11
    },
    "one_way_following",
    true,
    true,
    "12",
    true,
    "header",
    "en"
  );

  const badge = article.querySelector(".x-mutual-badge");
  assert.ok(badge);
  assert.equal(badge.textContent, "Following 1.11");
  assert.equal(badge.dataset.variant, "one_way_following");
  assert.equal(article.classList.contains("x-mutual-one-way-following"), true);
});

test("applyAnnotation can hide badge numbers for one-way followed-by", () => {
  const dom = new JSDOM(`<article data-testid="tweet"></article>`);
  const article = dom.window.document.querySelector("article");

  content.__test.applyAnnotation(
    article,
    {
      isFollowing: false,
      followsYou: true,
      followingCount: 900,
      followerCount: 1000,
      source: "page_store_selector",
      fetchedAt: Date.now()
    },
    {
      ratio: 0.9
    },
    "one_way_followed_by",
    false,
    true,
    "12",
    true,
    "header",
    "en"
  );

  const badge = article.querySelector(".x-mutual-badge");
  assert.ok(badge);
  assert.equal(badge.textContent, "Follows you");
});

test("applyAnnotation localizes japanese badge text", () => {
  const dom = new JSDOM(`<article data-testid="tweet"></article>`);
  const article = dom.window.document.querySelector("article");

  content.__test.applyAnnotation(
    article,
    {
      isFollowing: true,
      followsYou: true,
      followingCount: 1000,
      followerCount: 900,
      source: "page_store_selector",
      fetchedAt: Date.now()
    },
    {
      ratio: 1.11
    },
    "mutual",
    true,
    true,
    "12",
    true,
    "header",
    "ja"
  );

  const badge = article.querySelector(".x-mutual-badge");
  assert.ok(badge);
  assert.equal(badge.textContent, "相互 1.11");
  assert.match(badge.dataset.tooltip, /関係: 相互フォロー/);
  assert.match(badge.dataset.tooltip, /フォロー率: 1.11/);
});

test("applyAnnotation can disable post highlight while keeping the badge", () => {
  const dom = new JSDOM(`<article data-testid="tweet"></article>`);
  const article = dom.window.document.querySelector("article");

  content.__test.applyAnnotation(
    article,
    {
      isFollowing: true,
      followsYou: true,
      followingCount: 1000,
      followerCount: 950,
      source: "page_store_selector",
      fetchedAt: Date.now()
    },
    {
      ratio: 1.05
    },
    "mutual",
    true,
    true,
    "12",
    false,
    "header",
    "en"
  );

  const badge = article.querySelector(".x-mutual-badge");
  assert.ok(badge);
  assert.equal(article.classList.contains("x-mutual-match"), false);
  assert.equal(article.classList.contains("x-mutual-one-way-following"), false);
  assert.equal(article.classList.contains("x-mutual-one-way-followed-by"), false);
});

test("removeAnnotation clears the badge row when no badges remain", () => {
  const dom = new JSDOM(`
    <article data-testid="tweet">
      <div data-testid="User-Name">author row</div>
    </article>
  `);
  const article = dom.window.document.querySelector("article");

  content.__test.applyAnnotation(
    article,
    {
      isFollowing: true,
      followsYou: true,
      followingCount: 1000,
      followerCount: 1000,
      source: "page_store_selector",
      fetchedAt: Date.now()
    },
    {
      ratio: 1
    },
    "mutual",
    true,
    true,
    "header",
    "en"
  );

  content.__test.removeAnnotation(article);

  assert.equal(article.querySelector(".x-mutual-badge"), null);
  assert.equal(article.querySelector(".x-mutual-badge-row"), null);
});

test("applyAnnotation can place the badge below the author row", () => {
  const dom = new JSDOM(`
    <article data-testid="tweet">
      <div data-testid="User-Name">author row</div>
      <div role="group">
        <button data-testid="reply"></button>
        <button data-testid="like"></button>
      </div>
    </article>
  `);
  const article = dom.window.document.querySelector("article");

  content.__test.applyAnnotation(
    article,
    {
      isFollowing: true,
      followsYou: true,
      followingCount: 1000,
      followerCount: 1000,
      source: "page_store_selector",
      fetchedAt: Date.now()
    },
    {
      ratio: 1
    },
    "mutual",
    true,
    true,
    "12",
    true,
    "header",
    "en"
  );

  const badgeRow = article.querySelector(".x-mutual-badge-row");
  const header = article.querySelector('[data-testid="User-Name"]');
  assert.ok(badgeRow);
  assert.equal(badgeRow.dataset.placement, "header");
  assert.equal(header.nextElementSibling, badgeRow);
});

test("applyAnnotation places user-cell header badges below the identity row", () => {
  const dom = new JSDOM(`
    <div data-testid="UserCell">
      <div class="outer">
        <div class="content">
          <div class="row">
            <div class="identity">
              <a role="link" href="/gym231">かっちゃん</a>
              <a role="link" href="/gym231">@gym231</a>
            </div>
            <div class="action-wrap"><button aria-label="回关 @gym231">回关</button></div>
          </div>
          <div class="bio">bio</div>
        </div>
      </div>
    </div>
  `, { url: "https://x.com/chyni/followers" });
  const article = dom.window.document.querySelector('[data-testid="UserCell"]');

  content.__test.applyAnnotation(
    article,
    {
      isFollowing: true,
      followsYou: true,
      followingCount: 1230,
      followerCount: 1000,
      source: "page_store_selector",
      fetchedAt: Date.now()
    },
    {
      ratio: 1.23,
      shouldHighlight: true
    },
    "mutual",
    true,
    true,
    "12",
    true,
    "header",
    "zh_CN"
  );

  const row = article.querySelector(".row");
  const badgeRow = article.querySelector(".x-mutual-badge-row");
  assert.ok(badgeRow);
  assert.equal(badgeRow.dataset.placement, "header");
  assert.equal(row.nextElementSibling, badgeRow);
});

test("applyAnnotation anchors top-right badges after the top-right button group", () => {
  const dom = new JSDOM(`
    <article data-testid="tweet">
      <button data-follow-action="true">follow</button>
      <div class="top-right-row">
        <div class="top-right-actions">
          <div><button aria-label="Grok 操作">grok</button></div>
          <div><button data-testid="caret" aria-label="More">more</button></div>
        </div>
      </div>
    </article>
  `);
  const article = dom.window.document.querySelector("article");

  content.__test.applyAnnotation(
    article,
    {
      isFollowing: true,
      followsYou: true,
      followingCount: 1000,
      followerCount: 1000,
      source: "page_store_selector",
      fetchedAt: Date.now()
    },
    {
      ratio: 1
    },
    "mutual",
    true,
    true,
    "12",
    true,
    "corner",
    "en"
  );

  const badgeRow = article.querySelector(".x-mutual-badge-row");
  const group = article.querySelector(".top-right-actions");
  const moreWrapper = article.querySelector('[data-testid="caret"]').parentElement;
  assert.ok(badgeRow);
  assert.equal(badgeRow.dataset.placement, "top_right");
  assert.equal(badgeRow.parentElement, group);
  assert.equal(badgeRow.nextElementSibling, moreWrapper);
});

test("applyAnnotation appends the top-right badge after the more button wrapper", () => {
  const dom = new JSDOM(`
    <article data-testid="tweet">
      <button data-follow-action="true">follow</button>
      <div class="top-right-row">
        <div class="top-right-actions">
          <div><button aria-label="Grok 操作">grok</button></div>
          <div><button data-testid="caret" aria-label="More">more</button></div>
        </div>
      </div>
    </article>
  `, { pretendToBeVisual: true });
  const article = dom.window.document.querySelector("article");
  const group = article.querySelector(".top-right-actions");
  const moreWrapper = article.querySelector('[data-testid="caret"]').parentElement;
  group.getBoundingClientRect = () => ({
    width: 92,
    height: 32,
    top: 0,
    left: 0,
    right: 92,
    bottom: 32
  });

  content.__test.applyAnnotation(
    article,
    {
      isFollowing: true,
      followsYou: true,
      followingCount: 1000,
      followerCount: 1000,
      source: "page_store_selector",
      fetchedAt: Date.now()
    },
    {
      ratio: 1
    },
    "mutual",
    true,
    true,
    "top_right",
    "en"
  );

  const badgeRow = article.querySelector(".x-mutual-badge-row");
  assert.ok(badgeRow);
  assert.equal(badgeRow.dataset.placement, "top_right");
  assert.equal(badgeRow.parentElement, group);
  assert.equal(badgeRow.nextElementSibling, moreWrapper);
  assert.equal(article.classList.contains("x-mutual-top-right-replaced"), false);
});

test("applyAnnotation skips top-right placement until the action group exists", () => {
  const dom = new JSDOM(`
    <article data-testid="tweet">
      <div>body</div>
    </article>
  `);
  const article = dom.window.document.querySelector("article");

  const applied = content.__test.applyAnnotation(
    article,
    {
      isFollowing: true,
      followsYou: true,
      followingCount: 1000,
      followerCount: 1000,
      source: "page_store_selector",
      fetchedAt: Date.now()
    },
    {
      ratio: 1
    },
    "mutual",
    true,
    true,
    "12",
    true,
    "top_right",
    "en"
  );

  assert.equal(applied, false);
  assert.equal(article.querySelector(".x-mutual-badge-row"), null);
  assert.equal(article.querySelector(".x-mutual-badge"), null);
});

test("applyAnnotation places user-cell badges after the follow action button", () => {
  const dom = new JSDOM(`
    <div data-testid="UserCell">
      <div class="outer">
        <div class="avatar"></div>
        <div class="content">
          <div class="row">
            <div class="identity">user info</div>
            <div class="action-wrap"><button aria-label="回关 @gym231">回关</button></div>
            <div class="meta">more text</div>
          </div>
        </div>
      </div>
    </div>
  `, { url: "https://x.com/chyni/followers" });
  const article = dom.window.document.querySelector('[data-testid="UserCell"]');

  const applied = content.__test.applyAnnotation(
    article,
    {
      isFollowing: false,
      followsYou: true,
      followingCount: 800,
      followerCount: 1000,
      source: "page_store_selector",
      fetchedAt: Date.now()
    },
    {
      ratio: 0.8
    },
    "one_way_followed_by",
    true,
    true,
    "12",
    true,
    "top_right",
    "zh_CN"
  );

  const actionWrap = article.querySelector(".action-wrap");
  const followBtn = actionWrap.querySelector("button");
  const badgeRow = article.querySelector(".x-mutual-badge-row");
  assert.equal(applied, true);
  assert.ok(badgeRow);
  assert.equal(badgeRow.parentElement, actionWrap);
  // Reverted to insertBefore logic: badgeRow is now first
  assert.equal(badgeRow.nextElementSibling, followBtn);
  assert.equal(badgeRow.classList.contains("x-mutual-user-cell-badge-row"), true);
  assert.equal(actionWrap.classList.contains("x-mutual-user-cell-anchor"), true);
});

test("applyAnnotation places user-cell badges between the follow button and more button", () => {
  const dom = new JSDOM(`
    <div data-testid="UserCell">
      <div class="outer">
        <div class="content">
          <div class="row">
            <div class="identity">user info</div>
            <div class="actions">
              <div class="follow-wrap"><button aria-label="回关 @gym231">回关</button></div>
              <div class="more-wrap"><button aria-label="更多">更多</button></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `, { url: "https://x.com/chyni/followers" });
  const article = dom.window.document.querySelector('[data-testid="UserCell"]');

  const applied = content.__test.applyAnnotation(
    article,
    {
      isFollowing: false,
      followsYou: true,
      followingCount: 860,
      followerCount: 1000,
      source: "page_store_selector",
      fetchedAt: Date.now()
    },
    {
      ratio: 0.86
    },
    "one_way_followed_by",
    true,
    true,
    "12",
    true,
    "top_right",
    "zh_CN"
  );

  const actions = article.querySelector(".actions");
  const followWrap = article.querySelector(".follow-wrap");
  const moreWrap = article.querySelector(".more-wrap");
  const badgeRow = article.querySelector(".x-mutual-badge-row");
  assert.equal(applied, true);
  assert.ok(badgeRow);
  assert.equal(badgeRow.parentElement, actions);
  // Reverted to insertBefore(followWrap) logic: badgeRow is the first child
  assert.equal(badgeRow.nextElementSibling, followWrap);
  assert.equal(followWrap.nextElementSibling, moreWrap);
});

test("parseProfileData reads mutual markers and counts from hover-card text", () => {
  const dom = new JSDOM(`
    <div role="dialog">
      <button>Following</button>
      <span>Follows you</span>
      <span>1,200 Following</span>
      <span>1.1K Followers</span>
    </div>
  `);
  const root = dom.window.document.querySelector("div");

  const result = content.__test.parseProfileData(root, "target_user", "hover_card");
  assert.equal(result.isFollowing, true);
  assert.equal(result.followsYou, true);
  assert.equal(result.followingCount, 1200);
  assert.equal(result.followerCount, 1100);
});

test("extractProfileFromStoreUser maps page store users to annotator profiles", () => {
  const profile = content.__test.extractProfileFromStoreUser({
    screen_name: "Target_User",
    friends_count: 888,
    followers_count: 901,
    following: true,
    followed_by: false
  });

  assert.equal(profile.handle, "target_user");
  assert.equal(profile.followingCount, 888);
  assert.equal(profile.followerCount, 901);
  assert.equal(profile.isFollowing, true);
  assert.equal(profile.followsYou, false);
  assert.equal(profile.source, "page_store_selector");
});


test("extractProfilesFromNetworkPayload reads internal list-style responses", () => {
  const profiles = content.__test.extractProfilesFromNetworkPayload(
    {
      users: [
        {
          screen_name: "target_user",
          friends_count: 101,
          followers_count: 98,
          connections: ["following", "followed_by"]
        }
      ]
    },
    "https://x.com/i/api/1.1/some/list.json"
  );

  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].handle, "target_user");
  assert.equal(profiles[0].followingCount, 101);
  assert.equal(profiles[0].followerCount, 98);
  assert.equal(profiles[0].isFollowing, true);
  assert.equal(profiles[0].followsYou, true);
  assert.equal(profiles[0].source, "page_list_json");
});

test("extractProfilesFromNetworkPayload reads nested relationship_perspectives objects", () => {
  const profiles = content.__test.extractProfilesFromNetworkPayload(
    {
      data: {
        user: {
          core: {
            user_results: {
              result: {
                legacy: {
                  screen_name: "nested_user",
                  friends_count: 210,
                  followers_count: 208
                },
                relationship_perspectives: {
                  following: true,
                  followed_by: true
                }
              }
            }
          }
        }
      }
    },
    "https://x.com/i/api/graphql/abc/UserByScreenName"
  );

  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].handle, "nested_user");
  assert.equal(profiles[0].followingCount, 210);
  assert.equal(profiles[0].followerCount, 208);
  assert.equal(profiles[0].isFollowing, true);
  assert.equal(profiles[0].followsYou, true);
});

test("getAuthorProfile reuses live timeline data before falling back to article text", async () => {
  const dom = new JSDOM(`
    <body>
      <article data-testid="tweet">
        <a href="/target_user/status/123">post</a>
      </article>
    </body>
  `);
  const chromeStub = createChromeStub();
  const { TimelineAnnotator } = content.__test;
  const annotator = new TimelineAnnotator(chromeStub, dom.window.document, dom.window);
  annotator.profileStore.set("target_user", {
    handle: "target_user",
    isFollowing: true,
    followsYou: true,
    followingCount: 100,
    followerCount: 100,
    source: "page_timeline",
    fetchedAt: Date.now()
  });

  const article = dom.window.document.querySelector("article");
  const profile = await annotator.getAuthorProfile("target_user", article, false);
  assert.equal(profile.handle, "target_user");
  assert.equal(profile.followingCount, 100);
  assert.equal(profile.followerCount, 100);
});

test("handleTimelinePayload stores profiles from timeline responses", async () => {
  const dom = new JSDOM(`
    <body>
      <article data-testid="tweet">
        <a href="/target_user/status/123">post</a>
      </article>
    </body>
  `, { url: "https://x.com/home" });
  const { TimelineAnnotator } = content.__test;
  const annotator = new TimelineAnnotator(createChromeStub(), dom.window.document, dom.window);
  annotator.statusChip = dom.window.document.createElement("aside");
  dom.window.document.body.appendChild(annotator.statusChip);

  await annotator.handleTimelinePayload({
    url: "https://x.com/i/api/graphql/abc/HomeTimeline?variables=%7B%7D",
    payload: {
      data: {
        home: {
          home_timeline_urt: {
            instructions: [
              {
                entries: [
                  {
                    entryId: "tweet-1",
                    content: {
                      itemContent: {
                        tweet_results: {
                          result: {
                            core: {
                              user_results: {
                                result: {
                                  legacy: {
                                    screen_name: "target_user",
                                    friends_count: 110,
                                    followers_count: 100
                                  },
                                  relationship_perspectives: {
                                    following: true,
                                    followed_by: true
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                ]
              }
            ]
          }
        }
      }
    }
  });

  assert.equal(annotator.profileStore.size, 1);
  assert.equal(annotator.stats.liveAuthors, 1);
  assert.equal(annotator.stats.timelineResponsesSeen, 1);
  assert.equal(annotator.stats.timelineProfilesExtracted, 1);
});

test("handleLocationChange schedules a rescan when x.com route changes", async () => {
  const dom = new JSDOM(`<body></body>`, {
    url: "https://x.com/home",
    pretendToBeVisual: true
  });
  const { TimelineAnnotator } = content.__test;
  const annotator = new TimelineAnnotator(createChromeStub(), dom.window.document, dom.window);
  let rescanCalls = 0;

  annotator.rescan = async (forceRefresh) => {
    assert.equal(forceRefresh, true);
    rescanCalls += 1;
  };

  annotator.lastKnownUrl = "https://x.com/home";
  dom.reconfigure({ url: "https://x.com/chyni/followers" });
  annotator.handleLocationChange();

  await new Promise((resolve) => dom.window.setTimeout(resolve, 520));
  assert.equal(rescanCalls > 0, true);
});

test("getAnnotationVariant marks one-way followed-by accounts", () => {
  const variant = content.__test.getAnnotationVariant(
    {
      isFollowing: false,
      followsYou: true
    },
    {
      shouldHighlight: false
    }
  );

  assert.equal(variant, "one_way_followed_by");
});

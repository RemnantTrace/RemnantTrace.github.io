/* =========================================================
   REMNANTTRACE INTELLIGENCE
   RansomLook interface
   ========================================================= */

const RT_PROXY =
  "https://script.google.com/macros/s/AKfycbwE8_8EVl8qOTHCLvRLIUsGXeW530hQ1tLrftGLO5xARuQn8TYxLIBNGxuyne6rR0pYcNw/exec";

/* =========================================================
   ELEMENTS
   ========================================================= */

const searchInput = document.getElementById("rt-search");
const searchButton = document.getElementById("rt-search-button");
const results = document.getElementById("rt-results");
const resultsTitle = document.getElementById("rt-results-title");
const resultsCount = document.getElementById("rt-results-count");
const detail = document.getElementById("rt-detail");
const detailContent = document.getElementById("rt-detail-content");
const backButton = document.getElementById("rt-back");
const filters = document.querySelectorAll(".rt-filter");

let currentResults = [];
let currentView = "posts";
let currentProfileType = "";
let currentProfile = null;


/* =========================================================
   HTML ESCAPING
   ========================================================= */

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   SAFE VALUE HELPERS
   ========================================================= */

function isObject(value) {
  return value !== null && typeof value === "object";
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function cleanString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return String(value).trim();
}

function firstValue(object, keys, fallback = "") {
  if (!object || typeof object !== "object") {
    return fallback;
  }

  for (const key of keys) {
    if (
      object[key] !== undefined &&
      object[key] !== null &&
      object[key] !== ""
    ) {
      return object[key];
    }
  }

  return fallback;
}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(value) {
  if (!value) {
    return "DATE UNKNOWN";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHTML(value);
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


/* =========================================================
   URL HELPERS
   ========================================================= */

function looksLikeURL(value) {
  if (!value) {
    return false;
  }

  const text = String(value).trim();

  return (
    /^https?:\/\//i.test(text) ||
    /^www\./i.test(text) ||
    /\.onion([/:?#]|$)/i.test(text)
  );
}

function normalizeURL(value) {
  if (!value) {
    return "";
  }

  const text = String(value).trim();

  if (/^www\./i.test(text)) {
    return "http://" + text;
  }

  return text;
}

function getURLFromObject(object) {
  if (!object || typeof object !== "object") {
    return "";
  }

  const keys = [
    "url",
    "uri",
    "link",
    "href",
    "address",
    "site",
    "website",
    "location",
    "slug"
  ];

  for (const key of keys) {
    const value = object[key];

    if (typeof value === "string" && looksLikeURL(value)) {
      return normalizeURL(value);
    }
  }

  return "";
}


/* =========================================================
   RECURSIVE OBJECT WALKER
   ========================================================= */

/*
  RansomLook can return nested structures.

  Instead of assuming:
      group.locations[0].url

  this walks the COMPLETE response and looks for
  objects that contain URL/location information.
*/

function walkObject(value, callback, path = []) {
  if (value === null || value === undefined) {
    return;
  }

  callback(value, path);

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      walkObject(item, callback, path.concat(index));
    });

    return;
  }

  if (typeof value === "object") {
    Object.keys(value).forEach(key => {
      walkObject(
        value[key],
        callback,
        path.concat(key)
      );
    });
  }
}


/* =========================================================
   RECURSIVELY COLLECT LOCATION RECORDS
   ========================================================= */

function collectLocationRecords(data) {
  const records = [];
  const seen = new WeakSet();

  walkObject(data, (value, path) => {
    if (!isPlainObject(value)) {
      return;
    }

    if (seen.has(value)) {
      return;
    }

    seen.add(value);

    const url = getURLFromObject(value);

    const locationKeys = [
      "available",
      "status",
      "uptime",
      "uptime30d",
      "uptime_30d",
      "health",
      "lastscrape",
      "last_scrape",
      "lastSeen",
      "last_seen",
      "screen",
      "screenshot",
      "screenshots",
      "slug"
    ];

    const hasLocationField =
      locationKeys.some(key =>
        Object.prototype.hasOwnProperty.call(value, key)
      );

    /*
      A record qualifies if it has a URL or enough
      infrastructure-specific fields to identify it
      as a RansomLook location record.
    */

    if (url || hasLocationField) {
      records.push({
        object: value,
        path
      });
    }
  });

  return deduplicateLocationRecords(records);
}


/* =========================================================
   DEDUPLICATE LOCATIONS
   ========================================================= */

function deduplicateLocationRecords(records) {
  const output = [];
  const seen = new Set();

  records.forEach(record => {
    const object = record.object;

    const url =
      getURLFromObject(object) ||
      cleanString(
        firstValue(object, [
          "slug",
          "address",
          "location"
        ])
      );

    const identity = [
      url,
      cleanString(
        firstValue(object, [
          "available",
          "status"
        ])
      ),
      cleanString(
        firstValue(object, [
          "lastscrape",
          "last_scrape"
        ])
      )
    ].join("|");

    if (seen.has(identity)) {
      return;
    }

    seen.add(identity);

    output.push(record);
  });

  return output;
}


/* =========================================================
   FIND ARRAYS RECURSIVELY
   ========================================================= */

function findArraysByKey(data, possibleKeys) {
  const matches = [];
  const wanted = possibleKeys.map(key => key.toLowerCase());

  walkObject(data, (value, path) => {
    if (!Array.isArray(value)) {
      return;
    }

    const lastPathPart =
      path.length
        ? String(path[path.length - 1]).toLowerCase()
        : "";

    if (wanted.includes(lastPathPart)) {
      matches.push(value);
    }
  });

  return matches;
}


/* =========================================================
   FIND POSTS RECURSIVELY
   ========================================================= */

function collectPosts(data) {
  const posts = [];

  const postArrays = findArraysByKey(data, [
    "posts",
    "activity",
    "activities"
  ]);

  postArrays.forEach(array => {
    array.forEach(item => {
      if (item && typeof item === "object") {
        posts.push(item);
      }
    });
  });

  return deduplicateObjects(posts);
}


/* =========================================================
   FIND FILE SERVERS
   ========================================================= */

function collectFileServers(data) {
  const servers = [];

  const arrays = findArraysByKey(data, [
    "fileservers",
    "file_servers",
    "fileservers",
    "fileServers"
  ]);

  arrays.forEach(array => {
    array.forEach(item => {
      if (item && typeof item === "object") {
        servers.push(item);
      }
    });
  });

  return deduplicateObjects(servers);
}


/* =========================================================
   DEDUPLICATE OBJECTS
   ========================================================= */

function deduplicateObjects(items) {
  const output = [];
  const seen = new Set();

  items.forEach(item => {
    let identity;

    try {
      identity = JSON.stringify(item);
    } catch (error) {
      identity = String(item);
    }

    if (seen.has(identity)) {
      return;
    }

    seen.add(identity);
    output.push(item);
  });

  return output;
}


/* =========================================================
   GET OBJECT NAME
   ========================================================= */

function getObjectName(item) {
  if (typeof item === "string") {
    return item;
  }

  if (!item) {
    return "UNKNOWN";
  }

  return (
    item.name ||
    item.group_name ||
    item.groupName ||
    item.actor_name ||
    item.actorName ||
    item.market_name ||
    item.marketName ||
    item.handle ||
    item.title ||
    item.company ||
    item.victim ||
    item.victim_name ||
    "UNKNOWN"
  );
}


/* =========================================================
   GET GROUP NAME
   ========================================================= */

function getGroupName(post) {
  return (
    post.group_name ||
    post.group ||
    post.groupName ||
    post.actor ||
    "UNKNOWN GROUP"
  );
}


/* =========================================================
   GET POST TITLE
   ========================================================= */

function getPostTitle(post) {
  return (
    post.post_title ||
    post.title ||
    post.name ||
    post.company ||
    post.victim ||
    post.victim_name ||
    "UNTITLED POST"
  );
}


/* =========================================================
   GET POST DATE
   ========================================================= */

function getPostDate(post) {
  return (
    post.discovered ||
    post.date ||
    post.created ||
    post.created_at ||
    post.timestamp ||
    post.first_seen ||
    ""
  );
}


/* =========================================================
   API REQUEST
   ========================================================= */

function rtFetch(action, query = "") {
  return new Promise((resolve, reject) => {
    const callbackName =
      "rt_" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .slice(2);

    const script =
      document.createElement("script");

    let finished = false;

    const timeout =
      setTimeout(() => {
        if (finished) {
          return;
        }

        finished = true;
        cleanup();

        reject(
          new Error(
            "The intelligence service timed out."
          )
        );
      }, 30000);

    function cleanup() {
      clearTimeout(timeout);

      if (
        script &&
        script.parentNode
      ) {
        script.parentNode.removeChild(script);
      }

      try {
        delete window[callbackName];
      } catch (error) {
        window[callbackName] =
          undefined;
      }
    }

    window[callbackName] =
      function(data) {
        if (finished) {
          return;
        }

        finished = true;
        cleanup();

        if (
          data &&
          data.error
        ) {
          reject(
            new Error(data.error)
          );
          return;
        }

        resolve(data);
      };

    let url =
      RT_PROXY +
      "?action=" +
      encodeURIComponent(action) +
      "&prefix=" +
      encodeURIComponent(callbackName);

    if (query) {
      url +=
        "&q=" +
        encodeURIComponent(query);
    }

    script.src = url;

    script.onerror =
      function() {
        if (finished) {
          return;
        }

        finished = true;
        cleanup();

        reject(
          new Error(
            "The Google Apps Script proxy could not be reached."
          )
        );
      };

    document.body.appendChild(script);
  });
}


/* =========================================================
   NORMALIZE API RESPONSE
   ========================================================= */

function normalizeArray(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    Array.isArray(data.results)
  ) {
    return data.results;
  }

  if (
    data &&
    Array.isArray(data.posts)
  ) {
    return data.posts;
  }

  if (
    data &&
    Array.isArray(data.groups)
  ) {
    return data.groups;
  }

  if (
    data &&
    Array.isArray(data.actors)
  ) {
    return data.actors;
  }

  if (
    data &&
    Array.isArray(data.markets)
  ) {
    return data.markets;
  }

  return [];
}


/* =========================================================
   LOADING
   ========================================================= */

function showLoading() {
  results.innerHTML =
    `<div class="rt-loading">
      QUERYING INTELLIGENCE...
    </div>`;

  resultsCount.textContent = "";
}


/* =========================================================
   ERROR
   ========================================================= */

function showError(error) {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  results.innerHTML = `
    <div class="rt-error">
      <strong>
        INTELLIGENCE REQUEST FAILED
      </strong>

      <br><br>

      ${escapeHTML(message)}
    </div>
  `;

  resultsCount.textContent = "";
}


/* =========================================================
   EMPTY
   ========================================================= */

function showEmpty(message) {
  results.innerHTML =
    `<div class="rt-empty">
      ${escapeHTML(message)}
    </div>`;

  resultsCount.textContent =
    "0 RESULTS";
}


/* =========================================================
   RECENT ACTIVITY
   ========================================================= */

async function loadRecent() {
  currentView = "posts";

  showLoading();

  resultsTitle.textContent =
    "RECENT ACTIVITY";

  try {
    const data =
      await rtFetch("recent");

    currentResults =
      normalizeArray(data);

    renderPosts(
      currentResults
    );

  } catch (error) {
    console.error(
      "RemnantTrace intelligence error:",
      error
    );

    showError(error);
  }
}


/* =========================================================
   SEARCH
   ========================================================= */

async function performSearch() {
  const query =
    searchInput.value.trim();

  if (!query) {
    await loadRecent();
    return;
  }

  if (query.length < 2) {
    showEmpty(
      "Enter at least two characters."
    );

    return;
  }

  currentView = "search";

  showLoading();

  resultsTitle.textContent =
    "SEARCH / " + query;

  try {
    const data =
      await rtFetch(
        "search",
        query
      );

    currentResults =
      normalizeArray(data);

    renderPosts(
      currentResults
    );

  } catch (error) {
    console.error(
      "Search error:",
      error
    );

    showError(error);
  }
}


/* =========================================================
   POST RENDERER
   ========================================================= */

function renderPosts(posts) {
  resultsCount.textContent =
    `${posts.length} RESULTS`;

  if (!posts.length) {
    showEmpty(
      "No matching intelligence was found."
    );

    return;
  }

  results.innerHTML =
    posts.map(
      (post, index) => {

        const group =
          getGroupName(post);

        const title =
          getPostTitle(post);

        const date =
          getPostDate(post);

        return `
          <article
            class="rt-result"
            data-index="${index}"
          >

            <div class="rt-result-type">
              POST
            </div>

            <div>
              <h3 class="rt-result-title">
                ${escapeHTML(title)}
              </h3>

              <div class="rt-result-meta">
                GROUP /
                ${escapeHTML(group)}
              </div>
            </div>

            <div class="rt-result-date">
              ${formatDate(date)}
            </div>

          </article>
        `;
      }
    ).join("");

  document
    .querySelectorAll(".rt-result")
    .forEach(item => {

      item.addEventListener(
        "click",
        () => {

          const index =
            Number(
              item.dataset.index
            );

          showPostDetail(
            currentResults[index],
            item
          );
        }
      );
    });
}


/* =========================================================
   POST DETAIL
   ========================================================= */

function showPostDetail(
  post,
  resultElement
) {
  if (
    !post ||
    !resultElement
  ) {
    return;
  }

  const group =
    getGroupName(post);

  const title =
    getPostTitle(post);

  const date =
    getPostDate(post);

  const description =
    post.description ||
    post.content ||
    post.text ||
    post.body ||
    "";

  document
    .querySelectorAll(
      ".rt-inline-detail"
    )
    .forEach(
      element =>
        element.remove()
    );

  const inlineDetail =
    document.createElement("div");

  inlineDetail.className =
    "rt-inline-detail";

  inlineDetail.innerHTML = `
    <div class="rt-detail-header">

      <div class="rt-detail-type">
        OBSERVED VICTIM / POST
      </div>

      <h3>
        ${escapeHTML(title)}
      </h3>

    </div>

    <div class="rt-detail-body">

      <div class="rt-detail-grid">

        <div class="rt-detail-field">
          <div class="rt-detail-field-label">
            GROUP
          </div>

          <div class="rt-detail-field-value">
            ${escapeHTML(group)}
          </div>
        </div>

        <div class="rt-detail-field">
          <div class="rt-detail-field-label">
            FIRST OBSERVED
          </div>

          <div class="rt-detail-field-value">
            ${formatDate(date)}
          </div>
        </div>

      </div>

      ${
        description
          ? `
            <div
              class="rt-detail-description"
              style="margin-top:10px;"
            >

              <div class="rt-detail-field-label">
                DESCRIPTION
              </div>

              <div class="rt-detail-field-value">
                ${escapeHTML(description)}
              </div>

            </div>
          `
          : ""
      }

    </div>
  `;

  resultElement.insertAdjacentElement(
    "afterend",
    inlineDetail
  );

  inlineDetail.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}


/* =========================================================
   PROFILE LIST
   ========================================================= */

function renderNameList(
  items,
  type
) {
  currentResults = items;

  currentProfileType =
    type;

  resultsTitle.textContent =
    type;

  resultsCount.textContent =
    `${items.length} RESULTS`;

  if (!items.length) {
    showEmpty(
      `No ${type.toLowerCase()} were returned.`
    );

    return;
  }

  results.innerHTML =
    items.map(
      (item, index) => {

        const name =
          getObjectName(item);

        const profileType =
          type === "GROUPS"
            ? "RANSOMWARE GROUP"
            : type === "ACTORS"
              ? "THREAT ACTOR"
              : "MARKET";

        return `
          <article
            class="rt-result rt-profile-result"
            data-index="${index}"
          >

            <div class="rt-result-type">
              ${profileType}
            </div>

            <div>

              <h3 class="rt-result-title">
                ${escapeHTML(name)}
              </h3>

              <div class="rt-result-meta">
                REMNANTTRACE INTELLIGENCE INDEX
              </div>

            </div>

            <div class="rt-result-date">
              VIEW PROFILE →
            </div>

          </article>
        `;
      }
    ).join("");

  document
    .querySelectorAll(
      ".rt-profile-result"
    )
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          const index =
            Number(
              card.dataset.index
            );

          const item =
            currentResults[index];

          if (
            currentProfileType ===
            "GROUPS"
          ) {
            showGroupProfile(item);
          }

          else if (
            currentProfileType ===
            "ACTORS"
          ) {
            showActorProfile(item);
          }

          else if (
            currentProfileType ===
            "MARKETS"
          ) {
            showMarketProfile(item);
          }

        }
      );
    });
}


/* =========================================================
   GENERIC PROFILE FIELDS
   ========================================================= */

function renderProfileFields(item) {
  if (typeof item === "string") {

    return `
      <div class="rt-profile-section">

        <div class="rt-profile-section-title">
          PROFILE
        </div>

        <div class="rt-detail-field">
          <div class="rt-detail-field-value">
            ${escapeHTML(item)}
          </div>
        </div>

      </div>
    `;
  }

  if (!item) {

    return `
      <div class="rt-empty">
        No profile information was returned.
      </div>
    `;
  }

  const ignoredKeys = [
    "name",
    "group_name",
    "groupName",
    "actor_name",
    "actorName",
    "market_name",
    "marketName",
    "locations",
    "posts",
    "activity",
    "fileservers",
    "file_servers"
  ];

  const fields =
    Object.entries(item)
      .filter(
        ([key, value]) => {

          if (
            ignoredKeys.includes(key)
          ) {
            return false;
          }

          if (
            value === null ||
            value === undefined ||
            value === ""
          ) {
            return false;
          }

          if (
            typeof value === "object"
          ) {
            return false;
          }

          return true;
        }
      );

  if (!fields.length) {

    return `
      <div class="rt-profile-section">

        <div class="rt-profile-section-title">
          PROFILE
        </div>

        <div class="rt-detail-field">

          <div class="rt-detail-field-value">
            Profile information is not available
            in the returned intelligence record.
          </div>

        </div>

      </div>
    `;
  }

  return `
    <div class="rt-profile-section">

      <div class="rt-profile-section-title">
        PROFILE INFORMATION
      </div>

      <div class="rt-profile-grid">

        ${fields.map(
          ([key, value]) => {

            const label =
              key
                .replace(/_/g, " ")
                .replace(/\b\w/g, char =>
                  char.toUpperCase()
                );

            return `
              <div class="rt-detail-field">

                <div class="rt-detail-field-label">
                  ${escapeHTML(label)}
                </div>

                <div class="rt-detail-field-value">
                  ${escapeHTML(value)}
                </div>

              </div>
            `;
          }
        ).join("")}

      </div>

    </div>
  `;
}


/* =========================================================
   LOCATION DATA HELPERS
   ========================================================= */

function getLocationURL(location) {
  return normalizeURL(
    getURLFromObject(location) ||
    firstValue(
      location,
      [
        "slug",
        "url",
        "uri",
        "link",
        "href"
      ]
    )
  );
}

function getLocationStatus(location) {

  const available =
    firstValue(
      location,
      [
        "available",
        "up",
        "is_up",
        "online"
      ],
      null
    );

  if (
    typeof available ===
    "boolean"
  ) {
    return available
      ? "UP"
      : "DOWN";
  }

  const status =
    cleanString(
      firstValue(
        location,
        [
          "status",
          "state"
        ]
      )
    );

  if (status) {
    return status.toUpperCase();
  }

  return "UNKNOWN";
}

function getLocationUptime(location) {

  const value =
    firstValue(
      location,
      [
        "uptime",
        "uptime30d",
        "uptime_30d",
        "uptime_30_days",
        "uptime30",
        "availability"
      ]
    );

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  if (
    typeof value ===
    "number"
  ) {
    return `${value}%`;
  }

  return String(value);
}

function getLocationHealth(location) {

  const value =
    firstValue(
      location,
      [
        "health",
        "health_score",
        "score"
      ]
    );

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return String(value);
}

function getLastScrape(location) {

  return firstValue(
    location,
    [
      "lastscrape",
      "last_scrape",
      "lastScrape",
      "last_seen",
      "lastSeen",
      "updated",
      "updated_at"
    ],
    ""
  );
}

function getLocationScreen(location) {

  const value =
    firstValue(
      location,
      [
        "screen",
        "screenshot",
        "screenshot_url",
        "screenshotUrl",
        "screen_url",
        "screenUrl"
      ],
      ""
    );

  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return firstValue(
      value,
      [
        "url",
        "src",
        "href",
        "path"
      ],
      ""
    );
  }

  return "";
}


/* =========================================================
   RENDER URL
   ========================================================= */

function renderURL(url) {

  if (!url) {
    return `
      <div class="rt-location-url">
        URL NOT AVAILABLE
      </div>
    `;
  }

  return `
    <div class="rt-location-url-block">

      <div class="rt-location-url-type">
        URL
      </div>

      <div class="rt-location-url">
        ${escapeHTML(url)}
      </div>

    </div>
  `;
}


/* =========================================================
   RENDER SCREENSHOT
   ========================================================= */

function renderScreenshot(location) {

  const screen =
    getLocationScreen(
      location
    );

  if (!screen) {
    return `
      <div class="rt-location-screen">

        <div class="rt-screen-frame">
          NO SCREENSHOT AVAILABLE
        </div>

      </div>
    `;
  }

  return `
    <div class="rt-location-screen">

      <div class="rt-screen-frame">

        <img
          src="${escapeHTML(screen)}"
          alt="RansomLook infrastructure screenshot"
          loading="lazy"
          onerror="this.parentElement.innerHTML='SCREENSHOT UNAVAILABLE';"
        >

      </div>

    </div>
  `;
}


/* =========================================================
   RENDER LOCATION CARD
   ========================================================= */

function renderLocationCard(
  location,
  index
) {

  const url =
    getLocationURL(
      location
    );

  const status =
    getLocationStatus(
      location
    );

  const uptime =
    getLocationUptime(
      location
    );

  const health =
    getLocationHealth(
      location
    );

  const lastScrape =
    getLastScrape(
      location
    );

  const statusClass =
    status === "UP"
      ? "rt-status-up"
      : status === "DOWN"
        ? "rt-status-down"
        : "";

  return `
    <article class="rt-location-card">

      <div class="rt-location-top">

        <div class="rt-location-index">
          LOCATION ${String(
            index + 1
          ).padStart(2, "0")}
        </div>

        <div class="rt-location-status ${statusClass}">
          <span class="rt-location-status-dot"></span>
          ${escapeHTML(status)}
        </div>

      </div>

      <div class="rt-location-title">
        ${escapeHTML(
          url ||
          `LOCATION ${index + 1}`
        )}
      </div>

      ${renderURL(url)}

      <div class="rt-location-grid">

        <div class="rt-detail-field">

          <div class="rt-detail-field-label">
            STATUS
          </div>

          <div class="rt-detail-field-value">
            ${escapeHTML(status)}
          </div>

        </div>

        <div class="rt-detail-field">

          <div class="rt-detail-field-label">
            UPTIME 30D
          </div>

          <div class="rt-detail-field-value">
            ${escapeHTML(uptime)}
          </div>

        </div>

        <div class="rt-detail-field">

          <div class="rt-detail-field-label">
            HEALTH
          </div>

          <div class="rt-detail-field-value">
            ${escapeHTML(health)}
          </div>

        </div>

        <div class="rt-detail-field">

          <div class="rt-detail-field-label">
            LAST SCRAPE
          </div>

          <div class="rt-detail-field-value">
            ${lastScrape
              ? formatDate(lastScrape)
              : "—"}
          </div>

        </div>

      </div>

      ${renderScreenshot(location)}

      <details class="rt-location-extra">

        <summary>
          VIEW RAW LOCATION DATA
        </summary>

        <pre>${escapeHTML(
          JSON.stringify(
            location,
            null,
            2
          )
        )}</pre>

      </details>

    </article>
  `;
}


/* =========================================================
   RENDER FILE SERVERS
   ========================================================= */

function renderFileServers(
  servers
) {

  if (!servers.length) {
    return "";
  }

  return `
    <section class="rt-profile-section">

      <div class="rt-group-location-heading">

        <div class="rt-group-location-heading-title">
          FILE SERVERS
        </div>

        <div class="rt-group-location-heading-count">
          ${servers.length}
        </div>

      </div>

      <div class="rt-group-locations">

        ${servers.map(
          (server, index) =>
            renderLocationCard(
              server,
              index
            )
        ).join("")}

      </div>

    </section>
  `;
}


/* =========================================================
   RENDER GROUP SUMMARY
   ========================================================= */

function renderGroupSummary(
  group
) {

  const locations =
    collectLocationRecords(
      group
    );

  const posts =
    collectPosts(
      group
    );

  const servers =
    collectFileServers(
      group
    );

  const parser =
    firstValue(
      group,
      [
        "parser",
        "parsing",
        "parse",
        "parser_enabled"
      ]
    );

  const crypto =
    firstValue(
      group,
      [
        "crypto",
        "crypto_count",
        "cryptocurrency"
      ]
    );

  const description =
    firstValue(
      group,
      [
        "description",
        "desc",
        "bio"
      ]
    );

  const lastPost =
    posts.length
      ? posts
          .map(
            getPostDate
          )
          .filter(Boolean)
          .sort(
            (a, b) =>
              new Date(b) -
              new Date(a)
          )[0]
      : "";

  return `
    <div class="rt-group-summary">

      <div class="rt-group-summary-card">

        <div class="rt-group-summary-label">
          POSTS
        </div>

        <div class="rt-group-summary-value">
          ${posts.length || "—"}
        </div>

      </div>

      <div class="rt-group-summary-card">

        <div class="rt-group-summary-label">
          URLS
        </div>

        <div class="rt-group-summary-value">
          ${locations.length || "—"}
        </div>

      </div>

      <div class="rt-group-summary-card">

        <div class="rt-group-summary-label">
          FILE SERVERS
        </div>

        <div class="rt-group-summary-value">
          ${servers.length || "—"}
        </div>

      </div>

      <div class="rt-group-summary-card">

        <div class="rt-group-summary-label">
          PARSING
        </div>

        <div class="rt-group-summary-value">
          ${
            parser === true ||
            String(parser).toLowerCase() ===
              "enabled"
              ? "ENABLED"
              : parser
                ? String(parser).toUpperCase()
                : "—"
          }
        </div>

      </div>

      ${
        crypto
          ? `
            <div class="rt-group-summary-card">

              <div class="rt-group-summary-label">
                CRYPTO
              </div>

              <div class="rt-group-summary-value">
                ${escapeHTML(crypto)}
              </div>

            </div>
          `
          : ""
      }

      ${
        lastPost
          ? `
            <div class="rt-group-summary-card">

              <div class="rt-group-summary-label">
                LAST POST
              </div>

              <div class="rt-group-summary-value">
                ${formatDate(lastPost)}
              </div>

            </div>
          `
          : ""
      }

    </div>

    ${
      description
        ? `
          <section class="rt-profile-section">

            <div class="rt-profile-section-title">
              DESCRIPTION
            </div>

            <div class="rt-group-profile-note">
              ${escapeHTML(description)}
            </div>

          </section>
        `
        : ""
    }
  `;
}


/* =========================================================
   RENDER GROUP POSTS
   ========================================================= */

function renderGroupPosts(
  group
) {

  const posts =
    collectPosts(
      group
    );

  if (!posts.length) {
    return "";
  }

  const limitedPosts =
    posts.slice(0, 50);

  return `
    <section class="rt-profile-section">

      <div class="rt-group-location-heading">

        <div class="rt-group-location-heading-title">
          ACTIVITY
        </div>

        <div class="rt-group-location-heading-count">
          ${posts.length}
        </div>

      </div>

      <div class="rt-group-posts">

        ${limitedPosts.map(
          post => {

            const title =
              getPostTitle(
                post
              );

            const date =
              getPostDate(
                post
              );

            const description =
              firstValue(
                post,
                [
                  "description",
                  "content",
                  "text",
                  "body"
                ]
              );

            return `
              <article class="rt-result">

                <div class="rt-result-type">
                  POST
                </div>

                <div>

                  <h3 class="rt-result-title">
                    ${escapeHTML(title)}
                  </h3>

                  <div class="rt-result-meta">
                    ${escapeHTML(
                      description
                        ? String(description)
                            .slice(0, 220)
                        : "OBSERVED ACTIVITY"
                    )}
                  </div>

                </div>

                <div class="rt-result-date">
                  ${formatDate(date)}
                </div>

              </article>
            `;
          }
        ).join("")}

      </div>

    </section>
  `;
}


/* =========================================================
   RENDER GROUP PROFILE
   ========================================================= */

function renderGroupProfile(
  group
) {

  const locations =
    collectLocationRecords(
      group
    );

  const servers =
    collectFileServers(
      group
    );

  const groupObject =
    Array.isArray(group)
      ? group[0]
      : group;

  return `
    <div class="rt-profile">

      <div class="rt-profile-header">

        <div class="rt-detail-type">
          RANSOMWARE GROUP
        </div>

        <h2 class="rt-profile-title">
          ${escapeHTML(
            getObjectName(
              groupObject
            )
          )}
        </h2>

        <div class="rt-profile-subtitle">
          REMNANTTRACE INTELLIGENCE PROFILE
        </div>

      </div>

      <div class="rt-profile-content">

        ${renderGroupSummary(
          group
        )}

        <section class="rt-profile-section">

          <div class="rt-group-location-heading">

            <div class="rt-group-location-heading-title">
              INFRASTRUCTURE
            </div>

            <div class="rt-group-location-heading-count">
              ${locations.length}
            </div>

          </div>

          ${
            locations.length
              ? `
                <div class="rt-group-locations">

                  ${locations.map(
                    (record, index) =>
                      renderLocationCard(
                        record.object,
                        index
                      )
                  ).join("")}

                </div>
              `
              : `
                <div class="rt-empty">
                  No infrastructure records were returned.
                </div>
              `
          }

        </section>

        ${renderFileServers(
          servers
        )}

        ${renderGroupPosts(
          group
        )}

        <section class="rt-profile-section">

          <div class="rt-profile-section-title">
            RAW RANSOMLOOK RECORD
          </div>

          <details class="rt-location-extra">

            <summary>
              VIEW COMPLETE RETURNED DATA
            </summary>

            <pre>${escapeHTML(
              JSON.stringify(
                group,
                null,
                2
              )
            )}</pre>

          </details>

        </section>

        <div class="rt-profile-source">

          DATA SOURCE

          <p>
            Open ransomware intelligence.
            Data is presented through the
            RemnantTrace research interface
            and remains subject to the source's
            availability and collection methodology.
          </p>

        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   GROUP PROFILE
   ========================================================= */

async function showGroupProfile(
  group
) {

  const groupName =
    getObjectName(
      group
    );

  openProfileLoading(
    "RANSOMWARE GROUP",
    groupName
  );

  try {

    /*
      IMPORTANT:
      We do NOT use the groups-list object
      as the final profile.

      We make a second request to:

          /api/group/{name}

      This retrieves the detailed group record,
      including nested locations.
    */

    const detailedData =
      await rtFetch(
        "group",
        groupName
      );

    currentProfile =
      detailedData;

    detailContent.innerHTML =
      renderGroupProfile(
        detailedData
      );

    detail.hidden = false;

    detail.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {

    console.error(
      "Group profile error:",
      error
    );

    detailContent.innerHTML = `
      <div class="rt-profile-error">

        <strong>
          GROUP PROFILE REQUEST FAILED
        </strong>

        <p>
          ${escapeHTML(
            error.message ||
            error
          )}
        </p>

      </div>
    `;
  }
}


/* =========================================================
   ACTOR PROFILE
   ========================================================= */

function showActorProfile(
  actor
) {
  openProfileView(
    "THREAT ACTOR",
    actor
  );
}


/* =========================================================
   MARKET PROFILE
   ========================================================= */

function showMarketProfile(
  market
) {
  openProfileView(
    "MARKET",
    market
  );
}


/* =========================================================
   GENERIC PROFILE VIEW
   ========================================================= */

function openProfileView(
  type,
  item
) {

  currentProfileType =
    type;

  currentProfile =
    item;

  results.style.display =
    "none";

  document
    .querySelector(
      ".rt-results-heading"
    )
    .style.display =
    "none";

  document
    .querySelector(
      ".rt-filters"
    )
    .style.display =
    "none";

  detail.hidden =
    false;

  detailContent.innerHTML = `
    <div class="rt-profile">

      <div class="rt-profile-header">

        <div class="rt-detail-type">
          ${escapeHTML(type)}
        </div>

        <h2 class="rt-profile-title">
          ${escapeHTML(
            getObjectName(item)
          )}
        </h2>

        <div class="rt-profile-subtitle">
          REMNANTTRACE INTELLIGENCE PROFILE
        </div>

      </div>

      <div class="rt-profile-content">

        ${renderProfileFields(
          item
        )}

      </div>

    </div>
  `;

  detail.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


/* =========================================================
   PROFILE LOADING
   ========================================================= */

function openProfileLoading(
  type,
  name
) {

  results.style.display =
    "none";

  document
    .querySelector(
      ".rt-results-heading"
    )
    .style.display =
    "none";

  document
    .querySelector(
      ".rt-filters"
    )
    .style.display =
    "none";

  detail.hidden =
    false;

  detailContent.innerHTML = `
    <div class="rt-profile">

      <div class="rt-profile-header">

        <div class="rt-detail-type">
          ${escapeHTML(type)}
        </div>

        <h2 class="rt-profile-title">
          ${escapeHTML(name)}
        </h2>

        <div class="rt-profile-subtitle">
          LOADING RANSOMLOOK PROFILE
        </div>

      </div>

      <div class="rt-profile-content">

        <div class="rt-profile-loading">
          QUERYING GROUP INFRASTRUCTURE...
        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   CLOSE PROFILE
   ========================================================= */

function closeProfile() {

  detail.hidden =
    true;

  detailContent.innerHTML =
    "";

  results.style.display =
    "";

  document
    .querySelector(
      ".rt-results-heading"
    )
    .style.display =
    "";

  document
    .querySelector(
      ".rt-filters"
    )
    .style.display =
    "";

  const wrapper =
    document.querySelector(
      ".rt-results-wrapper"
    );

  if (wrapper) {

    window.scrollTo({
      top:
        wrapper.offsetTop -
        100,
      behavior:
        "smooth"
    });

  }
}


/* =========================================================
   FILTERS
   ========================================================= */

filters.forEach(
  filter => {

    filter.addEventListener(
      "click",
      async () => {

        filters.forEach(
          button =>
            button.classList.remove(
              "active"
            )
        );

        filter.classList.add(
          "active"
        );

        closeProfile();

        const type =
          filter.dataset.type;

        if (
          type === "all" ||
          type === "posts"
        ) {

          await loadRecent();

          return;
        }

        showLoading();

        try {

          const data =
            await rtFetch(
              type
            );

          renderNameList(
            normalizeArray(
              data
            ),
            type.toUpperCase()
          );

        } catch (error) {

          console.error(
            "Category error:",
            error
          );

          showError(
            error
          );
        }

      }
    );

  }
);


/* =========================================================
   BACK BUTTON
   ========================================================= */

backButton.addEventListener(
  "click",
  () => {
    closeProfile();
  }
);


/* =========================================================
   SEARCH BUTTON
   ========================================================= */

searchButton.addEventListener(
  "click",
  performSearch
);


/* =========================================================
   ENTER KEY
   ========================================================= */

searchInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Enter"
    ) {

      event.preventDefault();

      performSearch();
    }

  }
);


/* =========================================================
   INITIAL LOAD
   ========================================================= */

loadRecent();

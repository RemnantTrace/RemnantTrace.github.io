/* =========================================================
   REMNANTTRACE INTELLIGENCE
   RansomLook interface
   ========================================================= */

const RT_PROXY =
  "https://script.google.com/macros/s/AKfycbwE_8EVl8qOTHCLvRLIUsGXeW530hQ1tLrftGLO5xARuQn8TYxLIBNGxuyne6rR0pYcNw/exec";


/* =========================================================
   ELEMENTS
   ========================================================= */

const searchInput =
  document.getElementById("rt-search");

const searchButton =
  document.getElementById("rt-search-button");

const results =
  document.getElementById("rt-results");

const resultsTitle =
  document.getElementById("rt-results-title");

const resultsCount =
  document.getElementById("rt-results-count");

const detail =
  document.getElementById("rt-detail");

const detailContent =
  document.getElementById("rt-detail-content");

const backButton =
  document.getElementById("rt-back");

const filters =
  document.querySelectorAll(".rt-filter");


/* =========================================================
   STATE
   ========================================================= */

let currentResults = [];

let currentView = "posts";

let currentProfileType = "";

let currentProfile = null;


/* =========================================================
   HTML ESCAPING
   ========================================================= */

function escapeHTML(value) {

  if (
    value === null ||
    value === undefined
  ) {
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
   SAFE URL
   ========================================================= */

function safeURL(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const url =
    String(value).trim();

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  return "";
}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(value) {

  if (!value) {
    return "DATE UNKNOWN";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return escapeHTML(value);
  }

  return date.toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


/* =========================================================
   SHORT DATE
   ========================================================= */

function formatShortDate(value) {

  if (!value) {
    return "UNKNOWN";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return escapeHTML(value);
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric"
    }
  );
}


/* =========================================================
   API REQUEST
   ========================================================= */

function rtFetch(
  action,
  query = ""
) {

  return new Promise(
    (resolve, reject) => {

      const callbackName =
        "rt_" +
        Date.now() +
        "_" +
        Math.random()
          .toString(36)
          .slice(2);

      const script =
        document.createElement(
          "script"
        );

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
          script.parentNode
            .removeChild(script);
        }

        try {

          delete window[
            callbackName
          ];

        } catch (error) {

          window[
            callbackName
          ] = undefined;

        }
      }


      window[
        callbackName
      ] = function(data) {

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
            new Error(
              data.error
            )
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


      document.body.appendChild(
        script
      );

    }
  );
}


/* =========================================================
   NORMALIZE API RESPONSE
   ========================================================= */

function normalizeArray(data) {

  if (
    Array.isArray(data)
  ) {
    return data;
  }


  if (
    data &&
    Array.isArray(
      data.results
    )
  ) {
    return data.results;
  }


  if (
    data &&
    Array.isArray(
      data.posts
    )
  ) {
    return data.posts;
  }


  if (
    data &&
    Array.isArray(
      data.groups
    )
  ) {
    return data.groups;
  }


  if (
    data &&
    Array.isArray(
      data.actors
    )
  ) {
    return data.actors;
  }


  if (
    data &&
    Array.isArray(
      data.markets
    )
  ) {
    return data.markets;
  }


  return [];
}


/* =========================================================
   GET OBJECT NAME
   ========================================================= */

function getObjectName(item) {

  if (
    typeof item === "string"
  ) {
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

  if (
    typeof post === "string"
  ) {
    return post;
  }


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
   LOADING
   ========================================================= */

function showLoading() {

  results.innerHTML =
    `<div class="rt-loading">
      QUERYING INTELLIGENCE...
    </div>`;

  resultsCount.textContent =
    "";

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


  resultsCount.textContent =
    "";

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

  currentView =
    "posts";


  showLoading();


  resultsTitle.textContent =
    "RECENT ACTIVITY";


  try {

    const data =
      await rtFetch(
        "recent"
      );


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


  if (
    query.length < 2
  ) {

    showEmpty(
      "Enter at least two characters."
    );

    return;

  }


  currentView =
    "search";


  showLoading();


  resultsTitle.textContent =
    "SEARCH / " +
    query;


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
    posts
      .map(
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
      )
      .join("");


  document
    .querySelectorAll(
      ".rt-result"
    )
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
    document.createElement(
      "div"
    );


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

  currentResults =
    items;

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
    items
      .map(
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
      )
      .join("");


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

            showGroupProfile(
              item,
              card
            );

          } else if (
            currentProfileType ===
            "ACTORS"
          ) {

            showActorProfile(
              item
            );

          } else if (
            currentProfileType ===
            "MARKETS"
          ) {

            showMarketProfile(
              item
            );

          }

        }
      );

    });

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


  const heading =
    document.querySelector(
      ".rt-results-heading"
    );


  if (heading) {
    heading.style.display =
      "none";
  }


  const filterContainer =
    document.querySelector(
      ".rt-filters"
    );


  if (filterContainer) {
    filterContainer.style.display =
      "none";
  }


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

        ${renderProfileFields(item)}

      </div>

    </div>

  `;


  detail.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


/* =========================================================
   GENERIC PROFILE FIELDS
   ========================================================= */

function renderProfileFields(item) {

  if (
    typeof item === "string"
  ) {

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

    "marketName"

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

        ${

          fields
            .map(
              ([key, value]) => {

                const label =
                  key
                    .replace(
                      /_/g,
                      " "
                    )
                    .replace(
                      /\b\w/g,
                      char =>
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
            )
            .join("")

        }

      </div>

    </div>

  `;

}


/* =========================================================
   GROUP PROFILE
   ========================================================= */

async function showGroupProfile(
  group,
  resultElement
) {

  const groupName =
    getObjectName(group);


  currentProfileType =
    "RANSOMWARE GROUP";

  currentProfile =
    group;


  /*
   * Keep the GROUP result visible and
   * create an expandable detail panel
   * directly underneath it.
   */

  document
    .querySelectorAll(
      ".rt-group-inline-detail"
    )
    .forEach(
      element =>
        element.remove()
    );


  const inlineDetail =
    document.createElement(
      "div"
    );


  inlineDetail.className =
    "rt-group-inline-detail";


  inlineDetail.innerHTML = `

    <div class="rt-profile">

      <div class="rt-profile-header">

        <div class="rt-detail-type">
          RANSOMWARE GROUP
        </div>

        <h2 class="rt-profile-title">
          ${escapeHTML(groupName)}
        </h2>

        <div class="rt-profile-subtitle">
          RANSOMLOOK GROUP PROFILE
        </div>

      </div>

      <div class="rt-profile-content">

        <div class="rt-profile-loading">
          LOADING GROUP INTELLIGENCE...
        </div>

      </div>

    </div>

  `;


  if (resultElement) {

    resultElement.insertAdjacentElement(
      "afterend",
      inlineDetail
    );

  } else {

    results.appendChild(
      inlineDetail
    );

  }


  inlineDetail.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });


  try {

    /*
     * Fetch the actual RansomLook
     * group-specific record.
     */

    const data =
      await rtFetch(
        "group",
        groupName
      );


    /*
     * Render the RansomLook-style
     * group profile.
     */

    const profileHTML =
      renderGroupProfile(
        groupName,
        group,
        data
      );


    const content =
      inlineDetail.querySelector(
        ".rt-profile-content"
      );


    if (content) {

      content.innerHTML =
        profileHTML;

    }


  } catch (error) {

    console.error(
      "Group profile error:",
      error
    );


    const content =
      inlineDetail.querySelector(
        ".rt-profile-content"
      );


    if (content) {

      content.innerHTML = `

        <div class="rt-profile-error">

          <strong>
            GROUP PROFILE REQUEST FAILED
          </strong>

          <br><br>

          ${escapeHTML(
            error.message ||
            error
          )}

          <br><br>

          The group itself was found in
          the RansomLook group index, but
          its detailed infrastructure record
          could not be retrieved.

        </div>

      `;

    }

  }

}


/* =========================================================
   GROUP PROFILE DATA HELPERS
   ========================================================= */

function getFirstValue(
  object,
  keys,
  fallback = ""
) {

  if (
    !object ||
    typeof object !== "object"
  ) {
    return fallback;
  }


  for (
    const key of keys
  ) {

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
   FIND GROUP LOCATIONS
   ========================================================= */

function getGroupLocations(
  data
) {

  if (
    Array.isArray(data)
  ) {

    return data;

  }


  if (
    data &&
    Array.isArray(
      data.locations
    )
  ) {

    return data.locations;

  }


  if (
    data &&
    Array.isArray(
      data.urls
    )
  ) {

    return data.urls;

  }


  if (
    data &&
    Array.isArray(
      data.mirrors
    )
  ) {

    return data.mirrors;

  }


  if (
    data &&
    Array.isArray(
      data.location
    )
  ) {

    return data.location;

  }


  return [];

}


/* =========================================================
   FIND FILE SERVERS
   ========================================================= */

function getFileServers(
  data
) {

  if (!data) {
    return [];
  }


  if (
    Array.isArray(
      data.file_servers
    )
  ) {

    return data.file_servers;

  }


  if (
    Array.isArray(
      data.fileservers
    )
  ) {

    return data.fileservers;

  }


  if (
    Array.isArray(
      data.fileServers
    )
  ) {

    return data.fileServers;

  }


  if (
    data &&
    Array.isArray(
      data.files
    )
  ) {

    return data.files;

  }


  return [];

}


/* =========================================================
   LOCATION URL
   ========================================================= */

function getLocationURL(
  location
) {

  if (
    typeof location === "string"
  ) {

    return location;

  }


  if (!location) {
    return "";
  }


  return getFirstValue(
    location,
    [
      "url",
      "uri",
      "link",
      "address",
      "location",
      "site"
    ],
    ""
  );

}


/* =========================================================
   LOCATION STATUS
   ========================================================= */

function getLocationStatus(
  location
) {

  if (
    typeof location === "string"
  ) {

    return "";

  }


  if (!location) {
    return "";
  }


  const explicitStatus =
    getFirstValue(
      location,
      [
        "status",
        "state"
      ],
      ""
    );


  if (explicitStatus) {
    return String(
      explicitStatus
    );
  }


  const available =
    getFirstValue(
      location,
      [
        "available",
        "up",
        "online"
      ],
      null
    );


  if (
    available === true ||
    available === 1 ||
    available === "true"
  ) {

    return "Up";

  }


  if (
    available === false ||
    available === 0 ||
    available === "false"
  ) {

    return "Down";

  }


  return "Unknown";

}


/* =========================================================
   LOCATION UPTIME
   ========================================================= */

function getLocationUptime(
  location
) {

  if (
    typeof location === "string"
  ) {

    return "";

  }


  if (!location) {
    return "";
  }


  const value =
    getFirstValue(
      location,
      [
        "uptime30d",
        "uptime_30d",
        "uptime_30",
        "uptime30",
        "uptime",
        "availability"
      ],
      ""
    );


  if (
    typeof value === "number"
  ) {

    return (
      value <= 1
        ? Math.round(value * 100) + "%"
        : Math.round(value) + "%"
    );

  }


  return String(value);

}


/* =========================================================
   LOCATION HEALTH
   ========================================================= */

function getLocationHealth(
  location
) {

  if (
    typeof location === "string"
  ) {

    return "";

  }


  if (!location) {
    return "";
  }


  return getFirstValue(
    location,
    [
      "health",
      "health_score",
      "healthScore",
      "score"
    ],
    ""
  );

}


/* =========================================================
   LOCATION SCREEN
   ========================================================= */

function getLocationScreen(
  location
) {

  if (
    typeof location === "string"
  ) {

    return "";

  }


  if (!location) {
    return "";
  }


  return getFirstValue(
    location,
    [
      "screen",
      "screenshot",
      "screenshot_url",
      "screenshotUrl",
      "image"
    ],
    ""
  );

}


/* =========================================================
   SCREENSHOT HTML
   ========================================================= */

function renderScreen(
  screen,
  index
) {

  if (!screen) {
    return "";
  }


  const value =
    String(screen);


  /*
   * Direct image URL
   */

  if (
    value.startsWith(
      "http://"
    ) ||
    value.startsWith(
      "https://"
    )
  ) {

    return `

      <div class="rt-location-screen">

        <div class="rt-detail-field-label">
          SCREEN
        </div>

        <button
          type="button"
          class="rt-screen-toggle"
          onclick="this.nextElementSibling.hidden = !this.nextElementSibling.hidden"
        >
          VIEW SCREENSHOT
        </button>

        <div
          class="rt-screen-frame"
          hidden
        >

          <img
            src="${escapeHTML(value)}"
            alt="RansomLook screenshot ${index + 1}"
            loading="lazy"
          >

        </div>

      </div>

    `;

  }


  /*
   * Data URI
   */

  if (
    value.startsWith(
      "data:image/"
    )
  ) {

    return `

      <div class="rt-location-screen">

        <div class="rt-detail-field-label">
          SCREEN
        </div>

        <button
          type="button"
          class="rt-screen-toggle"
          onclick="this.nextElementSibling.hidden = !this.nextElementSibling.hidden"
        >
          VIEW SCREENSHOT
        </button>

        <div
          class="rt-screen-frame"
          hidden
        >

          <img
            src="${escapeHTML(value)}"
            alt="RansomLook screenshot ${index + 1}"
            loading="lazy"
          >

        </div>

      </div>

    `;

  }


  /*
   * Base64 image
   */

  if (
    /^[A-Za-z0-9+/=\s]+$/.test(
      value
    ) &&
    value.length > 100
  ) {

    const imageData =
      "data:image/png;base64," +
      value.replace(
        /\s/g,
        ""
      );


    return `

      <div class="rt-location-screen">

        <div class="rt-detail-field-label">
          SCREEN
        </div>

        <button
          type="button"
          class="rt-screen-toggle"
          onclick="this.nextElementSibling.hidden = !this.nextElementSibling.hidden"
        >
          VIEW SCREENSHOT
        </button>

        <div
          class="rt-screen-frame"
          hidden
        >

          <img
            src="${imageData}"
            alt="RansomLook screenshot ${index + 1}"
            loading="lazy"
          >

        </div>

      </div>

    `;

  }


  return `

    <div class="rt-location-screen">

      <div class="rt-detail-field-label">
        SCREEN
      </div>

      <div class="rt-detail-field-value">
        ${escapeHTML(value)}
      </div>

    </div>

  `;

}


/* =========================================================
   STATUS CLASS
   ========================================================= */

function getStatusClass(
  status
) {

  const normalized =
    String(
      status || ""
    ).toLowerCase();


  if (
    normalized === "up" ||
    normalized === "online" ||
    normalized === "available" ||
    normalized === "true"
  ) {

    return "rt-status-up";

  }


  if (
    normalized === "down" ||
    normalized === "offline" ||
    normalized === "unavailable" ||
    normalized === "false"
  ) {

    return "rt-status-down";

  }


  return "";

}


/* =========================================================
   LOCATION CARD
   ========================================================= */

function renderLocationCard(
  location,
  index,
  label = "URL"
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


  const screen =
    getLocationScreen(
      location
    );


  const statusClass =
    getStatusClass(
      status
    );


  const safeHref =
    safeURL(url);


  const urlHTML =
    safeHref
      ? `
        <a
          class="rt-location-url"
          href="${escapeHTML(safeHref)}"
          target="_blank"
          rel="noopener noreferrer"
        >

          <span>
            ↗
          </span>

          <strong>
            ${escapeHTML(url)}
          </strong>

        </a>
      `
      : `
        <div class="rt-location-url">

          <strong>
            ${escapeHTML(
              url || "URL NOT AVAILABLE"
            )}
          </strong>

        </div>
      `;


  return `

    <div class="rt-location-card">

      <div class="rt-location-top">

        <div>

          <div class="rt-location-index">
            ${escapeHTML(label)}
            ${String(index + 1).padStart(2, "0")}
          </div>

          <h4 class="rt-location-title">
            ${
              url
                ? escapeHTML(url)
                : "UNKNOWN LOCATION"
            }
          </h4>

        </div>


        <div
          class="rt-location-status ${statusClass}"
        >

          <span
            class="rt-location-status-dot"
          ></span>

          ${escapeHTML(
            status || "UNKNOWN"
          )}

        </div>

      </div>


      <div class="rt-location-url-block">

        <span class="rt-location-url-type">
          MONITORED LOCATION
        </span>

        ${urlHTML}

      </div>


      <div class="rt-location-grid">

        <div class="rt-detail-field">

          <div class="rt-detail-field-label">
            STATUS
          </div>

          <div class="rt-detail-field-value">
            ${escapeHTML(
              status || "UNKNOWN"
            )}
          </div>

        </div>


        <div class="rt-detail-field">

          <div class="rt-detail-field-label">
            UPTIME 30D
          </div>

          <div class="rt-detail-field-value">
            ${escapeHTML(
              uptime || "—"
            )}
          </div>

        </div>


        <div class="rt-detail-field">

          <div class="rt-detail-field-label">
            HEALTH
          </div>

          <div class="rt-detail-field-value">
            ${escapeHTML(
              health || "—"
            )}
          </div>

        </div>


        <div class="rt-detail-field">

          <div class="rt-detail-field-label">
            SCREEN
          </div>

          <div class="rt-detail-field-value">
            ${
              screen
                ? "AVAILABLE"
                : "—"
            }
          </div>

        </div>

      </div>


      ${
        screen
          ? renderScreen(
              screen,
              index
            )
          : ""
      }

    </div>

  `;

}


/* =========================================================
   SUMMARY VALUE
   ========================================================= */

function getSummaryValue(
  data,
  keys,
  fallback = "—"
) {

  const value =
    getFirstValue(
      data,
      keys,
      ""
    );


  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {

    return fallback;

  }


  return value;

}


/* =========================================================
   FORMAT PERCENT
   ========================================================= */

function formatPercent(
  value
) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {

    return "—";

  }


  if (
    typeof value === "number"
  ) {

    return (
      value <= 1
        ? Math.round(value * 100) + "%"
        : Math.round(value) + "%"
    );

  }


  const text =
    String(value);


  if (
    text.includes("%")
  ) {

    return text;

  }


  const number =
    Number(text);


  if (
    !Number.isNaN(number)
  ) {

    return (
      number <= 1
        ? Math.round(number * 100) + "%"
        : Math.round(number) + "%"
    );

  }


  return text;

}


/* =========================================================
   GROUP SUMMARY
   ========================================================= */

function renderGroupSummary(
  data,
  locations
) {

  const allPosts =
    getSummaryValue(
      data,
      [
        "posts",
        "post_count",
        "posts_count",
        "total_posts",
        "posts_all_time",
        "postsAllTime"
      ]
    );


  const last30 =
    getSummaryValue(
      data,
      [
        "last30",
        "last_30",
        "posts_last30",
        "posts_last_30",
        "last_30_days",
        "posts30"
      ]
    );


  const last7 =
    getSummaryValue(
      data,
      [
        "last7",
        "last_7",
        "posts_last7",
        "posts_last_7",
        "last_7_days",
        "posts7"
      ]
    );


  const uptime =
    getFirstValue(
      data,
      [
        "uptime30d",
        "uptime_30d",
        "avg_uptime_30d",
        "average_uptime_30d",
        "uptime"
      ],
      ""
    );


  const parser =
    getFirstValue(
      data,
      [
        "parser",
        "parsing",
        "parser_status",
        "parsing_status"
      ],
      ""
    );


  const urlCount =
    getFirstValue(
      data,
      [
        "urls_count",
        "url_count",
        "urls",
        "locations_count"
      ],
      locations.length
    );


  return `

    <div class="rt-group-summary">

      <div class="rt-group-summary-card">

        <div class="rt-group-summary-label">
          POSTS / ALL TIME
        </div>

        <div class="rt-group-summary-value">
          ${escapeHTML(
            allPosts
          )}
        </div>

      </div>


      <div class="rt-group-summary-card">

        <div class="rt-group-summary-label">
          LAST 30 DAYS
        </div>

        <div class="rt-group-summary-value">
          ${escapeHTML(
            last30
          )}
        </div>

      </div>


      <div class="rt-group-summary-card">

        <div class="rt-group-summary-label">
          LAST 7 DAYS
        </div>

        <div class="rt-group-summary-value">
          ${escapeHTML(
            last7
          )}
        </div>

      </div>


      <div class="rt-group-summary-card">

        <div class="rt-group-summary-label">
          AVG UPTIME 30D
        </div>

        <div class="rt-group-summary-value rt-positive">
          ${escapeHTML(
            formatPercent(
              uptime
            )
          )}
        </div>

      </div>


      <div class="rt-group-summary-card">

        <div class="rt-group-summary-label">
          PARSING
        </div>

        <div class="rt-group-summary-value">
          ${escapeHTML(
            parser || "—"
          )}
        </div>

      </div>


      <div class="rt-group-summary-card">

        <div class="rt-group-summary-label">
          URLS
        </div>

        <div class="rt-group-summary-value">
          ${escapeHTML(
            urlCount
          )}
        </div>

      </div>

    </div>

  `;

}


/* =========================================================
   GROUP CONTACT / DESCRIPTION
   ========================================================= */

function renderGroupMetadata(
  data
) {

  if (!data) {
    return "";
  }


  const description =
    getFirstValue(
      data,
      [
        "description",
        "desc",
        "about"
      ],
      ""
    );


  const mail =
    getFirstValue(
      data,
      [
        "mail",
        "email",
        "contact",
        "contact_email"
      ],
      ""
    );


  const pgp =
    getFirstValue(
      data,
      [
        "pgp",
        "pgp_key",
        "pgpKey"
      ],
      ""
    );


  if (
    !description &&
    !mail &&
    !pgp
  ) {

    return "";

  }


  return `

    <div class="rt-profile-section">

      <div class="rt-profile-section-title">
        GROUP INFORMATION
      </div>


      <div class="rt-profile-grid">

        ${
          description
            ? `
              <div class="rt-detail-field">

                <div class="rt-detail-field-label">
                  DESCRIPTION
                </div>

                <div class="rt-detail-field-value">
                  ${escapeHTML(
                    description
                  )}
                </div>

              </div>
            `
            : ""
        }


        ${
          mail
            ? `
              <div class="rt-detail-field">

                <div class="rt-detail-field-label">
                  MAIL
                </div>

                <div class="rt-detail-field-value">
                  ${escapeHTML(
                    mail
                  )}
                </div>

              </div>
            `
            : ""
        }


        ${
          pgp
            ? `
              <div
                class="rt-detail-field"
                style="grid-column:1/-1;"
              >

                <div class="rt-detail-field-label">
                  PGP
                </div>

                <div
                  class="rt-detail-field-value"
                  style="font-family:'Space Mono',monospace;font-size:10px;"
                >
                  ${escapeHTML(
                    pgp
                  )}
                </div>

              </div>
            `
            : ""
        }

      </div>

    </div>

  `;

}


/* =========================================================
   GROUP LAST POST
   ========================================================= */

function renderLastPost(
  data
) {

  if (!data) {
    return "";
  }


  const lastPost =
    getFirstValue(
      data,
      [
        "last_post",
        "lastPost",
        "lastpost",
        "last_post_date",
        "lastPostDate"
      ],
      ""
    );


  if (!lastPost) {
    return "";
  }


  return `

    <div class="rt-profile-section">

      <div class="rt-profile-section-title">
        ACTIVITY
      </div>

      <div class="rt-detail-field">

        <div class="rt-detail-field-label">
          LAST POST
        </div>

        <div class="rt-detail-field-value">
          ${formatDate(lastPost)}
        </div>

      </div>

    </div>

  `;

}


/* =========================================================
   GROUP PROFILE SOURCE
   ========================================================= */

function renderGroupSource(
  groupName
) {

  const url =
    "https://www.ransomlook.io/group/" +
    encodeURIComponent(
      groupName
    );


  return `

    <a
      class="rt-profile-source"
      href="${escapeHTML(url)}"
      target="_blank"
      rel="noopener noreferrer"
    >

      VIEW SOURCE PROFILE ↗

    </a>

  `;

}


/* =========================================================
   GROUP PROFILE RENDERER
   ========================================================= */

function renderGroupProfile(
  groupName,
  originalGroup,
  data
) {

  /*
   * Some RansomLook responses return
   * the detail object directly.
   *
   * Others may wrap the actual group
   * record inside "group" or "data".
   */

  let profile =
    data;


  if (
    data &&
    data.group &&
    typeof data.group === "object"
  ) {

    profile =
      data.group;

  }


  if (
    data &&
    data.data &&
    typeof data.data === "object"
  ) {

    profile =
      data.data;

  }


  const locations =
    getGroupLocations(
      profile
    );


  const fileServers =
    getFileServers(
      profile
    );


  /*
   * If the endpoint returns only
   * locations as the top-level array,
   * use the original data as the location
   * response.
   */

  const summarySource =
    Array.isArray(data)
      ? {}
      : profile || {};


  return `

    ${renderGroupSummary(
      summarySource,
      locations
    )}


    <div class="rt-group-profile-note">

      DATA SOURCE /
      RANSOMLOOK GROUP INTELLIGENCE

      <br>

      This profile reflects publicly available. 
      Availability, uptime, screenshots, and 
      observed posts can change as the source is updated.

    </div>


    ${renderGroupMetadata(
      summarySource
    )}


    ${renderLastPost(
      summarySource
    )}


    <div class="rt-profile-section">

      <div class="rt-group-location-heading">

        <div class="rt-group-location-heading-title">
          URLS
        </div>

        <div class="rt-group-location-heading-count">
          ${locations.length} MONITORED
        </div>

      </div>


      ${
        locations.length
          ? `
            <div class="rt-group-locations">

              ${

                locations
                  .map(
                    (location, index) =>
                      renderLocationCard(
                        location,
                        index,
                        "URL"
                      )
                  )
                  .join("")

              }

            </div>
          `
          : `
            <div class="rt-empty">
              No URL infrastructure records
              were returned for this group.
            </div>
          `
      }

    </div>


    ${
      fileServers.length
        ? `

          <div class="rt-profile-section">

            <div class="rt-group-location-heading">

              <div class="rt-group-location-heading-title">
                FILE SERVERS
              </div>

              <div class="rt-group-location-heading-count">
                ${fileServers.length} MONITORED
              </div>

            </div>


            <div class="rt-group-locations">

              ${

                fileServers
                  .map(
                    (server, index) =>
                      renderLocationCard(
                        server,
                        index,
                        "FILE SERVER"
                      )
                  )
                  .join("")

              }

            </div>

          </div>

        `
        : ""
    }


    ${renderGroupSource(
      groupName
    )}

  `;

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
   CLOSE PROFILE
   ========================================================= */

function closeProfile() {

  detail.hidden =
    true;


  detailContent.innerHTML =
    "";


  results.style.display =
    "";


  const heading =
    document.querySelector(
      ".rt-results-heading"
    );


  if (heading) {

    heading.style.display =
      "";

  }


  const filterContainer =
    document.querySelector(
      ".rt-filters"
    );


  if (filterContainer) {

    filterContainer.style.display =
      "";

  }


  const wrapper =
    document.querySelector(
      ".rt-results-wrapper"
    );


  if (wrapper) {

    window.scrollTo({

      top:
        wrapper.offsetTop - 100,

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
            normalizeArray(data),
            type.toUpperCase()
          );


        } catch (error) {

          console.error(
            "Category error:",
            error
          );

          showError(error);

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
      event.key === "Enter"
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

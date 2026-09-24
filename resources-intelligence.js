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
        document.createElement("script");


      let finished = false;


      const timeout =
        setTimeout(
          () => {

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

          },
          20000
        );


      function cleanup() {

        clearTimeout(timeout);

        if (
          script &&
          script.parentNode
        ) {

          script.parentNode.removeChild(
            script
          );

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
        encodeURIComponent(
          action
        ) +
        "&prefix=" +
        encodeURIComponent(
          callbackName
        );


      if (query) {

        url +=
          "&q=" +
          encodeURIComponent(
            query
          );

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

  results.innerHTML = `
    <div class="rt-loading">
      QUERYING INTELLIGENCE...
    </div>
  `;

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

  results.innerHTML = `
    <div class="rt-empty">
      ${escapeHTML(message)}
    </div>
  `;

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
      await rtFetch(
        "recent"
      );


    currentResults =
      normalizeArray(
        data
      );


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
      normalizeArray(
        data
      );


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

function renderPosts(
  posts
) {

  resultsCount.textContent =
    `${posts.length} RESULTS`;


  if (
    !posts.length
  ) {

    showEmpty(
      "No matching intelligence was found."
    );

    return;

  }


  results.innerHTML =
    posts.map(
      (
        post,
        index
      ) => {

        const group =
          getGroupName(
            post
          );


        const title =
          getPostTitle(
            post
          );


        const date =
          getPostDate(
            post
          );


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
    .querySelectorAll(
      ".rt-result"
    )
    .forEach(
      item => {

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

      }
    );

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
    getGroupName(
      post
    );


  const title =
    getPostTitle(
      post
    );


  const date =
    getPostDate(
      post
    );


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
      element => {

        element.remove();

      }
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


  if (
    !items.length
  ) {

    showEmpty(
      `No ${type.toLowerCase()} were returned.`
    );

    return;

  }


  results.innerHTML =
    items.map(
      (
        item,
        index
      ) => {

        const name =
          getObjectName(
            item
          );


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
    .forEach(
      card => {

        card.addEventListener(
          "click",
          () => {

            const index =
              Number(
                card.dataset.index
              );


            const item =
              currentResults[
                index
              ];


            if (
              currentProfileType ===
              "GROUPS"
            ) {

              showGroupProfile(
                item
              );

            }


            else if (
              currentProfileType ===
              "ACTORS"
            ) {

              showActorProfile(
                item
              );

            }


            else if (
              currentProfileType ===
              "MARKETS"
            ) {

              showMarketProfile(
                item
              );

            }

          }
        );

      }
    );

}


/* =========================================================
   PROFILE VIEW
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

function renderProfileFields(
  item
) {

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
    Object.entries(
      item
    )
    .filter(
      ([key, value]) => {

        if (
          ignoredKeys.includes(
            key
          )
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
        ).join("")}

      </div>

    </div>

  `;

}


/* =========================================================
   GROUP PROFILE
   ========================================================= */

function showGroupProfile(
  group
) {

  openProfileView(
    "RANSOMWARE GROUP",
    group
  );

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
          button => {

            button.classList.remove(
              "active"
            );

          }
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

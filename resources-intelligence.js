/* =========================================================
   REMNANTTRACE INTELLIGENCE
   RansomLook interface
   ========================================================= */

/*
 * PUT YOUR GOOGLE APPS SCRIPT /exec URL HERE
 *
 * Example:
 * https://script.google.com/macros/s/XXXXXXXX/exec
 */

const RT_PROXY =
  "YOUR_GOOGLE_APPS_SCRIPT_EXEC_URL";


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


/* =========================================================
   JSONP REQUEST
   ========================================================= */

function rtFetch(action, parameter = "") {

  return new Promise((resolve, reject) => {

    const callbackName =
      "rtCallback_" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .substring(2);

    const script =
      document.createElement("script");

    const timeout =
      setTimeout(() => {

        cleanup();

        reject(
          new Error(
            "Request timed out."
          )
        );

      }, 20000);


    function cleanup() {

      clearTimeout(timeout);

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      try {
        delete window[callbackName];
      } catch (e) {
        window[callbackName] = undefined;
      }

    }


    window[callbackName] =
      function(data) {

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
      "&callback=" +
      encodeURIComponent(callbackName);


    if (parameter) {

      url +=
        "&q=" +
        encodeURIComponent(parameter);

    }


    script.src = url;

    script.onerror =
      function() {

        cleanup();

        reject(
          new Error(
            "Unable to contact the intelligence service."
          )
        );

      };


    document.body.appendChild(script);

  });

}


/* =========================================================
   ESCAPE HTML
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
   DATE FORMAT
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
   NORMALIZE RESPONSE
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

function showError(message) {

  results.innerHTML = `
    <div class="rt-error">
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
   SEARCH
   ========================================================= */

async function performSearch() {

  const query =
    searchInput.value.trim();


  if (!query) {

    loadRecent();

    return;

  }


  if (query.length < 2) {

    showEmpty(
      "Enter at least two characters."
    );

    return;

  }


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
      currentResults,
      "SEARCH RESULTS"
    );


  } catch (error) {

    console.error(error);

    showError(
      "Search could not be completed."
    );

  }

}


/* =========================================================
   RECENT POSTS
   ========================================================= */

async function loadRecent() {

  showLoading();

  resultsTitle.textContent =
    "RECENT ACTIVITY";


  try {

    const data =
      await rtFetch("recent");


    currentResults =
      normalizeArray(data);


    renderPosts(
      currentResults,
      "RECENT ACTIVITY"
    );


  } catch (error) {

    console.error(error);

    showError(
      "Unable to retrieve RansomLook intelligence."
    );

  }

}


/* =========================================================
   RENDER POSTS
   ========================================================= */

function renderPosts(
  posts,
  title
) {

  resultsTitle.textContent =
    title;


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
          post.group_name ||
          post.group ||
          "UNKNOWN GROUP";


        const title =
          post.post_title ||
          post.title ||
          post.name ||
          "UNTITLED POST";


        const discovered =
          post.discovered ||
          post.date ||
          post.created ||
          "";


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
              ${formatDate(discovered)}
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
            currentResults[index]
          );

        }
      );

    });

}


/* =========================================================
   POST DETAIL
   ========================================================= */

function showPostDetail(post) {

  if (!post) {
    return;
  }


  const group =
    post.group_name ||
    post.group ||
    "Unknown";


  const title =
    post.post_title ||
    post.title ||
    post.name ||
    "Untitled Post";


  const discovered =
    post.discovered ||
    post.date ||
    post.created ||
    "";


  detail.hidden = false;


  detailContent.innerHTML = `

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
            ${formatDate(discovered)}
          </div>

        </div>

      </div>

    </div>

  `;


  detail.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


/* =========================================================
   FILTERS
   ========================================================= */

filters.forEach(filter => {

  filter.addEventListener(
    "click",
    async () => {

      filters.forEach(button => {

        button.classList.remove(
          "active"
        );

      });


      filter.classList.add(
        "active"
      );


      const type =
        filter.dataset.type;


      if (type === "all") {

        await loadRecent();

        return;

      }


      if (type === "posts") {

        await loadRecent();

        return;

      }


      showLoading();


      try {

        let data;


        if (type === "groups") {

          data =
            await rtFetch("groups");

          renderNameList(
            normalizeArray(data),
            "GROUPS"
          );

        }


        else if (type === "actors") {

          data =
            await rtFetch("actors");

          renderNameList(
            normalizeArray(data),
            "ACTORS"
          );

        }


        else if (type === "markets") {

          data =
            await rtFetch("markets");

          renderNameList(
            normalizeArray(data),
            "MARKETS"
          );

        }


      } catch (error) {

        console.error(error);

        showError(
          "Unable to retrieve this intelligence category."
        );

      }

    }
  );

});


/* =========================================================
   NAME LIST
   ========================================================= */

function renderNameList(
  items,
  type
) {

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
          typeof item === "string"
            ? item
            : item.name ||
              item.group_name ||
              item.market_name ||
              item.handle ||
              "Unknown";


        return `

          <article
            class="rt-result"
            data-index="${index}"
          >

            <div class="rt-result-type">
              ${escapeHTML(
                type === "ACTORS"
                  ? "ACTOR"
                  : type === "GROUPS"
                    ? "GROUP"
                    : "MARKET"
              )}
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
              PROFILE
            </div>

          </article>

        `;

      }
    ).join("");

}


/* =========================================================
   BACK
   ========================================================= */

backButton.addEventListener(
  "click",
  () => {

    detail.hidden = true;


    const wrapper =
      document.querySelector(
        ".rt-results-wrapper"
      );


    if (wrapper) {

      window.scrollTo({

        top:
          wrapper.offsetTop - 100,

        behavior: "smooth"

      });

    }

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

    if (event.key === "Enter") {

      event.preventDefault();

      performSearch();

    }

  }
);


/* =========================================================
   INITIAL LOAD
   ========================================================= */

loadRecent();

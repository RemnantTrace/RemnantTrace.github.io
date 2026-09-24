/* =========================================================
   REMNANTTRACE INTELLIGENCE
   RansomLook API interface
   ========================================================= */

const RT_API = "https://www.ransomlook.io/api/";


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

let currentType = "all";


/* =========================================================
   API REQUEST
   ========================================================= */

async function rtFetch(endpoint) {

  const response = await fetch(
    `${RT_API}${endpoint}`,
    {
      method: "GET",

      headers: {
        "Accept": "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status}`
    );
  }

  return await response.json();
}


/* =========================================================
   ESCAPE HTML
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
   DATE FORMAT
   ========================================================= */

function formatDate(value) {

  if (!value) {
    return "DATE UNKNOWN";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

  resultsCount.textContent = "0 RESULTS";
}


/* =========================================================
   SEARCH POSTS
   ========================================================= */

async function searchPosts(query) {

  const encoded =
    encodeURIComponent(query);

  return await rtFetch(
    `/search?query=${encoded}`
  );
}


/* =========================================================
   LOAD RECENT POSTS
   ========================================================= */

async function loadRecent() {

  showLoading();

  try {

    const data =
      await rtFetch("/posts?days=3");

    currentResults =
      Array.isArray(data) ? data : [];

    renderPosts(currentResults);

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

function renderPosts(posts) {

  resultsTitle.textContent =
    "RECENT ACTIVITY";

  resultsCount.textContent =
    `${posts.length} RESULTS`;

  if (!posts.length) {

    showEmpty(
      "No recent intelligence was returned."
    );

    return;
  }


  results.innerHTML =
    posts.map((post, index) => {

      const group =
        post.group_name || "UNKNOWN GROUP";

      const title =
        post.post_title || "UNTITLED POST";

      const discovered =
        post.discovered || "";

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

    }).join("");


  document
    .querySelectorAll(".rt-result")
    .forEach(item => {

      item.addEventListener(
        "click",
        () => {

          const index =
            Number(item.dataset.index);

          showPostDetail(
            currentResults[index]
          );

        }
      );

    });

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


  showLoading();

  resultsTitle.textContent =
    `SEARCH / ${query}`;


  try {

    const data =
      await searchPosts(query);

    currentResults =
      Array.isArray(data) ? data : [];

    renderSearchResults(
      currentResults
    );

  } catch (error) {

    console.error(error);

    showError(
      "Search could not be completed."
    );

  }

}


/* =========================================================
   SEARCH RESULTS
   ========================================================= */

function renderSearchResults(items) {

  resultsTitle.textContent =
    "SEARCH RESULTS";

  resultsCount.textContent =
    `${items.length} RESULTS`;


  if (!items.length) {

    showEmpty(
      "No matching intelligence was found."
    );

    return;
  }


  results.innerHTML =
    items.map((item, index) => {

      const group =
        item.group_name || "UNKNOWN GROUP";

      const title =
        item.post_title || "UNTITLED POST";

      return `

        <article
          class="rt-result"
          data-index="${index}"
        >

          <div class="rt-result-type">
            VICTIM / POST
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
            ${formatDate(item.discovered)}
          </div>

        </article>

      `;

    }).join("");


  document
    .querySelectorAll(".rt-result")
    .forEach(item => {

      item.addEventListener(
        "click",
        () => {

          const index =
            Number(item.dataset.index);

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


  detail.hidden = false;

  detailContent.innerHTML = `

    <div class="rt-detail-header">

      <div class="rt-detail-type">
        OBSERVED VICTIM / POST
      </div>

      <h3>
        ${escapeHTML(
          post.post_title || "Untitled Post"
        )}
      </h3>

    </div>


    <div class="rt-detail-body">

      <div class="rt-detail-grid">

        <div class="rt-detail-field">

          <div class="rt-detail-field-label">
            GROUP
          </div>

          <div class="rt-detail-field-value">
            ${escapeHTML(
              post.group_name || "Unknown"
            )}
          </div>

        </div>


        <div class="rt-detail-field">

          <div class="rt-detail-field-label">
            FIRST OBSERVED
          </div>

          <div class="rt-detail-field-value">
            ${formatDate(
              post.discovered
            )}
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
   BACK
   ========================================================= */

backButton.addEventListener(
  "click",
  () => {

    detail.hidden = true;

    window.scrollTo({
      top:
        document
          .querySelector(".rt-results-wrapper")
          .offsetTop - 100,

      behavior: "smooth"
    });

  }
);


/* =========================================================
   FILTER BUTTONS
   ========================================================= */

filters.forEach(filter => {

  filter.addEventListener(
    "click",
    async () => {

      filters.forEach(button => {
        button.classList.remove("active");
      });

      filter.classList.add("active");

      currentType =
        filter.dataset.type;


      if (currentType === "all") {

        await loadRecent();

        return;

      }


      /*
       * Groups, actors, and markets use their
       * dedicated RansomLook API namespaces.
       */

      showLoading();


      try {

        let data;


        if (currentType === "groups") {

          data =
            await rtFetch("/groups");

          renderNameList(
            data,
            "GROUPS"
          );

        }


        else if (currentType === "actors") {

          data =
            await rtFetch("/actors");

          renderActorList(data);

        }


        else if (currentType === "markets") {

          data =
            await rtFetch("/markets");

          renderNameList(
            data,
            "MARKETS"
          );

        }


        else if (currentType === "posts") {

          await loadRecent();

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
   GROUP / MARKET LIST
   ========================================================= */

function renderNameList(data, type) {

  let items = [];


  if (Array.isArray(data)) {
    items = data;
  }

  else if (data && Array.isArray(data.groups)) {
    items = data.groups;
  }

  else if (data && Array.isArray(data.markets)) {
    items = data.markets;
  }


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
    items.map((item, index) => {

      const name =
        typeof item === "string"
          ? item
          : item.name ||
            item.group_name ||
            item.market_name ||
            "Unknown";


      return `

        <article
          class="rt-result"
          data-name="${escapeHTML(name)}"
        >

          <div class="rt-result-type">
            ${type === "GROUPS"
              ? "GROUP"
              : "MARKET"}
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

    }).join("");


  document
    .querySelectorAll(".rt-result")
    .forEach(item => {

      item.addEventListener(
        "click",
        () => {

          const name =
            item.dataset.name;

          showEntityDetail(
            name,
            type
          );

        }
      );

    });

}


/* =========================================================
   ACTORS
   ========================================================= */

function renderActorList(data) {

  let actors = [];


  if (Array.isArray(data)) {
    actors = data;
  }

  else if (
    data &&
    Array.isArray(data.actors)
  ) {
    actors = data.actors;
  }


  resultsTitle.textContent =
    "ACTORS";


  resultsCount.textContent =
    `${actors.length} RESULTS`;


  if (!actors.length) {

    showEmpty(
      "No threat actors were returned."
    );

    return;
  }


  results.innerHTML =
    actors.map(actor => {

      const name =
        typeof actor === "string"
          ? actor
          : actor.name ||
            actor.handle ||
            "Unknown";


      return `

        <article
          class="rt-result"
          data-name="${escapeHTML(name)}"
        >

          <div class="rt-result-type">
            ACTOR
          </div>

          <div>

            <h3 class="rt-result-title">
              ${escapeHTML(name)}
            </h3>

            <div class="rt-result-meta">
              THREAT ACTOR PROFILE
            </div>

          </div>

          <div class="rt-result-date">
            PROFILE
          </div>

        </article>

      `;

    }).join("");


  document
    .querySelectorAll(".rt-result")
    .forEach(item => {

      item.addEventListener(
        "click",
        () => {

          showEntityDetail(
            item.dataset.name,
            "ACTORS"
          );

        }
      );

    });

}


/* =========================================================
   ENTITY DETAIL
   ========================================================= */

async function showEntityDetail(
  name,
  type
) {

  detail.hidden = false;

  detailContent.innerHTML = `

    <div class="rt-detail-header">

      <div class="rt-detail-type">
        ${escapeHTML(
          type.slice(0, -1)
        )}
      </div>

      <h3>
        ${escapeHTML(name)}
      </h3>

    </div>

    <div class="rt-detail-body">

      <div class="rt-loading">
        RETRIEVING PROFILE...
      </div>

    </div>

  `;


  detail.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });


  try {

    let data;


    if (type === "GROUPS") {

      data =
        await rtFetch(
          `/group/${encodeURIComponent(name)}`
        );

    }


    else if (type === "ACTORS") {

      data =
        await rtFetch(
          `/actor/${encodeURIComponent(name)}`
        );

    }


    else {

      data = {
        name: name
      };

    }


    renderEntityDetail(
      data,
      name,
      type
    );


  } catch (error) {

    console.error(error);

    detailContent.innerHTML += `

      <div class="rt-detail-body">

        <div class="rt-error">
          Profile information could not be retrieved.
        </div>

      </div>

    `;

  }

}


/* =========================================================
   RENDER ENTITY DETAIL
   ========================================================= */

function renderEntityDetail(
  data,
  fallbackName,
  type
) {

  const name =
    data?.name ||
    fallbackName;


  let fields = [];


  if (type === "GROUPS") {

    const locations =
      data?.[0]?.locations ||
      data?.locations ||
      [];


    fields.push({
      label: "GROUP",
      value: name
    });


    fields.push({
      label: "LOCATIONS",
      value: Array.isArray(locations)
        ? locations.length
        : "Unknown"
    });


    if (Array.isArray(locations)) {

      const available =
        locations.filter(
          location =>
            location &&
            location.available
        ).length;


      fields.push({
        label: "AVAILABLE LOCATIONS",
        value: available
      });

    }

  }


  else if (type === "ACTORS") {

    fields.push({
      label: "ACTOR",
      value: name
    });


    const aliases =
      data?.aliases || [];


    fields.push({
      label: "ALIASES",
      value:
        Array.isArray(aliases)
          ? aliases.join(", ") || "None listed"
          : aliases || "None listed"
    });


    const relations =
      data?.relations?.groups || [];


    fields.push({
      label: "RELATED GROUPS",
      value:
        Array.isArray(relations)
          ? relations.join(", ") || "None listed"
          : relations || "None listed"
    });

  }


  detailContent.innerHTML = `

    <div class="rt-detail-header">

      <div class="rt-detail-type">
        ${escapeHTML(
          type.slice(0, -1)
        )}
      </div>

      <h3>
        ${escapeHTML(name)}
      </h3>

    </div>


    <div class="rt-detail-body">

      <div class="rt-detail-grid">

        ${fields.map(field => `

          <div class="rt-detail-field">

            <div class="rt-detail-field-label">
              ${escapeHTML(field.label)}
            </div>

            <div class="rt-detail-field-value">
              ${escapeHTML(field.value)}
            </div>

          </div>

        `).join("")}

      </div>

    </div>

  `;

}


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

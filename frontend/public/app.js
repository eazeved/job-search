const API_BASE = "/api";
let customDomains = [];

function createTermRow(isFirst) {
  const row = document.createElement("div");
  row.className = "term-row";

  if (!isFirst) {
    const select = document.createElement("select");
    select.className = "condition-select";
    ["AND", "OR", "NOT"].forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });
    row.appendChild(select);
  }

  const input = document.createElement("input");
  input.type = "text";
  input.className = "term-input";
  input.placeholder = isFirst ? 'e.g. "chief of staff"' : "e.g. CoS";
  row.appendChild(input);

  if (!isFirst) {
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn-remove";
    removeBtn.textContent = "×";
    removeBtn.title = "Remove";
    removeBtn.onclick = () => row.remove();
    row.appendChild(removeBtn);
  }

  return row;
}

function initTerms() {
  const container = document.getElementById("terms");
  container.appendChild(createTermRow(true));

  document.getElementById("addTerm").onclick = () => {
    container.appendChild(createTermRow(false));
  };
}

function collectTerms() {
  const rows = document.querySelectorAll("#terms .term-row");
  const terms = [];
  rows.forEach((row) => {
    const input = row.querySelector(".term-input");
    const select = row.querySelector(".condition-select");
    const value = input.value.trim();
    if (value) {
      terms.push({ value, condition: select ? select.value : null });
    }
  });
  return terms;
}

async function loadSites() {
  const res = await fetch(`${API_BASE}/sites`);
  const sites = await res.json();
  const grid = document.getElementById("sites");
  sites.forEach((site) => {
    const label = document.createElement("label");
    label.className = "site-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = site.id;
    checkbox.checked = true;
    checkbox.className = "site-checkbox";
    label.appendChild(checkbox);

    const span = document.createElement("span");
    span.innerHTML = `<strong>${site.name}</strong><br><small>${site.domain}</small>`;
    label.appendChild(span);

    grid.appendChild(label);
  });
}

function collectSiteIds() {
  return Array.from(document.querySelectorAll(".site-checkbox:checked")).map(
    (cb) => cb.value
  );
}

function initCustomDomains() {
  document.getElementById("addCustomDomain").onclick = () => {
    const input = document.getElementById("customDomain");
    const value = input.value.trim();
    if (!value) return;
    customDomains.push(value);
    input.value = "";
    renderCustomDomains();
  };
}

function renderCustomDomains() {
  const list = document.getElementById("customDomainList");
  list.innerHTML = "";
  customDomains.forEach((domain, idx) => {
    const li = document.createElement("li");
    li.textContent = domain;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.className = "btn-remove-small";
    removeBtn.onclick = () => {
      customDomains.splice(idx, 1);
      renderCustomDomains();
    };
    li.appendChild(removeBtn);
    list.appendChild(li);
  });
}

function getEngine() {
  return document.querySelector('input[name="engine"]:checked').value;
}

async function runSearch() {
  const terms = collectTerms();
  if (terms.length === 0) {
    alert("Please enter at least one keyword.");
    return;
  }

  const siteIds = collectSiteIds();
  if (siteIds.length === 0 && customDomains.length === 0) {
    alert("Please select at least one job board.");
    return;
  }

  const engine = getEngine();
  const btn = document.getElementById("searchBtn");
  btn.disabled = true;
  btn.textContent = "Building...";

  try {
    const res = await fetch(`${API_BASE}/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terms, siteIds, customDomains, engine }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Something went wrong.");
      return;
    }

    const data = await res.json();
    renderResults(data);
  } catch (e) {
    alert("Could not reach the backend. Is it running?");
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate search →";
  }
}

function renderResults(data) {
  document.getElementById("resultsSection").hidden = false;
  document.getElementById("combinedQueryText").textContent = data.combinedQuery;

  const link = document.getElementById("combinedLink");
  link.href = data.combinedUrl;

  const grid = document.getElementById("resultsGrid");
  grid.innerHTML = "";

  data.perSite.forEach((site, idx) => {
    const card = document.createElement("div");
    card.className = "result-card";
    const codeId = `query-${idx}`;
    card.innerHTML = `
      <h3>${site.domain}</h3>
      <code id="${codeId}">${site.query}</code>
      <div class="result-actions">
        <a href="${site.url}" target="_blank" rel="noopener" class="btn-small">Open ↗</a>
        <button class="btn-small copy-btn" data-target="${codeId}" type="button">Copy</button>
      </div>
    `;
    grid.appendChild(card);
  });

  attachCopyButtons();
  document
    .getElementById("resultsSection")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

function attachCopyButtons() {
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.onclick = () => {
      const target = document.getElementById(btn.dataset.target);
      navigator.clipboard.writeText(target.textContent);
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = original), 1200);
    };
  });
}

document.getElementById("searchBtn").addEventListener("click", runSearch);

initTerms();
initCustomDomains();
loadSites();

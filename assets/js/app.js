const PATHS = {
  stats: "data/stats.json",
  leaderboard: "data/leaderboard.json",
  samples: "data/samples.json",
  site: "data/site.json",
};

let charts = [];
let publicSamples = [];

const fmt = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(digits);
};

const intFmt = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat().format(Number(value));
};

async function loadJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.warn(`[Agent-CWE] Could not load ${path}:`, error);
    return fallback;
  }
}

function setupNavigation() {
  const button = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");
  button?.addEventListener("click", () => {
    const opened = menu.classList.toggle("open");
    button.setAttribute("aria-expanded", String(opened));
  });
  menu?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => {
    menu.classList.remove("open");
    button?.setAttribute("aria-expanded", "false");
  }));
}

function setupCitationCopy() {
  const btn = document.getElementById("copyCitation");
  const text = document.getElementById("citationText");
  btn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text.textContent.trim());
      const old = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(() => (btn.textContent = old), 1200);
    } catch (error) {
      console.warn("Clipboard copy failed", error);
    }
  });
}

async function renderSiteConfig() {
  const site = await loadJson(PATHS.site, {});
  if (site.title) {
    document.title = site.title;
    document.querySelectorAll(".brand-text").forEach((x) => (x.textContent = site.short_name || site.title));
  }
  const github = document.getElementById("githubButton");
  if (github) {
    if (site.github_url) github.href = site.github_url;
    else {
      github.classList.add("disabled");
      github.setAttribute("aria-disabled", "true");
    }
  }
  if (site.paper_url) {
    const paper = document.getElementById("paperButton");
    paper.href = site.paper_url;
    paper.textContent = "Paper";
    paper.classList.remove("disabled");
    paper.removeAttribute("aria-disabled");
  }
  if (site.footer_version) document.getElementById("footerVersion").textContent = site.footer_version;
}

function renderMetric(id, value) {
  document.getElementById(id).textContent = intFmt(value);
}

function renderLanguageTable(stats) {
  const body = document.getElementById("languageTableBody");
  const rows = Array.isArray(stats.language_distribution) ? stats.language_distribution : [];
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="5" class="table-empty">Public language statistics are not available yet.</td></tr>';
    return;
  }
  const sampleTotal = Number(stats.sample_count || 0);
  const fnTotal = Number(stats.gold_function_count || 0);
  body.innerHTML = rows.map((r) => {
    const samplePct = sampleTotal ? Number(r.samples || 0) / sampleTotal * 100 : null;
    const fnPct = fnTotal ? Number(r.functions || 0) / fnTotal * 100 : null;
    return `<tr>
      <td><strong>${escapeHtml(r.language || "Unknown")}</strong></td>
      <td>${intFmt(r.samples)}</td>
      <td>${samplePct === null ? "—" : fmt(samplePct) + "%"}</td>
      <td>${intFmt(r.functions)}</td>
      <td>${fnPct === null ? "—" : fmt(fnPct) + "%"}</td>
    </tr>`;
  }).join("");
}

function makeBarChart(canvasId, emptyId, labels, values, label) {
  const canvas = document.getElementById(canvasId);
  const empty = document.getElementById(emptyId);
  if (!labels.length || !values.some((x) => Number(x) > 0) || typeof Chart === "undefined") {
    canvas.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  canvas.classList.remove("hidden");
  const chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderRadius: 8,
        maxBarThickness: 44,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { displayColors: false },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#64748b" } },
        y: { beginAtZero: true, ticks: { precision: 0, color: "#64748b" }, grid: { color: "#eef2f7" } },
      },
    },
  });
  charts.push(chart);
}

function renderConsensus(stats) {
  const grid = document.getElementById("consensusGrid");
  const items = Array.isArray(stats.consensus) ? stats.consensus : [];
  if (!items.length) {
    grid.innerHTML = '<div class="empty-state">Consensus statistics are not public yet.</div>';
    return;
  }
  grid.innerHTML = items.map((item) => `
    <article class="consensus-card">
      <div class="consensus-title">${escapeHtml(item.label || "Consensus")}</div>
      <div class="consensus-values">
        <div class="consensus-value"><strong>${intFmt(item.samples)}</strong><span>Samples</span></div>
        <div class="consensus-value"><strong>${intFmt(item.functions)}</strong><span>Functions</span></div>
      </div>
    </article>
  `).join("");
}

async function renderStats() {
  const stats = await loadJson(PATHS.stats, {});
  renderMetric("metricSamples", stats.sample_count);
  renderMetric("metricFunctions", stats.gold_function_count);
  renderMetric("metricLanguages", stats.language_count);
  renderMetric("metricModels", stats.curator_model_count);
  document.getElementById("statsVersion").textContent = stats.version || "Public-safe stats";

  const hasReleased = Number(stats.sample_count) > 0;
  document.getElementById("dataStatus").textContent = hasReleased
    ? (stats.status_text || "Aggregate benchmark statistics are available.")
    : "Private benchmark data is not included in this repository.";

  const rows = Array.isArray(stats.language_distribution) ? stats.language_distribution : [];
  const labels = rows.map((r) => r.language);
  makeBarChart("sampleLanguageChart", "sampleChartEmpty", labels, rows.map((r) => r.samples || 0), "Samples");
  makeBarChart("functionLanguageChart", "functionChartEmpty", labels, rows.map((r) => r.functions || 0), "Gold functions");
  renderLanguageTable(stats);
  renderConsensus(stats);
}

function scoreCell(value) {
  return value === null || value === undefined ? "—" : `${fmt(value)}%`;
}

async function renderLeaderboard() {
  const data = await loadJson(PATHS.leaderboard, []);
  const body = document.getElementById("leaderboardBody");
  if (!Array.isArray(data) || !data.length) {
    body.innerHTML = '<tr><td colspan="8" class="table-empty">Leaderboard entries are coming soon.</td></tr>';
    return;
  }
  const ranked = [...data].sort((a, b) => {
    const af = a.f1 == null ? -1 : Number(a.f1);
    const bf = b.f1 == null ? -1 : Number(b.f1);
    return bf - af;
  });
  body.innerHTML = ranked.map((r, idx) => {
    const complete = [r.exact_match, r.precision, r.recall, r.f1].some((x) => x !== null && x !== undefined);
    const status = r.status || (complete ? "Evaluated" : "Coming soon");
    return `<tr>
      <td>${idx + 1}</td>
      <td><strong>${escapeHtml(r.model || "Unnamed model")}</strong></td>
      <td>${escapeHtml(r.organization || "—")}</td>
      <td>${scoreCell(r.exact_match)}</td>
      <td>${scoreCell(r.precision)}</td>
      <td>${scoreCell(r.recall)}</td>
      <td>${scoreCell(r.f1)}</td>
      <td><span class="status-chip ${complete ? "complete" : "soon"}">${escapeHtml(status)}</span></td>
    </tr>`;
  }).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function populateExplorerFilters(samples) {
  const languages = [...new Set(samples.map((x) => x.language).filter(Boolean))].sort();
  const cwes = [...new Set(samples.map((x) => x.cwe).filter(Boolean))].sort();
  const lang = document.getElementById("languageFilter");
  const cwe = document.getElementById("cweFilter");
  lang.innerHTML = '<option value="">All</option>' + languages.map((x) => `<option>${escapeHtml(x)}</option>`).join("");
  cwe.innerHTML = '<option value="">All</option>' + cwes.map((x) => `<option>${escapeHtml(x)}</option>`).join("");
}

function renderExplorer() {
  const search = document.getElementById("sampleSearch").value.trim().toLowerCase();
  const language = document.getElementById("languageFilter").value;
  const cwe = document.getElementById("cweFilter").value;
  const grid = document.getElementById("sampleGrid");
  const empty = document.getElementById("sampleEmpty");

  const filtered = publicSamples.filter((x) => {
    if (language && x.language !== language) return false;
    if (cwe && x.cwe !== cwe) return false;
    if (!search) return true;
    const haystack = [x.sample_id, x.cwe, x.language, x.title, x.summary].join(" ").toLowerCase();
    return haystack.includes(search);
  });

  if (!filtered.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    empty.textContent = publicSamples.length
      ? "No public samples match the current filters."
      : "No public sample metadata has been released.";
    return;
  }
  empty.classList.add("hidden");
  grid.innerHTML = filtered.map((x) => `
    <article class="sample-card">
      <div class="sample-meta">
        ${x.cwe ? `<span class="tag">${escapeHtml(x.cwe)}</span>` : ""}
        ${x.language ? `<span class="tag gray">${escapeHtml(x.language)}</span>` : ""}
      </div>
      <h3>${escapeHtml(x.title || x.sample_id || "Public sample")}</h3>
      <p>${escapeHtml(x.summary || "Sanitized metadata only.")}</p>
    </article>
  `).join("");
}

async function setupExplorer() {
  publicSamples = await loadJson(PATHS.samples, []);
  if (!Array.isArray(publicSamples)) publicSamples = [];
  populateExplorerFilters(publicSamples);
  ["sampleSearch", "languageFilter", "cweFilter"].forEach((id) => {
    document.getElementById(id)?.addEventListener(id === "sampleSearch" ? "input" : "change", renderExplorer);
  });
  renderExplorer();
}

async function main() {
  setupNavigation();
  setupCitationCopy();
  await Promise.all([
    renderSiteConfig(),
    renderStats(),
    renderLeaderboard(),
    setupExplorer(),
  ]);
}

document.addEventListener("DOMContentLoaded", main);

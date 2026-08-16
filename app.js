
const $ = (id) => document.getElementById(id);

const tabsElement = $("tabs");
const newTabButton = $("newTabButton");
const form = $("navForm");
const input = $("urlInput");
const viewer = $("viewer");
const status = $("status");
const progress = $("progress");
const startScreen = $("startScreen");

const backButton = $("backButton");
const forwardButton = $("forwardButton");
const reloadButton = $("reloadButton");
const homeButton = $("homeButton");
const bookmarkButton = $("bookmarkButton");
const themeButton = $("themeButton");
const menuButton = $("menuButton");

const drawer = $("drawer");
const drawerClose = $("drawerClose");
const bookmarkList = $("bookmarkList");
const historyList = $("historyList");
const recentlyClosedList = $("recentlyClosedList");
const clearHistoryButton = $("clearHistoryButton");

const backendDot = $("backendDot");
const backendText = $("backendText");
const configPanel = $("configPanel");
const metricsPanel = $("metricsPanel");
const domainInput = $("domainInput");
const domainTestButton = $("domainTestButton");
const domainTestOutput = $("domainTestOutput");

const inspectButton = $("inspectButton");
const inspectOutput = $("inspectOutput");

const quickGrid = $("quickGrid");
const brandName = $("brandName");
const brandTagline = $("brandTagline");

const paletteBackdrop = $("paletteBackdrop");
const paletteInput = $("paletteInput");
const paletteList = $("paletteList");

const findbar = $("findbar");
const findInput = $("findInput");
const findNext = $("findNext");
const findPrev = $("findPrev");
const findClose = $("findClose");

const toastElement = $("toast");

let tabCounter = 0;
let activeTabId = null;
const tabs = new Map();
let lastBackendConfig = null;
let zoomLevel = 1;

const STORE = {
  bookmarks: "viewer09.bookmarks.v1",
  history: "viewer09.history.v1",
  tabs: "viewer09.tabs.v1",
  closed: "viewer09.closed.v1",
  theme: "viewer09.theme.v1"
};

function toast(message) {
  toastElement.textContent = message;
  toastElement.classList.add("show");

  clearTimeout(toast._timer);

  toast._timer = setTimeout(() => {
    toastElement.classList.remove("show");
  }, 1800);
}

function backendBase() {
  const value = String(window.BACKEND_URL || "").trim();

  if (!value || value.includes("CHANGE-ME")) {
    return null;
  }

  return value.replace(/\/+$/, "");
}

function homeUrl() {
  return String(window.HOME_URL || "https://www.wikipedia.org");
}

function searchUrl(query) {
  const template = String(
    window.SEARCH_URL || "https://www.google.com/search?q={query}"
  );

  return template.replace("{query}", encodeURIComponent(query));
}

function looksLikeWebAddress(value) {
  const text = String(value || "").trim();

  if (!text) {
    return false;
  }

  // Explicit schemes are always treated as addresses.
  if (/^https?:\/\//i.test(text)) {
    return true;
  }

  // Whitespace strongly indicates a search query.
  if (/\s/.test(text)) {
    return false;
  }

  // Common URL forms:
  // example.com
  // example.com/path
  // sub.example.co.uk
  // 8.8.8.8
  // [IPv6] is left to the backend validator.
  if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:[/?#].*)?$/i.test(text)) {
    return true;
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:[/?#].*)?$/.test(text)) {
    return true;
  }

  return false;
}

function normalizeInput(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  // Browser-style behavior:
  // obvious web address -> navigate
  // literally everything else -> Google search
  if (!looksLikeWebAddress(text)) {
    return searchUrl(text);
  }

  if (/^https?:\/\//i.test(text)) {
    return text;
  }

  return "https://" + text;
}

function makeViewerUrl(target) {
  const backend = backendBase();

  if (!backend) {
    return null;
  }

  return backend + "/view?url=" + encodeURIComponent(target);
}

function loadJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getBookmarks() {
  return loadJson(STORE.bookmarks, []);
}

function getHistory() {
  return loadJson(STORE.history, []);
}

function getClosed() {
  return loadJson(STORE.closed, []);
}

function currentTab() {
  return tabs.get(activeTabId) || null;
}

function serializeTabs() {
  return {
    activeTabId,
    tabCounter,
    tabs: Array.from(tabs.values()).map((tab) => ({
      ...tab
    }))
  };
}

function persistTabs() {
  saveJson(STORE.tabs, serializeTabs());
}

function restoreTabs() {
  const saved = loadJson(STORE.tabs, null);

  if (!saved || !Array.isArray(saved.tabs) || saved.tabs.length === 0) {
    createTab();
    return;
  }

  tabs.clear();

  for (const tab of saved.tabs.slice(0, 12)) {
    const id = Number(tab.id);

    if (!Number.isFinite(id)) {
      continue;
    }

    tabs.set(id, {
      id,
      title: String(tab.title || "New Tab"),
      url: String(tab.url || ""),
      history: Array.isArray(tab.history) ? tab.history.slice(0, 100) : [],
      index: Number.isFinite(tab.index) ? tab.index : -1
    });

    tabCounter = Math.max(tabCounter, id);
  }

  if (!tabs.size) {
    createTab();
    return;
  }

  activeTabId = tabs.has(saved.activeTabId)
    ? saved.activeTabId
    : Array.from(tabs.keys())[0];

  renderTabs();
  showTab(activeTabId);
}

function createTab(url = "") {
  const id = ++tabCounter;

  tabs.set(id, {
    id,
    title: "New Tab",
    url: "",
    history: [],
    index: -1
  });

  activeTabId = id;
  renderTabs();
  showTab(id);
  persistTabs();

  if (url) {
    navigate(url, true);
  }

  return id;
}

function closeTab(id) {
  const tab = tabs.get(id);

  if (!tab) {
    return;
  }

  if (tab.url) {
    let closed = getClosed();

    closed.unshift({
      url: tab.url,
      title: tab.title || tab.url,
      closedAt: Date.now()
    });

    saveJson(STORE.closed, closed.slice(0, 15));
  }

  const ids = Array.from(tabs.keys());
  const position = ids.indexOf(id);

  tabs.delete(id);

  if (!tabs.size) {
    createTab();
    renderDrawer();
    return;
  }

  if (activeTabId === id) {
    activeTabId = ids[position + 1] || ids[position - 1];
  }

  renderTabs();
  showTab(activeTabId);
  persistTabs();
  renderDrawer();
}

function reopenClosed() {
  const closed = getClosed();

  if (!closed.length) {
    toast("No recently closed tabs");
    return;
  }

  const first = closed.shift();
  saveJson(STORE.closed, closed);
  createTab(first.url);
  renderDrawer();
}

function switchTab(id) {
  if (!tabs.has(id)) {
    return;
  }

  activeTabId = id;
  renderTabs();
  showTab(id);
  persistTabs();
}

function renderTabs() {
  tabsElement.querySelectorAll(".tab").forEach((node) => node.remove());

  for (const tab of tabs.values()) {
    const element = document.createElement("div");
    element.className = "tab" + (tab.id === activeTabId ? " active" : "");

    const title = document.createElement("div");
    title.className = "tab-title";
    title.textContent = tab.title || "New Tab";

    const close = document.createElement("button");
    close.className = "tab-close";
    close.type = "button";
    close.textContent = "×";
    close.title = "Close tab";

    element.addEventListener("click", () => {
      switchTab(tab.id);
    });

    close.addEventListener("click", (event) => {
      event.stopPropagation();
      closeTab(tab.id);
    });

    element.appendChild(title);
    element.appendChild(close);
    tabsElement.insertBefore(element, newTabButton);
  }
}

function updateNavButtons() {
  const tab = currentTab();

  backButton.disabled = !tab || tab.index <= 0;
  forwardButton.disabled =
    !tab ||
    tab.index < 0 ||
    tab.index >= tab.history.length - 1;
}

function showTab(id) {
  const tab = tabs.get(id);

  if (!tab) {
    return;
  }

  input.value = tab.url || "";
  updateNavButtons();

  if (!tab.url) {
    viewer.src = "about:blank";
    startScreen.style.display = "grid";
    status.textContent = "Ready.";
  } else {
    startScreen.style.display = "none";
    setLoading("Opening " + tab.url);
    viewer.src = makeViewerUrl(tab.url);
  }

  updateBookmarkButton();
}

function setLoading(message) {
  status.textContent = message || "Loading…";
  progress.className = "progress loading";
}

function finishLoading(message) {
  progress.className = "progress done";
  status.textContent = message || "Loaded.";

  setTimeout(() => {
    progress.className = "progress";
  }, 300);
}

function addHistoryEntry(url, title) {
  let items = getHistory();

  items = items.filter((item) => item.url !== url);

  items.unshift({
    url,
    title: title || url,
    time: Date.now()
  });

  saveJson(STORE.history, items.slice(0, 100));
  renderDrawer();
}

function navigate(value, pushHistory = true) {
  const backend = backendBase();

  if (!backend) {
    status.textContent = "Set BACKEND_URL in config.js first.";
    toast("Backend not configured");
    return;
  }

  const target = normalizeInput(value);

  if (!target) {
    status.textContent = "Enter a URL or search.";
    return;
  }

  const tab = currentTab();

  if (!tab) {
    return;
  }

  if (pushHistory) {
    if (tab.index < tab.history.length - 1) {
      tab.history.splice(tab.index + 1);
    }

    if (tab.history[tab.index] !== target) {
      tab.history.push(target);
      tab.index = tab.history.length - 1;
    }
  }

  tab.url = target;
  tab.title = target.replace(/^https?:\/\//, "").split("/")[0] || "Page";

  input.value = target;
  startScreen.style.display = "none";
  setLoading("Opening " + target);
  viewer.src = makeViewerUrl(target);

  addHistoryEntry(target, tab.title);
  renderTabs();
  updateNavButtons();
  updateBookmarkButton();
  persistTabs();
}

function goBack() {
  const tab = currentTab();

  if (!tab || tab.index <= 0) {
    return;
  }

  tab.index -= 1;
  tab.url = tab.history[tab.index];
  showTab(tab.id);
  persistTabs();
}

function goForward() {
  const tab = currentTab();

  if (!tab || tab.index >= tab.history.length - 1) {
    return;
  }

  tab.index += 1;
  tab.url = tab.history[tab.index];
  showTab(tab.id);
  persistTabs();
}

function reloadPage() {
  const tab = currentTab();

  if (!tab || !tab.url) {
    return;
  }

  setLoading("Reloading " + tab.url);

  viewer.src =
    makeViewerUrl(tab.url) +
    "&_r=" +
    Date.now();
}

function toggleBookmark() {
  const tab = currentTab();

  if (!tab || !tab.url) {
    return;
  }

  let items = getBookmarks();
  const index = items.findIndex((item) => item.url === tab.url);

  if (index >= 0) {
    items.splice(index, 1);
    toast("Bookmark removed");
  } else {
    items.unshift({
      url: tab.url,
      title: tab.title || tab.url
    });
    toast("Bookmarked");
  }

  saveJson(STORE.bookmarks, items.slice(0, 150));
  updateBookmarkButton();
  renderDrawer();
}

function updateBookmarkButton() {
  const tab = currentTab();

  if (!tab || !tab.url) {
    bookmarkButton.textContent = "☆";
    return;
  }

  const exists = getBookmarks().some((item) => item.url === tab.url);
  bookmarkButton.textContent = exists ? "★" : "☆";
}

function makeDrawerLink(item, target) {
  const row = document.createElement("div");
  row.className = "drawer-item";

  const link = document.createElement("a");
  link.className = "grow";
  link.textContent = item.title || item.url;
  link.title = item.url;

  link.addEventListener("click", () => {
    drawer.classList.remove("open");
    navigate(item.url, true);
  });

  row.appendChild(link);
  target.appendChild(row);
}

function renderDrawer() {
  const bookmarks = getBookmarks();
  const history = getHistory();
  const closed = getClosed();

  bookmarkList.innerHTML = "";
  historyList.innerHTML = "";
  recentlyClosedList.innerHTML = "";

  if (!bookmarks.length) {
    bookmarkList.textContent = "No bookmarks yet.";
  }

  for (const item of bookmarks.slice(0, 40)) {
    makeDrawerLink(item, bookmarkList);
  }

  if (!history.length) {
    historyList.textContent = "No history yet.";
  }

  for (const item of history.slice(0, 40)) {
    makeDrawerLink(item, historyList);
  }

  if (!closed.length) {
    recentlyClosedList.textContent = "No recently closed tabs.";
  }

  for (const item of closed.slice(0, 10)) {
    makeDrawerLink(item, recentlyClosedList);
  }
}

function applyTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
  localStorage.setItem(STORE.theme, theme);
}

function toggleTheme() {
  const isLight = document.body.classList.contains("light");
  applyTheme(isLight ? "dark" : "light");
}

function renderQuickLinks() {
  const links = Array.isArray(window.QUICK_LINKS)
    ? window.QUICK_LINKS
    : [];

  quickGrid.innerHTML = "";

  for (const [label, url] of links) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick";

    const title = document.createElement("strong");
    title.textContent = label;

    const sub = document.createElement("small");
    sub.textContent = url.replace(/^https?:\/\//, "");

    button.appendChild(title);
    button.appendChild(sub);

    button.addEventListener("click", () => {
      navigate(url, true);
    });

    quickGrid.appendChild(button);
  }
}

async function apiJson(path) {
  const backend = backendBase();

  if (!backend) {
    throw new Error("Backend not configured.");
  }

  const response = await fetch(backend + path, {
    cache: "no-store"
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || "Invalid backend response.");
  }

  if (!response.ok) {
    throw new Error(data.error || "Backend request failed.");
  }

  return data;
}

async function checkBackend() {
  const backend = backendBase();

  if (!backend) {
    backendDot.className = "dot down";
    backendText.textContent = "Backend not configured";
    return;
  }

  try {
    const data = await apiJson("/health");

    backendDot.className = "dot up";
    backendText.textContent =
      "ONLINE · v" +
      (data.version || "?") +
      " · " +
      (data.allowed_host_count || 0) +
      " HOSTS";

    lastBackendConfig = data;
  } catch {
    backendDot.className = "dot down";
    backendText.textContent = "Backend unavailable";
  }
}

async function loadConfigAndMetrics() {
  configPanel.textContent = "Loading…";
  metricsPanel.textContent = "Loading…";

  try {
    const [config, metrics] = await Promise.all([
      apiJson("/api/config"),
      apiJson("/api/metrics")
    ]);

    configPanel.innerHTML = `
      <div class="kv">
        <div>Version</div><div>${escapeHtml(config.version)}</div>
        <div>Phase</div><div>${escapeHtml(config.phase)}</div>
        <div>Allowed hosts</div><div>${escapeHtml(config.allowed_hosts.length)}</div>
        <div>Timeout</div><div>${escapeHtml(config.request_timeout)}s</div>
        <div>Redirect max</div><div>${escapeHtml(config.max_redirects)}</div>
        <div>Response max</div><div>${formatBytes(config.max_response_size)}</div>
        <div>GET bridge</div><div>${config.js_get_bridge ? "ON" : "OFF"}</div>
      </div>
    `;

    const cache = metrics.cache || {};

    metricsPanel.innerHTML = `
      <div class="kv">
        <div>Cache</div><div>${cache.enabled ? "ON" : "OFF"}</div>
        <div>Entries</div><div>${escapeHtml(cache.entries || 0)}</div>
        <div>Hits</div><div>${escapeHtml(cache.hits || 0)}</div>
        <div>Misses</div><div>${escapeHtml(cache.misses || 0)}</div>
        <div>Stores</div><div>${escapeHtml(cache.stores || 0)}</div>
        <div>Evictions</div><div>${escapeHtml(cache.evictions || 0)}</div>
        <div>TTL</div><div>${escapeHtml(cache.ttl_seconds || 0)}s</div>
      </div>
    `;
  } catch (error) {
    configPanel.textContent = error.message;
    metricsPanel.textContent = error.message;
  }
}

async function testDomain() {
  const host = domainInput.value.trim();

  if (!host) {
    return;
  }

  domainTestOutput.textContent = "Testing…";

  try {
    const data = await apiJson(
      "/api/domain-test?host=" + encodeURIComponent(host)
    );

    domainTestOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    domainTestOutput.textContent = error.message;
  }
}

async function inspectCurrent() {
  const tab = currentTab();

  if (!tab || !tab.url) {
    inspectOutput.textContent = "Open a page first.";
    return;
  }

  inspectOutput.textContent = "Inspecting…";

  try {
    const data = await apiJson(
      "/api/inspect?url=" + encodeURIComponent(tab.url)
    );

    const summary = data.summary || {};

    let html = `
      <div class="kv">
        <div>Status</div><div>${escapeHtml(data.status)}</div>
        <div>Type</div><div>${escapeHtml(data.content_type || "unknown")}</div>
        <div>Size</div><div>${formatBytes(data.size || 0)}</div>
        <div>Fetch time</div><div>${escapeHtml(data.elapsed_ms || 0)}ms</div>
        <div>Dependency hosts</div><div>${escapeHtml(summary.dependency_hosts || 0)}</div>
        <div>Allowed</div><div>${escapeHtml(summary.allowed_dependency_hosts || 0)}</div>
        <div>Blocked</div><div>${escapeHtml(summary.blocked_dependency_hosts || 0)}</div>
      </div>
    `;

    if (Array.isArray(data.dependencies) && data.dependencies.length) {
      html += "<div style='margin-top:12px'>";

      for (const dep of data.dependencies) {
        html += `
          <div class="drawer-item inspect-host ${dep.allowed ? "allowed" : "blocked"}">
            <span class="grow mono">${escapeHtml(dep.host)}</span>
            <span>${dep.allowed ? "ALLOW" : "BLOCK"}</span>
            <span>${escapeHtml(dep.count)}</span>
          </div>
        `;
      }

      html += "</div>";
    }

    inspectOutput.innerHTML = html;
  } catch (error) {
    inspectOutput.textContent = error.message;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);

  if (value < 1024) {
    return value + " B";
  }

  if (value < 1024 * 1024) {
    return (value / 1024).toFixed(1) + " KB";
  }

  return (value / (1024 * 1024)).toFixed(1) + " MB";
}

function sendToPage(type, extra = {}) {
  const backend = backendBase();

  if (!backend || !viewer.contentWindow) {
    return;
  }

  let origin;

  try {
    origin = new URL(backend).origin;
  } catch {
    return;
  }

  viewer.contentWindow.postMessage(
    {
      source: "viewer09-parent",
      type,
      ...extra
    },
    origin
  );
}

function runFind(backwards = false) {
  const query = findInput.value.trim();

  if (!query) {
    return;
  }

  sendToPage("find", {
    query,
    backwards
  });
}

function adjustZoom(delta) {
  zoomLevel = Math.max(
    0.5,
    Math.min(2.0, Math.round((zoomLevel + delta) * 10) / 10)
  );

  sendToPage("zoom", {
    zoom: zoomLevel
  });

  toast("Zoom " + Math.round(zoomLevel * 100) + "%");
}

const commands = [
  {
    label: "New tab",
    hint: "Ctrl+T",
    run: () => createTab()
  },
  {
    label: "Reopen closed tab",
    hint: "Ctrl+Shift+T",
    run: reopenClosed
  },
  {
    label: "Toggle theme",
    hint: "",
    run: toggleTheme
  },
  {
    label: "Open bookmarks/history",
    hint: "",
    run: () => {
      drawer.classList.add("open");
      renderDrawer();
      loadConfigAndMetrics();
    }
  },
  {
    label: "Inspect current page",
    hint: "",
    run: () => {
      drawer.classList.add("open");
      inspectCurrent();
    }
  },
  {
    label: "Find in page",
    hint: "Ctrl+F",
    run: () => {
      findbar.classList.add("open");
      findInput.focus();
    }
  },
  {
    label: "Zoom in",
    hint: "Ctrl++",
    run: () => adjustZoom(0.1)
  },
  {
    label: "Zoom out",
    hint: "Ctrl+-",
    run: () => adjustZoom(-0.1)
  }
];

function openPalette() {
  paletteBackdrop.classList.add("open");
  paletteInput.value = "";
  renderPalette("");
  setTimeout(() => paletteInput.focus(), 0);
}

function closePalette() {
  paletteBackdrop.classList.remove("open");
}

function renderPalette(filter) {
  const needle = String(filter || "").toLowerCase();

  paletteList.innerHTML = "";

  for (const command of commands) {
    if (needle && !command.label.toLowerCase().includes(needle)) {
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-option";

    const label = document.createElement("span");
    label.textContent = command.label;

    const hint = document.createElement("span");
    hint.textContent = command.hint || "";

    button.appendChild(label);
    button.appendChild(hint);

    button.addEventListener("click", () => {
      closePalette();
      command.run();
    });

    paletteList.appendChild(button);
  }
}

function initializeBrand() {
  brandName.textContent = String(window.APP_NAME || "VIEWER//09");
  brandTagline.textContent = String(
    window.APP_TAGLINE || "PUBLIC WEB TEST VIEWER"
  );

  document.title = String(window.APP_NAME || "VIEWER//09");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  navigate(input.value, true);
});

backButton.addEventListener("click", goBack);
forwardButton.addEventListener("click", goForward);
reloadButton.addEventListener("click", reloadPage);
homeButton.addEventListener("click", () => navigate(homeUrl(), true));
bookmarkButton.addEventListener("click", toggleBookmark);
themeButton.addEventListener("click", toggleTheme);

menuButton.addEventListener("click", () => {
  drawer.classList.add("open");
  renderDrawer();
  loadConfigAndMetrics();
});

drawerClose.addEventListener("click", () => {
  drawer.classList.remove("open");
});

clearHistoryButton.addEventListener("click", () => {
  saveJson(STORE.history, []);
  renderDrawer();
  toast("History cleared");
});

domainTestButton.addEventListener("click", testDomain);
domainInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    testDomain();
  }
});

inspectButton.addEventListener("click", inspectCurrent);

newTabButton.addEventListener("click", () => {
  createTab();
});

viewer.addEventListener("load", () => {
  const tab = currentTab();

  finishLoading(
    tab && tab.url
      ? tab.url
      : "Loaded."
  );
});

window.addEventListener("message", (event) => {
  const backend = backendBase();

  if (!backend) {
    return;
  }

  let backendOrigin;

  try {
    backendOrigin = new URL(backend).origin;
  } catch {
    return;
  }

  if (event.origin !== backendOrigin) {
    return;
  }

  const data = event.data || {};

  if (data.source !== "viewer09") {
    return;
  }

  if (data.type === "find-result") {
    toast(data.found ? "Match found" : "No match");
    return;
  }

  if (data.type === "zoom-result") {
    return;
  }

  if (data.type !== "location") {
    return;
  }

  const tab = currentTab();

  if (!tab) {
    return;
  }

  const target = normalizeInput(data.url);

  if (!target) {
    return;
  }

  tab.url = target;
  tab.title = data.title
    ? String(data.title).slice(0, 80)
    : target.replace(/^https?:\/\//, "").split("/")[0];

  input.value = target;

  if (tab.history[tab.index] !== target) {
    if (tab.index < tab.history.length - 1) {
      tab.history.splice(tab.index + 1);
    }

    tab.history.push(target);
    tab.index = tab.history.length - 1;
  }

  addHistoryEntry(target, tab.title);
  renderTabs();
  updateNavButtons();
  updateBookmarkButton();
  persistTabs();
  status.textContent = target;
});

paletteInput.addEventListener("input", () => {
  renderPalette(paletteInput.value);
});

paletteBackdrop.addEventListener("click", (event) => {
  if (event.target === paletteBackdrop) {
    closePalette();
  }
});

findNext.addEventListener("click", () => runFind(false));
findPrev.addEventListener("click", () => runFind(true));
findClose.addEventListener("click", () => {
  findbar.classList.remove("open");
});

findInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    runFind(event.shiftKey);
  }

  if (event.key === "Escape") {
    findbar.classList.remove("open");
  }
});

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const mod = event.ctrlKey || event.metaKey;

  if (mod && key === "l") {
    event.preventDefault();
    input.focus();
    input.select();
  }

  if (mod && key === "r") {
    event.preventDefault();
    reloadPage();
  }

  if (mod && key === "t" && !event.shiftKey) {
    event.preventDefault();
    createTab();
  }

  if (mod && event.shiftKey && key === "t") {
    event.preventDefault();
    reopenClosed();
  }

  if (mod && key === "w") {
    event.preventDefault();

    if (activeTabId !== null) {
      closeTab(activeTabId);
    }
  }

  if (mod && key === "k") {
    event.preventDefault();
    openPalette();
  }

  if (mod && key === "f") {
    event.preventDefault();
    findbar.classList.add("open");
    findInput.focus();
    findInput.select();
  }

  if (mod && (event.key === "+" || event.key === "=")) {
    event.preventDefault();
    adjustZoom(0.1);
  }

  if (mod && event.key === "-") {
    event.preventDefault();
    adjustZoom(-0.1);
  }

  if (mod && event.key === "0") {
    event.preventDefault();
    zoomLevel = 1;
    sendToPage("zoom", { zoom: 1 });
    toast("Zoom 100%");
  }

  if (event.altKey && event.key === "ArrowLeft") {
    event.preventDefault();
    goBack();
  }

  if (event.altKey && event.key === "ArrowRight") {
    event.preventDefault();
    goForward();
  }

  if (event.key === "Escape") {
    closePalette();
    findbar.classList.remove("open");
  }
});

applyTheme(localStorage.getItem(STORE.theme) || "dark");
initializeBrand();
renderQuickLinks();
renderDrawer();
restoreTabs();
checkBackend();
setInterval(checkBackend, 60000);

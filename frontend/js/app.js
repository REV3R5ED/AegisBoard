/* AegisBoard SPA — router, API client, shell */
const api = {
  async get(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`GET ${path}: ${r.status}`);
    return r.json();
  },
  async run(tool, action, fields, fileInputs) {
    const fd = new FormData();
    fd.append("tool", tool);
    fd.append("action", action);
    fd.append("payload", JSON.stringify(fields));
    for (const [name, file] of Object.entries(fileInputs)) {
      if (file) fd.append(name, file, file.name);
    }
    const r = await fetch("/api/run", { method: "POST", body: fd });
    return r.json();
  },
};

const state = { tools: [], status: {}, toolMap: {} };

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const sevClass = (s) => (s || "info").toLowerCase();

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function toast(msg, kind = "ok") {
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.innerHTML = `<span>${kind === "ok" ? "✓" : "✕"}</span><span>${esc(msg)}</span>`;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

/* ---------- JSON syntax-highlighted viewer ---------- */
function jsonHtml(obj) {
  const json = JSON.stringify(obj, null, 2)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return json.replace(
    /("(\\u[a-f0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(\.\d+)?([eE][+-]?\d+)?/g,
    (m) => {
      let cls = "j-num";
      if (/^"/.test(m)) cls = /:$/.test(m) ? "j-key" : "j-str";
      else if (/true|false/.test(m)) cls = "j-bool";
      else if (/null/.test(m)) cls = "j-null";
      return `<span class="${cls}">${m}</span>`;
    }
  );
}

/* ---------- Router ---------- */
const routes = {};
function route(path, fn) { routes[path] = fn; }

function navigate() {
  const hash = location.hash || "#/";
  const [_, page, arg] = hash.split("/");
  const view = document.getElementById("view");
  const crumb = document.getElementById("crumb");
  document.querySelectorAll(".nav-item").forEach((n) =>
    n.classList.toggle("active", n.dataset.route === hash)
  );
  view.scrollTop = 0;
  if (page === "" || page === undefined) return renderDashboard(view, crumb);
  if (page === "investigation") return renderInvestigation(view, crumb);
  if (page === "tool" && arg) return renderTool(view, crumb, arg);
  view.innerHTML = `<div class="empty"><div class="big">🔍</div>Page not found.</div>`;
}

function buildNav() {
  const nav = document.getElementById("nav");
  let html = `<div class="nav-section">Operations</div>
    <a class="nav-item" data-route="#/" href="#/">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
      Dashboard</a>
    <a class="nav-item" data-route="#/investigation" href="#/investigation">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>
      Investigation</a>
    <div class="nav-section">Engines</div>`;
  for (const t of state.tools) {
    html += `<a class="nav-item" data-route="#/tool/${t.id}" href="#/tool/${t.id}">
      <span class="nav-dot" style="background:${t.color}"></span>${esc(t.name)}
      <span class="nav-meta">${esc(t.domain.split(" ")[0])}</span></a>`;
  }
  nav.innerHTML = html;
}

async function boot() {
  try {
    const [toolsRes, statusRes] = await Promise.all([
      api.get("/api/tools"), api.get("/api/status"),
    ]);
    state.tools = toolsRes.tools;
    state.status = statusRes.tools;
    for (const t of state.tools) state.toolMap[t.id] = t;
    buildNav();
    const online = Object.values(state.status).filter((s) => s.available).length;
    document.getElementById("status-dot").className = `dot ${online === 8 ? "ok" : "pulse"}`;
    document.getElementById("status-text").textContent = `${online}/8 engines online`;
  } catch (e) {
    document.getElementById("status-text").textContent = "Backend unreachable";
    toast("Could not reach the AegisBoard backend.", "err");
  }
  window.addEventListener("hashchange", navigate);
  navigate();
}

document.addEventListener("DOMContentLoaded", boot);

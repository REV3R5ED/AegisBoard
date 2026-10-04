/* AegisBoard views — dashboard, investigation, tool pages */

function toolColor(id) {
  return (state.toolMap[id] && state.toolMap[id].color) || "#22d3ee";
}
function toolName(id) {
  return (state.toolMap[id] && state.toolMap[id].name) || id;
}

/* ================= Dashboard ================= */
async function renderDashboard(view, crumb) {
  crumb.innerHTML = `<b>Dashboard</b> · fleet overview`;
  view.innerHTML = `
    <div class="page-head">
      <div class="page-title">Security operations overview</div>
      <div class="page-sub">Eight specialist engines, one investigation surface.</div>
    </div>
    <div class="grid kpi">
      <div class="card"><h3>Case coverage</h3><div class="kpi-value kpi-ok">100%</div><div class="kpi-sub">8/8 indicators · BLACKECHO-001</div></div>
      <div class="card"><h3>Findings</h3><div class="kpi-value">26</div><div class="kpi-sub">normalized across all engines</div></div>
      <div class="card"><h3>Engines online</h3><div class="kpi-value kpi-accent" id="kpi-engines">…</div><div class="kpi-sub">live CLI availability</div></div>
      <div class="card"><h3>Relationships</h3><div class="kpi-value">6<span style="font-size:16px;color:var(--text-3)">/6</span></div><div class="kpi-sub">cross-tool links reconstructed</div></div>
    </div>
    <div class="section-title">Engines</div>
    <div class="section-sub">Click an engine to run it interactively.</div>
    <div class="grid tools" id="tool-grid"></div>
    <div class="section-title">Latest case activity</div>
    <div class="card"><div class="timeline" id="mini-timeline"></div></div>`;

  const online = Object.values(state.status).filter((s) => s.available).length;
  document.getElementById("kpi-engines").textContent = `${online}/8`;

  document.getElementById("tool-grid").innerHTML = state.tools.map((t) => {
    const st = state.status[t.id] || {};
    return `<div class="card hoverable tool-card" style="--tc:${t.color}" onclick="location.hash='#/tool/${t.id}'">
      <div class="tool-domain">${esc(t.domain)}</div>
      <div class="tool-head"><span class="nav-dot" style="background:${t.color}"></span>
        <span class="tool-name">${esc(t.name)}</span></div>
      <div class="tool-tag">${esc(t.tagline)}</div>
      <div class="tool-foot">
        <span class="status-pill ${st.available ? "on" : "off"}">${st.available ? "ONLINE" : "OFFLINE"}</span>
        <span class="link-arrow">Open →</span>
      </div></div>`;
  }).join("");

  try {
    const c = await api.get("/api/case");
    const items = (c.timeline || []).slice(-5).reverse();
    document.getElementById("mini-timeline").innerHTML = items.map((e) => `
      <div class="tl-item" style="--tc:${toolColor(e.tool)}">
        <div class="tl-time">${esc(e.timestamp)}</div>
        <div class="tl-title">${esc(e.title)}</div>
        <div class="tl-tool">${esc(toolName(e.tool))}</div>
      </div>`).join("");
  } catch (e) { /* case data optional */ }
}

/* ================= Investigation ================= */
let invTab = "timeline";
let invCase = null;
let findingFilter = { tool: "", severity: "", q: "" };

async function renderInvestigation(view, crumb) {
  crumb.innerHTML = `<b>Investigation</b> · BLACKECHO-001`;
  view.innerHTML = `
    <div class="page-head">
      <div class="page-title">BLACKECHO-001 — phishing → persistence</div>
      <div class="page-sub">Synthetic intrusion reconstructed end-to-end by all eight engines.</div>
    </div>
    <div class="grid kpi" id="inv-kpis"></div>
    <div class="tabs">
      <div class="tab ${invTab === "timeline" ? "active" : ""}" data-tab="timeline">Timeline</div>
      <div class="tab ${invTab === "findings" ? "active" : ""}" data-tab="findings">Findings</div>
      <div class="tab ${invTab === "graph" ? "active" : ""}" data-tab="graph">Relationships</div>
      <div class="tab ${invTab === "report" ? "active" : ""}" data-tab="report">Report</div>
    </div>
    <div id="inv-body"><div class="card"><div class="skeleton" style="height:220px"></div></div></div>
    <div class="scrim" id="scrim" onclick="closeDrawer()"></div>
    <aside class="drawer" id="drawer"><div class="drawer-head"><b>Finding detail</b><button class="drawer-close" onclick="closeDrawer()">×</button></div><div class="drawer-body" id="drawer-body"></div></aside>`;

  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => { invTab = t.dataset.tab; renderInvestigation(view, crumb); })
  );

  try {
    invCase = await api.get("/api/case");
  } catch (e) {
    document.getElementById("inv-body").innerHTML =
      `<div class="empty"><div class="big">⚠️</div>Could not load case data.</div>`;
    return;
  }
  const s = invCase.scoring || {};
  document.getElementById("inv-kpis").innerHTML = `
    <div class="card"><h3>Coverage</h3><div class="kpi-value kpi-ok">${s.coverage_pct ?? "—"}%</div><div class="kpi-sub">${s.recovered ?? "—"}/${s.expected_indicators ?? "—"} indicators</div></div>
    <div class="card"><h3>False positives</h3><div class="kpi-value">${s.false_positives ?? "—"}</div><div class="kpi-sub">benign distractors elevated</div></div>
    <div class="card"><h3>Misses</h3><div class="kpi-value">${(s.misses || []).length}</div><div class="kpi-sub">expected indicators not found</div></div>
    <div class="card"><h3>Attack techniques</h3><div class="kpi-value" style="font-size:22px;padding-top:6px">${(invCase.incident?.attack_ids || []).join(" · ")}</div><div class="kpi-sub">MITRE ATT&CK</div></div>`;

  const body = document.getElementById("inv-body");
  if (invTab === "timeline") renderInvTimeline(body);
  else if (invTab === "findings") renderInvFindings(body);
  else if (invTab === "graph") renderInvGraph(body);
  else renderInvReport(body);
}

function renderInvTimeline(body) {
  const items = invCase.timeline || [];
  body.innerHTML = `<div class="card"><div class="timeline">${items.map((e) => `
    <div class="tl-item" style="--tc:${toolColor(e.tool)}">
      <div class="tl-time">${esc(e.timestamp)}</div>
      <div class="tl-title">${esc(e.title)}</div>
      <div class="tl-tool">${esc(toolName(e.tool))} · ${esc(e.entity || "")}${e.severity ? ` · <span class="badge ${sevClass(e.severity)}">${esc(e.severity)}</span>` : ""}</div>
    </div>`).join("")}</div></div>`;
}

function renderInvFindings(body) {
  const findings = (invCase.findings || []).filter((f) => f.entity === "Finding");
  const tools = [...new Set(findings.map((f) => f.source_tool))].sort();
  body.innerHTML = `
    <div class="filter-bar">
      <select id="f-tool"><option value="">All engines</option>${tools.map((t) => `<option ${findingFilter.tool === t ? "selected" : ""} value="${t}">${esc(toolName(t))}</option>`).join("")}</select>
      <select id="f-sev"><option value="">All severities</option>${["critical", "high", "medium", "low", "info"].map((s) => `<option ${findingFilter.severity === s ? "selected" : ""}>${s}</option>`).join("")}</select>
      <input id="f-q" type="text" placeholder="Search findings…" value="${esc(findingFilter.q)}" style="flex:1;min-width:200px">
    </div>
    <div class="card" style="padding:0;overflow:hidden"><table class="data"><thead><tr>
      <th>Severity</th><th>Finding</th><th>Engine</th><th>Technique</th><th>Confidence</th>
    </tr></thead><tbody id="f-rows"></tbody></table></div>`;

  const draw = () => {
    const rows = findings
      .filter((f) =>
        (!findingFilter.tool || f.source_tool === findingFilter.tool) &&
        (!findingFilter.severity || sevClass(f.severity) === findingFilter.severity) &&
        (!findingFilter.q || JSON.stringify(f).toLowerCase().includes(findingFilter.q.toLowerCase()))
      )
      .sort((a, b) => (SEV_ORDER[sevClass(a.severity)] ?? 9) - (SEV_ORDER[sevClass(b.severity)] ?? 9));
    document.getElementById("f-rows").innerHTML = rows.map((f, i) => `
      <tr onclick="openFinding(${findings.indexOf(f)})">
        <td><span class="badge ${sevClass(f.severity)}">${esc(f.severity || "info")}</span></td>
        <td><b>${esc(f.title || f.id)}</b><div class="dim ellipsis">${esc(f.description || "")}</div></td>
        <td><span class="badge tool" style="color:${toolColor(f.source_tool)};border-color:${toolColor(f.source_tool)}55">${esc(toolName(f.source_tool))}</span></td>
        <td class="mono dim">${esc((f.attack_ids || []).join(", ") || "—")}</td>
        <td class="mono">${f.confidence ?? "—"}</td>
      </tr>`).join("") ||
      `<tr><td colspan="5"><div class="empty">No findings match the filters.</div></td></tr>`;
  };
  document.getElementById("f-tool").onchange = (e) => { findingFilter.tool = e.target.value; draw(); };
  document.getElementById("f-sev").onchange = (e) => { findingFilter.severity = e.target.value; draw(); };
  document.getElementById("f-q").oninput = (e) => { findingFilter.q = e.target.value; draw(); };
  draw();
}

function openFinding(idx) {
  const f = (invCase.findings || []).filter((x) => x.entity === "Finding")[idx];
  if (!f) return;
  document.getElementById("drawer-body").innerHTML = `
    <div style="margin-bottom:12px"><span class="badge ${sevClass(f.severity)}">${esc(f.severity || "info")}</span>
    <span class="badge tool" style="color:${toolColor(f.source_tool)};border-color:${toolColor(f.source_tool)}55;margin-left:6px">${esc(toolName(f.source_tool))}</span></div>
    <h3 style="margin-bottom:8px">${esc(f.title || f.id)}</h3>
    <p class="dim" style="margin-bottom:14px">${esc(f.description || "")}</p>
    <div class="json-view">${jsonHtml(f)}</div>`;
  document.getElementById("drawer").classList.add("open");
  document.getElementById("scrim").classList.add("open");
}
function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("scrim").classList.remove("open");
}

function renderInvGraph(body) {
  const rels = invCase.relationships || [];
  // Fixed layout: nodes positioned for readability
  const nodes = [
    { id: "email", label: "Phishing email", sub: "phishscope", x: 90, y: 60, c: "#38bdf8" },
    { id: "attach", label: "Attachment", sub: "invoice-logo.jpg", x: 90, y: 200, c: "#a78bfa" },
    { id: "endpoint", label: "Endpoint execution", sub: "huntforge", x: 340, y: 60, c: "#f472b6" },
    { id: "persist", label: "Persistence", sub: "registry run key", x: 340, y: 200, c: "#f472b6" },
    { id: "network", label: "Network activity", sub: "netscope", x: 590, y: 60, c: "#fbbf24" },
    { id: "ioc", label: "IOC triage", sub: "sentinelkit", x: 590, y: 200, c: "#fb7185" },
    { id: "case", label: "DFIR case", sub: "aegisforge", x: 340, y: 330, c: "#22d3ee" },
  ];
  const edges = [
    ["email", "attach", "attachment"], ["email", "endpoint", "51 min"],
    ["endpoint", "persist", "run key"], ["endpoint", "network", "C2-ish"],
    ["network", "ioc", "enrich"], ["attach", "ioc", "hash"],
    ["ioc", "case", "evidence"], ["endpoint", "case", "timeline"],
  ];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const W = 760, H = 400, NW = 150, NH = 52;
  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  for (const [a, b, label] of edges) {
    const A = byId[a], B = byId[b];
    const x1 = A.x + NW / 2, y1 = A.y + NH / 2, x2 = B.x + NW / 2, y2 = B.y + NH / 2;
    const mx = (x1 + x2) / 2;
    svg += `<path class="g-edge" d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none" marker-end="url(#arr)"/>`;
    svg += `<text class="g-edge-label" x="${mx}" y="${(y1 + y2) / 2 - 6}" text-anchor="middle">${esc(label)}</text>`;
  }
  svg += `<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="#64748b" stroke-width="1.4"/></marker></defs>`;
  for (const n of nodes) {
    svg += `<g class="g-node"><rect x="${n.x}" y="${n.y}" width="${NW}" height="${NH}" rx="9" style="stroke:${n.c}66"/>
      <circle cx="${n.x + 20}" cy="${n.y + NH / 2}" r="6" fill="${n.c}"/>
      <text x="${n.x + 34}" y="${n.y + 23}">${esc(n.label)}</text>
      <text class="g-sub" x="${n.x + 34}" y="${n.y + 38}">${esc(n.sub)}</text></g>`;
  }
  svg += `</svg>`;
  body.innerHTML = `
    <div class="graph-wrap">${svg}</div>
    <div class="rel-list card" style="padding:0;overflow:hidden"><table class="data"><thead><tr>
      <th>Link</th><th>Evidence</th><th>Status</th>
    </tr></thead><tbody>${rels.map((r) => `
      <tr><td class="mono">${esc(r.type)}</td><td>${esc(r.evidence)}</td>
      <td>${r.status === "reconstructed" ? '<span class="check">✓ reconstructed</span>' : '<span class="cross">✕ missing</span>'}</td></tr>`).join("")}
    </tbody></table></div>`;
}

function renderInvReport(body) {
  const s = invCase.scoring || {};
  const by = s.by_indicator || {};
  body.innerHTML = `<div class="card report-body">
    <h2>Executive summary</h2>
    <p>On 2026-09-28, a finance employee at Northstar Meridian opened a vendor-themed invoice email.
    The attachment triggered an Office-to-PowerShell process chain, a payload-like executable was written
    to the user's temp directory, persistence was established via a Registry Run key, and the host
    contacted test infrastructure over DNS and TLS.</p>
    <p>All eight defensive tools were run against the synthetic evidence at pinned commits.
    Every expected indicator was recovered; no benign distractor was elevated.</p>
    <h2>Ground-truth comparison</h2>
    <table><tr><th>Indicator</th><th>Recovered</th></tr>
    ${Object.entries(by).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v ? '<span class="check">✓</span>' : '<span class="cross">✕</span>'}</td></tr>`).join("")}</table>
    <h2>Metrics</h2>
    <ul>
      <li>Coverage: <b>${s.coverage_pct ?? "—"}%</b> (${s.recovered ?? "—"}/${s.expected_indicators ?? "—"})</li>
      <li>False positives: <b>${s.false_positives ?? "—"}</b></li>
      <li>Misses: <b>${(s.misses || []).join(", ") || "none"}</b></li>
      <li>Engines reporting: <b>${(s.tools_reporting || []).length}</b>/8</li>
    </ul>
    <h2>Limitations</h2>
    <ul>
      <li>Synthetic evidence: payloads are inert placeholders; network destinations are documentation-range IPs.</li>
      <li>PhishScope is observation-only by design; verdicts are derived in the scoring layer.</li>
      <li>HuntForge <span class="mono">detect</span> exits 1 when findings exist (health-gate semantics).</li>
    </ul>
  </div>`;
}

/* ================= Tool page ================= */
async function renderTool(view, crumb, toolId) {
  const t = state.toolMap[toolId];
  if (!t) { view.innerHTML = `<div class="empty">Unknown tool.</div>`; return; }
  const st = state.status[toolId] || {};
  crumb.innerHTML = `<b>Engines</b> · ${esc(t.name)}`;
  view.innerHTML = `
    <div class="hero">
      <div class="hero-mark" style="background:${t.color}1f;border:1px solid ${t.color}55;color:${t.color}">${esc(t.name[0])}</div>
      <div>
        <div class="domain">${esc(t.domain)}</div>
        <h1>${esc(t.name)}</h1>
        <div class="tagline">“${esc(t.tagline)}”</div>
      </div>
      <div style="margin-left:auto"><span class="status-pill ${st.available ? "on" : "off"}">${st.available ? "● ONLINE" : "● OFFLINE"}</span>
      <div class="dim mono" style="font-size:11px;margin-top:6px;text-align:right">${esc(st.version || "")}</div></div>
    </div>
    <div class="section-title">Actions</div>
    <div class="section-sub">Run ${esc(t.name)} live against your own input. Nothing leaves this host.</div>
    <div id="actions"></div>`;

  const wrap = document.getElementById("actions");
  wrap.innerHTML = t.actions.map((a, i) => `
    <div class="card action-card">
      <div class="action-head">
        <div><div class="action-title">${esc(a.label)}</div><div class="action-desc">${esc(a.description)}</div></div>
      </div>
      <div class="form-grid" id="form-${i}">
        ${a.inputs.map((inp) => `
          <div class="field"><label>${esc(inp.label)}</label>
          ${inp.type === "textarea"
            ? `<textarea data-inp="${inp.name}" placeholder="${esc(inp.placeholder || "")}"></textarea>`
            : inp.type === "file"
              ? `<input type="file" data-inp="${inp.name}" accept="${esc(inp.accept || "")}">`
              : `<input type="text" data-inp="${inp.name}" placeholder="${esc(inp.placeholder || "")}">`}
          </div>`).join("")}
      </div>
      <div style="margin-top:14px"><button class="btn btn-primary" id="run-${i}" ${st.available ? "" : "disabled"}>
        <span>▶</span> Run ${esc(a.label)}</button></div>
      <div id="result-${i}"></div>
    </div>`).join("");

  t.actions.forEach((a, i) => {
    const btn = document.getElementById(`run-${i}`);
    if (!btn || btn.disabled) return;
    btn.addEventListener("click", async () => {
      const fields = {}, fileInputs = {};
      document.querySelectorAll(`#form-${i} [data-inp]`).forEach((el) => {
        if (el.type === "file") { if (el.files[0]) fileInputs[el.dataset.inp] = el.files[0]; }
        else fields[el.dataset.inp] = el.value;
      });
      const resEl = document.getElementById(`result-${i}`);
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Running…`;
      resEl.innerHTML = `<div class="result-meta">executing <span class="mono">${esc(t.id)} · ${esc(a.id)}</span>…</div><div class="skeleton" style="height:120px"></div>`;
      try {
        const r = await api.run(t.id, a.id, fields, fileInputs);
        const ok = r.ok;
        resEl.innerHTML = `
          <div class="result-meta"><span class="${ok ? "result-ok" : "result-fail"}">${ok ? "✓" : "✕"} exit ${r.exit_code}</span>
          <span>${r.duration_ms ?? "—"} ms</span>
          ${(r.steps || []).map((s) => `<span class="dim">${esc(s.argv.join(" "))} → ${s.exit_code}</span>`).join("")}</div>
          ${r.stderr && !ok ? `<div class="json-view" style="margin-bottom:10px;color:var(--crit)">${esc(r.stderr.slice(0, 2000))}</div>` : ""}
          <div class="json-view">${jsonHtml(r.parsed ?? r.stdout ?? r)}</div>`;
        toast(ok ? `${t.name} · ${a.label} completed` : `${t.name} · ${a.label} failed`, ok ? "ok" : "err");
      } catch (e) {
        resEl.innerHTML = `<div class="result-meta result-fail">✕ request failed: ${esc(e.message)}</div>`;
        toast("Request failed: " + e.message, "err");
      }
      btn.disabled = false;
      btn.innerHTML = `<span>▶</span> Run ${esc(a.label)}`;
    });
  });
}

/* AegisBoard views — dashboard + tool workspaces */

function toolColor(id) {
  return (state.toolMap[id] && state.toolMap[id].color) || "#22d3ee";
}
function toolName(id) {
  return (state.toolMap[id] && state.toolMap[id].name) || id;
}

/* ================= Dashboard ================= */
async function renderDashboard(view, crumb) {
  crumb.innerHTML = `<b>Dashboard</b> · engine overview`;
  view.innerHTML = `
    <div class="page-head">
      <div class="page-title">Security toolkit</div>
      <div class="page-sub">Eight specialist engines behind one clean interface. Pick a tool and go.</div>
    </div>
    <div class="grid kpi">
      <div class="card"><h3>Engines online</h3><div class="kpi-value kpi-ok" id="kpi-engines">…</div><div class="kpi-sub">live CLI availability</div></div>
      <div class="card"><h3>Actions available</h3><div class="kpi-value" id="kpi-actions">…</div><div class="kpi-sub">across all engines</div></div>
      <div class="card"><h3>Runs this session</h3><div class="kpi-value kpi-accent" id="kpi-runs">0</div><div class="kpi-sub">tool executions</div></div>
      <div class="card"><h3>Success rate</h3><div class="kpi-value" id="kpi-rate">—</div><div class="kpi-sub">of executed runs</div></div>
    </div>
    <div class="section-title">Engines</div>
    <div class="section-sub">Click an engine to open its workspace.</div>
    <div class="grid tools" id="tool-grid"></div>
    <div class="section-title">Recent activity</div>
    <div class="card" style="padding:0;overflow:hidden">
      <table class="data"><thead><tr>
        <th>Time</th><th>Engine</th><th>Action</th><th>Result</th><th>Duration</th>
      </tr></thead><tbody id="hist-rows">
        <tr><td colspan="5"><div class="empty" style="padding:24px">No runs yet — open an engine and run something.</div></td></tr>
      </tbody></table>
    </div>`;

  const online = Object.values(state.status).filter((s) => s.available).length;
  document.getElementById("kpi-engines").textContent = `${online}/8`;
  document.getElementById("kpi-actions").textContent =
    state.tools.reduce((n, t) => n + t.actions.length, 0);

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
    const h = await api.get("/api/history");
    const runs = h.runs || [];
    document.getElementById("kpi-runs").textContent = runs.length;
    if (runs.length) {
      const okCount = runs.filter((r) => r.ok).length;
      document.getElementById("kpi-rate").textContent =
        `${Math.round((100 * okCount) / runs.length)}%`;
      document.getElementById("hist-rows").innerHTML = runs.slice(0, 10).map((r) => `
        <tr>
          <td class="mono dim">${esc(r.ts.replace("T", " ").replace("Z", ""))}</td>
          <td><span class="badge tool" style="color:${toolColor(r.tool)};border-color:${toolColor(r.tool)}55">${esc(r.tool_name)}</span></td>
          <td>${esc(r.action)}</td>
          <td>${r.ok ? '<span class="check">✓</span>' : `<span class="cross">✕ exit ${r.exit_code ?? "?"}</span>`}</td>
          <td class="mono dim">${r.duration_ms ?? "—"} ms</td>
        </tr>`).join("");
    }
  } catch (e) { /* history optional */ }
}

/* ================= Tool workspace ================= */
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
    <div class="section-sub">Run ${esc(t.name)} against your own input. Nothing leaves this host.</div>
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

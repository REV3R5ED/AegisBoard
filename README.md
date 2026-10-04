# AegisBoard — Unified DFIR Dashboard

One professional web interface over all eight specialist engines:

| Engine | Domain |
|---|---|
| PhishScope | Email & phishing forensics |
| MetaTrace | Image forensics & metadata |
| HuntForge | Endpoint threat hunting |
| LogLens | Log analysis |
| NetScope | Network investigation |
| SentinelKit | IOC triage |
| AegisForge | DFIR case management |
| AutoOPS | Operational validation |

Plus a full **Investigation** view: the BLACKECHO-001 case reconstructed end-to-end —
timeline, findings, cross-tool relationship graph, ground-truth scoring, analyst report.

## Run it

```bash
pip install -r requirements.txt
# install the 8 engines (editable checkouts or pip)
uvicorn backend.app:app --host 127.0.0.1 --port 8077
```

Then open http://127.0.0.1:8077.

The dashboard probes each engine's CLI at startup (`--version`) and marks it
online/offline. Tool actions execute the real CLIs server-side in isolated temp
dirs with timeouts — nothing leaves the host.

## Layout

```
backend/    FastAPI app, tool registry (16 actions), safe subprocess runner
frontend/   Vanilla SPA: dashboard, investigation, 8 tool workspaces
data/       Bundled BLACKECHO-001 case (normalized findings, timeline, scoring)
```

## Safety

All wired actions are read-only analyses of user-supplied input. Uploads are
written to per-run temp directories and deleted afterwards. No shell
interpretation of arguments (`argv` lists only).

# AegisBoard — Web UI for the 8 DFIR Engines

One professional web interface over all eight specialist engines.
A technician opens the site, picks a tool, and uses it — no CLI required.

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

## Run it

```bash
pip install -r requirements.txt
# install the 8 engines (editable checkouts or pip)
uvicorn backend.app:app --host 127.0.0.1 --port 8077
```

Then open http://127.0.0.1:8077.

## How it works

- The dashboard probes each engine's CLI at startup (`--version`) and shows live online/offline status.
- Each engine gets its own workspace with actions rendered from a registry
  (`backend/registry.py`) — 16 actions in v1: analyze a `.eml`, inspect an
  image, run HuntForge detections on a Sysmon export, classify an IP, extract
  IOCs from pasted text, open a DFIR case, and more.
- Actions execute the real CLIs server-side in isolated temp dirs with
  timeouts. Nothing leaves the host.
- Recent runs appear on the dashboard with exit codes and durations.

## Layout

```
backend/    FastAPI app, tool registry (16 actions), safe subprocess runner
frontend/   Vanilla SPA: dashboard + 8 tool workspaces
```

## Safety

All wired actions are read-only analyses of user-supplied input. Uploads are
written to per-run temp directories and deleted afterwards. No shell
interpretation of arguments (`argv` lists only).

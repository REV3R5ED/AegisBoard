"""AegisBoard — unified DFIR dashboard over the 8 specialist engines.

Run:  uvicorn backend.app:app --host 127.0.0.1 --port 8077
Then: http://127.0.0.1:8077
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import registry, runner

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "blackecho"

app = FastAPI(title="AegisBoard", version="1.0.0")


def _case_payload() -> dict:
    def load(name: str):
        p = DATA / name
        return json.loads(p.read_text()) if p.exists() else None

    findings: list[dict] = []
    for tool_file in ["aegisforge", "autoops", "huntforge", "loglens",
                      "metatrace", "netscope", "phishscope", "sentinelkit"]:
        recs = load(f"{tool_file}.json") or []
        findings.extend(recs)
    return {
        "incident": load("incident.json"),
        "findings": findings,
        "timeline": load("timeline.json") or [],
        "relationships": load("relationships.json") or [],
        "scoring": load("results.json") or {},
    }


@app.get("/api/tools")
def api_tools():
    return {"tools": registry.public_registry()}


@app.get("/api/status")
def api_status():
    statuses = {}
    for t in registry.TOOLS:
        statuses[t["id"]] = runner.probe(t["binary"])
    return {"tools": statuses}


@app.get("/api/case")
def api_case():
    return _case_payload()


@app.post("/api/run")
async def api_run(
    tool: str = Form(...),
    action: str = Form(...),
    payload: str = Form("{}"),
    files: list[UploadFile] = File(default=[]),
):
    tool_def = registry.get_tool(tool)
    action_def = registry.get_action(tool, action) if tool_def else None
    if not tool_def or not action_def:
        return JSONResponse({"ok": False, "error": "unknown tool/action"}, status_code=404)
    try:
        fields = json.loads(payload)
    except Exception:
        fields = {}
    uploads: dict[str, tuple[str, bytes]] = {}
    for f in files:
        uploads[f.name] = (f.filename or "upload", await f.read())
    result = runner.execute(tool_def, action_def, fields, uploads)
    return JSONResponse(result)


# --- frontend ---
app.mount("/js", StaticFiles(directory=ROOT / "frontend" / "js"), name="js")
app.mount("/css", StaticFiles(directory=ROOT / "frontend" / "css"), name="css")


@app.get("/")
def index():
    return FileResponse(ROOT / "frontend" / "index.html")

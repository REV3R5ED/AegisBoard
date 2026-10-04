"""AegisBoard runner — safe subprocess execution of the 8 tool CLIs.

- argv lists only, never shell=True
- per-run temp dir, cleaned up afterwards
- timeouts; stdout parsed as JSON when possible
- HuntForge multi-step chains run in an isolated state dir
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

TIMEOUT_S = 90


def resolve_binary(name: str) -> str:
    """Find the tool binary: current venv first, then PATH."""
    venv_bin = Path(sys.prefix) / "bin" / name
    if venv_bin.exists():
        return str(venv_bin)
    found = shutil.which(name)
    return found or name


def _run(argv: list[str], timeout: int = TIMEOUT_S) -> dict:
    started = time.monotonic()
    argv = [resolve_binary(argv[0])] + argv[1:]
    try:
        proc = subprocess.run(
            argv, capture_output=True, text=True, timeout=timeout, check=False
        )
        out = proc.stdout or ""
        parsed = None
        try:
            parsed = json.loads(out)
        except Exception:
            pass
        return {
            "ok": proc.returncode == 0,
            "exit_code": proc.returncode,
            "stdout": out[:200_000],
            "stderr": (proc.stderr or "")[:20_000],
            "parsed": parsed,
            "duration_ms": int((time.monotonic() - started) * 1000),
        }
    except subprocess.TimeoutExpired:
        return {"ok": False, "exit_code": -1, "stdout": "",
                "stderr": f"timed out after {timeout}s", "parsed": None,
                "duration_ms": timeout * 1000}
    except FileNotFoundError:
        return {"ok": False, "exit_code": -1, "stdout": "",
                "stderr": f"binary not found: {argv[0]}", "parsed": None,
                "duration_ms": 0}


def _huntforge_chain(kind: str, sysmon_path: str) -> dict:
    """Ingest Sysmon XML into an isolated case, then detect/timeline."""
    tmp = Path(tempfile.mkdtemp(prefix="aegisboard-hf-"))
    state = tmp / "state"
    case = "aegisboard-case"
    steps = [
        [resolve_binary("huntforge"), "--state-dir", str(state), "case", "create", "--name", case],
        [resolve_binary("huntforge"), "--state-dir", str(state), "ingest", "--case", case,
         "--kind", "sysmon", "--path", sysmon_path],
    ]
    if kind == "huntforge_detect":
        steps.append([resolve_binary("huntforge"), "--state-dir", str(state), "detect",
                      "--case", case, "--json"])
    else:
        steps.append([resolve_binary("huntforge"), "--state-dir", str(state), "timeline",
                      "--case", case, "--json"])
    results = []
    try:
        for argv in steps:
            r = _run(argv)
            results.append({"argv": argv[3:], "exit_code": r["exit_code"],
                            "ok": r["ok"]})
            if not r["ok"] and "detect" not in argv and "timeline" not in argv:
                break
        final = _run(steps[-1])
        final["steps"] = results
        # HuntForge detect exits 1 when findings exist — that's a result, not a failure
        if kind == "huntforge_detect" and final["exit_code"] == 1 and final["parsed"]:
            final["ok"] = True
        return final
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def execute(tool: dict, action: dict, fields: dict[str, str],
            files: dict[str, tuple[str, bytes]]) -> dict:
    """Run one registry action. fields=text inputs, files=name->(filename, bytes)."""
    tmp = Path(tempfile.mkdtemp(prefix="aegisboard-"))
    try:
        paths: dict[str, str] = {}
        # text_to_file: write a textarea into a temp file for CLIs needing a path
        if "text_to_file" in action:
            src = action["text_to_file"]
            p = tmp / f"{src}.txt"
            p.write_text(fields.get(src, ""), encoding="utf-8")
            paths[f"{src}_file"] = str(p)
        for name, (filename, data) in files.items():
            p = tmp / f"{name}_{filename}".replace("/", "_")
            p.write_bytes(data)
            paths[name] = str(p)

        if "chain" in action:
            sysmon = paths.get("sysmon")
            if not sysmon:
                return {"ok": False, "error": "missing Sysmon XML upload"}
            return _huntforge_chain(action["chain"], sysmon)

        argv = [tool["binary"]]
        for token in action["argv"]:
            if token.startswith("{") and token.endswith("}"):
                key = token[1:-1]
                argv.append(paths.get(key, fields.get(key, "")))
            else:
                argv.append(token)
        return _run(argv)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def probe(binary: str) -> dict:
    r = _run([resolve_binary(binary), "--version"], timeout=15)
    return {"available": r["ok"] or r["exit_code"] == 0,
            "version": (r["stdout"] or r["stderr"]).strip().splitlines()[0][:80]
            if (r["stdout"] or r["stderr"]).strip() else "unknown"}

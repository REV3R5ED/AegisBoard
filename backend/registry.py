"""AegisBoard tool registry — the 8 specialist engines and their UI actions.

Each action declares its inputs; the frontend renders forms from this metadata
and POSTs to /api/run. argv templates are resolved server-side only.
"""

from __future__ import annotations

TOOLS: list[dict] = [
    {
        "id": "phishscope",
        "name": "PhishScope",
        "tagline": "Trace the message. Expose the evidence.",
        "domain": "Email & phishing forensics",
        "color": "#38bdf8",
        "binary": "phishscope",
        "actions": [
            {
                "id": "analyze",
                "label": "Analyze email",
                "description": "Full safe analysis of a .eml message: headers, auth, URLs, attachments, impersonation signals.",
                "inputs": [
                    {"name": "eml", "type": "file", "label": ".eml file", "accept": ".eml,message/rfc822"}
                ],
                "argv": ["analyze", "{eml}", "--json"],
            },
            {
                "id": "urls",
                "label": "Extract URLs",
                "description": "List and classify every URL found in the message.",
                "inputs": [
                    {"name": "eml", "type": "file", "label": ".eml file", "accept": ".eml,message/rfc822"}
                ],
                "argv": ["urls", "{eml}", "--json"],
            },
            {
                "id": "auth",
                "label": "Check authentication",
                "description": "SPF, DKIM and DMARC evaluation for the message.",
                "inputs": [
                    {"name": "eml", "type": "file", "label": ".eml file", "accept": ".eml,message/rfc822"}
                ],
                "argv": ["auth", "{eml}", "--json"],
            },
        ],
    },
    {
        "id": "metatrace",
        "name": "MetaTrace",
        "tagline": "Trace the story behind the image.",
        "domain": "Image forensics & metadata",
        "color": "#a78bfa",
        "binary": "metatrace",
        "actions": [
            {
                "id": "analyze",
                "label": "Inspect image",
                "description": "EXIF, GPS, XMP/IPTC, timestamps, device fingerprints and anomaly flags.",
                "inputs": [
                    {"name": "image", "type": "file", "label": "Image file", "accept": "image/*"}
                ],
                "argv": ["analyze", "{image}", "--json"],
            },
        ],
    },
    {
        "id": "huntforge",
        "name": "HuntForge",
        "tagline": "Hunt the endpoint. Reconstruct the attack.",
        "domain": "Endpoint threat hunting",
        "color": "#f472b6",
        "binary": "huntforge",
        "actions": [
            {
                "id": "detect",
                "label": "Run detections",
                "description": "Ingest a Sysmon XML export into an isolated case and run the detection rules.",
                "inputs": [
                    {"name": "sysmon", "type": "file", "label": "Sysmon XML", "accept": ".xml,text/xml"}
                ],
                "chain": "huntforge_detect",
            },
            {
                "id": "timeline",
                "label": "Build timeline",
                "description": "Chronological event timeline from the ingested Sysmon data.",
                "inputs": [
                    {"name": "sysmon", "type": "file", "label": "Sysmon XML", "accept": ".xml,text/xml"}
                ],
                "chain": "huntforge_timeline",
            },
        ],
    },
    {
        "id": "loglens",
        "name": "LogLens",
        "tagline": "Lightweight defensive log analysis.",
        "domain": "Log analysis",
        "color": "#34d399",
        "binary": "loglens",
        "actions": [
            {
                "id": "analyze",
                "label": "Analyze logs",
                "description": "Summarize a log file: levels, bursts, repeats, anomalies.",
                "inputs": [
                    {"name": "log", "type": "file", "label": "Log file (.log, .jsonl, .txt)", "accept": ".log,.jsonl,.txt,text/plain"}
                ],
                "argv": ["analyze", "{log}", "--json"],
            },
        ],
    },
    {
        "id": "netscope",
        "name": "NetScope",
        "tagline": "Defensive network visibility and diagnostics.",
        "domain": "Network investigation",
        "color": "#fbbf24",
        "binary": "netscope",
        "actions": [
            {
                "id": "address",
                "label": "Classify address",
                "description": "Local classification of one IPv4/IPv6 address (private, reserved, documentation…).",
                "inputs": [
                    {"name": "address", "type": "text", "label": "IP address", "placeholder": "203.0.113.44"}
                ],
                "argv": ["address", "{address}", "--json"],
            },
            {
                "id": "network",
                "label": "Classify network",
                "description": "Classify one IPv4/IPv6 network prefix.",
                "inputs": [
                    {"name": "network", "type": "text", "label": "Network prefix", "placeholder": "203.0.113.0/24"}
                ],
                "argv": ["network", "{network}", "--json"],
            },
        ],
    },
    {
        "id": "sentinelkit",
        "name": "SentinelKit",
        "tagline": "Defensive security analysis toolkit.",
        "domain": "IOC triage",
        "color": "#fb7185",
        "binary": "sentinelkit",
        "actions": [
            {
                "id": "ioc",
                "label": "Extract IOCs",
                "description": "Pull indicators (IPs, domains, URLs, hashes) out of pasted text.",
                "inputs": [
                    {"name": "text", "type": "textarea", "label": "Text to scan", "placeholder": "Paste suspicious text, headers, log lines…"}
                ],
                "argv": ["ioc", "{text_file}", "--format", "json"],
                "text_to_file": "text",
            },
            {
                "id": "ip",
                "label": "Classify IP",
                "description": "Reputation-style local classification of an IP address.",
                "inputs": [
                    {"name": "address", "type": "text", "label": "IP address", "placeholder": "203.0.113.44"}
                ],
                "argv": ["ip", "{address}", "--json"],
            },
            {
                "id": "hash",
                "label": "Hash & identify",
                "description": "SHA-256 of input text and digest-string identification.",
                "inputs": [
                    {"name": "text", "type": "text", "label": "Text or hash", "placeholder": "hello world"}
                ],
                "argv": ["hash", "{text}"],
            },
        ],
    },
    {
        "id": "aegisforge",
        "name": "AegisForge",
        "tagline": "Modular DFIR platform.",
        "domain": "DFIR case management",
        "color": "#22d3ee",
        "binary": "aegisforge",
        "actions": [
            {
                "id": "domain",
                "label": "Investigate domain",
                "description": "Consolidated domain investigation report (offline-safe).",
                "inputs": [
                    {"name": "domain", "type": "text", "label": "Domain", "placeholder": "example.com"}
                ],
                "argv": ["domain", "investigate", "{domain}", "--json"],
            },
            {
                "id": "case",
                "label": "Open case",
                "description": "Create a new DFIR case shell to attach evidence to.",
                "inputs": [
                    {"name": "title", "type": "text", "label": "Case title", "placeholder": "BLACKECHO-002"},
                    {"name": "note", "type": "text", "label": "Note", "placeholder": "Initial triage"},
                ],
                "argv": ["case", "create", "--title", "{title}", "--note", "{note}", "--json"],
            },
        ],
    },
    {
        "id": "autoops",
        "name": "AutoOPS",
        "tagline": "Safe, observable automation for IT operations.",
        "domain": "Operational validation",
        "color": "#94a3b8",
        "binary": "autoops",
        "actions": [
            {
                "id": "preflight",
                "label": "Preflight check",
                "description": "Read-only operational health checks on this host.",
                "inputs": [],
                "argv": ["preflight"],
            },
            {
                "id": "environment",
                "label": "Environment",
                "description": "Inspect runtime and host environment (read-only).",
                "inputs": [],
                "argv": ["environment"],
            },
        ],
    },
]


def get_tool(tool_id: str) -> dict | None:
    return next((t for t in TOOLS if t["id"] == tool_id), None)


def get_action(tool_id: str, action_id: str) -> dict | None:
    tool = get_tool(tool_id)
    if not tool:
        return None
    return next((a for a in tool["actions"] if a["id"] == action_id), None)


def public_registry() -> list[dict]:
    """Registry safe to send to the browser (no argv templates)."""
    out = []
    for t in TOOLS:
        out.append({
            "id": t["id"],
            "name": t["name"],
            "tagline": t["tagline"],
            "domain": t["domain"],
            "color": t["color"],
            "actions": [
                {"id": a["id"], "label": a["label"], "description": a["description"],
                 "inputs": a["inputs"]}
                for a in t["actions"]
            ],
        })
    return out

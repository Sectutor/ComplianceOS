"""
Sandbox Executor — Isolated Action Runtime
PREMIUM FEATURE

Runs agent actions in ephemeral Docker containers with:
- No outbound network (unless explicitly permitted)
- Read-only filesystem (except /output)
- Strict resource limits (CPU, memory, timeout)
- Full stdout/stderr/exit code capture → audit trail
"""
import os
import json
import uuid
import logging
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

log = logging.getLogger("sandbox")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Sandbox Executor", version="1.0.0")

AUDIT_DIR = Path(os.getenv("SANDBOX_AUDIT_DIR", "/audit"))
AUDIT_DIR.mkdir(parents=True, exist_ok=True)

MAX_MEMORY = os.getenv("SANDBOX_MAX_MEMORY", "512m")
MAX_CPU = os.getenv("SANDBOX_MAX_CPU", "1.0")
TIMEOUT = int(os.getenv("SANDBOX_TIMEOUT", "300"))


class ActionRequest(BaseModel):
    """An action to execute in a sandboxed container."""
    image: str = "alpine:latest"
    command: list[str]
    env: dict[str, str] = {}
    timeout: int = 60
    cpu: str = MAX_CPU
    memory: str = MAX_MEMORY
    allow_network: bool = False
    action_type: str = "read"  # read | write | destroy
    reason: str = ""


class ActionResponse(BaseModel):
    session_id: str
    success: bool
    exit_code: int
    stdout: str
    stderr: str
    duration_seconds: float
    requires_human_approval: bool = False
    audit_entry: Optional[dict] = None


# ── Endpoints ─────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "docker": _check_docker()}


@app.post("/execute", response_model=ActionResponse)
async def execute(req: ActionRequest):
    """Execute an action in an ephemeral sandbox container."""
    session_id = uuid.uuid4().hex[:12]
    start = datetime.now(timezone.utc)

    # Determine if HITL approval is needed
    needs_approval = req.action_type in ("write", "destroy")

    # Generate container name
    container_name = f"sandbox-{session_id}"

    # Build docker run args
    docker_args = [
        "docker", "run", "--rm",
        "--name", container_name,
        f"--memory={req.memory}",
        f"--cpus={req.cpu}",
        "--read-only",
        "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
        f"--env", f"SESSION_ID={session_id}",
    ]

    # Network policy
    if not req.allow_network:
        docker_args.append("--network=none")

    # Mount output directory
    output_dir = Path(tempfile.mkdtemp())
    docker_args.extend(["-v", f"{output_dir}:/output:rw"])

    # Add env vars
    for k, v in req.env.items():
        docker_args.extend(["-e", f"{k}={v}"])

    # Add image + command
    docker_args.append(req.image)
    docker_args.append("--")
    docker_args.extend(req.command)

    # Execute
    log.info(f"[{session_id}] Running: {' '.join(docker_args[:8])}... (timeout={req.timeout}s)")
    try:
        result = subprocess.run(
            docker_args,
            capture_output=True, text=True,
            timeout=req.timeout,
        )
    except subprocess.TimeoutExpired:
        subprocess.run(["docker", "kill", container_name], capture_output=True)
        stdout, stderr = "", "TIMEOUT: Action exceeded {req.timeout}s"
        exit_code = -1
        success = False
    else:
        stdout = result.stdout
        stderr = result.stderr
        exit_code = result.returncode
        success = result.returncode == 0

    duration = (datetime.now(timezone.utc) - start).total_seconds()

    # Build audit entry
    audit_entry = {
        "session_id": session_id,
        "action_type": req.action_type,
        "image": req.image,
        "command": " ".join(req.command),
        "exit_code": exit_code,
        "duration_seconds": round(duration, 2),
        "success": success,
        "stdout_truncated": stdout[:1000] if stdout else "",
        "stderr_truncated": stderr[:500] if stderr else "",
        "needs_human_approval": needs_approval,
        "approved": not needs_approval,
        "approved_by": None,
        "timestamp": start.isoformat(),
    }

    # Write audit log
    audit_file = AUDIT_DIR / f"{session_id}.json"
    with open(audit_file, "w") as f:
        json.dump(audit_entry, f, indent=2)

    return ActionResponse(
        session_id=session_id,
        success=success,
        exit_code=exit_code,
        stdout=stdout,
        stderr=stderr,
        duration_seconds=round(duration, 2),
        requires_human_approval=needs_approval,
        audit_entry=audit_entry,
    )


@app.get("/audit")
async def list_audit():
    """List all audit entries."""
    entries = []
    for f in sorted(AUDIT_DIR.glob("*.json"), reverse=True)[:100]:
        with open(f) as fh:
            entries.append(json.load(fh))
    return {"entries": entries, "count": len(entries)}


@app.get("/audit/{session_id}")
async def get_audit(session_id: str):
    """Get a specific audit entry."""
    audit_file = AUDIT_DIR / f"{session_id}.json"
    if not audit_file.exists():
        raise HTTPException(404, "Audit entry not found")
    return json.loads(audit_file.read_text())


@app.post("/approve/{session_id}")
async def approve(session_id: str, approved: bool = True, by: str = "system"):
    """Mark an action as approved/denied (HITL)."""
    audit_file = AUDIT_DIR / f"{session_id}.json"
    if not audit_file.exists():
        raise HTTPException(404, "Audit entry not found")
    entry = json.loads(audit_file.read_text())
    entry["approved"] = approved
    entry["approved_by"] = by
    entry["approved_at"] = datetime.now(timezone.utc).isoformat()
    audit_file.write_text(json.dumps(entry, indent=2))
    return {"status": "ok", "approved": approved, "session_id": session_id}


def _check_docker() -> bool:
    try:
        subprocess.run(["docker", "info"], capture_output=True, timeout=5)
        return True
    except Exception:
        return False


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8020)

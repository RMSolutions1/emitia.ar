import os
import posixpath
from pathlib import Path

import paramiko


LOCAL_ROOT = Path(__file__).resolve().parents[1]
REMOTE_ROOT = "/home/emitia/htdocs/www.emitia.com.ar"

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]

INCLUDE_FILES = [
    "package.json",
    "package-lock.json",
    "next.config.js",
    "tsconfig.json",
    "next-env.d.ts",
    "postcss.config.js",
    "tailwind.config.ts",
    "middleware.ts",
    ".env.example",
    ".gitignore",
]

INCLUDE_DIRS = [
    "app",
    "components",
    "hooks",
    "lib",
    "prisma",
    "public",
    "scripts",
]

OPTIONAL_GLOBS = [
    "*.crt",
    "*.key",
]

EXCLUDE_DIR_NAMES = {
    "node_modules",
    ".next",
    ".git",
    ".afip-cache",
    ".cursor",
}

EXCLUDE_FILE_NAMES = {
    ".env.local",
    ".env",
}


def _sftp_mkdir_p(sftp: paramiko.SFTPClient, remote_path: str) -> None:
    current = "/"
    for chunk in remote_path.strip("/").split("/"):
        current = posixpath.join(current, chunk)
        try:
            sftp.stat(current)
        except FileNotFoundError:
            sftp.mkdir(current)


def _upload_file(sftp: paramiko.SFTPClient, local_file: Path, remote_file: str) -> None:
    _sftp_mkdir_p(sftp, posixpath.dirname(remote_file))
    sftp.put(str(local_file), remote_file)


def _iter_files(base: Path):
    for p in base.rglob("*"):
        if p.is_dir():
            continue
        rel_parts = p.relative_to(base).parts
        if any(part in EXCLUDE_DIR_NAMES for part in rel_parts):
            continue
        if p.name in EXCLUDE_FILE_NAMES:
            continue
        yield p


def upload_project(sftp: paramiko.SFTPClient) -> None:
    uploaded = 0

    for f in INCLUDE_FILES:
        local_file = LOCAL_ROOT / f
        if local_file.exists():
            remote_file = posixpath.join(REMOTE_ROOT, f)
            _upload_file(sftp, local_file, remote_file)
            uploaded += 1
            print(f"uploaded file: {f}")

    for pattern in OPTIONAL_GLOBS:
        for local_file in LOCAL_ROOT.glob(pattern):
            remote_file = posixpath.join(REMOTE_ROOT, local_file.name)
            _upload_file(sftp, local_file, remote_file)
            uploaded += 1
            print(f"uploaded optional: {local_file.name}")

    for d in INCLUDE_DIRS:
        local_dir = LOCAL_ROOT / d
        if not local_dir.exists():
            continue
        for local_file in _iter_files(local_dir):
            rel = local_file.relative_to(LOCAL_ROOT).as_posix()
            remote_file = posixpath.join(REMOTE_ROOT, rel)
            _upload_file(sftp, local_file, remote_file)
            uploaded += 1
            if uploaded % 200 == 0:
                print(f"uploaded {uploaded} files...")

    print(f"total uploaded files: {uploaded}")


def run_remote(ssh: paramiko.SSHClient, cmd: str, timeout: int = 1800) -> tuple[str, str, int]:
    stdin, stdout, stderr = ssh.exec_command(f"bash -lc '{cmd}'", timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    return out, err, code


def main() -> int:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        HOST,
        port=PORT,
        username=USER,
        password=PASSWORD,
        timeout=20,
        allow_agent=False,
        look_for_keys=False,
    )

    sftp = ssh.open_sftp()
    _sftp_mkdir_p(sftp, REMOTE_ROOT)
    upload_project(sftp)
    sftp.close()

    install_cmd = (
        "cd /home/emitia/htdocs/www.emitia.com.ar && "
        "source ~/.nvm/nvm.sh && "
        "npm install --legacy-peer-deps"
    )
    out, err, code = run_remote(ssh, install_cmd, timeout=2400)
    print("=== npm install ===")
    print(out[-4000:])
    if err.strip():
        print(err[-2000:])
    if code != 0:
        ssh.close()
        return code

    build_cmd = (
        "cd /home/emitia/htdocs/www.emitia.com.ar && "
        "source ~/.nvm/nvm.sh && "
        "npm run build"
    )
    out, err, code = run_remote(ssh, build_cmd, timeout=3600)
    print("=== npm run build ===")
    print(out[-4000:])
    if err.strip():
        print(err[-2000:])
    if code != 0:
        ssh.close()
        return code

    start_cmd = (
        "mkdir -p ~/logs ~/tmp; "
        # Reinicio limpio: matar TODO lo que ocupe el 3001 (incluye 'next-server',
        # no solo 'next start'), si no el proceso viejo sigue sirviendo el build anterior.
        "fuser -k 3001/tcp 2>/dev/null || true; "
        "pkill -f \"next start\" 2>/dev/null || true; "
        "pkill -f \"next-server\" 2>/dev/null || true; "
        "sleep 3; "
        "cd /home/emitia/htdocs/www.emitia.com.ar && "
        "source ~/.nvm/nvm.sh && "
        "nohup npm run start -- -p 3001 > ~/logs/emitia-next.log 2>&1 < /dev/null & "
        "echo $! > ~/tmp/emitia-next.pid; "
        "sleep 8; "
        "ss -tlnp 2>/dev/null | grep ':3001' || echo NO_PORT_3001; "
        "tail -n 30 ~/logs/emitia-next.log || true"
    )
    out, err, code = run_remote(ssh, start_cmd, timeout=120)
    print("=== start app ===")
    print(out[-4000:])
    if err.strip():
        print(err[-2000:])

    check_cmd = (
        "curl -sI --max-time 12 http://127.0.0.1:3001 | head -10; "
        "curl -sI --max-time 12 https://www.emitia.com.ar | head -10"
    )
    out, err, _ = run_remote(ssh, check_cmd, timeout=120)
    print("=== health checks ===")
    print(out)
    if err.strip():
        print(err)

    ssh.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

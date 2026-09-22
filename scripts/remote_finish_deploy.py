import os

import paramiko


HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]


def run(ssh: paramiko.SSHClient, cmd: str, timeout: int = 1800) -> int:
    stdin, stdout, stderr = ssh.exec_command(f"bash -lc '{cmd}'", timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    print(f"\n=== {cmd} ===\n")
    if out.strip():
        print(out[-8000:])
    if err.strip():
        print(err[-4000:])
    print(f"exit={code}")
    return code


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

    base = "/home/emitia/htdocs/www.emitia.com.ar"

    code = run(
        ssh,
        f"cd {base} && source ~/.nvm/nvm.sh && npm install --legacy-peer-deps",
        timeout=2400,
    )
    if code != 0:
        ssh.close()
        return code

    code = run(
        ssh,
        f"cd {base} && source ~/.nvm/nvm.sh && npm run build",
        timeout=3600,
    )
    if code != 0:
        ssh.close()
        return code

    run(
        ssh,
        "mkdir -p ~/logs ~/tmp; "
        "pkill -f 'next start.*3001' || true; "
        f"cd {base} && source ~/.nvm/nvm.sh && "
        "nohup npm run start -- -p 3001 > ~/logs/emitia-next.log 2>&1 < /dev/null & "
        "echo $! > ~/tmp/emitia-next.pid; "
        "sleep 5; "
        "ss -tlnp 2>/dev/null | grep ':3001' || true; "
        "tail -n 40 ~/logs/emitia-next.log || true",
        timeout=120,
    )

    run(
        ssh,
        "curl -sI --max-time 12 http://127.0.0.1:3001 | head -10; "
        "curl -sI --max-time 12 https://www.emitia.com.ar | head -10",
        timeout=120,
    )

    ssh.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

import os

import paramiko


HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]


CMDS = [
    "source ~/.nvm/nvm.sh && node -v && npm -v",
    "sudo -n true; echo SUDO_EXIT:$?",
    "crontab -l 2>/dev/null | grep '3001' || echo NO_CRON_3001",
    "cd /home/emitia/htdocs/www.emitia.com.ar && ls -la | head -40",
    "ps -ef | grep next | grep 3001 | grep -v grep || true",
    "tail -n 60 ~/logs/emitia-next.log 2>/dev/null || echo NO_LOG",
    "ss -tlnp 2>/dev/null | grep ':3001' || echo PORT_3001_NOT_LISTENING",
    "curl -sI --max-time 12 http://127.0.0.1:3001 | head -10",
    "curl -sI --max-time 12 https://www.emitia.com.ar | head -10",
]


def main() -> int:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        HOST,
        port=PORT,
        username=USER,
        password=PASSWORD,
        timeout=20,
        allow_agent=False,
        look_for_keys=False,
    )

    for cmd in CMDS:
        stdin, stdout, stderr = client.exec_command(f"bash -lc '{cmd}'", timeout=120)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        code = stdout.channel.recv_exit_status()
        print(f"\n=== {cmd} ===")
        if out.strip():
            print(out)
        if err.strip():
            print(err)
        print(f"exit={code}")

    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

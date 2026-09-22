import os
import time

import paramiko


HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
BASE = "/home/emitia/htdocs/www.emitia.com.ar"


def exec_cmd(client: paramiko.SSHClient, cmd: str, timeout: int = 120):
    wrapped = f'bash -lc "{cmd.replace("\"", "\\\"")}"'
    stdin, stdout, stderr = client.exec_command(wrapped, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    print(f"\n=== {cmd} ===")
    if out.strip():
        print(out)
    if err.strip():
        print(err)
    print(f"exit={code}")
    return code


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

    exec_cmd(client, "mkdir -p ~/logs ~/tmp")
    exec_cmd(client, "pkill -f \"next start -- -p 3001\" || true")
    exec_cmd(
        client,
        f"cd {BASE} && source ~/.nvm/nvm.sh && nohup npm run start -- -p 3001 > ~/logs/emitia-next.log 2>&1 < /dev/null & echo $! > ~/tmp/emitia-next.pid",
    )
    time.sleep(5)
    exec_cmd(client, "cat ~/tmp/emitia-next.pid 2>/dev/null || echo NO_PID")
    exec_cmd(client, "ps -ef | grep \"next start\" | grep -v grep || true")
    exec_cmd(client, "ss -tlnp 2>/dev/null | grep ':3001' || echo PORT_3001_NOT_LISTENING")
    exec_cmd(client, "tail -n 80 ~/logs/emitia-next.log 2>/dev/null || echo NO_LOG")
    exec_cmd(client, "curl -sI --max-time 12 http://127.0.0.1:3001 | head -10")
    exec_cmd(client, "curl -sI --max-time 12 https://www.emitia.com.ar | head -10")

    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

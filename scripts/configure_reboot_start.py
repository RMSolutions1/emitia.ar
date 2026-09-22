import os

import paramiko


HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
BASE = "/home/emitia/htdocs/www.emitia.com.ar"


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

    cmd = (
        "bash -lc \""
        "mkdir -p ~/logs ~/tmp; "
        "line='@reboot bash -lc \\\"source ~/.nvm/nvm.sh && cd "
        + BASE
        + " && nohup npm run start -- -p 3001 > ~/logs/emitia-next.log 2>&1 < /dev/null &\\\"'; "
        "(crontab -l 2>/dev/null | grep -v 'npm run start -- -p 3001' ; echo \\\"$line\\\") | crontab -; "
        "crontab -l\""
    )
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    print(out)
    if err.strip():
        print(err)
    print(f"exit={code}")

    client.close()
    return 0 if code == 0 else code


if __name__ == "__main__":
    raise SystemExit(main())

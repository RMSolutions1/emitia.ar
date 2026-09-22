import os
import sys

import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]

LOCAL_SH = sys.argv[1]          # local path to .sh
REMOTE_SH = sys.argv[2]         # remote path to place .sh
REMOTE_LOG = sys.argv[3]        # remote log path
ACTION = sys.argv[4] if len(sys.argv) > 4 else "start"  # start|tail


def connect():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
              timeout=20, allow_agent=False, look_for_keys=False)
    return c


def run(c, cmd, timeout=40):
    _, stdout, stderr = c.exec_command(f"bash -lc '{cmd}'", timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err


def main():
    c = connect()
    if ACTION == "start":
        # upload, normalize line endings, launch in background
        sftp = c.open_sftp()
        with open(LOCAL_SH, "rb") as f:
            data = f.read().replace(b"\r\n", b"\n")
        with sftp.open(REMOTE_SH, "wb") as rf:
            rf.write(data)
        sftp.close()
        run(c, f"chmod +x {REMOTE_SH}; mkdir -p ~/logs")
        # launch detached
        launch = (
            f"nohup bash {REMOTE_SH} > {REMOTE_LOG} 2>&1 < /dev/null & echo STARTED_PID:$!"
        )
        out, err = run(c, launch, timeout=20)
        print(out.strip())
        if err.strip():
            print("ERR:", err.strip()[:300])
    elif ACTION == "tail":
        out, err = run(c, f"tail -n 40 {REMOTE_LOG} 2>/dev/null || echo NO_LOG", timeout=20)
        print(out)
        if err.strip():
            print("ERR:", err.strip()[:300])
    c.close()


if __name__ == "__main__":
    main()

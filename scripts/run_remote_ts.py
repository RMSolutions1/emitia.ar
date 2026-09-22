import os
import sys

import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
BASE = "/home/emitia/htdocs/www.emitia.com.ar"


def main() -> int:
    script = sys.argv[1] if len(sys.argv) > 1 else "complete-company.ts"
    local = os.path.join(os.path.dirname(__file__), script)
    remote = f"{BASE}/scripts/{os.path.basename(script)}"

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(
        HOST,
        port=PORT,
        username=USER,
        password=PASSWORD,
        timeout=20,
        allow_agent=False,
        look_for_keys=False,
    )

    sftp = c.open_sftp()
    sftp.put(local, remote)
    sftp.close()

    cmd = f"cd {BASE} && source ~/.nvm/nvm.sh && npx tsx scripts/{os.path.basename(script)}"
    _, so, se = c.exec_command(f"bash -lc '{cmd}'", timeout=120)
    out = so.read().decode("utf-8", "replace")
    err = se.read().decode("utf-8", "replace")
    print(out.strip())
    if err.strip():
        print("STDERR:", err.strip()[:800])
    c.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

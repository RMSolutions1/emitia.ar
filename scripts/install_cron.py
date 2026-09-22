import os

import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
          timeout=20, allow_agent=False, look_for_keys=False)

# upload boot script
sftp = c.open_sftp()
local = os.path.join(os.path.dirname(__file__), "emitia-boot.sh")
with open(local, "rb") as f:
    data = f.read().replace(b"\r\n", b"\n")
c.exec_command("bash -lc 'mkdir -p ~/bin ~/logs ~/tmp'")
import time
time.sleep(1)
with sftp.open("/home/emitia/bin/emitia-boot.sh", "wb") as rf:
    rf.write(data)
sftp.close()

cmds = [
    "chmod +x ~/bin/emitia-boot.sh",
    # rebuild crontab: @reboot + cada 5 min watchdog (sin duplicar)
    "( crontab -l 2>/dev/null | grep -v 'emitia-boot.sh' | grep -v 'npm run start -- -p 3001' ; "
    "echo '@reboot /bin/bash /home/emitia/bin/emitia-boot.sh' ; "
    "echo '*/5 * * * * /bin/bash /home/emitia/bin/emitia-boot.sh' ) | crontab -",
    "crontab -l",
]
for cmd in cmds:
    _, stdout, stderr = c.exec_command(f"bash -lc \"{cmd}\"", timeout=30)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    print(f"\n=== {cmd[:50]} ===")
    if out.strip():
        print(out.strip())
    if err.strip():
        print("ERR:", err.strip()[:300])
c.close()

"""Run emitia-boot watchdog on VPS."""
import os
import paramiko

PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("149.50.129.58", 5393, "emitia", PASSWORD, timeout=20, allow_agent=False, look_for_keys=False)
_, so, _ = c.exec_command("bash /home/emitia/bin/emitia-boot.sh && sleep 3 && curl -s http://127.0.0.1:3001/api/health/db", timeout=60)
print(so.read().decode())
c.close()

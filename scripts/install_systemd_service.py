"""Configura servicio systemd permanente emitia-next y limpia AI_PROVIDER forzado."""
import os
import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
APP_DIR = "/home/emitia/htdocs/www.emitia.com.ar"
NVM = "/home/emitia/.nvm/nvm.sh"

UNIT = f"""[Unit]
Description=EMITIA Next.js App
After=network.target

[Service]
Type=simple
User=emitia
Group=emitia
WorkingDirectory={APP_DIR}
Environment=HOME=/home/emitia
Environment=NVM_DIR=/home/emitia/.nvm
ExecStart=/bin/bash -lc 'source {NVM} && exec npm run start -- -p 3001'
Restart=always
RestartSec=5
StandardOutput=append:/home/emitia/logs/emitia-next.log
StandardError=append:/home/emitia/logs/emitia-next.log

[Install]
WantedBy=multi-user.target
"""


def run(c, cmd, timeout=120):
    _, so, se = c.exec_command(cmd, timeout=timeout)
    out = so.read().decode("utf-8", "replace")
    err = se.read().decode("utf-8", "replace")
    code = so.channel.recv_exit_status()
    return out, err, code


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
              timeout=20, allow_agent=False, look_for_keys=False)

    sftp = c.open_sftp()
    with sftp.open("/etc/systemd/system/emitia-next.service", "w") as f:
        f.write(UNIT)
    sftp.close()

    # Quitar AI_PROVIDER=gemini forzado (Gemini bloqueado por geo en AR; permite fallback)
    env_path = f"{APP_DIR}/.env"
    sftp = c.open_sftp()
    with sftp.open(env_path, "r") as f:
        lines = f.read().decode("utf-8").splitlines()
    new_lines = [ln for ln in lines if not ln.strip().startswith("AI_PROVIDER=")]
    with sftp.open(env_path, "w") as f:
        f.write("\n".join(new_lines) + "\n")
    sftp.close()
    print("Removed AI_PROVIDER=gemini from .env")

    cmds = [
        "mkdir -p /home/emitia/logs && chown emitia:emitia /home/emitia/logs",
        "systemctl daemon-reload",
        "systemctl stop emitia-next 2>/dev/null || true",
        "fuser -k 3001/tcp 2>/dev/null || true",
        "sleep 2",
        "systemctl enable emitia-next",
        "systemctl start emitia-next",
        "sleep 10",
        "systemctl is-active emitia-next",
        "ss -tlnp | grep ':3001' || echo NO_PORT",
        "curl -sI --max-time 10 http://127.0.0.1:3001 | head -3",
    ]
    for cmd in cmds:
        out, err, code = run(c, cmd)
        print(f"$ {cmd}")
        if out.strip():
            print(out.strip())
        if err.strip():
            print("ERR:", err.strip()[:200])
        print(f"exit={code}\n")

    c.close()


if __name__ == "__main__":
    main()

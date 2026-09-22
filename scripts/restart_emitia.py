"""Reinicia la app EMITIA en el VPS como usuario 'emitia' usando systemd-run
(servicio transitorio que sobrevive al cierre de la sesion SSH), conectando como root.

Uso: setear EMITIA_SSH_* y correr `python scripts/restart_emitia.py`.
"""
import os

import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]

APP_DIR = "/home/emitia/htdocs/www.emitia.com.ar"
NVM = "/home/emitia/.nvm/nvm.sh"


def run(c, cmd, timeout=120):
    _, so, se = c.exec_command(cmd, timeout=timeout)
    out = so.read().decode("utf-8", "replace")
    err = se.read().decode("utf-8", "replace")
    code = so.channel.recv_exit_status()
    return out, err, code


def main() -> int:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
              timeout=20, allow_agent=False, look_for_keys=False)

    # 1) Matar lo que ocupe el 3001 y servicios previos
    kill = (
        "fuser -k 3001/tcp 2>/dev/null || true; "
        "pkill -f 'next start' 2>/dev/null || true; "
        "pkill -f 'next-server' 2>/dev/null || true; "
        "systemctl stop emitia-next 2>/dev/null || true; "
        "systemctl reset-failed emitia-next 2>/dev/null || true; "
        "mkdir -p /home/emitia/logs && chown emitia:emitia /home/emitia/logs; "
        "sleep 2; echo KILLED"
    )
    out, err, code = run(c, kill)
    print("=== kill ===\n", out, err)

    # 2) Arrancar como 'emitia' via systemd-run (transitorio, desacoplado del SSH)
    inner = (
        f"source {NVM} && cd {APP_DIR} && exec npm run start -- -p 3001"
    )
    start = (
        "systemd-run --unit=emitia-next --collect "
        "--uid=emitia --gid=emitia "
        "-p WorkingDirectory=" + APP_DIR + " "
        "-p Restart=always "
        "-E HOME=/home/emitia "
        f"-E NVM_DIR=/home/emitia/.nvm "
        f"/bin/bash -lc \"{inner}\" "
        "&& echo STARTED_VIA_SYSTEMD || echo SYSTEMD_RUN_FAILED"
    )
    out, err, code = run(c, start)
    print("=== start ===\n", out, err, "exit=", code)

    # 3) Esperar y verificar
    check = (
        "sleep 12; "
        "systemctl is-active emitia-next 2>/dev/null || true; "
        "ss -tlnp 2>/dev/null | grep ':3001' || echo NO_PORT_3001; "
        "curl -sI --max-time 12 http://127.0.0.1:3001 | head -3; "
        "journalctl -u emitia-next --no-pager -n 20 2>/dev/null | tail -20 || true"
    )
    out, err, code = run(c, check, timeout=60)
    print("=== check ===\n", out, err)

    c.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

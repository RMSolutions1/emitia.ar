"""Arranca el servicio systemd permanente emitia-next."""
import os
import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]


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

    for cmd in [
        "systemctl reset-failed emitia-next 2>/dev/null || true",
        "systemctl daemon-reload",
        "systemctl enable emitia-next 2>&1",
        "systemctl start emitia-next 2>&1",
        "sleep 12",
        "systemctl is-active emitia-next 2>&1",
        "ss -tlnp 2>/dev/null | grep ':3001' || echo NO_PORT",
        "curl -sI --max-time 10 http://127.0.0.1:3001 | head -3",
        "journalctl -u emitia-next --no-pager -n 8 2>&1",
    ]:
        out, err, code = run(c, cmd)
        line = (out or err).encode("ascii", "replace").decode("ascii")
        print(f"[{code}] {cmd}\n{line[:600]}\n")

    c.close()


if __name__ == "__main__":
    main()

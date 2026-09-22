"""Agrega o actualiza variables de IA en el .env remoto."""
import os
import sys

import paramiko

HOST = os.environ["EMITIA_SSH_HOST"]
PORT = int(os.environ.get("EMITIA_SSH_PORT", "22"))
USER = os.environ["EMITIA_SSH_USER"]
PASSWORD = os.environ["EMITIA_SSH_PASSWORD"]
ENV_PATH = "/home/emitia/htdocs/www.emitia.com.ar/.env"

VARS = {
    "GEMINI_API_KEY": os.environ.get("GEMINI_API_KEY", ""),
    "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY", ""),
    "AI_PROVIDER": os.environ.get("AI_PROVIDER", ""),
}


def upsert_env(lines: list[str], key: str, value: str) -> list[str]:
    if not value:
        return lines
    prefix = f"{key}="
    out = [ln for ln in lines if not ln.strip().startswith(prefix)]
    out.append(f"{key}={value}")
    return out


def main() -> int:
    active = {k: v for k, v in VARS.items() if v}
    if not active:
        print("ERROR: pasá GEMINI_API_KEY u OPENAI_API_KEY como variable de entorno local")
        return 1

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
              timeout=20, allow_agent=False, look_for_keys=False)

    sftp = c.open_sftp()
    with sftp.open(ENV_PATH, "r") as f:
        lines = f.read().decode("utf-8").splitlines()

    with sftp.open(ENV_PATH + ".bak-ai", "w") as f:
        f.write("\n".join(lines) + "\n")

    out = lines[:]
    for key, value in active.items():
        out = upsert_env(out, key, value)

    with sftp.open(ENV_PATH, "w") as f:
        f.write("\n".join(out) + "\n")
    sftp.close()

    print("Variables IA actualizadas:", ", ".join(active.keys()))

    restart = (
        "systemctl restart emitia-next && sleep 12 && "
        "systemctl is-active emitia-next && "
        "curl -sI --max-time 10 http://127.0.0.1:3001 | head -3"
    )
    _, so, se = c.exec_command(restart, timeout=120)
    print(so.read().decode("utf-8", "replace"))
    err = se.read().decode("utf-8", "replace")
    if err.strip():
        print("ERR:", err[:500])
    c.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

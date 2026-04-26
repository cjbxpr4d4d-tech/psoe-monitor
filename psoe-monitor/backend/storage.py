import json
import os
import logging
from pathlib import Path

logger = logging.getLogger("storage")

DATA_DIR = Path(os.getenv("DATA_DIR", "/data" if os.path.exists("/data") else "."))
DATA_FILE = DATA_DIR / "psoe_monitor_historico.json"
MAX_HISTORY = int(os.getenv("MAX_HISTORY", "90"))


def load_data():
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error("Error leyendo datos: %s", e)
    return {"history": [], "last_update": None}


def save_data(data):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error("Error guardando datos: %s", e)


def append_entry(entry):
    data = load_data()
    data["history"].append(entry)
    if len(data["history"]) > MAX_HISTORY:
        data["history"] = data["history"][-MAX_HISTORY:]
    data["last_update"] = entry["timestamp"]
    save_data(data)
    logger.info("Entry guardada. Total: %d", len(data["history"]))

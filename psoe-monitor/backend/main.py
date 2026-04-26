import os
import logging
from datetime import datetime
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from scrapers import fetch_x, fetch_instagram, fetch_facebook, fetch_tiktok
from sentiment import analyze_sentiment
from storage import load_data, append_entry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("psoe-monitor")

app = FastAPI(title="PSOE CERA Monitor API", version="2.0.0")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = BackgroundScheduler()

def run_full_scrape():
    logger.info("Iniciando scrape completo...")
    all_posts = []
    errors = []
    for platform, fetcher in [
        ("X", fetch_x),
        ("Instagram", fetch_instagram),
        ("Facebook", fetch_facebook),
        ("TikTok", fetch_tiktok),
    ]:
        try:
            posts = fetcher()
            for p in posts:
                p["sentiment"] = analyze_sentiment(p.get("content", ""))
            all_posts.extend(posts)
            logger.info("%s: %d posts", platform, len(posts))
        except Exception as e:
            logger.error("%s error: %s", platform, e)
            errors.append({"platform": platform, "error": str(e)})

    sentiments = [p["sentiment"] for p in all_posts if isinstance(p["sentiment"], float)]
    avg_sentiment = round(sum(sentiments) / max(len(sentiments), 1), 4)

    platform_count = {}
    for p in all_posts:
        platform_count[p["platform"]] = platform_count.get(p["platform"], 0) + 1

    import re
    from collections import Counter
    all_text = " ".join(p.get("content", "") for p in all_posts).lower()
    words = re.findall(r"\b\w{4,}\b", all_text)
    stopwords = {"para", "este", "esta", "como", "pero", "more", "that", "this",
                 "with", "have", "from", "they", "will", "been", "were", "what"}
    word_freq = Counter(w for w in words if w not in stopwords).most_common(20)

    entry = {
        "timestamp": datetime.now().isoformat(),
        "combined_sentiment": avg_sentiment,
        "total_posts": len(all_posts),
        "platform_count": platform_count,
        "word_freq": [{"word": w, "freq": f} for w, f in word_freq],
        "sample": all_posts[:30],
        "errors": errors,
    }
    append_entry(entry)
    logger.info("Scrape completado. Posts: %d, sentimiento: %s", len(all_posts), avg_sentiment)
    return entry

scheduler.add_job(run_full_scrape, "cron", hour=8, minute=0)
scheduler.start()


@app.get("/")
def root():
    return {"status": "online", "service": "PSOE CERA Monitor API v2.0"}


@app.get("/api/status")
def status():
    data = load_data()
    history = data.get("history", [])
    last = history[-1] if history else {}
    return {
        "last_update": data.get("last_update"),
        "total_entries": len(history),
        "current_sentiment": last.get("combined_sentiment", 0),
        "platforms_active": 4,
    }


@app.get("/api/sentiment-series")
def sentiment_series(days: int = 30):
    data = load_data()
    history = data.get("history", [])[-days:]
    series = []
    for e in history:
        row = {
            "date": e["timestamp"][:10],
            "sentiment": e.get("combined_sentiment", 0),
            "total": e.get("total_posts", 0),
        }
        row.update(e.get("platform_count", {}))
        series.append(row)
    return {"series": series}


@app.get("/api/feed")
def feed(platform: str = None, limit: int = 30):
    data = load_data()
    history = data.get("history", [])
    if not history:
        return {"posts": [], "count": 0}
    posts = history[-1].get("sample", [])
    if platform and platform != "Todos":
        posts = [p for p in posts if p.get("platform") == platform]
    return {"posts": posts[:limit], "count": len(posts)}


@app.get("/api/wordfreq")
def wordfreq(days: int = 7):
    from collections import Counter
    data = load_data()
    history = data.get("history", [])[-days:]
    combined = Counter()
    for entry in history:
        for item in entry.get("word_freq", []):
            combined[item["word"]] += item["freq"]
    return {"word_freq": [{"word": w, "freq": f} for w, f in combined.most_common(20)]}


@app.get("/api/scenarios")
def scenarios():
    return {
        "scenarios": [
            {"escenario": "Base (status quo)", "pp": 55, "psoe": 28, "vox": 17, "necesita_vox": False, "prob": 30},
            {"escenario": "CERA favorable PP", "pp": 57, "psoe": 26, "vox": 17, "necesita_vox": False, "prob": 20},
            {"escenario": "CERA + LMD favorable PSOE", "pp": 52, "psoe": 33, "vox": 15, "necesita_vox": True, "prob": 35},
            {"escenario": "CERA muy favorable PSOE", "pp": 49, "psoe": 37, "vox": 14, "necesita_vox": True, "prob": 15},
        ]
    }


@app.post("/api/update")
async def trigger_update(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_full_scrape)
    return {"status": "started", "message": "Scrape iniciado en background (~60s)"}

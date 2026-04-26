import logging

logger = logging.getLogger("sentiment")
_vader = None

def _get_vader():
    global _vader
    if _vader is None:
        try:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
            _vader = SentimentIntensityAnalyzer()
        except ImportError:
            pass
    return _vader

def analyze_sentiment(text):
    if not text or not text.strip():
        return 0.0
    text = text[:500]
    vader = _get_vader()
    if vader:
        try:
            return round(vader.polarity_scores(text)["compound"], 4)
        except Exception:
            pass
    try:
        from textblob import TextBlob
        return round(TextBlob(text).sentiment.polarity, 4)
    except Exception:
        pass
    return 0.0

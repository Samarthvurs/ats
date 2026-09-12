#!/usr/bin/env python3
"""
Resumeit ATS Trainer — Synthetic Dataset Generator + XGBoost Model Trainer.
Run with: python train.py
This will generate a labeled dataset, train a scoring model, and save it to models/ats_model.pkl
"""

import numpy as np
import re
import pickle
import os

from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

os.makedirs("models", exist_ok=True)

# -----------------------------------------------------------------
# 1.  Feature extractor – runs on raw resume text
# -----------------------------------------------------------------
POWER_VERBS = [
    "led", "built", "designed", "developed", "increased", "reduced",
    "managed", "deployed", "optimised", "delivered", "launched", "scaled",
    "architected", "automated", "improved", "created", "implemented",
    "negotiated", "mentored", "collaborated", "spearheaded", "engineered",
    "revitalized", "orchestrated", "pioneered", "standardized", "accelerated",
    "transformed", "integrated", "innovated", "cultivated", "leveraged",
]

SECTION_KEYWORDS = {
    "education": ["education", "university", "college", "bachelor", "master", "degree", "phd", "academic", "scholar"],
    "experience": ["experience", "employment", "work history", "professional history", "background", "tenure", "projects"],
    "skills":    ["skills", "technologies", "tools", "competencies", "proficiencies", "stack", "expertise"],
    "projects":  ["projects", "portfolio", "github", "open source", "labs"],
    "summary":   ["summary", "objective", "profile", "about me", "overview"],
}


def extract_features(text: str) -> dict:
    """Return a dict of numerical features for a given resume text."""
    lower = text.lower()
    words = text.split()

    # — Section presence
    features = {f"has_{s}": int(any(k in lower for k in kws)) for s, kws in SECTION_KEYWORDS.items()}

    # — Word count buckets
    wc = len(words)
    features["word_count"]  = min(wc, 1500)
    features["too_short"]   = int(wc < 150)
    features["too_long"]    = int(wc > 1400)

    # — Power verbs
    features["power_verb_count"] = sum(1 for w in words if w.lower().rstrip(".,;:") in POWER_VERBS)

    # — Quantified impact detection (numbers / percentages)
    features["metric_count"] = len(re.findall(r'\d+[\.,]?\d*\s*(?:%|percent|million|k\b|x\b|users?|customers?)?', text, re.IGNORECASE))

    # — Email and phone presence (professional completeness)
    features["has_email"] = int(bool(re.search(r'[\w.-]+@[\w.-]+\.\w+', text)))
    features["has_phone"] = int(bool(re.search(r'(\+?\d[\d\s\-\(\)]{8,}\d)', text)))

    # — Linkedin / GitHub
    features["has_linkedin"] = int("linkedin" in lower)
    features["has_github"]   = int("github" in lower)

    # — Tech keywords (broad set)
    tech_words = [
        "python","javascript","react","node","aws","sql","docker","kubernetes","git","api",
        "machine learning","tensorflow","pytorch","java","typescript","golang","rust",
        "mongodb","postgresql","c++","next.js","tailwind","gcp","snowflake","azure",
        "terraform","graphql","redis","elasticsearch","jenkins","linux","flask","django",
        "fastapi","vue","angular","spark","hadoop","data science","devops","cicd"
    ]
    features["tech_keyword_count"] = sum(1 for t in tech_words if t in lower)

    # — Years of experience heuristic
    years = re.findall(r'(\d+)\+?\s*(?:years?|yrs?)', lower)
    features["yoe_max"] = max([int(y) for y in years], default=0)

    # — Date range estimation
    # Enhanced date range detection
    date_pairs = re.findall(r'((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\s*\d{4})\s*(?:-|to|–|until)\s*(\d{4}|present|current|now)', lower)
    total = 0
    for s_str, e_str in date_pairs:
        try:
            s_match = re.search(r'\d{4}', s_str)
            e_match = re.search(r'\d{4}', e_str)
            s_year = int(s_match.group()) if s_match else 0
            e_year = 2026 if e_str in ["present","current","now"] else (int(e_match.group()) if e_match else 0)
            if s_year > 1950 and e_year >= s_year:
                total += (e_year - s_year)
        except: continue
    features["date_range_years"] = min(total, 25)

    return features


def features_to_vector(features: dict) -> list:
    """Consistent ordering from feature dict → list (for model input)."""
    order = [
        "has_education","has_experience","has_skills","has_projects","has_summary",
        "word_count","too_short","too_long","power_verb_count","metric_count",
        "has_email","has_phone","has_linkedin","has_github","tech_keyword_count",
        "yoe_max","date_range_years",
    ]
    return [features.get(k, 0) for k in order]


FEATURE_ORDER = [
    "has_education","has_experience","has_skills","has_projects","has_summary",
    "word_count","too_short","too_long","power_verb_count","metric_count",
    "has_email","has_phone","has_linkedin","has_github","tech_keyword_count",
    "yoe_max","date_range_years",
]


# -----------------------------------------------------------------
# 2.  Synthetic dataset generator
# -----------------------------------------------------------------
def synthesise_dataset(n=5000, seed=42):
    rng = np.random.default_rng(seed)
    X, y = [], []

    for _ in range(n):
        f = {
            "has_education":      rng.integers(0, 2),
            "has_experience":     rng.integers(0, 2),
            "has_skills":         rng.integers(0, 2),
            "has_projects":       rng.integers(0, 2),
            "has_summary":        rng.integers(0, 2),
            "word_count":         int(rng.integers(50, 1500)),
            "too_short":          0,
            "too_long":           0,
            "power_verb_count":   int(rng.integers(0, 30)),
            "metric_count":       int(rng.integers(0, 40)),
            "has_email":          rng.integers(0, 2),
            "has_phone":          rng.integers(0, 2),
            "has_linkedin":       rng.integers(0, 2),
            "has_github":         rng.integers(0, 2),
            "tech_keyword_count": int(rng.integers(0, 25)),
            "yoe_max":            int(rng.integers(0, 15)),
            "date_range_years":   int(rng.integers(0, 15)),
        }
        f["too_short"] = int(f["word_count"] < 150)
        f["too_long"]  = int(f["word_count"] > 1400)

        # Build a score with refined weighted signal
        score = (
            f["has_education"]       * 10 +
            f["has_experience"]      * 18 + # Experience is king
            f["has_skills"]          * 10 +
            f["has_projects"]        * 6  +
            f["has_summary"]         * 4  +
            min(f["word_count"] / 10, 12) +
            f["power_verb_count"]    * 1.5 + # High impact verbs
            f["metric_count"]        * 1.2 + # High impact metrics
            f["has_email"]           * 5  +
            f["has_phone"]           * 4  +
            f["has_linkedin"]        * 3  +
            f["has_github"]          * 2  +
            f["tech_keyword_count"]  * 2.0 + # Skills are important
            f["yoe_max"]             * 1.5 +
            f["date_range_years"]    * 0.8 +
            -f["too_short"]          * 25 + # Major penalty for being too short
            -f["too_long"]           * 10
        )
        score = np.clip(score + rng.normal(0, 4), 10, 100)

        X.append([f[k] for k in FEATURE_ORDER])
        y.append(round(float(score), 1))

    return np.array(X), np.array(y)


# -----------------------------------------------------------------
# 3.  Train & save
# -----------------------------------------------------------------
if __name__ == "__main__":
    print("📦 Generating synthetic training data (5000 resumes)…")
    X, y = synthesise_dataset(5000)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("🧠 Training Gradient Boosting model…")
    model = GradientBoostingRegressor(
        n_estimators=300, learning_rate=0.05, max_depth=4,
        subsample=0.8, random_state=42
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"✅ Training complete!  Test MAE = {mae:.2f} points")

    # Only save the model + feature order — NOT function references (avoids pickle issues)
    payload = {"model": model, "feature_order": FEATURE_ORDER}
    with open("models/ats_model.pkl", "wb") as f:
        pickle.dump(payload, f)
    print("💾 Model saved to  backend/models/ats_model.pkl")

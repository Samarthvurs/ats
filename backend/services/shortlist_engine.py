"""
Smart Shortlisting Engine
==========================
Ranks a batch of resumes against a single Job Description using a genuine
hybrid of:

  1. KEYWORD matching   — explicit skills/tools/terms named in the JD are
     checked for literal (+ synonym/stem) presence in each resume. This
     rewards candidates who use the exact vocabulary a recruiter searches for.

  2. SEMANTIC matching  — sentence embeddings (or a graceful local fallback)
     compare the *meaning* of the JD and each resume, and are also used to
     check whether a specific missing skill is nonetheless implied by the
     candidate's actual experience (e.g. "built REST APIs with Node.js and
     MongoDB" implies "Express" even though the word never appears).

Both signals are combined into one explainable final score using a
user-tunable formula (see DEFAULT_CONFIG), and every skill match is tagged
with the exact character span it was found/inferred at so the UI can
highlight it directly on the resume text — no black box, no "paste into an
LLM and ask for a score".
"""

import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity

# =========================================================================
# 0. DEFAULT SCORING CONFIG (all tunable from the UI)
# =========================================================================
DEFAULT_CONFIG = {
    "semantic_weight": 0.5,       # 0..1 — final = w*semantic + (1-w)*keyword
    "required_weight": 1.0,       # points a required skill is worth
    "preferred_weight": 0.5,      # points a preferred skill is worth
    "semantic_credit": 0.6,       # fraction of points for an *inferred* (not literal) match
    "semantic_threshold": 0.42,   # min cosine similarity to count as an inferred match
}


def resolve_config(cfg: dict) -> dict:
    out = dict(DEFAULT_CONFIG)
    if cfg:
        for k in DEFAULT_CONFIG:
            if k in cfg and cfg[k] is not None:
                try:
                    out[k] = float(cfg[k])
                except (TypeError, ValueError):
                    pass
    out["semantic_weight"] = float(np.clip(out["semantic_weight"], 0, 1))
    out["semantic_threshold"] = float(np.clip(out["semantic_threshold"], 0.05, 0.95))
    return out


# =========================================================================
# 1. SKILL VOCABULARY
# =========================================================================
# canonical skill name -> list of literal surface forms / synonyms it can
# appear as in free text. Matched with word-boundary-aware regex.
SKILL_VOCAB = {
    "JavaScript": ["javascript", r"\bjs\b"],
    "TypeScript": ["typescript", r"\bts\b"],
    "Python": [r"\bpython\b"],
    "Java": [r"\bjava\b(?!script)"],
    "Node.js": ["node.js", "nodejs", "node js", r"\bnode\b"],
    "Express.js": ["express.js", "expressjs", r"\bexpress\b"],
    "React": ["react.js", "reactjs", r"\breact\b"],
    "Next.js": ["next.js", "nextjs"],
    "Vue.js": ["vue.js", "vuejs", r"\bvue\b"],
    "Angular": [r"\bangular\b"],
    "MongoDB": ["mongodb", "mongo db", r"\bmongo\b"],
    "PostgreSQL": ["postgresql", r"\bpostgres\b"],
    "MySQL": [r"\bmysql\b"],
    "SQL": [r"\bsql\b"],
    "NoSQL": [r"\bnosql\b"],
    "REST API": ["rest api", "restful api", "rest apis", r"\brestful\b"],
    "GraphQL": [r"\bgraphql\b"],
    "HTML": [r"\bhtml5?\b"],
    "CSS": [r"\bcss3?\b"],
    "Tailwind CSS": [r"\btailwind\b"],
    "Bootstrap": [r"\bbootstrap\b"],
    "Git": [r"\bgit\b", r"\bgithub\b", r"\bgitlab\b", "version control"],
    "Docker": [r"\bdocker\b"],
    "Kubernetes": [r"\bkubernetes\b", r"\bk8s\b"],
    "AWS": [r"\baws\b", "amazon web services"],
    "Azure": [r"\bazure\b"],
    "GCP": [r"\bgcp\b", "google cloud"],
    "CI/CD": ["ci/cd", "cicd", "continuous integration"],
    "Redux": [r"\bredux\b"],
    "Firebase": [r"\bfirebase\b"],
    "C++": [r"c\+\+"],
    "C#": [r"c#"],
    "Machine Learning": ["machine learning", r"\bml\b"],
    "Data Structures": ["data structure"],
    "Algorithms": [r"\balgorithms?\b"],
    "Agile": [r"\bagile\b", r"\bscrum\b"],
    "Communication": [r"\bcommunication\b"],
    "Problem Solving": ["problem solving", "problem-solving"],
    "Team Collaboration": [r"\bcollaboration\b", r"\bteamwork\b"],
    "Unit Testing": ["unit test", r"\bjest\b", r"\bmocha\b", r"\bpytest\b"],
    "Linux": [r"\blinux\b", r"\bunix\b"],
    "Django": [r"\bdjango\b"],
    "Flask": [r"\bflask\b"],
    "FastAPI": [r"\bfastapi\b"],
    "Spring Boot": ["spring boot", "springboot"],
    "TensorFlow": [r"\btensorflow\b"],
    "PyTorch": [r"\bpytorch\b"],
    "Webpack": [r"\bwebpack\b"],
    "Vite": [r"\bvite\b"],
    "Figma": [r"\bfigma\b"],
    "Jira": [r"\bjira\b"],
    "Redis": [r"\bredis\b"],
    "Microservices": [r"\bmicroservices?\b"],
    "OOP": ["object oriented", "object-oriented", r"\boop\b"],
    "API Design": ["api design", "api development"],
    "Leadership": [r"\bleadership\b"],
}

_SKILL_PATTERNS = {
    name: re.compile("|".join(patterns), re.IGNORECASE)
    for name, patterns in SKILL_VOCAB.items()
}

REQUIRED_SECTION_HEADERS = [
    "requirements", "required skills", "must have", "must-have",
    "qualifications", "what you'll need", "you must have", "responsibilities",
]
PREFERRED_SECTION_HEADERS = [
    "preferred", "nice to have", "nice-to-have", "good to have",
    "bonus", "a plus", "is a plus", "would be nice",
]


def extract_skills_from_jd(jd_text: str) -> dict:
    """Returns {required: [...], preferred: [...]} canonical skill names."""
    lower = jd_text.lower()

    pref_positions = [lower.find(h) for h in PREFERRED_SECTION_HEADERS if h in lower]
    pref_start = min([p for p in pref_positions if p != -1], default=None)

    required, preferred = [], []
    for name, pattern in _SKILL_PATTERNS.items():
        m = pattern.search(lower)
        if not m:
            continue
        if pref_start is not None and m.start() >= pref_start:
            preferred.append(name)
        else:
            required.append(name)

    return {"required": sorted(set(required)), "preferred": sorted(set(preferred))}


def _skill_present_literal(skill: str, text_lower: str, patterns: dict = None) -> bool:
    p = (patterns or _SKILL_PATTERNS).get(skill)
    return bool(p and p.search(text_lower))


def build_pattern_map(custom_terms: list) -> dict:
    """Merges the vocabulary patterns with ad-hoc patterns for recruiter-
    supplied "must-have keyword" terms that aren't in SKILL_VOCAB — e.g. a
    specific certification, tool, or phrase like "5+ years Python"."""
    patterns = dict(_SKILL_PATTERNS)
    for term in custom_terms or []:
        term = term.strip()
        if not term or term in patterns:
            continue
        escaped = re.escape(term)
        # word-boundary match for alnum-only terms; plain substring otherwise
        # (so things like "C++" or "CI/CD"-style punctuation still match)
        pattern = rf"\b{escaped}\b" if re.match(r"^[\w\s]+$", term) else escaped
        try:
            patterns[term] = re.compile(pattern, re.IGNORECASE)
        except re.error:
            patterns[term] = re.compile(re.escape(term), re.IGNORECASE)
    return patterns


def extract_contact_info(text: str) -> dict:
    """Regex-based email/phone extraction — deterministic, no ML needed for
    something this structured, and it's what powers the emailing/offer
    workflow and the candidate database view."""
    email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    phone_match = re.search(r"(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?(?:[\s.-]?\d{2,4}){2,4}", text)
    if phone_match and sum(ch.isdigit() for ch in phone_match.group(0)) < 7:
        phone_match = None
    linkedin_match = re.search(r"linkedin\.com/[^\s,)]+", text, re.IGNORECASE)
    return {
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0).strip() if phone_match else None,
        "linkedin": linkedin_match.group(0) if linkedin_match else None,
    }


EDUCATION_HEADERS = ["education", "academic background", "academic qualifications", "qualifications"]
EXPERIENCE_HEADERS = ["work experience", "professional experience", "employment history", "experience", "employment"]
OTHER_SECTION_HEADERS = ["projects", "skills", "certifications", "summary", "objective", "achievements", "publications", "extracurricular"]

DATE_RANGE_RE = re.compile(
    r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\s*\d{4})\s*(?:-|to|–|until)\s*(\d{4}|present|current|now)"
)


def _sum_date_ranges(segment: str) -> int:
    total = 0
    for s_str, e_str in DATE_RANGE_RE.findall(segment):
        s_match = re.search(r"\d{4}", s_str)
        if not s_match:
            continue
        s_year = int(s_match.group())
        e_year = 2026 if e_str in ("present", "current", "now") else int(re.search(r"\d{4}", e_str).group())
        if s_year > 1950 and e_year >= s_year:
            total += (e_year - s_year)
    return total


def extract_years_of_experience(text: str):
    """Lightweight NLP heuristic: explicit "N years" mentions, or summed
    Month/Year date ranges (e.g. "Jan 2021 - Present") — but ONLY within an
    actual work-experience section. Without this scoping, a degree's
    "2020 - 2024" gets miscounted as four years of professional experience,
    which is the #1 way this kind of heuristic goes wrong. Returns None
    (not 0) when nothing could be inferred, so the UI shows "N/A"."""
    lower = text.lower()
    years = [int(y) for y in re.findall(r"(\d+)\+?\s*(?:years?|yrs?)\b(?!\s*(?:of\s+)?(?:study|education|schooling))", lower)]
    explicit_max = max(years, default=0)

    exp_start = None
    for h in EXPERIENCE_HEADERS:
        idx = lower.find(h)
        if idx != -1 and (exp_start is None or idx < exp_start):
            exp_start = idx

    if exp_start is not None:
        # Scope to [experience header .. next section header], so education/
        # projects/skills sections below it are excluded from the date-range sum.
        next_headers = [lower.find(h, exp_start + 1) for h in EDUCATION_HEADERS + OTHER_SECTION_HEADERS]
        next_headers = [i for i in next_headers if i != -1]
        exp_end = min(next_headers) if next_headers else len(text)
        scoped = lower[exp_start:exp_end]
    else:
        # No explicit experience section — fall back to the whole resume but
        # cut out any education section entirely so degree years don't leak in.
        scoped = lower
        for h in EDUCATION_HEADERS:
            idx = scoped.find(h)
            if idx != -1:
                next_headers = [scoped.find(h2, idx + 1) for h2 in EXPERIENCE_HEADERS + OTHER_SECTION_HEADERS]
                next_headers = [i for i in next_headers if i != -1]
                edu_end = min(next_headers) if next_headers else len(scoped)
                scoped = scoped[:idx] + scoped[edu_end:]

    total = _sum_date_ranges(scoped)

    if explicit_max == 0 and total == 0:
        return None
    return max(explicit_max, min(total, 30))


EDUCATION_LEVELS = [
    ("phd", 5, [r"\bph\.?d\b", "doctorate", "doctoral"]),
    ("master", 4, [r"\bm\.?tech\b", r"\bm\.?s\b", r"\bm\.?sc\b", r"\bmba\b", r"\bm\.?a\b", "master's", "masters", r"\bmaster\b", r"\bmca\b"]),
    ("bachelor", 3, [r"\bb\.?tech\b", r"\bb\.?e\b", r"\bb\.?s\b", r"\bb\.?sc\b", r"\bbca\b", r"\bb\.?a\b", "bachelor's", "bachelors", r"\bbachelor\b"]),
    ("diploma", 2, ["diploma"]),
    ("high_school", 1, ["high school", r"\b12th\b", "senior secondary"]),
]
EDUCATION_LEVEL_RANK = {name: rank for name, rank, _ in EDUCATION_LEVELS}


def extract_education(text: str):
    """Detects the highest degree level mentioned and, where possible, the
    field of study next to it (e.g. "B.Tech in Computer Science" -> field
    "Computer Science"). Returns None when nothing recognizable is found."""
    lower = text.lower()
    best = None
    for name, rank, patterns in EDUCATION_LEVELS:
        for p in patterns:
            m = re.search(p, lower, re.IGNORECASE)
            if m and (best is None or rank > best["rank"]):
                # Two common phrasings: "B.Tech in Computer Science" and the
                # preposition-less "B.Tech Computer Science, XYZ University".
                field_match = re.search(
                    rf"{p}.{{0,4}}(?:in|of)\s+([a-zA-Z& ]{{3,40}}?)(?=,|\.|\n|\s+(?:from|university|college|institute|school)\b|$)",
                    lower, re.IGNORECASE,
                ) or re.search(
                    rf"{p}\s+([a-zA-Z& ]{{3,40}}?)(?=,|\.|\n|\s+(?:from|university|college|institute|school)\b|$)",
                    lower, re.IGNORECASE,
                )
                field = field_match.group(1).strip(" .,\n") if field_match else None
                best = {"level": name, "rank": rank, "field": field}
    if not best:
        return None
    return {"level": best["level"], "field": best["field"]}


def extract_cgpa(text: str):
    """Extracts a CGPA/GPA mention and normalizes it to a /10 scale so
    thresholds are comparable regardless of whether the resume reports
    a /4.0 or /10 scale. Returns None (not 0) when nothing is found —
    an absent CGPA should read as "N/A", never as a failing score."""
    m = re.search(r"\b(?:cgpa|gpa)\b\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:/\s*(\d+(?:\.\d+)?))?", text, re.IGNORECASE)
    if not m:
        return None
    try:
        value = float(m.group(1))
        scale = float(m.group(2)) if m.group(2) else (4.0 if value <= 4.0 else 10.0)
        if scale <= 0:
            return None
        normalized = round(min(value / scale * 10, 10), 2)
        return {"raw": m.group(0).strip(), "value": value, "scale": scale, "value_10": normalized}
    except (ValueError, ZeroDivisionError):
        return None


_ner_nlp = None
_ner_load_attempted = False


def _get_ner_model():
    """Lazy-loaded spaCy NER model, independent of the semantic-matching
    backend above — used purely for named-entity recognition (location),
    a genuinely different ML technique from the embedding similarity."""
    global _ner_nlp, _ner_load_attempted
    if _ner_load_attempted:
        return _ner_nlp
    _ner_load_attempted = True
    try:
        import spacy
        # Keep the parser enabled — spaCy's NER leans on parse structure to
        # disambiguate short proper nouns (e.g. "Austin" as city vs. name),
        # which matters a lot on the terse, sentence-less text of a resume
        # header. Only lemmatizer (unused here) is dropped for a bit of speed.
        _ner_nlp = spacy.load("en_core_web_sm", disable=["lemmatizer"])
        print("[shortlist_engine] NER backend: spaCy en_core_web_sm (location extraction)")
    except Exception:
        _ner_nlp = None
        print("[shortlist_engine] NER unavailable — location extraction disabled "
              "(pip install spacy && python -m spacy download en_core_web_sm)")
    return _ner_nlp


US_STATE_ABBR = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
    "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
    "VA", "WA", "WV", "WI", "WY",
}


def _regex_location_fallback(text: str):
    """Small NER models miss short, sentence-less resume headers like
    "Austin, TX" fairly often (no surrounding grammar to disambiguate a
    place from a name) — this catches the extremely common "City, ST"
    pattern as a deterministic backstop when NER comes up empty."""
    header = text[:400]
    # NB: the inter-word separator is a literal space, not \s — \s matches
    # newlines too, which previously let this bridge across lines (e.g.
    # "Kumar\nAustin, TX" got misread as one two-word city name).
    m = re.search(r"\b([A-Z][a-zA-Z.]+(?: [A-Z][a-zA-Z.]+)?),[ ]*([A-Z]{2})\b", header)
    if m and m.group(2) in US_STATE_ABBR:
        return f"{m.group(1)}, {m.group(2)}"
    return None



# Small NER models occasionally mistag a tech/degree word as a place on the
# short, grammar-less text of a resume header (e.g. "React", "History").
# Filter those out rather than surface a confusing false location.
_LOCATION_DENYLIST = {s.lower() for s in SKILL_VOCAB.keys()} | {
    "history", "science", "engineering", "arts", "commerce", "business", "administration",
    "technology", "computer", "management", "mathematics", "physics", "chemistry", "biology",
    "economics", "psychology", "communication", "communications", "design", "marketing",
}


def extract_location(text: str):
    """Named-entity recognition over the resume header (where a candidate's
    city/address is almost always stated) to pull a GPE (geo-political
    entity) — e.g. "Bangalore" or "Austin, TX" — falling back to a regex
    pattern for the common "City, ST" header format NER sometimes misses on
    text this short and unstructured. Returns None rather than a guess."""
    nlp = _get_ner_model()
    if nlp:
        doc = nlp(text[:600])
        gpes = [
            ent.text.strip() for ent in doc.ents
            if ent.label_ in ("GPE", "LOC")
            and len(ent.text.strip()) > 1
            and ent.text.strip().lower() not in _LOCATION_DENYLIST
        ]
        if gpes:
            return gpes[0]
    return _regex_location_fallback(text)


# =========================================================================
# 2. SEMANTIC BACKEND (graceful fallback chain)
# =========================================================================
#   a) sentence-transformers (best quality, general-language semantics)
#   b) spaCy medium model word vectors (lighter, still real embeddings)
#   c) TF-IDF + Truncated SVD (Latent Semantic Analysis) fitted per-batch
#      — always available offline, still genuinely "meaning" based since it
#        clusters co-occurring terms into latent topics rather than raw
#        literal overlap.
# =========================================================================

_backend_kind = None
_st_model = None
_spacy_md = None
_skill_vec_cache = {}  # skill name -> embedding vector (persists across jobs)


def _init_backend():
    global _backend_kind, _st_model, _spacy_md
    if _backend_kind is not None:
        return _backend_kind
    try:
        from sentence_transformers import SentenceTransformer
        _st_model = SentenceTransformer("all-MiniLM-L6-v2")
        _backend_kind = "st"
        print("[shortlist_engine] Semantic backend: sentence-transformers (all-MiniLM-L6-v2)")
    except Exception:
        try:
            import spacy
            _spacy_md = spacy.load("en_core_web_md")
            if getattr(_spacy_md.vocab.vectors, "shape", (0,))[0] > 0:
                _backend_kind = "spacy_md"
                print("[shortlist_engine] Semantic backend: spaCy en_core_web_md vectors")
            else:
                _backend_kind = "lsa"
        except Exception:
            _backend_kind = "lsa"
            print("[shortlist_engine] Semantic backend: TF-IDF + LSA fallback "
                  "(install `sentence-transformers` for higher-quality semantic matching)")
    return _backend_kind


def backend_label() -> str:
    return {
        "st": "Sentence embeddings (all-MiniLM-L6-v2)",
        "spacy_md": "Word vectors (spaCy en_core_web_md)",
        "lsa": "Latent Semantic Analysis (TF-IDF + SVD)",
    }.get(_init_backend(), "unknown")


def _embed_texts(texts: list) -> np.ndarray:
    """Embeds a list of strings with whichever backend is available.
    Returns an (n, d) L2-normalized numpy array, or None if only LSA-per-corpus
    scoring is available (handled separately)."""
    backend = _init_backend()
    if not texts:
        return np.zeros((0, 1))
    if backend == "st":
        vecs = _st_model.encode(texts, normalize_embeddings=True, show_progress_bar=False, batch_size=64)
        return np.array(vecs)
    if backend == "spacy_md":
        vecs = []
        for t in texts:
            doc = _spacy_md(t[:5000])
            v = doc.vector
            n = np.linalg.norm(v)
            vecs.append(v / n if n > 0 else v)
        return np.array(vecs)
    return None  # LSA handled at corpus level


def supports_skill_level_semantics() -> bool:
    return _init_backend() in ("st", "spacy_md")


def get_skill_vectors(skills: list) -> np.ndarray:
    """Cached skill-phrase embeddings — avoids re-embedding the same ~50
    vocabulary skills for every one of a 200-resume batch."""
    missing = [s for s in skills if s not in _skill_vec_cache]
    if missing:
        vecs = _embed_texts([f"Experience with {s}" for s in missing])
        for s, v in zip(missing, vecs):
            _skill_vec_cache[s] = v
    return np.array([_skill_vec_cache[s] for s in skills])


def _rescale_similarity(sim: float, lo: float = 0.15, hi: float = 0.75) -> float:
    """Cosine similarities for embedding models rarely span the full [0,1]
    range for real text pairs — rescale so scores actually spread out."""
    return float(np.clip((sim - lo) / (hi - lo), 0.0, 1.0))


def document_semantic_scores(jd_text: str, resume_texts: list) -> list:
    """Returns a semantic similarity (0-1, already rescaled) for each resume
    against the JD, using whichever backend is available. Batched so it
    scales to hundreds of resumes in one pass."""
    if not resume_texts:
        return []
    backend = _init_backend()

    if backend in ("st", "spacy_md"):
        all_vecs = _embed_texts([jd_text[:4000]] + [r[:6000] for r in resume_texts])
        jd_vec, resume_vecs = all_vecs[0:1], all_vecs[1:]
        sims = cosine_similarity(jd_vec, resume_vecs)[0]
        return [_rescale_similarity(float(s)) for s in sims]

    # --- LSA fallback: fit TF-IDF + SVD jointly over JD + all resumes ------
    corpus = [jd_text] + resume_texts
    try:
        vec = TfidfVectorizer(stop_words="english", max_features=4000)
        tfidf = vec.fit_transform(corpus)
        n_components = max(2, min(80, tfidf.shape[1] - 1, tfidf.shape[0] - 1))
        svd = TruncatedSVD(n_components=n_components, random_state=42)
        reduced = svd.fit_transform(tfidf)
        sims = cosine_similarity(reduced[0:1], reduced[1:])[0]
        return [_rescale_similarity(float(s), lo=0.05, hi=0.6) for s in sims]
    except Exception:
        return [0.5 for _ in resume_texts]


def _split_chunks_with_offsets(text: str, max_chunks: int = 100):
    """Splits resume text into sentence/line-ish chunks, keeping the exact
    (start, end) character offsets in the ORIGINAL text so semantic matches
    can be highlighted precisely on the resume preview."""
    chunks = []
    for m in re.finditer(r"[^\n.•]+", text):
        raw = m.group()
        stripped = raw.strip()
        if len(stripped) < 20:
            continue
        lead = len(raw) - len(raw.lstrip())
        start = m.start() + lead
        end = start + len(stripped)
        chunks.append((start, end, stripped))
    if not chunks:
        capped = text[:2000]
        chunks = [(0, len(capped), capped)]
    return chunks[:max_chunks]


def infer_semantic_skill_matches(missing_skills: list, resume_text: str, threshold: float = 0.42) -> list:
    """For skills not literally present, checks whether the resume's actual
    content is nonetheless semantically close to that skill (e.g. resume
    mentions Node.js + MongoDB + REST APIs -> infer 'Express' likely).
    Returns [{skill, start, end, chunk, score}] with exact offsets into
    resume_text for highlighting."""
    if not missing_skills or not supports_skill_level_semantics():
        return []

    chunks = _split_chunks_with_offsets(resume_text)
    chunk_texts = [c[2] for c in chunks]

    skill_vecs = get_skill_vectors(missing_skills)
    chunk_vecs = _embed_texts(chunk_texts)
    if chunk_vecs is None or len(chunk_vecs) == 0:
        return []

    sims = cosine_similarity(skill_vecs, chunk_vecs)
    results = []
    for i, skill in enumerate(missing_skills):
        best_idx = int(np.argmax(sims[i]))
        best_score = float(sims[i][best_idx])
        if best_score >= threshold:
            start, end, chunk_text = chunks[best_idx]
            results.append({"skill": skill, "start": start, "end": end, "chunk": chunk_text, "score": round(best_score, 3)})
    return results


# =========================================================================
# 3. HIGHLIGHT SPANS (for resume preview UI)
# =========================================================================

def build_highlights(text: str, explicit_matched: set, semantic_results: list, patterns: dict = None) -> list:
    """Non-overlapping list of {start,end,type,skill} spans, sorted by
    position, ready for the frontend to render as highlighted text."""
    patterns = patterns or _SKILL_PATTERNS
    spans = []
    for skill in explicit_matched:
        pattern = patterns.get(skill)
        if not pattern:
            continue
        for m in pattern.finditer(text):
            spans.append({"start": m.start(), "end": m.end(), "type": "explicit", "skill": skill})
    for r in semantic_results:
        spans.append({"start": r["start"], "end": r["end"], "type": "semantic", "skill": r["skill"]})

    spans.sort(key=lambda s: (s["start"], -(s["end"] - s["start"])))
    merged = []
    last_end = -1
    for s in spans:
        if s["start"] >= last_end:
            merged.append(s)
            last_end = s["end"]
    return merged


# =========================================================================
# 4. KEYWORD COVERAGE SCORE (weights fully configurable)
# =========================================================================

def keyword_coverage(required: list, preferred: list, explicit_matched: set, semantic_matched: set, cfg: dict, skill_weights: dict = None) -> float:
    req_w, pref_w, credit = cfg["required_weight"], cfg["preferred_weight"], cfg["semantic_credit"]
    skill_weights = skill_weights or {}
    total_weight = 0.0
    earned = 0.0
    for skill in required:
        w = req_w * skill_weights.get(skill, 1.0)
        total_weight += w
        if skill in explicit_matched:
            earned += w
        elif skill in semantic_matched:
            earned += w * credit
    for skill in preferred:
        w = pref_w * skill_weights.get(skill, 1.0)
        total_weight += w
        if skill in explicit_matched:
            earned += w
        elif skill in semantic_matched:
            earned += w * credit

    if total_weight <= 0:
        return 50.0  # No dictionary skills detected in this JD at all
    return float(np.clip((earned / total_weight) * 100, 0, 100))


# =========================================================================
# 5. BIAS / NARROW-PHRASING DETECTION (bonus feature)
# =========================================================================

GENDER_CODED_TERMS = [
    "rockstar", "ninja", "guru", "young", "digital native",
    "native english speaker", "recent graduate only", "he/she", "he or she",
    "chairman", "salesman", "manpower", "energetic young",
]


def detect_bias_flags(jd_text: str) -> list:
    flags = []
    lower = jd_text.lower()

    for term in GENDER_CODED_TERMS:
        if term in lower:
            flags.append({
                "type": "Potentially biased language",
                "detail": f"The phrase \"{term}\" can skew applicant pools by age/gender/background "
                          f"and isn't a real job requirement.",
            })

    yoe_match = re.search(r"(\d+)\+?\s*years?", lower)
    is_entry_level = bool(re.search(r"\b(intern|junior|entry[- ]level|fresher|graduate)\b", lower))
    if yoe_match and is_entry_level and int(yoe_match.group(1)) >= 3:
        flags.append({
            "type": "Experience mismatch",
            "detail": f"JD asks for {yoe_match.group(1)}+ years of experience but targets an "
                      f"entry-level/intern role — this could exclude qualified junior candidates "
                      f"who would otherwise be a great fit.",
        })

    if re.search(r"\b(phd|doctorate)\b", lower) and is_entry_level:
        flags.append({
            "type": "Overly narrow qualification",
            "detail": "A PhD/doctorate requirement on an entry-level or intern posting is unusually "
                      "narrow and may filter out strong candidates unnecessarily.",
        })

    skills_found = extract_skills_from_jd(jd_text)
    if len(skills_found["required"]) >= 12 and not skills_found["preferred"]:
        flags.append({
            "type": "Overloaded requirements",
            "detail": f"{len(skills_found['required'])} distinct skills are all marked as strictly "
                      f"required with none marked as preferred/nice-to-have — very few real "
                      f"candidates will match every single one, narrowing the pool more than necessary.",
        })

    return flags


# =========================================================================
# 6. CANDIDATE NAME EXTRACTION
# =========================================================================

def extract_candidate_name(resume_text: str, filename: str) -> str:
    lines = [l.strip() for l in resume_text.splitlines() if l.strip()][:6]
    name_re = re.compile(r"^[A-Z][a-zA-Z.'-]+(\s+[A-Z][a-zA-Z.'-]+){1,3}$")
    for line in lines:
        candidate = line.strip()
        if "@" in candidate or any(ch.isdigit() for ch in candidate):
            continue
        if 4 <= len(candidate) <= 40 and name_re.match(candidate):
            return candidate
    # Fallback: derive from filename
    base = re.sub(r"\.(pdf|docx?|txt)$", "", filename, flags=re.IGNORECASE)
    base = re.sub(r"[_\-]+", " ", base).strip()
    base = re.sub(r"\b(resume|cv|final|updated|copy)\b", "", base, flags=re.IGNORECASE).strip()
    return base.title() if base else filename


# =========================================================================
# 7. TOP-LEVEL PIPELINE
# =========================================================================

def rank_candidates(job_description: str, resumes: list, config: dict = None, progress_cb=None, phase_cb=None) -> dict:
    """
    resumes: list of {"filename": str, "text": str, "parse_error": str|None}
    config: see DEFAULT_CONFIG — every weight is user-tunable from the UI.
    progress_cb(done, total): optional, called after each candidate is scored
    so a long-running (200+ resume) job can report real progress.
    phase_cb(phase_name): optional, called before each major sub-phase so the
    UI can show a meaningful label during the (batched, single-call) document
    embedding step rather than looking frozen.
    """
    config = config or {}
    cfg = resolve_config(config)

    # Custom skills: [{name, required: bool, weight: float}] — "must-have"
    # vs "normal" (preferred) keywords added by the recruiter, each with an
    # optional per-skill weight multiplier. Falls back to the older flat
    # custom_required_skills list for compatibility.
    custom_skills = config.get("custom_skills") or [
        {"name": t, "required": True, "weight": 1.0} for t in config.get("custom_required_skills", []) if t and t.strip()
    ]
    custom_skills = [c for c in custom_skills if c.get("name", "").strip()]
    custom_required = [c["name"].strip() for c in custom_skills if c.get("required", True)]
    custom_preferred = [c["name"].strip() for c in custom_skills if not c.get("required", True)]
    patterns = build_pattern_map([c["name"].strip() for c in custom_skills])

    jd_skills_raw = extract_skills_from_jd(job_description)
    required = sorted(set(jd_skills_raw["required"]) | set(custom_required))
    preferred = sorted((set(jd_skills_raw["preferred"]) | set(custom_preferred)) - set(required))

    skill_weights = {c["name"].strip(): float(c.get("weight", 1.0)) for c in custom_skills}
    skill_weights.update(config.get("skill_weights") or {})

    jd_skills = {"required": required, "preferred": preferred, "custom": custom_required + custom_preferred}
    bias_flags = detect_bias_flags(job_description)

    min_years = config.get("min_years_experience")
    min_cgpa = config.get("min_cgpa")
    min_education = config.get("min_education_level")  # one of EDUCATION_LEVEL_RANK keys, or None
    required_field = (config.get("required_field_of_study") or "").strip().lower()
    criteria_penalty = float(config.get("criteria_penalty", 10))

    # Warm the skill-vector cache once for the whole batch (big win at scale)
    if phase_cb:
        phase_cb("embedding_skills")
    if supports_skill_level_semantics():
        get_skill_vectors(list(set(required + preferred)))

    valid = [r for r in resumes if not r.get("parse_error") and len(r.get("text", "").strip()) >= 40]
    invalid = [r for r in resumes if r not in valid]

    if phase_cb:
        phase_cb("embedding_documents")
    semantic_sims = document_semantic_scores(job_description, [r["text"] for r in valid]) if valid else []

    if phase_cb:
        phase_cb("scoring_candidates")

    candidates = []
    total = len(valid)
    for idx, r in enumerate(valid):
        text = r["text"]
        lower = text.lower()

        explicit_matched = {s for s in (required + preferred) if _skill_present_literal(s, lower, patterns)}
        missing_after_literal = [s for s in required + preferred if s not in explicit_matched]
        semantic_results = infer_semantic_skill_matches(missing_after_literal, text, threshold=cfg["semantic_threshold"])
        semantic_matched = {r2["skill"] for r2 in semantic_results}

        missing_required = [s for s in required if s not in explicit_matched and s not in semantic_matched]
        missing_preferred = [s for s in preferred if s not in explicit_matched and s not in semantic_matched]

        kw_score = keyword_coverage(required, preferred, explicit_matched, semantic_matched, cfg, skill_weights)
        sem_score_pct = semantic_sims[idx] * 100

        years_exp = extract_years_of_experience(text)
        cgpa = extract_cgpa(text)
        education = extract_education(text)

        # Criteria checks — "N/A" (couldn't extract) never silently counts as
        # a pass OR a hard fail; it's surfaced as unknown (None) and excluded
        # from the penalty so imperfect extraction never quietly tanks a real
        # candidate. Only a confirmed below-threshold value is penalized.
        if min_years in (None, "") or years_exp is None:
            meets_years = None
        else:
            meets_years = years_exp >= float(min_years)

        if min_cgpa in (None, "") or cgpa is None:
            meets_cgpa = None
        else:
            meets_cgpa = cgpa["value_10"] >= float(min_cgpa)

        if not min_education or education is None:
            meets_education = None
        else:
            meets_education = EDUCATION_LEVEL_RANK.get(education["level"], 0) >= EDUCATION_LEVEL_RANK.get(min_education, 0)

        if not required_field or not education or not education.get("field"):
            meets_field = None
        else:
            meets_field = required_field in education["field"]

        penalty = 0.0
        if meets_years is False:
            penalty += criteria_penalty
        if meets_cgpa is False:
            penalty += criteria_penalty
        if meets_education is False:
            penalty += criteria_penalty
        if meets_field is False:
            penalty += criteria_penalty * 0.5

        final_score = round(
            max(0.0, cfg["semantic_weight"] * sem_score_pct + (1 - cfg["semantic_weight"]) * kw_score - penalty), 1
        )

        preview = text[:8000]
        contact = extract_contact_info(text)
        location = extract_location(text)
        candidates.append({
            "id": f"cand_{idx}",
            "name": extract_candidate_name(text, r["filename"]),
            "filename": r["filename"],
            "email": contact["email"],
            "phone": contact["phone"],
            "linkedin": contact["linkedin"],
            "location": location,
            "years_experience": years_exp,
            "cgpa": cgpa,
            "education": education,
            "meets_criteria": {
                "years_experience": meets_years, "cgpa": meets_cgpa,
                "education": meets_education, "field_of_study": meets_field,
            },
            "final_score": final_score,
            "semantic_score": round(sem_score_pct, 1),
            "keyword_score": round(kw_score, 1),
            "matched_skills": sorted(explicit_matched & set(required)),
            "matched_preferred_skills": sorted(explicit_matched & set(preferred)),
            "semantic_matched_skills": sorted(semantic_matched & set(required)),
            "semantic_matched_preferred_skills": sorted(semantic_matched & set(preferred)),
            "missing_required_skills": missing_required,
            "missing_preferred_skills": missing_preferred,
            "word_count": len(text.split()),
            "text_preview": preview,
            "highlights": build_highlights(preview, explicit_matched, [sr for sr in semantic_results if sr["start"] < len(preview)], patterns),
            "parse_error": None,
        })

        if progress_cb:
            progress_cb(idx + 1, total)

    candidates.sort(key=lambda c: c["final_score"], reverse=True)
    for i, c in enumerate(candidates):
        c["rank"] = i + 1

    for r in invalid:
        candidates.append({
            "id": f"cand_err_{r['filename']}",
            "name": extract_candidate_name("", r["filename"]),
            "filename": r["filename"],
            "email": None, "phone": None, "linkedin": None, "location": None, "years_experience": None,
            "cgpa": None, "education": None,
            "meets_criteria": {"years_experience": None, "cgpa": None, "education": None, "field_of_study": None},
            "final_score": 0,
            "semantic_score": 0,
            "keyword_score": 0,
            "matched_skills": [], "matched_preferred_skills": [],
            "semantic_matched_skills": [], "semantic_matched_preferred_skills": [],
            "missing_required_skills": required,
            "missing_preferred_skills": preferred,
            "word_count": 0,
            "text_preview": "",
            "highlights": [],
            "parse_error": r.get("parse_error") or "Could not extract readable text from this file "
                                                     "(likely a scanned image, corrupted, or unsupported format).",
            "rank": None,
        })

    explanations = {}
    for c in candidates[:3]:
        if c["parse_error"]:
            continue
        explanations[c["id"]] = build_explanation(c)

    return {
        "jd_skills": jd_skills,
        "bias_flags": bias_flags,
        "candidates": candidates,
        "explanations": explanations,
        "semantic_backend": _init_backend(),
        "semantic_backend_label": backend_label(),
        "config": cfg,
    }


def build_explanation(c: dict) -> str:
    parts = []
    parts.append(
        f"{c['name']} ranked #{c['rank']} with an overall fit score of {c['final_score']}/100 "
        f"(semantic similarity to the JD: {c['semantic_score']}%, keyword/skill coverage: {c['keyword_score']}%)."
    )
    if c["matched_skills"]:
        parts.append("Explicitly demonstrates required skills: " + ", ".join(c["matched_skills"]) + ".")
    if c["semantic_matched_skills"]:
        parts.append(
            "Context strongly suggests experience with " + ", ".join(c["semantic_matched_skills"]) +
            " even though those exact words don't appear in the resume — inferred from related work described."
        )
    if c["missing_required_skills"]:
        parts.append(
            "Required skills not evidenced anywhere in the resume: " +
            ", ".join(c["missing_required_skills"]) + ". Worth probing on these in an interview."
        )
    else:
        parts.append("No required skills appear to be missing.")
    return " ".join(parts)

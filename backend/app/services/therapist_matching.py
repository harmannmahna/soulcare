"""Embedding-based therapist ranking with tag-filter fallback.

Tries Weaviate when WEAVIATE_URL is set; otherwise ranks with a local
TF-IDF cosine space over therapist bio + specialty + approach.
"""

from __future__ import annotations

from functools import lru_cache

from app.config import get_settings
from app.store import store


def _doc(t: dict) -> str:
    tags = " ".join(t.get("tags") or [])
    return " ".join(
        [
            t.get("name") or "",
            t.get("title") or "",
            t.get("bio") or "",
            t.get("approach") or "",
            tags,
            t.get("city") or "",
        ]
    )


@lru_cache
def _vectorizer():
    from sklearn.feature_extraction.text import TfidfVectorizer

    return TfidfVectorizer(ngram_range=(1, 2), min_df=1)


async def _weaviate_query(query: str, limit: int) -> list[dict] | None:
    settings = get_settings()
    if not settings.weaviate_url:
        return None
    try:
        import weaviate
        from weaviate.classes.query import MetadataQuery

        client = weaviate.connect_to_custom(
            http_host=settings.weaviate_url.replace("https://", "").replace("http://", "").split(":")[0],
            http_port=443 if settings.weaviate_url.startswith("https") else 80,
            http_secure=settings.weaviate_url.startswith("https"),
            grpc_host=settings.weaviate_url.replace("https://", "").replace("http://", "").split(":")[0],
            grpc_port=50051,
            grpc_secure=settings.weaviate_url.startswith("https"),
        )
        try:
            coll = client.collections.get("Therapist")
            res = coll.query.near_text(query=query, limit=limit, return_metadata=MetadataQuery(distance=True))
            out = []
            for obj in res.objects:
                props = obj.properties or {}
                dist = getattr(obj.metadata, "distance", None)
                sim = round(1 - float(dist), 3) if dist is not None else None
                props["similarity"] = sim
                props["match_reason"] = props.get("match_reason") or "weaviate near-text"
                out.append(props)
            return out
        finally:
            client.close()
    except Exception:  # noqa: BLE001
        return None


async def rank_therapists(query: str, tags: list[str] | None = None, limit: int = 3) -> list[dict]:
    blob = " ".join([query or "", *(tags or [])]).strip()
    remote = await _weaviate_query(blob or "mental health support", limit)
    if remote:
        return remote[:limit]

    therapists = await store.collection("therapists").find({})
    if not therapists:
        return []
    try:
        from sklearn.metrics.pairwise import cosine_similarity

        docs = [_doc(t) for t in therapists]
        vec = _vectorizer()
        matrix = vec.fit_transform(docs)
        qv = vec.transform([blob or "care support"])
        scores = cosine_similarity(qv, matrix)[0]
        ranked = sorted(zip(scores, therapists), key=lambda p: -float(p[0]))
        out = []
        for score, t in ranked[:limit]:
            item = {k: v for k, v in t.items() if k != "_id"}
            item["similarity"] = round(float(score), 3)
            overlap = [x for x in (t.get("tags") or []) if x.lower() in blob.lower()]
            why = overlap[:3] if overlap else (t.get("tags") or [])[:2]
            item["match_reason"] = "matched on: " + (", ".join(why) if why else "profile similarity")
            item["match_backend"] = "local_tfidf"
            out.append(item)
        return out
    except Exception:  # noqa: BLE001
        tagset = {t.lower() for t in (tags or [])}
        scored = []
        for t in therapists:
            overlap = len(tagset.intersection({x.lower() for x in t.get("tags", [])}))
            scored.append((overlap, t))
        scored.sort(key=lambda pair: (-pair[0], -float(pair[1].get("rating") or 0)))
        picked = [item for _, item in scored[:limit]] or therapists[:limit]
        out = []
        for t in picked:
            item = {k: v for k, v in t.items() if k != "_id"}
            item["match_reason"] = "tag fallback (embeddings unavailable)"
            item["match_backend"] = "tags"
            out.append(item)
        return out

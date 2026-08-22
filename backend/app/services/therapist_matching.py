"""Embedding-based therapist ranking with tag-filter fallback.

Tries Weaviate when WEAVIATE_URL is set; otherwise ranks with a local
TF-IDF cosine space over therapist bio + specialty + approach.
"""

from __future__ import annotations

from functools import lru_cache
import json

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


def _parse_weaviate(result: object) -> list[dict]:
    if not isinstance(result, dict):
        return []
    blob = result.get("result") or result.get("data") or result
    if not isinstance(blob, dict):
        return []
    data = blob.get("data") or blob
    rows = (((data.get("Get") or {}).get("Therapist")) if isinstance(data, dict) else None) or []
    out = []
    for row in rows:
        extra = row.get("_additional") or {}
        dist = extra.get("distance")
        item = {k: v for k, v in row.items() if k != "_additional"}
        item["similarity"] = round(1 - float(dist), 3) if dist is not None else None
        item["match_reason"] = "matched via Swytchcode Weaviate near-text"
        out.append(item)
    return out


async def _weaviate_query(query: str, limit: int) -> list[dict] | None:
    """Vector search via Swytchcode Weaviate GraphQL. Local rank is the fallback."""
    from app.services.swytchcode_exec import exec_tool

    gql = (
        "{ Get { Therapist(nearText: {concepts: [%s]} limit: %s) "
        "{ name title city tags bio approach price_inr rating "
        "_additional { distance } } } }"
        % (json.dumps(query or "mental health support"), int(limit))
    )
    swy = await exec_tool("weaviate_graphql", body={"query": gql})
    if swy.get("ok") and not swy.get("demo"):
        parsed = _parse_weaviate(swy.get("result"))
        if parsed:
            for item in parsed:
                item["match_backend"] = "swytchcode:weaviate.graphql.create"
            return parsed
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
            item["match_backend"] = "swytchcode_weaviate_fallback_tfidf"
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

from __future__ import annotations

import time

from .es_client import GIG_INDEX, es
from .schemas import GigSearchResult, SearchParams, SearchResponse


async def elasticsearch_search(params: SearchParams) -> SearchResponse:
    if es is None:
        raise RuntimeError("elasticsearch package is not installed")

    start   = time.monotonic()
    must    : list = []
    filter_ : list = [{"term": {"status": "active"}}]
    should  : list = []

    # ── Full-text query ───────────────────────────────────────────
    if params.q:
        must.append({
            "multi_match": {
                "query":         params.q,
                "fields":        ["title^3", "title.autocomplete^2", "description", "tags^2"],
                "type":          "best_fields",
                "fuzziness":     "AUTO",
                "prefix_length": 2,
                "operator":      "and",
            }
        })
        should.append({
            "match_phrase": {"title": {"query": params.q, "boost": 2}}
        })
    else:
        must.append({"match_all": {}})

    # ── Filters ───────────────────────────────────────────────────
    if params.category:
        filter_.append({"term": {"category_slug": params.category}})
    if params.tag_list:
        filter_.append({"terms": {"tags": params.tag_list}})
    if params.min_price is not None or params.max_price is not None:
        price_range: dict = {}
        if params.min_price is not None:
            price_range["gte"] = float(params.min_price)
        if params.max_price is not None:
            price_range["lte"] = float(params.max_price)
        filter_.append({"range": {"price_from": price_range}})
    if params.delivery_days:
        filter_.append({"range": {"delivery_days_min": {"lte": params.delivery_days}}})
    if params.min_rating is not None:
        filter_.append({"range": {"avg_rating": {"gte": params.min_rating}}})
    if params.seller_level:
        filter_.append({"term": {"seller_level": params.seller_level}})

    # ── function_score for ranking signals ───────────────────────
    query_body = {
        "function_score": {
            "query": {"bool": {"must": must, "filter": filter_, "should": should}},
            "functions": [
                {
                    "field_value_factor": {
                        "field":    "avg_rating",
                        "factor":   0.2,
                        "modifier": "log1p",
                        "missing":  0,
                    }
                },
                {
                    "field_value_factor": {
                        "field":    "review_count",
                        "factor":   0.1,
                        "modifier": "log1p",
                        "missing":  0,
                    }
                },
                {
                    "gauss": {
                        "created_at": {
                            "origin": "now",
                            "scale":  "30d",
                            "decay":  0.5,
                        }
                    },
                    "weight": 0.5,
                },
            ],
            "score_mode": "sum",
            "boost_mode": "multiply",
        }
    }

    # ── Sort ──────────────────────────────────────────────────────
    sort_map = {
        "relevance":  ["_score"],
        "price_asc":  [{"price_from": "asc"},  "_score"],
        "price_desc": [{"price_from": "desc"}, "_score"],
        "rating":     [{"avg_rating": {"order": "desc", "missing": "_last"}}, "_score"],
        "newest":     [{"created_at": "desc"},  "_score"],
        "popular":    [{"review_count": "desc"}, "_score"],
    }
    sort = sort_map.get(params.sort, ["_score"])

    # ── Aggregations ──────────────────────────────────────────────
    aggs = {
        "categories": {"terms": {"field": "category_slug", "size": 20}},
        "price_stats": {"stats": {"field": "price_from"}},
        "rating_ranges": {
            "range": {
                "field": "avg_rating",
                "ranges": [
                    {"key": "4+",   "from": 4.0},
                    {"key": "4.5+", "from": 4.5},
                ],
            }
        },
    }

    response = await es.search(
        index = GIG_INDEX,
        body  = {
            "query": query_body,
            "sort":  sort,
            "from":  params.offset,
            "size":  params.limit,
            "aggs":  aggs,
            "highlight": {
                "fields": {
                    "title":       {"number_of_fragments": 0},
                    "description": {"fragment_size": 150, "number_of_fragments": 1},
                },
                "pre_tags":  ["<mark>"],
                "post_tags": ["</mark>"],
            },
        },
    )

    total = response["hits"]["total"]["value"]
    hits  = response["hits"]["hits"]

    results = [
        GigSearchResult(
            id                = h["_source"]["id"],
            title             = h["_source"]["title"],
            slug              = h["_source"]["slug"],
            cover_url         = h["_source"].get("cover_url"),
            seller_name       = h["_source"].get("seller_name", ""),
            seller_level      = h["_source"].get("seller_level"),
            price_from        = h["_source"]["price_from"],
            delivery_days_min = h["_source"]["delivery_days_min"],
            avg_rating        = h["_source"].get("avg_rating"),
            review_count      = h["_source"].get("review_count", 0),
            tags              = h["_source"].get("tags", []),
            rank              = h["_score"],
        )
        for h in hits
    ]

    # ── "Did you mean" on zero results ────────────────────────────
    suggestions: list[str] = []
    if total == 0 and params.q:
        suggest_resp = await es.search(
            index = GIG_INDEX,
            body  = {
                "suggest": {
                    "title_suggest": {
                        "text":   params.q,
                        "phrase": {
                            "field":       "title",
                            "size":        3,
                            "gram_size":   3,
                            "confidence":  1,
                            "direct_generator": [
                                {"field": "title", "suggest_mode": "always"}
                            ],
                        },
                    }
                },
                "size": 0,
            },
        )
        options     = (
            suggest_resp.get("suggest", {})
            .get("title_suggest", [{}])[0]
            .get("options", [])
        )
        suggestions = [opt["text"] for opt in options]

    return SearchResponse(
        results     = results,
        total       = total,
        page        = params.page,
        pages       = -(-total // params.limit),
        query       = params.q,
        facets      = _parse_aggs(response.get("aggregations", {})),
        suggestions = suggestions,
        took_ms     = round((time.monotonic() - start) * 1000, 1),
    )


def _parse_aggs(aggs: dict) -> dict:
    return {
        "categories": [
            {"slug": b["key"], "count": b["doc_count"]}
            for b in aggs.get("categories", {}).get("buckets", [])
        ],
        "price_stats": aggs.get("price_stats", {}),
        "rating_ranges": [
            {"label": b["key"], "count": b["doc_count"]}
            for b in aggs.get("rating_ranges", {}).get("buckets", [])
        ],
    }

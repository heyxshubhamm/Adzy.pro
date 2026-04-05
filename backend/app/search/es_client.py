"""
Elasticsearch async client.

Phase 2 — only active when USE_ELASTICSEARCH=true in env.
Requires: pip install elasticsearch[async]>=8.0
"""
from __future__ import annotations

import os

try:
    from elasticsearch import AsyncElasticsearch
    _ES_AVAILABLE = True
except ImportError:
    AsyncElasticsearch = None  # type: ignore[assignment,misc]
    _ES_AVAILABLE = False

GIG_INDEX = "gigs"

GIG_MAPPING = {
    "settings": {
        "analysis": {
            "analyzer": {
                "gig_analyzer": {
                    "type":      "custom",
                    "tokenizer": "standard",
                    "filter":    ["lowercase", "asciifolding", "stop", "snowball"],
                },
                "autocomplete_analyzer": {
                    "type":      "custom",
                    "tokenizer": "standard",
                    "filter":    ["lowercase", "asciifolding", "edge_ngram_filter"],
                },
            },
            "filter": {
                "edge_ngram_filter": {
                    "type":     "edge_ngram",
                    "min_gram": 2,
                    "max_gram": 20,
                },
                "snowball": {"type": "snowball", "language": "English"},
            },
        },
        "number_of_shards":   1,
        "number_of_replicas": 0,
    },
    "mappings": {
        "properties": {
            "id":            {"type": "keyword"},
            "title": {
                "type":     "text",
                "analyzer": "gig_analyzer",
                "fields": {
                    "autocomplete": {"type": "text",    "analyzer": "autocomplete_analyzer"},
                    "keyword":      {"type": "keyword"},
                },
            },
            "description":       {"type": "text",    "analyzer": "gig_analyzer"},
            "tags":              {"type": "keyword"},
            "category_id":       {"type": "keyword"},
            "category_slug":     {"type": "keyword"},
            "seller_id":         {"type": "keyword"},
            "seller_level":      {"type": "keyword"},
            "status":            {"type": "keyword"},
            "price_from":        {"type": "float"},
            "delivery_days_min": {"type": "integer"},
            "avg_rating":        {"type": "float"},
            "review_count":      {"type": "integer"},
            "order_count":       {"type": "integer"},
            "created_at":        {"type": "date"},
            "cover_url":         {"type": "keyword", "index": False},
            "slug":              {"type": "keyword"},
            "seller_name":       {"type": "keyword"},
        }
    },
}


def _build_client() -> "AsyncElasticsearch | None":
    if not _ES_AVAILABLE:
        return None
    return AsyncElasticsearch(
        hosts         = [os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200")],
        http_auth     = (
            os.getenv("ES_USER", "elastic"),
            os.getenv("ES_PASSWORD", "changeme"),
        ),
        retry_on_timeout = True,
        max_retries      = 3,
        request_timeout  = 10,
    )


es = _build_client()


async def create_index() -> None:
    if es is None:
        return
    exists = await es.indices.exists(index=GIG_INDEX)
    if not exists:
        await es.indices.create(index=GIG_INDEX, body=GIG_MAPPING)

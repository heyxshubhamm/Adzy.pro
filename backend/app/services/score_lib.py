from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class SellerFeatureVector:
    keywords: float
    total_orders: int
    completed_orders: int
    completion_rate: float
    rejection_rate: float
    rating: float
    reviews_count: int
    ctr: float
    online_status: float
    website_activity: float
    repeat_orders: float
    level: int


def clip01(value: float) -> float:
    if value < 0:
        return 0.0
    if value > 1:
        return 1.0
    return float(value)


def normalize_log(value: float, max_value: float) -> float:
    value = max(0.0, float(value))
    max_value = max(1.0, float(max_value))
    return clip01(math.log1p(value) / math.log1p(max_value))


def normalize_ratio(value: float, cap: float = 1.0) -> float:
    cap = max(1e-9, float(cap))
    return clip01(float(value) / cap)


def normalize_reviews(rating: float, reviews_count: int, reviews_max: int = 500) -> float:
    rating_component = clip01(float(rating) / 5.0)
    volume_component = normalize_log(float(reviews_count), float(reviews_max))
    return clip01((0.6 * rating_component) + (0.4 * volume_component))


def normalize_repeat_orders(repeat_ratio: float) -> float:
    return clip01(math.sqrt(clip01(float(repeat_ratio))))


def normalize_level(level: int) -> float:
    return clip01(float(level) / 4.0)


def normalize_feature_vector(
    features: SellerFeatureVector,
    *,
    total_orders_max: int = 2000,
    completed_orders_max: int = 2000,
    website_activity_max: int = 250,
) -> dict[str, float]:
    keywords_norm = clip01(features.keywords)
    total_orders_norm = normalize_log(features.total_orders, total_orders_max)
    completed_orders_norm = normalize_log(features.completed_orders, completed_orders_max)
    completion_rate_norm = clip01(features.completion_rate)
    rejection_penalty_norm = clip01(1.0 - features.rejection_rate)
    reviews_norm = normalize_reviews(features.rating, features.reviews_count)
    ctr_norm = normalize_ratio(features.ctr, cap=0.20)
    online_status_norm = clip01(features.online_status)
    website_activity_norm = normalize_log(features.website_activity, website_activity_max)
    repeat_orders_norm = normalize_repeat_orders(features.repeat_orders)
    level_norm = normalize_level(features.level)

    return {
        "keywords": keywords_norm,
        "total_orders": total_orders_norm,
        "completed_orders": completed_orders_norm,
        "completion_rate": completion_rate_norm,
        "rejection_penalty": rejection_penalty_norm,
        "reviews": reviews_norm,
        "ctr": ctr_norm,
        "online_status": online_status_norm,
        "website_activity": website_activity_norm,
        "repeat_orders": repeat_orders_norm,
        "level": level_norm,
    }


def weighted_score_0_100(normalized: dict[str, float], weights_pct: dict[str, float]) -> float:
    score_0_1 = 0.0
    for key, value in normalized.items():
        score_0_1 += (weights_pct.get(key, 0.0) / 100.0) * clip01(value)
    return round(clip01(score_0_1) * 100.0, 2)

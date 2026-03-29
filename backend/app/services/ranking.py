import random
from datetime import datetime, timezone
from typing import List, Dict
import math

def normalize(value: float, max_value: float) -> float:
    if not max_value or max_value == 0:
        return 0
    return value / max_value

def calculate_base_score(listing: any, max_values: Dict[str, float]) -> float:
    # 1. Time Awareness (Decay Factor)
    days_old = (datetime.now(timezone.utc) - listing.created_at.replace(tzinfo=timezone.utc)).days
    is_new = days_old < 4 # The Discovery Phase (ABC Model)
    
    # 2. Activity & Presence Factor
    # Score based on how recently the seller was online (last 24h = 1.0, last week = 0.5)
    last_act = getattr(listing.seller, 'last_active_at', None)
    online_activity = 1.0
    if last_act:
        hours_since = (datetime.now(timezone.utc) - last_act.replace(tzinfo=timezone.utc)).total_seconds() / 3600
        online_activity = max(0.1, 1.0 - (hours_since / 168)) 
    
    # 3. Trust Factors
    verified = 1.0 if getattr(listing, 'is_verified', False) else 0.0
    
    # 4. Seller Speed Factor
    resp_speed = float(getattr(listing.seller, 'response_speed_seconds', 3600) or 3600)
    resp_score = 1.0 - min(resp_speed / 86400, 0.9) # 24h benchmark
    
    # 5. Intent Relevance
    relevance = getattr(listing, 'relevance_score', 0.5)
    
    # 6. Conversion Analytics
    stats = getattr(listing, 'stats', None)
    impressions = getattr(stats, 'impressions_count', 0) or 1
    clicks = getattr(stats, 'clicks_count', 0) or 0
    orders = getattr(stats, 'orders_count', 0) or 0
    
    ctr = clicks / impressions
    cr = orders / (clicks or 1)
    
    # 7. Quality Merit (Historical Performance)
    completion_rate = float(getattr(listing.seller, 'completion_rate', 100.0) or 100.0) / 100.0
    order_merit = float(getattr(listing.seller, 'total_orders_completed', 0)) / 10.0 # Standardized to 10 orders
    merit_score = min(1.0, (completion_rate * 0.7) + (min(1.0, order_merit) * 0.3))

    if is_new:
        # LAYER 1: NEW GIG SCORE (Discovery Mode)
        price = float(getattr(listing, 'price', 0) or 0)
        price_comp = 1.0 - normalize(price, max_values.get("price", 1))
        
        score = (
            0.25 * online_activity +
            0.20 * verified +
            0.15 * resp_score +
            0.15 * ctr +
            0.15 * price_comp +
            0.10 * relevance
        )
    else:
        # LAYER 1: MATURE GIG SCORE (Performance Mode)
        score = (
            0.25 * cr +
            0.15 * merit_score +
            0.15 * (float(getattr(listing, 'rating', 5.0))/5.0) +
            0.10 * resp_score +
            0.10 * online_activity +
            0.10 * ctr +
            0.05 * verified +
            0.10 * relevance
        )

    return score

def calculate_final_score(listing: any, max_values: Dict[str, float], total_impressions: int) -> float:
    """
    MASTER UNIFIED FORMULA (adzy.pro PRD):
    Score = Base × Level × NewBoost × Freshness × Narad × (1 - RiskPenalty)
    """
    
    # 1. Base Score (Quality Merit)
    base_score = calculate_base_score(listing, max_values)
    
    # 2. Level Multiplier (Trust Layer)
    level = getattr(listing.seller, "publisher_level", 0)
    level_multipliers = {0: 1.0, 1: 1.1, 2: 1.25, 3: 1.4, 4: 1.6}
    level_multiplier = level_multipliers.get(level, 1.0)
    
    # 3. New Gig Boost (ABC Discovery Layer)
    days_old = (datetime.now(timezone.utc) - listing.created_at.replace(tzinfo=timezone.utc)).days
    new_boost = 1.0
    if days_old == 0: new_boost = 1.6 # High initial blast
    elif days_old == 1: new_boost = 1.4
    elif days_old == 2: new_boost = 1.2
    
    # 4. Freshness Factor (Time Decay Layer)
    freshness = 1.0
    if days_old <= 7: freshness = 1.1
    elif days_old > 90: freshness = 0.8 # Legacy penalty
    
    # 5. Narad Exploration (Stochastic discovery)
    narad = random.uniform(0.95, 1.05)
    
    # 6. Risk Penalty (Security Layer)
    risk_score = float(getattr(listing, 'risk_score', 0.0) or 0.0)
    risk_penalty = 1.0 - (risk_score / 150.0) # 100 risk = ~33% penalty
    
    # MASTER UNIFICATION
    final_score = (
        base_score * 
        level_multiplier * 
        new_boost * 
        freshness * 
        narad * 
        risk_penalty
    )
    
    # 7. Bandit/UCB Contribution (Internal Learning)
    stats = getattr(listing, 'stats', None)
    gig_impressions = getattr(stats, 'impressions_count', 0) or 1
    gig_orders = getattr(stats, 'orders_count', 0) or 0
    total_imps = total_impressions or 1
    
    avg_reward = gig_orders / gig_impressions
    exploration = math.sqrt((2 * math.log(total_imps)) / gig_impressions)
    bandit_score = avg_reward + (0.5 * exploration) # Higher weight on exploration
    
    final_score += (0.1 * bandit_score)
    
    return final_score

def rank_listings(listings: List[any]) -> List[any]:
    if not listings:
        return []
        
    max_values = {
        "orders": max([getattr(l, "orders_count", 0) or 0 for l in listings] or [1]),
        "price": max([float(getattr(l, "price", 0) or 0) for l in listings] or [1]),
    }
    
    total_impressions = sum([getattr(l, "impressions_count", 0) or 0 for l in listings])
    
    for l in listings:
        l.relevance_score = 0.5 
        l.final_score = calculate_final_score(l, max_values, total_impressions)
        
    return sorted(listings, key=lambda x: getattr(x, "final_score", 0), reverse=True)

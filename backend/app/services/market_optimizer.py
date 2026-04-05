import math
import statistics
from typing import Callable

from app.services.monkey_algorithm import MonkeyAlgorithm, MonkeyConfig, ProblemDefinition, Vector
from app.services.score_lib import weighted_score_0_100

def pearson_correlation(x: list[float], y: list[float]) -> float:
    n = len(x)
    if n < 2:
        return 0.0
    
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    
    numerator = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
    sum_sq_x = sum((xi - mean_x) ** 2 for xi in x)
    sum_sq_y = sum((yi - mean_y) ** 2 for yi in y)
    
    denominator = math.sqrt(sum_sq_x * sum_sq_y)
    if denominator == 0:
        return 0.0
    
    return numerator / denominator


def spearman_correlation(x: list[float], y: list[float]) -> float:
    if len(x) != len(y) or len(x) < 2:
        return 0.0
        
    x_ranks = calculate_ranks(x)
    y_ranks = calculate_ranks(y)
    
    return pearson_correlation(x_ranks, y_ranks)


def calculate_ranks(values: list[float]) -> list[float]:
    indexed = list(enumerate(values))
    indexed.sort(key=lambda item: item[1])
    
    ranks = [0.0] * len(values)
    n = len(values)
    
    i = 0
    while i < n:
        j = i
        while j < n and indexed[j][1] == indexed[i][1]:
            j += 1
        
        avg_rank = sum(range(i + 1, j + 1)) / (j - i)
        for k in range(i, j):
            ranks[indexed[k][0]] = avg_rank
        i = j
        
    return ranks


def construct_market_problem(
    features_dataset: list[dict[str, float]], 
    targets: list[float], 
    keys: list[str], 
    bounds_dict: dict[str, tuple[float, float]]
) -> ProblemDefinition:
    """
    Constructs the 11-dimensional Intelligence problem for the Monkey Algorithm.
    The goal is to MAXIMIZE the Spearman rank correlation between the
    generated `seller_score` and the true Target (e.g. historical revenue or conversions).
    """
    
    bounds = []
    for k in keys:
        b_min, b_max = bounds_dict[k]
        bounds.append((b_min, b_max))
        
    n_dim = len(keys)

    def objective(w: Vector) -> float:
        # Normalize weights so they exactly sum to 100.0 mathematically
        total_w = sum(max(0.001, wi) for wi in w)
        normalized_w = [ (wi / total_w) * 100.0 for wi in w ]
        
        # Build weight dictionary
        weight_policy = {k: nw for k, nw in zip(keys, normalized_w)}
        
        # Calculate scores for all sellers
        computed_scores = []
        for feat in features_dataset:
            score = weighted_score_0_100(feat, weight_policy)
            computed_scores.append(score)
            
        # Correlate rankings
        correlation = spearman_correlation(computed_scores, targets)
        
        # Strict boundary penalties
        penalty = 0.0
        for k, nw in zip(keys, normalized_w):
            min_pct, max_pct = bounds_dict[k]
            if nw < min_pct:
                penalty += (min_pct - nw) ** 2
            if nw > max_pct:
                penalty += (nw - max_pct) ** 2
                
        # Return composite objective. We want to maximize correlation (up to 1.0)
        # and deeply penalize any deviation from DB min/max constraints.
        return correlation - (10.0 * penalty)

    return ProblemDefinition(
        name="market_intelligence_ranking",
        objective=objective,
        bounds=bounds,
        constraints=[],  # Handled softly via penalty
        mode="max" 
    )

def optimize_market_weights(
    features_dataset: list[dict[str, float]], 
    targets: list[float], 
    keys: list[str], 
    bounds_dict: dict[str, tuple[float, float]],
    config: MonkeyConfig = None
) -> dict[str, float]:
    
    if not features_dataset or not targets:
        return {}

    if config is None:
        config = MonkeyConfig(
            population_size=15, 
            climb_iterations=100, 
            cycles=60, 
            step_length=2.0, 
            eyesight=5.0,
            seed=42
        )
        
    problem = construct_market_problem(features_dataset, targets, keys, bounds_dict)
    ama = MonkeyAlgorithm(problem, config)
    
    result = ama.optimize()
    
    w_best = result.best_position
    total_w = sum(max(0.001, wi) for wi in w_best)
    normalized_w = [ (wi / total_w) * 100.0 for wi in w_best ]
    
    return {k: round(nw, 2) for k, nw in zip(keys, normalized_w)}

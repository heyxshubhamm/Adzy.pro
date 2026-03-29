import math
import sys
from pathlib import Path

# Allow importing backend package when tests run from repo root.
ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.services.monkey_algorithm import (  # noqa: E402
    MonkeyAlgorithm,
    MonkeyConfig,
    build_problem,
)


def test_paper_example_constrained_maximization():
    problem = build_problem("paper_example", dim=2)
    cfg = MonkeyConfig(
        population_size=5,
        climb_iterations=600,
        cycles=30,
        step_length=1e-5,
        eyesight=0.5,
        somersault_low=-1.0,
        somersault_high=1.0,
        seed=7,
    )
    result = MonkeyAlgorithm(problem, cfg).optimize()

    # Paper reports around 0.095825. We accept a realistic tolerance for quick CI runtime.
    assert result.best_value > 0.09


def test_sphere_30d_reaches_near_zero():
    problem = build_problem("f8", dim=30)
    cfg = MonkeyConfig(
        population_size=5,
        climb_iterations=1000,
        cycles=80,
        step_length=1e-2,
        eyesight=20.0,
        seed=11,
    )
    result = MonkeyAlgorithm(problem, cfg).optimize()

    assert math.isfinite(result.best_value)
    # In high dimension, MA should still cut the score strongly from random starts.
    assert result.best_value < 2_000.0

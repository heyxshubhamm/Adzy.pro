from __future__ import annotations

from dataclasses import dataclass
import math
import random
import statistics
from typing import Callable, Iterable

Vector = list[float]
ObjectiveFn = Callable[[Vector], float]
ConstraintFn = Callable[[Vector], bool]


@dataclass
class MonkeyConfig:
    population_size: int = 5
    climb_iterations: int = 2000
    cycles: int = 60
    step_length: float = 1e-3
    eyesight: float = 0.5
    somersault_low: float = -1.0
    somersault_high: float = 1.0
    max_watch_attempts: int = 200
    max_feasible_attempts: int = 5000
    convergence_patience: int = 80
    convergence_tol: float = 1e-12
    seed: int | None = 42


@dataclass
class MonkeyResult:
    best_position: Vector
    best_value: float
    history: list[float]
    evaluations: int
    feasible_ratio: float


@dataclass
class ProblemDefinition:
    name: str
    objective: ObjectiveFn
    bounds: list[tuple[float, float]]
    constraints: list[ConstraintFn]
    mode: str = "min"  # "min" or "max"

    @property
    def dim(self) -> int:
        return len(self.bounds)


def _sign(value: float) -> float:
    if value > 0:
        return 1.0
    if value < 0:
        return -1.0
    return 0.0


class MonkeyAlgorithm:
    """
    Monkey Algorithm (MA) with climb, watch-jump, somersault phases.

    This implementation follows Zhao & Tang (2008) mechanics while adding
    production-safe guards: feasibility retries, clipping to bounds, and
    convergence early stop per monkey climb loop.
    """

    def __init__(self, problem: ProblemDefinition, config: MonkeyConfig):
        if config.population_size <= 0:
            raise ValueError("population_size must be > 0")
        if config.climb_iterations <= 0:
            raise ValueError("climb_iterations must be > 0")
        if config.cycles <= 0:
            raise ValueError("cycles must be > 0")
        if config.step_length <= 0:
            raise ValueError("step_length must be > 0")
        if config.eyesight <= 0:
            raise ValueError("eyesight must be > 0")
        if config.somersault_low > config.somersault_high:
            raise ValueError("somersault_low must be <= somersault_high")
        if problem.mode not in {"min", "max"}:
            raise ValueError("problem.mode must be 'min' or 'max'")

        self.problem = problem
        self.cfg = config
        self.rng = random.Random(config.seed)
        self.evaluations = 0
        self.feasible_checks = 0
        self.feasible_hits = 0

    def optimize(self) -> MonkeyResult:
        monkeys = [self._sample_feasible_point() for _ in range(self.cfg.population_size)]

        best = monkeys[0][:]
        best_val = self._evaluate(best)
        history: list[float] = [best_val]

        for _ in range(self.cfg.cycles):
            for idx in range(len(monkeys)):
                monkeys[idx] = self._climb(monkeys[idx])
                monkeys[idx] = self._watch_jump(monkeys[idx])
                monkeys[idx] = self._climb(monkeys[idx])

                val = self._evaluate(monkeys[idx])
                if self._better(val, best_val):
                    best = monkeys[idx][:]
                    best_val = val

            monkeys = self._somersault(monkeys)

            for m in monkeys:
                v = self._evaluate(m)
                if self._better(v, best_val):
                    best = m[:]
                    best_val = v

            history.append(best_val)

        feasible_ratio = (self.feasible_hits / self.feasible_checks) if self.feasible_checks else 1.0
        return MonkeyResult(
            best_position=best,
            best_value=best_val,
            history=history,
            evaluations=self.evaluations,
            feasible_ratio=feasible_ratio,
        )

    def _better(self, new_val: float, old_val: float) -> bool:
        if self.problem.mode == "max":
            return new_val > old_val
        return new_val < old_val

    def _clip_bounds(self, x: Vector) -> Vector:
        return [
            min(max(v, low), high)
            for v, (low, high) in zip(x, self.problem.bounds)
        ]

    def _is_feasible(self, x: Vector) -> bool:
        self.feasible_checks += 1
        for v, (low, high) in zip(x, self.problem.bounds):
            if v < low or v > high:
                return False
        for c in self.problem.constraints:
            if not c(x):
                return False
        self.feasible_hits += 1
        return True

    def _evaluate(self, x: Vector) -> float:
        self.evaluations += 1
        return float(self.problem.objective(x))

    def _sample_feasible_point(self) -> Vector:
        for _ in range(self.cfg.max_feasible_attempts):
            x = [self.rng.uniform(low, high) for low, high in self.problem.bounds]
            if self._is_feasible(x):
                return x
        raise RuntimeError(
            "Failed to sample a feasible point. Check constraints/bounds or increase max_feasible_attempts."
        )

    def _climb(self, x0: Vector) -> Vector:
        x = x0[:]
        current_val = self._evaluate(x)
        no_improve = 0

        for _ in range(self.cfg.climb_iterations):
            delta = [self.cfg.step_length if self.rng.random() < 0.5 else -self.cfg.step_length for _ in range(self.problem.dim)]
            x_plus = self._clip_bounds([xi + di for xi, di in zip(x, delta)])
            x_minus = self._clip_bounds([xi - di for xi, di in zip(x, delta)])

            # If perturbation gets infeasible due to nonlinear constraints, skip this step.
            if not self._is_feasible(x_plus) or not self._is_feasible(x_minus):
                no_improve += 1
                if no_improve >= self.cfg.convergence_patience:
                    break
                continue

            f_plus = self._evaluate(x_plus)
            f_minus = self._evaluate(x_minus)

            pseudo_grad = []
            for d in delta:
                # From the paper: g_j ~= (f(x+delta)-f(x-delta)) / (2*delta_j)
                # since delta_j in {+a, -a}
                pseudo_grad.append((f_plus - f_minus) / (2.0 * d))

            y = self._clip_bounds([xi + self.cfg.step_length * _sign(gj) for xi, gj in zip(x, pseudo_grad)])
            if self._is_feasible(y):
                y_val = self._evaluate(y)
                if self._better(y_val, current_val) or abs(y_val - current_val) <= self.cfg.convergence_tol:
                    x = y
                    current_val = y_val
                    no_improve = 0
                else:
                    no_improve += 1
            else:
                no_improve += 1

            if no_improve >= self.cfg.convergence_patience:
                break

        return x

    def _watch_jump(self, x: Vector) -> Vector:
        current = x[:]
        current_val = self._evaluate(current)

        for _ in range(self.cfg.max_watch_attempts):
            y = [
                self.rng.uniform(max(low, xi - self.cfg.eyesight), min(high, xi + self.cfg.eyesight))
                for xi, (low, high) in zip(current, self.problem.bounds)
            ]
            if not self._is_feasible(y):
                continue
            y_val = self._evaluate(y)
            if self._better(y_val, current_val) or abs(y_val - current_val) <= self.cfg.convergence_tol:
                return y

        return current

    def _somersault(self, monkeys: list[Vector]) -> list[Vector]:
        dim = self.problem.dim
        pivot = [sum(m[j] for m in monkeys) / len(monkeys) for j in range(dim)]

        next_positions: list[Vector] = []
        for x in monkeys:
            updated = x[:]
            for _ in range(self.cfg.max_watch_attempts):
                alpha = self.rng.uniform(self.cfg.somersault_low, self.cfg.somersault_high)
                y = self._clip_bounds([xi + alpha * (pj - xi) for xi, pj in zip(x, pivot)])
                if self._is_feasible(y):
                    updated = y
                    break
            next_positions.append(updated)

        return next_positions


# -----------------------------
# Built-in objective benchmarks
# -----------------------------

def _u_penalty(xi: float, a: float, k: float, m: float) -> float:
    if xi > a:
        return k * ((xi - a) ** m)
    if xi < -a:
        return k * ((-xi - a) ** m)
    return 0.0


def schwefel(x: Vector) -> float:
    return sum(-xi * math.sin(math.sqrt(abs(xi))) for xi in x)


def rastrigin(x: Vector) -> float:
    n = len(x)
    return 10.0 * n + sum((xi * xi) - 10.0 * math.cos(2.0 * math.pi * xi) for xi in x)


def ackley(x: Vector) -> float:
    n = len(x)
    s1 = sum(xi * xi for xi in x)
    s2 = sum(math.cos(2.0 * math.pi * xi) for xi in x)
    return -20.0 * math.exp(-0.2 * math.sqrt(s1 / n)) - math.exp(s2 / n) + 20.0 + math.e


def griewank(x: Vector) -> float:
    s = sum((xi * xi) / 4000.0 for xi in x)
    p = 1.0
    for i, xi in enumerate(x, start=1):
        p *= math.cos(xi / math.sqrt(i))
    return s - p + 1.0


def penalized_f5(x: Vector) -> float:
    n = len(x)
    y = [1.0 + (xi + 1.0) / 4.0 for xi in x]

    s = 10.0 * (math.sin(math.pi * y[0]) ** 2)
    for i in range(n - 1):
        s += ((y[i] - 1.0) ** 2) * (1.0 + 10.0 * (math.sin(math.pi * y[i + 1]) ** 2))
    s += ((y[-1] - 1.0) ** 2)
    s *= math.pi / n

    penalty = sum(_u_penalty(xi, 10.0, 100.0, 4.0) for xi in x)
    return s + penalty


def rosenbrock(x: Vector) -> float:
    return sum(100.0 * ((x[i] * x[i] - x[i + 1]) ** 2) + (x[i] - 1.0) ** 2 for i in range(len(x) - 1))


def sphere(x: Vector) -> float:
    return sum(xi * xi for xi in x)


def quartic(x: Vector) -> float:
    return sum((i + 1) * (xi ** 4) for i, xi in enumerate(x))


def sum_abs_plus_prod_abs(x: Vector) -> float:
    prod = 1.0
    for xi in x:
        prod *= abs(xi)
    return sum(abs(xi) for xi in x) + prod


def sum_of_squares_prefix(x: Vector) -> float:
    run = 0.0
    total = 0.0
    for xi in x:
        run += xi
        total += run * run
    return total


def max_abs(x: Vector) -> float:
    return max(abs(xi) for xi in x)


def paper_example_objective(x: Vector) -> float:
    x1, x2 = x[0], x[1]
    denom = (x1 ** 3) * (x1 + x2)
    if abs(denom) < 1e-12:
        # Avoid division blow-up inside feasible space edge cases.
        return -1e18
    return ((math.sin(2.0 * math.pi * x1) ** 3) * math.sin(2.0 * math.pi * x2)) / denom


def paper_example_constraints() -> list[ConstraintFn]:
    def c1(x: Vector) -> bool:
        x1, x2 = x[0], x[1]
        return (x1 * x1 - x2 + 1.0) <= 0.0

    def c2(x: Vector) -> bool:
        x1, x2 = x[0], x[1]
        return (1.0 - x1 + (x2 - 4.0) ** 2) <= 0.0

    return [c1, c2]


def build_problem(name: str, dim: int) -> ProblemDefinition:
    name = name.lower().strip()

    if name == "paper_example":
        if dim != 2:
            raise ValueError("paper_example requires dim=2")
        return ProblemDefinition(
            name="paper_example",
            objective=paper_example_objective,
            bounds=[(0.0, 10.0), (0.0, 10.0)],
            constraints=paper_example_constraints(),
            mode="max",
        )

    mapping: dict[str, tuple[ObjectiveFn, tuple[float, float]]] = {
        "f1": (schwefel, (-500.0, 500.0)),
        "f2": (rastrigin, (-5.12, 5.12)),
        "f3": (ackley, (-32.0, 32.0)),
        "f4": (griewank, (-600.0, 600.0)),
        "f5": (penalized_f5, (-50.0, 50.0)),
        "f7": (rosenbrock, (-5.0, 10.0)),
        "f8": (sphere, (-100.0, 100.0)),
        "f9": (quartic, (-1.28, 1.28)),
        "f10": (sum_abs_plus_prod_abs, (-10.0, 10.0)),
        "f11": (sum_of_squares_prefix, (-100.0, 100.0)),
        "f12": (max_abs, (-100.0, 100.0)),
    }

    if name not in mapping:
        raise ValueError(
            "Unknown problem name. Use one of: "
            "paper_example, f1, f2, f3, f4, f5, f7, f8, f9, f10, f11, f12"
        )

    fn, bnd = mapping[name]
    return ProblemDefinition(
        name=name,
        objective=fn,
        bounds=[bnd for _ in range(dim)],
        constraints=[],
        mode="min",
    )


def run_multiple(
    problem: ProblemDefinition,
    config: MonkeyConfig,
    runs: int,
) -> dict:
    if runs <= 0:
        raise ValueError("runs must be > 0")

    values: list[float] = []
    best_result: MonkeyResult | None = None

    for i in range(runs):
        cfg = MonkeyConfig(**{**config.__dict__, "seed": (None if config.seed is None else config.seed + i)})
        result = MonkeyAlgorithm(problem, cfg).optimize()
        values.append(result.best_value)

        if best_result is None:
            best_result = result
        else:
            if problem.mode == "min" and result.best_value < best_result.best_value:
                best_result = result
            if problem.mode == "max" and result.best_value > best_result.best_value:
                best_result = result

    assert best_result is not None

    return {
        "problem": problem.name,
        "mode": problem.mode,
        "dim": problem.dim,
        "runs": runs,
        "mean": statistics.mean(values),
        "variance": statistics.pvariance(values) if len(values) > 1 else 0.0,
        "best": best_result.best_value,
        "worst": max(values) if problem.mode == "min" else min(values),
        "best_position": best_result.best_position,
        "sample_history": best_result.history,
        "sample_evaluations": best_result.evaluations,
    }


def format_report(rows: Iterable[dict]) -> str:
    lines = []
    hdr = f"{'Problem':<14}{'Dim':>8}{'Runs':>8}{'Mean':>18}{'Var':>18}{'Best':>18}"
    lines.append(hdr)
    lines.append("-" * len(hdr))
    for r in rows:
        lines.append(
            f"{r['problem']:<14}{r['dim']:>8}{r['runs']:>8}"
            f"{r['mean']:>18.8f}{r['variance']:>18.8e}{r['best']:>18.8f}"
        )
    return "\n".join(lines)

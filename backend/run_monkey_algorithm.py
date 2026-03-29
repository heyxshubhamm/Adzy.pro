from __future__ import annotations

import argparse
import json
from time import perf_counter

from app.services.monkey_algorithm import (
    MonkeyAlgorithm,
    MonkeyConfig,
    build_problem,
    format_report,
    run_multiple,
)


def _default_config_for_problem(name: str) -> MonkeyConfig:
    name = name.lower()
    # Defaults inspired by the 2008 paper tables and practical runtime limits.
    if name == "paper_example":
        return MonkeyConfig(
            population_size=5,
            climb_iterations=2000,
            cycles=100,
            step_length=1e-5,
            eyesight=0.5,
            somersault_low=-1.0,
            somersault_high=1.0,
            convergence_patience=120,
            seed=42,
        )
    if name == "f1":
        return MonkeyConfig(
            population_size=5,
            climb_iterations=2000,
            cycles=60,
            step_length=1e-1,
            eyesight=10.0,
            somersault_low=-10.0,
            somersault_high=30.0,
            seed=42,
        )
    if name in {"f2", "f3", "f4"}:
        return MonkeyConfig(
            population_size=5,
            climb_iterations=30,
            cycles=60,
            step_length=1e-6,
            eyesight=1.0 if name in {"f2", "f3"} else 10.0,
            somersault_low=-1.0,
            somersault_high=1.0,
            seed=42,
        )
    if name == "f5":
        return MonkeyConfig(
            population_size=5,
            climb_iterations=30,
            cycles=60,
            step_length=1e-2,
            eyesight=1.0,
            somersault_low=-1.0,
            somersault_high=1.0,
            seed=42,
        )

    return MonkeyConfig(seed=42)


def run_single(args: argparse.Namespace) -> None:
    problem = build_problem(args.problem, args.dim)
    cfg = _default_config_for_problem(args.problem)

    # Allow command-line override when needed.
    if args.population is not None:
        cfg.population_size = args.population
    if args.nc is not None:
        cfg.climb_iterations = args.nc
    if args.cycles is not None:
        cfg.cycles = args.cycles
    if args.step is not None:
        cfg.step_length = args.step
    if args.eyesight is not None:
        cfg.eyesight = args.eyesight
    if args.somersault_low is not None:
        cfg.somersault_low = args.somersault_low
    if args.somersault_high is not None:
        cfg.somersault_high = args.somersault_high
    if args.seed is not None:
        cfg.seed = args.seed

    t0 = perf_counter()
    if args.runs > 1:
        summary = run_multiple(problem, cfg, runs=args.runs)
        dt = perf_counter() - t0
        print(format_report([summary]))
        print(f"\nElapsed: {dt:.3f}s")
        if args.json:
            print(json.dumps(summary, indent=2, default=float))
        return

    result = MonkeyAlgorithm(problem, cfg).optimize()
    dt = perf_counter() - t0
    print(f"Problem: {problem.name}  mode={problem.mode}  dim={problem.dim}")
    print(f"Best value: {result.best_value:.10f}")
    print(f"Best position (first 10 dims): {result.best_position[:10]}")
    print(f"Evaluations: {result.evaluations}  feasible_ratio={result.feasible_ratio:.4f}")
    print(f"Elapsed: {dt:.3f}s")
    if args.json:
        print(json.dumps({
            "problem": problem.name,
            "mode": problem.mode,
            "dim": problem.dim,
            "best_value": result.best_value,
            "best_position": result.best_position,
            "evaluations": result.evaluations,
            "history": result.history,
        }, indent=2, default=float))


def run_suite(args: argparse.Namespace) -> None:
    rows = []
    t0 = perf_counter()

    for problem_name in ["f1", "f2", "f3", "f4", "f5", "f7", "f8", "f9", "f10", "f11", "f12"]:
        cfg = _default_config_for_problem(problem_name)
        # Keep runtime controlled for local execution.
        cfg.cycles = min(cfg.cycles, args.cycles)
        cfg.climb_iterations = min(cfg.climb_iterations, args.nc)
        problem = build_problem(problem_name, args.dim)
        rows.append(run_multiple(problem, cfg, runs=args.runs))

    dt = perf_counter() - t0
    print(format_report(rows))
    print(f"\nElapsed: {dt:.3f}s")
    if args.json:
        print(json.dumps(rows, indent=2, default=float))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Standalone Monkey Algorithm runner")
    parser.add_argument("--problem", type=str, default="paper_example", help="paper_example or f1..f5,f7..f12")
    parser.add_argument("--dim", type=int, default=2, help="Dimension (paper_example requires 2)")
    parser.add_argument("--runs", type=int, default=1, help="Independent runs for mean/variance")
    parser.add_argument("--suite", action="store_true", help="Run full benchmark suite")

    parser.add_argument("--population", type=int, default=None)
    parser.add_argument("--nc", type=int, default=300)
    parser.add_argument("--cycles", type=int, default=40)
    parser.add_argument("--step", type=float, default=None)
    parser.add_argument("--eyesight", type=float, default=None)
    parser.add_argument("--somersault-low", type=float, default=None)
    parser.add_argument("--somersault-high", type=float, default=None)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--json", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.suite:
        run_suite(args)
    else:
        run_single(args)


if __name__ == "__main__":
    main()

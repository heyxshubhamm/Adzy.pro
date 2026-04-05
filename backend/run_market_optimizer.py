import asyncio
import os
import sys
from dotenv import load_dotenv

# Load .env BEFORE importing any models/config the app directory
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

# If running locally outside docker, map pgbouncer to localhost
if "pgbouncer" in os.environ.get("DATABASE_URL", ""):
    os.environ["DATABASE_URL"] = os.environ["DATABASE_URL"].replace("pgbouncer:6432", "localhost:5432")

# Now add parent to path and import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.models import User
from app.services.market_scoring import (
    DEFAULT_WEIGHTS,
    _aggregate_seller_features,
    validate_and_update_weights,
    recompute_all_seller_scores
)
from app.services.score_lib import normalize_feature_vector
from app.services.market_optimizer import optimize_market_weights
from app.services.monkey_algorithm import MonkeyConfig

async def run_market_intelligence():
    print("🧠 Initializing Market Intelligence Optimizer (Advanced Monkey Algorithm)...")
    
    async with AsyncSessionLocal() as db:
        print("📊 Fetching seller historical telemetry...")
        sellers_q = await db.execute(select(User).where(User.role == "seller"))
        sellers = sellers_q.scalars().all()
        
        if len(sellers) < 2:
            print("❌ Not enough sellers to optimize weights. Need at least 2.")
            return

        features_dataset = []
        targets = []
        
        keys = list(DEFAULT_WEIGHTS.keys())
        bounds_dict = {k: (vmin, vmax) for k, (_, vmin, vmax) in DEFAULT_WEIGHTS.items()}
        
        for seller in sellers:
            feat_vec = await _aggregate_seller_features(db, str(seller.id))
            if not feat_vec:
                continue
                
            norm_feat = normalize_feature_vector(feat_vec)
            features_dataset.append(norm_feat)
            
            # The "True North" Target Metric:
            # We want seller_score to heavily correlate with high volume completion + repeat customers
            target_metric = feat_vec.completed_orders + (feat_vec.repeat_orders * 10.0) + (feat_vec.reviews_count * 2.0)
            targets.append(float(target_metric))
            
        print(f"✅ Loaded {len(features_dataset)} seller profiles into memory.")
        print("🐒 Unleashing the Monkey Algorithm to solve for 11-Dimensional Weights...")
        print("   -> Objective: Maximize Spearman Rank Correlation with True North metrics")
        print("   -> Constraint: Sum exactly to 100%, abiding by strict DB Min/Max Pct Bounds")
        
        config = MonkeyConfig(
            population_size=10, 
            climb_iterations=50, 
            cycles=40,   # Lower cycle count for local speed, in prod can be 100
            step_length=5.0, 
            eyesight=10.0,
            seed=42
        )
        
        best_weights = optimize_market_weights(
            features_dataset=features_dataset, 
            targets=targets, 
            keys=keys, 
            bounds_dict=bounds_dict,
            config=config
        )
        
        print("\n✨ Optimal Weights Found ✨")
        for k, v in best_weights.items():
            print(f"  {k:20}: {v:>5.2f}%")
            
        total = sum(best_weights.values())
        print(f"Total: {total:.2f}%")
        
        if total > 0.0:
            print("\n💾 Persisting optimized intelligence matrix to Adzy database...")
            try:
                await validate_and_update_weights(db, best_weights, updated_by="monkey_intelligence")
                print("✅ Successfully updated WeightPolicy table!")
                
                print("🔄 Recomputing all seller scores across the marketplace...")
                res = await recompute_all_seller_scores(db)
                print(f"✅ Real-time Ranking Matrix Updated: {res['success']} successes, {res['failed']} failures.")
                
            except Exception as e:
                print(f"❌ Failed to persist weights: {e}")

if __name__ == "__main__":
    asyncio.run(run_market_intelligence())

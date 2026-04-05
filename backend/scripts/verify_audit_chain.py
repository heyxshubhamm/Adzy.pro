import asyncio
import uuid
import hashlib
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.models.models import AuditLog, User
from sqlalchemy import select

async def verify_audit_chain():
    print("🚀 Starting Audit Chain Integrity Verification...")
    
    async with AsyncSessionLocal() as db:
        # 0. Clear previous logs to ensure clean chain
        from sqlalchemy import delete
        await db.execute(delete(AuditLog))
        await db.commit()
        print("🧹 Cleared previous audit logs.")

        # 1. Create a dummy admin if not exists
        result = await db.execute(select(User).where(User.role == 'admin'))
        admin = result.scalar_one_or_none()
        if not admin:
            print("❌ No admin found. Please run seed script first.")
            return

        # 2. Insert 3 logs
        print("📝 Generating test audit logs...")
        for i in range(3):
            log = AuditLog(
                admin_id=admin.id,
                action=f"test.action.{i}",
                target_type="system",
                target_id="verification_node",
                payload={"step": i}
            )
            db.add(log)
            await db.commit()
            print(f"   ✅ Created log {i} with hash: {log.chain_hash[:16]}...")
            await asyncio.sleep(1.1) # SQLite resolution is 1s

        # 3. Verify Chain
        print("\n🔍 Verifying chain integrity...")
        result = await db.execute(select(AuditLog).order_by(AuditLog.created_at.asc()))
        logs = result.scalars().all()
        
        prev_hash = "0" * 64
        integrity_ok = True
        
        for log in logs:
            # Consistent formatting for verification
            import json
            payload_str = json.dumps(log.payload, sort_keys=True) if log.payload else "{}"
            data_str = f"{prev_hash}|{str(log.admin_id)}|{log.action}|{str(log.target_id)}|{payload_str}"
            print(f"DEBUG_VERIFY_HASH: {data_str}")
            expected_hash = hashlib.sha256(data_str.encode()).hexdigest()
            
            if log.chain_hash != expected_hash:
                print(f"   ❌ TEMPER DETECTED at log {log.id}!")
                print(f"      Expected: {expected_hash[:16]}...")
                print(f"      Found:    {log.chain_hash[:16]}...")
                integrity_ok = False
                break
            else:
                prev_hash = log.chain_hash
        
        if integrity_ok:
            print("\n🌟 AUDIT CHAIN INTEGRITY: 100% SECURE")
        else:
            print("\n⚠️ AUDIT CHAIN COMPROMISED")

if __name__ == "__main__":
    asyncio.run(verify_audit_chain())

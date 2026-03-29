import sys
import os
import uuid

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.models import Category

def seed():
    db = SessionLocal()
    
    # Comprehensive Marketplace Categories
    categories = [
        {"name": "Programming & Tech", "slug": "programming-tech"},
        {"name": "Graphics & Design", "slug": "graphics-design"},
        {"name": "Digital Marketing", "slug": "digital-marketing"},
        {"name": "Writing & Translation", "slug": "writing-translation"},
        {"name": "Video & Animation", "slug": "video-animation"},
        {"name": "Music & Audio", "slug": "music-audio"},
        {"name": "Business Services", "slug": "business-services"},
        {"name": "Data & AI", "slug": "data-ai"},
        {"name": "Lifestyle", "slug": "lifestyle"},
        {"name": "Photography", "slug": "photography"},
        {"name": "E-commerce", "slug": "e-commerce"},
        {"name": "Cybersecurity", "slug": "cybersecurity"},
        {"name": "Mobile Apps", "slug": "mobile-apps"},
        {"name": "DevOps", "slug": "devops"},
    ]
    
    print("Seeding Marketplace Categories... 🚀")
    for cat in categories:
        existing = db.query(Category).filter(Category.slug == cat["slug"]).first()
        if not existing:
            db.add(Category(**cat))
            print(f"✅ Created: {cat['name']}")
        else:
            print(f"ℹ️ Skipping: {cat['name']} (Already exists)")
    
    try:
        db.commit()
        print("\n✨ Adzy Marketplace seeded successfully! 🏆")
    except Exception as e:
        db.rollback()
        print(f"\n❌ Seeding failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()

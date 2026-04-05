"""
Run: docker compose exec backend python scripts/seed_categories.py
Full Fiverr-style category tree — 14 top-level categories.
"""
import asyncio, sys, re, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import AsyncSessionLocal
from app.models.models import Category
from sqlalchemy import select, delete

def slugify(name: str, parent_slug: str = "") -> str:
    base = re.sub(r"[\s_]+", "-", re.sub(r"[^\w\s-]", "", name.lower().strip()))[:80]
    if parent_slug:
        return f"{parent_slug}-{base}"[:100]
    return base

TREE = [
  {
    "name": "Trending", "icon": "🔥", "color": "#E85D24", "sort_order": 1,
    "children": [
      {"name": "Publish Your Book", "sort_order": 1, "children": [
        {"name": "Book Design"}, {"name": "Book Editing"},
        {"name": "Book & eBook Marketing"}, {"name": "Children's Book Illustration"},
        {"name": "Beta Reading"}, {"name": "Book & eBook Writing"},
      ]},
      {"name": "Create Your Website", "sort_order": 2, "children": [
        {"name": "E-commerce & Dropshipping"}, {"name": "Shopify"},
        {"name": "WordPress"}, {"name": "Website Design"},
        {"name": "E-Commerce Marketing"},
      ]},
      {"name": "Build Your Brand", "sort_order": 3, "children": [
        {"name": "Brand Strategy"}, {"name": "Brand Style Guides"},
        {"name": "Social Media Management"}, {"name": "Social Media Design"},
        {"name": "UGC Videos"}, {"name": "Video Ads & Commercials"},
        {"name": "Paid Social Media"},
      ]},
      {"name": "Grow Your Audience", "sort_order": 4, "children": [
        {"name": "Social Media Strategy"}, {"name": "Social Media Videos"},
        {"name": "Live Action Explainers"}, {"name": "Slideshow Videos"},
        {"name": "Organic Social Promotions"}, {"name": "Social Media Automation"},
      ]},
      {"name": "Find a Job", "sort_order": 5, "children": [
        {"name": "Resume Writing"}, {"name": "Resume Design"},
        {"name": "Search & Apply"}, {"name": "Interview Prep"},
        {"name": "Career Consulting"}, {"name": "LinkedIn Profiles"},
      ]},
      {"name": "AI Services", "sort_order": 6, "children": [
        {"name": "AI Video"}, {"name": "AI Websites & Software"},
        {"name": "AI Mobile Apps"}, {"name": "AI Agents"},
        {"name": "Data Model Training"}, {"name": "AI Technology Consulting"},
        {"name": "Generative Engine Optimization (GEO)"},
      ]},
    ]
  },
  {
    "name": "Graphics & Design", "icon": "🎨", "color": "#993556", "sort_order": 2,
    "children": [
      {"name": "Logo & Brand Identity", "sort_order": 1, "children": [
        {"name": "Logo Design"}, {"name": "Brand Style Guides"},
        {"name": "Business Cards & Stationery"}, {"name": "Fonts & Typography"},
        {"name": "Art Direction"},
      ]},
      {"name": "Art & Illustration", "sort_order": 2, "children": [
        {"name": "Illustration"}, {"name": "AI Artists"},
        {"name": "AI Avatar Design"}, {"name": "Portraits & Caricatures"},
        {"name": "Comic Illustration"}, {"name": "Cartoon Illustration"},
        {"name": "Storyboards"}, {"name": "Album Cover Design"},
        {"name": "Pattern Design"}, {"name": "Tattoo Design"},
      ]},
      {"name": "Web & App Design", "sort_order": 3, "children": [
        {"name": "Website Design"}, {"name": "App Design"},
        {"name": "UX Design"}, {"name": "Landing Page Design"},
        {"name": "Icon Design"},
      ]},
      {"name": "Print Design", "sort_order": 4, "children": [
        {"name": "Brochure Design"}, {"name": "Flyer Design"},
        {"name": "Packaging & Label Design"}, {"name": "Poster Design"},
        {"name": "Catalog Design"}, {"name": "Menu Design"},
      ]},
      {"name": "Visual Design", "sort_order": 5, "children": [
        {"name": "Image Editing"}, {"name": "AI Image Editing"},
        {"name": "Presentation Design"}, {"name": "Resume Design"},
        {"name": "Infographic Design"}, {"name": "Vector Tracing"},
      ]},
      {"name": "Marketing Design", "sort_order": 6, "children": [
        {"name": "Social Media Design"}, {"name": "Email Design"},
        {"name": "Web Banners"}, {"name": "Signage Design"},
      ]},
      {"name": "3D Design", "sort_order": 7, "children": [
        {"name": "3D Architecture"}, {"name": "3D Industrial Design"},
        {"name": "3D Fashion & Garment"}, {"name": "3D Printing"},
        {"name": "3D Characters"}, {"name": "3D Landscape"},
        {"name": "3D Game Art"}, {"name": "3D Jewelry Design"},
      ]},
      {"name": "Architecture & Building Design", "sort_order": 8, "children": [
        {"name": "Architecture & Interior Design"}, {"name": "Landscape Design"},
        {"name": "Building Engineering"}, {"name": "Lighting Design"},
      ]},
      {"name": "Fashion & Merchandise", "sort_order": 9, "children": [
        {"name": "T-Shirts & Merchandise"}, {"name": "Fashion Design"},
        {"name": "Jewelry Design"},
      ]},
      {"name": "Books & eBooks", "sort_order": 10, "children": [
        {"name": "Book Design"}, {"name": "Book Covers"},
        {"name": "Book Layout Design & Typesetting"},
        {"name": "Children's Book Illustration"}, {"name": "Comic Book Illustration"},
      ]},
      {"name": "Product & Gaming", "sort_order": 11, "children": [
        {"name": "Industrial & Product Design"}, {"name": "Character Modeling"},
        {"name": "Game Art"}, {"name": "Graphics for Streamers"},
      ]},
    ]
  },
  {
    "name": "Programming & Tech", "icon": "💻", "color": "#534AB7", "sort_order": 3,
    "children": [
      {"name": "Website Development", "sort_order": 1, "children": [
        {"name": "Business Websites"}, {"name": "E-Commerce Development"},
        {"name": "Custom Websites"}, {"name": "Landing Pages"},
        {"name": "Dropshipping Websites"},
      ]},
      {"name": "Website Platforms", "sort_order": 2, "children": [
        {"name": "WordPress"}, {"name": "Shopify"},
        {"name": "Wix"}, {"name": "Webflow"}, {"name": "Bubble"},
      ]},
      {"name": "Website Maintenance", "sort_order": 3, "children": [
        {"name": "Website Customization"}, {"name": "Bug Fixes"},
        {"name": "Backup & Migration"}, {"name": "Speed Optimization"},
      ]},
      {"name": "AI Development", "sort_order": 4, "children": [
        {"name": "AI Websites & Software"}, {"name": "AI Mobile Apps"},
        {"name": "AI Integrations"}, {"name": "AI Agents"},
        {"name": "AI Technology Consulting"}, {"name": "Vibe Coding Development & MVP"},
        {"name": "Troubleshooting & Improvements"},
        {"name": "Deployments & DevOps"},
      ]},
      {"name": "Mobile App Development", "sort_order": 5, "children": [
        {"name": "Cross-platform Development"}, {"name": "Android App Development"},
        {"name": "iOS App Development"}, {"name": "Mobile App Maintenance"},
      ]},
      {"name": "Chatbot Development", "sort_order": 6, "children": [
        {"name": "AI Chatbot"}, {"name": "Rules Based Chatbot"},
      ]},
      {"name": "Game Development", "sort_order": 7, "children": [
        {"name": "Unreal Engine"}, {"name": "Unity Developers"},
        {"name": "Roblox"}, {"name": "Fivem"},
      ]},
      {"name": "Cloud & Cybersecurity", "sort_order": 8, "children": [
        {"name": "Cloud Computing"}, {"name": "DevOps Engineering"},
        {"name": "Cybersecurity"},
      ]},
      {"name": "Software Development", "sort_order": 9, "children": [
        {"name": "Full Stack"}, {"name": "Web Apps"},
        {"name": "Automations & Agents"}, {"name": "APIs & Integrations"},
        {"name": "Databases"}, {"name": "QA & Review"},
      ]},
      {"name": "Blockchain & Cryptocurrency", "sort_order": 10, "children": [
        {"name": "Decentralized Apps (dApps)"}, {"name": "Cryptocurrencies & Tokens"},
      ]},
      {"name": "Miscellaneous", "sort_order": 11, "children": [
        {"name": "Electronics Engineering"}, {"name": "Support & IT"},
        {"name": "Machine Learning"}, {"name": "Data Tagging & Annotation"},
        {"name": "Convert Files"}, {"name": "User Testing"},
      ]},
    ]
  },
  {
    "name": "Digital Marketing", "icon": "📣", "color": "#0F6E56", "sort_order": 4,
    "children": [
      {"name": "Search", "sort_order": 1, "children": [
        {"name": "Search Engine Optimization (SEO)"},
        {"name": "Generative Engine Optimization (GEO)"},
        {"name": "Search Engine Marketing (SEM)"},
        {"name": "Local SEO"}, {"name": "E-Commerce SEO"}, {"name": "Video SEO"},
      ]},
      {"name": "Social", "sort_order": 2, "children": [
        {"name": "Social Media Marketing"}, {"name": "Paid Social Media"},
        {"name": "Social Commerce"}, {"name": "Influencer Marketing"},
        {"name": "Online Communities"},
      ]},
      {"name": "Channel Specific", "sort_order": 3, "children": [
        {"name": "TikTok Shop"}, {"name": "Facebook Ads Campaign"},
        {"name": "Instagram Marketing"}, {"name": "YouTube Promotion"},
        {"name": "Google SEM"}, {"name": "Shopify Marketing"},
      ]},
      {"name": "Methods & Techniques", "sort_order": 4, "children": [
        {"name": "Video Marketing"}, {"name": "E-Commerce Marketing"},
        {"name": "Email Marketing"}, {"name": "Email Automations"},
        {"name": "Marketing Automation"}, {"name": "Guest Posting"},
        {"name": "Affiliate Marketing"}, {"name": "Display Advertising"},
        {"name": "Public Relations"}, {"name": "Crowdfunding"},
        {"name": "Text Message Marketing"},
      ]},
      {"name": "Scale With AI", "sort_order": 5, "children": [
        {"name": "AI Marketing Prompt Strategy"},
        {"name": "Brand Personality Design"},
        {"name": "Email Marketing Personalization"},
        {"name": "AI-Powered Campaign Management"},
        {"name": "AI-Powered Ad Bidding & Automation"},
      ]},
      {"name": "Analytics & Strategy", "sort_order": 6, "children": [
        {"name": "Marketing Strategy"}, {"name": "Marketing Consultation"},
        {"name": "Marketing Concepts & Ideation"},
        {"name": "Conversion Rate Optimization (CRO)"},
        {"name": "Conscious Branding & Marketing"},
        {"name": "Web Analytics"},
      ]},
      {"name": "Industry Specific", "sort_order": 7, "children": [
        {"name": "Music Promotion"}, {"name": "Podcast Marketing"},
        {"name": "Mobile App Marketing"}, {"name": "Book & eBook Marketing"},
      ]},
    ]
  },
  {
    "name": "Video & Animation", "icon": "🎬", "color": "#854F0B", "sort_order": 5,
    "children": [
      {"name": "Editing & Post-Production", "sort_order": 1, "children": [
        {"name": "Video Editing"}, {"name": "Visual Effects"},
        {"name": "Intro & Outro Videos"}, {"name": "Video Repurposing"},
        {"name": "Video Templates Editing"}, {"name": "Subtitles & Captions"},
      ]},
      {"name": "Social & Marketing Videos", "sort_order": 2, "children": [
        {"name": "Video Ads & Commercials"}, {"name": "Social Media Videos"},
        {"name": "Music Videos"}, {"name": "Slideshow Videos"},
      ]},
      {"name": "Presenter Videos", "sort_order": 3, "children": [
        {"name": "UGC Videos"}, {"name": "TikTok UGC Videos"},
        {"name": "Instagram UGC Videos"}, {"name": "Spokesperson Videos"},
      ]},
      {"name": "Motion Graphics", "sort_order": 4, "children": [
        {"name": "Logo Animation"}, {"name": "Lottie & Web Animation"},
        {"name": "Text Animation"}, {"name": "Video Art Creation"},
      ]},
      {"name": "Animation", "sort_order": 5, "children": [
        {"name": "Character Animation"}, {"name": "Animated GIFs"},
        {"name": "Animation for Kids"}, {"name": "Animation for Streamers"},
        {"name": "Rigging"}, {"name": "NFT Animation"},
      ]},
      {"name": "Explainer Videos", "sort_order": 6, "children": [
        {"name": "Animated Explainers"}, {"name": "Live Action Explainers"},
        {"name": "Screencasting Videos"}, {"name": "eLearning Video Production"},
        {"name": "Crowdfunding Videos"},
      ]},
      {"name": "Product Videos", "sort_order": 7, "children": [
        {"name": "3D Product Animation"}, {"name": "E-Commerce Product Videos"},
        {"name": "Corporate Videos"}, {"name": "App & Website Previews"},
      ]},
      {"name": "AI Video", "sort_order": 8, "children": [
        {"name": "AI UGC"}, {"name": "AI Videography"},
        {"name": "AI Music Videos"}, {"name": "AI Video Avatars"},
      ]},
      {"name": "Filmed Video Production", "sort_order": 9, "children": [
        {"name": "Videographers"}, {"name": "Drone Videography"},
        {"name": "Filmed Video Production"},
      ]},
    ]
  },
  {
    "name": "Writing & Translation", "icon": "✍️", "color": "#185FA5", "sort_order": 6,
    "children": [
      {"name": "Content Writing", "sort_order": 1, "children": [
        {"name": "Articles & Blog Posts"}, {"name": "Content Strategy"},
        {"name": "Website Content"}, {"name": "Scriptwriting"},
        {"name": "Creative Writing"}, {"name": "Podcast Writing"},
        {"name": "Speechwriting"}, {"name": "Research & Summaries"},
      ]},
      {"name": "Editing & Critique", "sort_order": 2, "children": [
        {"name": "Proofreading & Editing"}, {"name": "Academic Support"},
        {"name": "AI Content Editing"}, {"name": "Writing Advice"},
      ]},
      {"name": "Book & eBook Publishing", "sort_order": 3, "children": [
        {"name": "Book & eBook Writing"}, {"name": "Book Editing"},
        {"name": "Developmental Editing"}, {"name": "Line Editing"},
        {"name": "Beta Reading"}, {"name": "Books & Literature Translation"},
      ]},
      {"name": "Career Writing", "sort_order": 4, "children": [
        {"name": "Resume Writing"}, {"name": "Cover Letters"},
        {"name": "LinkedIn Profiles"}, {"name": "Job Descriptions"},
      ]},
      {"name": "Business & Marketing Copy", "sort_order": 5, "children": [
        {"name": "Brand Voice & Tone"}, {"name": "Business Names & Slogans"},
        {"name": "Case Studies"}, {"name": "Product Descriptions"},
        {"name": "Ad Copy"}, {"name": "Sales Copy"},
        {"name": "Email Copy"}, {"name": "Social Media Copywriting"},
        {"name": "Press Releases"}, {"name": "UX Writing"},
      ]},
      {"name": "Translation & Transcription", "sort_order": 6, "children": [
        {"name": "Translation"}, {"name": "Localization"},
        {"name": "Transcription"}, {"name": "Interpretation"},
      ]},
      {"name": "Miscellaneous", "sort_order": 7, "children": [
        {"name": "eLearning Content Development"},
        {"name": "Technical Writing"}, {"name": "Handwriting"},
        {"name": "Industry Specific Content"},
      ]},
    ]
  },
  {
    "name": "Music & Audio", "icon": "🎵", "color": "#3B6D11", "sort_order": 7,
    "children": [
      {"name": "Music Production & Writing", "sort_order": 1, "children": [
        {"name": "Music Producers"}, {"name": "Composers"},
        {"name": "Singers & Vocalists"}, {"name": "Session Musicians"},
        {"name": "Songwriters"}, {"name": "Jingles & Intros"},
        {"name": "Custom Songs"},
      ]},
      {"name": "Voice Over & Narration", "sort_order": 2, "children": [
        {"name": "24hr Turnaround"}, {"name": "Female Voice Over"},
        {"name": "Male Voice Over"}, {"name": "French Voice Over"},
        {"name": "German Voice Over"},
      ]},
      {"name": "Audio Engineering & Post Production", "sort_order": 3, "children": [
        {"name": "Mixing & Mastering"}, {"name": "Audio Editing"},
        {"name": "Vocal Tuning"},
      ]},
      {"name": "Streaming & Audio", "sort_order": 4, "children": [
        {"name": "Podcast Production"}, {"name": "Audiobook Production"},
        {"name": "Audio Ads Production"}, {"name": "Voice Synthesis & AI"},
        {"name": "DJing"},
      ]},
      {"name": "Sound Design", "sort_order": 5, "children": [
        {"name": "Sound Design"}, {"name": "Meditation Music"},
        {"name": "Audio Logo & Sonic Branding"},
        {"name": "Custom Patches & Samples"}, {"name": "Audio Plugin Development"},
      ]},
      {"name": "Lessons & Transcriptions", "sort_order": 6, "children": [
        {"name": "Online Music Lessons"}, {"name": "Music Transcription"},
        {"name": "Music & Audio Consultation"},
      ]},
    ]
  },
  {
    "name": "Business", "icon": "💼", "color": "#5F5E5A", "sort_order": 8,
    "children": [
      {"name": "Business Formation & Consulting", "sort_order": 1, "children": [
        {"name": "LLC Registration"}, {"name": "Business Formation & Registration"},
        {"name": "Market Research"}, {"name": "Business Plans"},
        {"name": "Business Consulting"}, {"name": "HR Consulting"},
        {"name": "AI Consulting"},
      ]},
      {"name": "Operations & Management", "sort_order": 2, "children": [
        {"name": "Virtual Assistant"}, {"name": "Project Management"},
        {"name": "Software Management"}, {"name": "E-Commerce Management"},
        {"name": "Supply Chain Management"}, {"name": "Customs & Tariff Advisory"},
        {"name": "Event Management"}, {"name": "Product Management"},
      ]},
      {"name": "Legal Services", "sort_order": 3, "children": [
        {"name": "Intellectual Property Management"},
        {"name": "Legal Documents & Contracts"},
        {"name": "Legal Research"}, {"name": "General Legal Advice"},
      ]},
      {"name": "Sales & Customer Care", "sort_order": 4, "children": [
        {"name": "Sales"}, {"name": "Customer Experience Management (CXM)"},
        {"name": "Lead Generation"}, {"name": "GTM Engineering"},
        {"name": "Customer Care"},
      ]},
      {"name": "Data & Business Intelligence", "sort_order": 5, "children": [
        {"name": "Data Visualization"}, {"name": "Data Analytics"},
        {"name": "Data Scraping"},
      ]},
      {"name": "Miscellaneous", "sort_order": 6, "children": [
        {"name": "Presentations"}, {"name": "Online Investigations"},
        {"name": "Sustainability Consulting"}, {"name": "Game Concept Design"},
      ]},
    ]
  },
  {
    "name": "Finance", "icon": "💰", "color": "#BA7517", "sort_order": 9,
    "children": [
      {"name": "Accounting Services", "sort_order": 1, "children": [
        {"name": "Fractional CFO Services"}, {"name": "Financial Reporting"},
        {"name": "Bookkeeping"}, {"name": "Payroll Management"},
      ]},
      {"name": "Corporate Finance", "sort_order": 2, "children": [
        {"name": "Due Diligence"}, {"name": "Valuation"},
        {"name": "Mergers & Acquisitions Advisory"},
        {"name": "Corporate Finance Strategy"},
      ]},
      {"name": "Tax Consulting", "sort_order": 3, "children": [
        {"name": "Tax Returns"}, {"name": "Tax Identification Services"},
        {"name": "Tax Planning"}, {"name": "Tax Compliance"},
        {"name": "Tax Exemptions"},
      ]},
      {"name": "Financial Planning & Analysis", "sort_order": 4, "children": [
        {"name": "Budgeting and Forecasting"}, {"name": "Financial Modeling"},
        {"name": "Cost Analysis"}, {"name": "Stock Analysis"},
      ]},
      {"name": "Personal Finance & Wealth Management", "sort_order": 5, "children": [
        {"name": "Personal Budget Management"}, {"name": "Investments Advisory"},
        {"name": "Online Trading Lessons"}, {"name": "Retirement Advisory"},
        {"name": "Financial Coaching"}, {"name": "Insurance Advisory"},
      ]},
      {"name": "Fundraising", "sort_order": 6, "children": [
        {"name": "Investors Sourcing"}, {"name": "Funding Pitch Presentations"},
        {"name": "Fundraising Consultation"},
      ]},
      {"name": "Banking", "sort_order": 7, "children": [
        {"name": "Mortgage Advisory"}, {"name": "Loan Advisory"},
        {"name": "Credit Score Advisory"}, {"name": "Bank Account Opening"},
      ]},
    ]
  },
  {
    "name": "AI Services", "icon": "🤖", "color": "#A32D2D", "sort_order": 10,
    "children": [
      {"name": "AI Mobile Development", "sort_order": 1, "children": [
        {"name": "AI Mobile Apps"}, {"name": "AI Websites & Software"},
        {"name": "AI Chatbot"}, {"name": "AI Integrations"},
        {"name": "AI Agents"}, {"name": "AI Fine-Tuning"},
        {"name": "AI Technology Consulting"},
      ]},
      {"name": "Data", "sort_order": 2, "children": [
        {"name": "Data Science & ML"}, {"name": "Data Analytics"},
        {"name": "Data Visualization"},
      ]},
      {"name": "AI Artists", "sort_order": 3, "children": [
        {"name": "AI Avatar Design"}, {"name": "ComfyUI Workflow Creation"},
        {"name": "AI Image Editing"}, {"name": "Midjourney Artists"},
        {"name": "Stable Diffusion Artists"},
      ]},
      {"name": "AI for Businesses", "sort_order": 4, "children": [
        {"name": "AI Consulting"}, {"name": "AI Strategy"},
        {"name": "AI Lessons"}, {"name": "AI Video"},
        {"name": "AI Music Videos"}, {"name": "AI Video Avatars"},
        {"name": "AI UGC"},
      ]},
      {"name": "AI Audio", "sort_order": 5, "children": [
        {"name": "Voice Synthesis & AI"}, {"name": "Text to Speech"},
      ]},
      {"name": "AI Content", "sort_order": 6, "children": [
        {"name": "AI Content Editing"}, {"name": "Custom Writing Prompts"},
      ]},
    ]
  },
  {
    "name": "Personal Growth", "icon": "🌱", "color": "#1D9E75", "sort_order": 11,
    "children": [
      {"name": "Self Improvement", "sort_order": 1, "children": [
        {"name": "Career Counseling"}, {"name": "Life Coaching"},
        {"name": "Online Tutoring"}, {"name": "Language Lessons"},
        {"name": "Generative AI Lessons"},
      ]},
      {"name": "Leisure & Hobbies", "sort_order": 2, "children": [
        {"name": "Astrology & Psychics"}, {"name": "Arts & Crafts"},
        {"name": "Tabletop Games"}, {"name": "Puzzle & Game Creation"},
        {"name": "Cosplay Creation"}, {"name": "Traveling"},
        {"name": "Collectibles"},
      ]},
      {"name": "Fashion & Style", "sort_order": 3, "children": [
        {"name": "Modeling & Acting"}, {"name": "Styling & Beauty"},
        {"name": "Trend Forecasting"},
      ]},
      {"name": "Wellness & Fitness", "sort_order": 4, "children": [
        {"name": "Fitness"}, {"name": "Nutrition"}, {"name": "Wellness"},
      ]},
      {"name": "Gaming", "sort_order": 5, "children": [
        {"name": "Game Coaching"}, {"name": "Marvel Rivals Coaching"},
        {"name": "eSports Management & Strategy"}, {"name": "Game Matchmaking"},
        {"name": "Ingame Creation"}, {"name": "Game Recordings & Guides"},
      ]},
      {"name": "Miscellaneous", "sort_order": 6, "children": [
        {"name": "Family & Genealogy"}, {"name": "Cosmetics Formulation"},
        {"name": "Greeting Cards & Videos"}, {"name": "Embroidery Digitizing"},
      ]},
    ]
  },
  {
    "name": "Consulting", "icon": "🧠", "color": "#378ADD", "sort_order": 12,
    "children": [
      {"name": "Business Consultants", "sort_order": 1, "children": [
        {"name": "Legal Consulting"}, {"name": "Business Consulting"},
        {"name": "HR Consulting"}, {"name": "AI Consulting"},
        {"name": "Business Plans"}, {"name": "E-commerce Consulting"},
      ]},
      {"name": "Marketing Strategy", "sort_order": 2, "children": [
        {"name": "Marketing Strategy"}, {"name": "Content Strategy"},
        {"name": "Social Media Strategy"}, {"name": "Influencers Strategy"},
        {"name": "Video Marketing Consulting"}, {"name": "SEM Strategy"},
        {"name": "PR Strategy"},
      ]},
      {"name": "Data Consulting", "sort_order": 3, "children": [
        {"name": "Data Analytics Consulting"},
        {"name": "Databases Consulting"},
        {"name": "Data Visualization Consulting"},
      ]},
      {"name": "Coaching & Advice", "sort_order": 4, "children": [
        {"name": "Career Counseling"}, {"name": "Life Coaching"},
        {"name": "Game Coaching"}, {"name": "Styling & Beauty Advice"},
        {"name": "Travel Advice"}, {"name": "Nutrition Coaching"},
        {"name": "Mindfulness Coaching"},
      ]},
      {"name": "Tech Consulting", "sort_order": 5, "children": [
        {"name": "AI Technology Consulting"}, {"name": "Website Consulting"},
        {"name": "Mobile App Consulting"}, {"name": "Game Development Consulting"},
        {"name": "Software Development Consulting"},
        {"name": "Cybersecurity Consulting"},
      ]},
      {"name": "Mentorship", "sort_order": 6, "children": [
        {"name": "Marketing Mentorship"}, {"name": "Design Mentorship"},
        {"name": "Writing Mentorship"}, {"name": "Video Mentorship"},
        {"name": "Music Mentorship"},
      ]},
    ]
  },
  {
    "name": "Data", "icon": "📊", "color": "#534AB7", "sort_order": 13,
    "children": [
      {"name": "Data Science & ML", "sort_order": 1, "children": [
        {"name": "Machine Learning"}, {"name": "Computer Vision"},
        {"name": "NLP"}, {"name": "Deep Learning"},
        {"name": "Generative Models"}, {"name": "Time Series Analysis"},
      ]},
      {"name": "Data Analysis & Visualization", "sort_order": 2, "children": [
        {"name": "Data Analytics"}, {"name": "Data Visualization"},
        {"name": "Data Tagging & Annotation"}, {"name": "Dashboards"},
      ]},
      {"name": "Data Collection", "sort_order": 3, "children": [
        {"name": "Data Entry"}, {"name": "Data Typing"},
        {"name": "Data Scraping"}, {"name": "Data Formatting"},
        {"name": "Data Cleaning"}, {"name": "Data Enrichment"},
      ]},
      {"name": "Data Processing & Management", "sort_order": 4, "children": [
        {"name": "Data Processing"}, {"name": "Data Governance & Protection"},
      ]},
      {"name": "Databases & Engineering", "sort_order": 5, "children": [
        {"name": "Databases"}, {"name": "Data Engineering"},
      ]},
    ]
  },
  {
    "name": "Photography", "icon": "📷", "color": "#D85A30", "sort_order": 14,
    "children": [
      {"name": "Products & Lifestyle", "sort_order": 1, "children": [
        {"name": "Product Photographers"}, {"name": "Food Photographers"},
        {"name": "Lifestyle & Fashion Photographers"},
      ]},
      {"name": "People & Scenes", "sort_order": 2, "children": [
        {"name": "Portrait Photographers"}, {"name": "Event Photographers"},
        {"name": "Real Estate Photographers"}, {"name": "Scenic Photographers"},
        {"name": "Drone Photographers"},
      ]},
      {"name": "Local Photography", "sort_order": 3, "children": [
        {"name": "Photographers in New York"},
        {"name": "Photographers in Los Angeles"},
        {"name": "Photographers in London"},
        {"name": "Photographers in Paris"},
      ]},
      {"name": "Miscellaneous", "sort_order": 4, "children": [
        {"name": "Photography Classes"}, {"name": "Photo Preset Creation"},
      ]},
    ]
  },
]

async def seed():
    async with AsyncSessionLocal() as db:
        if "--force" in sys.argv:
            print("Force flag detected. Deleting all categories...")
            await db.execute(delete(Category))
            await db.commit()
            
        result = await db.execute(select(Category).limit(1))
        if result.scalar_one_or_none():
            print("Already seeded — skipping. Use --force to re-seed.")
            return

        total = 0

        async def insert(node: dict, parent_id=None, level=0, parent_slug=""):
            nonlocal total
            current_slug = slugify(node["name"], parent_slug)
            cat = Category(
                name       = node["name"],
                slug       = current_slug,
                parent_id  = parent_id,
                icon       = node.get("icon"),
                color      = node.get("color"),
                sort_order = node.get("sort_order", 0),
                level      = level,
                is_active  = True,
                gig_count  = 0,
            )
            db.add(cat)
            await db.flush()
            total += 1
            for child in node.get("children", []):
                await insert(child, parent_id=cat.id, level=level + 1, parent_slug=current_slug)

        for cat in TREE:
            await insert(cat)

        await db.commit()
        print(f"✓ Seeded {total} categories across {len(TREE)} top-level categories.")

if __name__ == "__main__":
    asyncio.run(seed())

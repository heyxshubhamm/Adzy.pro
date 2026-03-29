import re
from typing import Tuple

# Contact patterns
EMAIL_REGEX = re.compile(r'[\w\.-]+@[\w\.-]+\.\w+')
PHONE_REGEX = re.compile(r'(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}')
URL_REGEX = re.compile(r'(https?://)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(/\S*)?')

# Bypass keywords
BYPASS_KEYWORDS = [
    "whatsapp", "telegram", "skype", "dm me", "contact me", 
    "pay outside", "off platform", "paypal me", "gpay", "invoice"
]

def scan_message(text: str) -> Tuple[float, str]:
    """
    Scans a message for contact info and bypass intent.
    Returns (risk_score, masked_text)
    """
    risk_score = 0.0
    masked_text = text
    
    # 1. Regex Detection (Emails/Phones)
    emails = EMAIL_REGEX.findall(text)
    phones = PHONE_REGEX.findall(text)
    
    if emails or phones:
        risk_score += 0.5
        masked_text = EMAIL_REGEX.sub("[EMAIL REMOVED]", masked_text)
        masked_text = PHONE_REGEX.sub("[PHONE REMOVED]", masked_text)
        
    # 2. Keyword Detection
    found_keywords = [kw for kw in BYPASS_KEYWORDS if kw in text.lower()]
    if found_keywords:
        risk_score += 0.3
        
    # 3. Obfuscation detection (Simple context)
    if " (at) " in text.lower() or " [at] " in text.lower():
        risk_score += 0.2
        masked_text = masked_text.replace(" (at) ", " [MASKED] ").replace(" [at] ", " [MASKED] ")

    return min(risk_score, 1.0), masked_text

import razorpay
from app.core.config import settings

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def create_razorpay_order(amount: float, currency: str = "INR"):
    data = {
        "amount": int(amount * 100), # Amount in paise
        "currency": currency,
        "payment_capture": 1
    }
    return client.order.create(data=data)

def verify_webhook_signature(payload: str, signature: str, secret: str):
    return client.utility.verify_webhook_signature(payload, signature, secret)

import resend, os
from jinja2 import Environment, FileSystemLoader

# Layer 5: Transactional Messaging (Resend & Jinja2)
resend.api_key = os.getenv("RESEND_API_KEY")
FRONTEND_URL   = os.getenv("FRONTEND_URL", "http://localhost:3000")
EMAIL_FROM     = os.getenv("EMAIL_FROM", "noreply@adzy.pro")

# Templates directory sync
template_dir = os.path.join(os.path.dirname(__file__), "templates")
os.makedirs(template_dir, exist_ok=True)
jinja_env = Environment(loader=FileSystemLoader(template_dir))

def _render(template_name: str, **ctx) -> str:
    """Renders the HTML authority for transactional emails using Jinja2."""
    return jinja_env.get_template(template_name).render(**ctx)

async def send_verification_email(email: str, username: str, token: str, user_id: str) -> None:
    """Dispatches an HMAC-signed verification link to the user's inbox."""
    verify_url = f"{FRONTEND_URL}/verify-email?token={token}&user_id={user_id}"
    html       = _render("verify_email.html", username=username, verify_url=verify_url)

    resend.Emails.send({
        "from":    EMAIL_FROM,
        "to":      [email],
        "subject": "Verify your identity — Adzy.pro Marketplace",
        "html":    html,
    })

async def send_welcome_email(email: str, username: str) -> None:
    """Dispatches the welcome telemetry to newly verified marketplace units."""
    html = _render("welcome.html", username=username, login_url=f"{FRONTEND_URL}/login")
    resend.Emails.send({
        "from":    EMAIL_FROM,
        "to":      [email],
        "subject": "System Entry Confirmed — Welcome to Adzy.pro",
        "html":    html,
    })

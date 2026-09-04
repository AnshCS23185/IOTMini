import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
from datetime import datetime
from app.config import settings

logger = logging.getLogger("paneliq.email")

def send_invitation_email(to_email: str, name: str, pin: str):
    """
    Sends an invitation email with a temporary PIN using SMTP.
    Includes RFC 5322 compliant headers (Date, Message-ID, Reply-To)
    and dual text/plain + text/html payloads to maximize deliverability
    and prevent messages from being marked as spam/junk.
    """
    to_email = (to_email or "").strip()
    if not to_email:
        logger.warning("send_invitation_email called with empty recipient email.")
        return False

    smtp_host = settings.SMTP_HOST or "smtp.gmail.com"
    smtp_port = int(settings.SMTP_PORT or 587)
    smtp_user = settings.SMTP_USER or settings.SMTP_USERNAME or ""
    smtp_password = settings.SMTP_PASSWORD or ""
    from_email = settings.EMAILS_FROM_EMAIL or settings.FROM_EMAIL or smtp_user or "noreply@paneliq.com"
    from_name = settings.EMAILS_FROM_NAME or "PanelIQ"

    if not smtp_user or not smtp_password:
        logger.info("--------------------------------------------------")
        logger.info(f"MOCK EMAIL DISPATCH TO: {to_email}")
        logger.info(f"Subject: Welcome to PanelIQ - Your Access PIN")
        logger.info(f"PIN: {pin}")
        logger.info("--------------------------------------------------")
        return True

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Welcome to PanelIQ - Your Access PIN"
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = to_email
        msg['Date'] = formatdate(localtime=True)
        msg['Message-ID'] = make_msgid(domain='gmail.com')
        msg['Reply-To'] = from_email

        # 1. Plain text version (essential for spam filter trust score)
        plain_text = f"""Welcome to PanelIQ, {name}!

You have been invited to access the PanelIQ Solar Management Platform.

Your temporary 4-digit access PIN is: {pin}

Use your email ({to_email}) and this temporary PIN to log in to PanelIQ. You will be prompted to set your permanent password upon your first login.

Best regards,
The PanelIQ Team
"""
        msg.attach(MIMEText(plain_text, 'plain', 'utf-8'))

        # 2. Rich HTML version
        html_content = f"""<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f5; padding: 40px 10px; margin: 0;">
    <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e4e4e7;">
      <div style="background-color: #104C64; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px;">PanelIQ</h1>
      </div>
      <div style="padding: 36px 30px; color: #18181b;">
        <h2 style="margin-top: 0; color: #104C64; font-size: 20px;">Welcome, {name}!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #3f3f46;">You have been invited to access the PanelIQ Solar Management Platform.</p>
        <p style="font-size: 15px; line-height: 1.6; color: #3f3f46;">To securely log in to your customer account, use the following temporary access PIN:</p>
        
        <div style="background-color: #f4f4f5; border: 1px solid #d4d4d8; border-radius: 6px; padding: 20px; text-align: center; margin: 28px 0;">
          <span style="font-size: 34px; font-weight: 700; letter-spacing: 10px; color: #B86F50; font-family: monospace;">{pin}</span>
        </div>
        
        <div style="text-align: center; margin: 28px 0;">
          <a href="http://localhost:5173/login" style="background-color: #104C64; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Login to PanelIQ</a>
        </div>
        
        <p style="font-size: 13px; line-height: 1.5; color: #71717a;">You will be prompted to create your permanent password upon your first login.</p>
        <p style="font-size: 13px; line-height: 1.5; color: #71717a; margin-top: 24px; border-top: 1px solid #e4e4e7; pt: 16px;">
          Best regards,<br/>
          <strong>The PanelIQ Team</strong>
        </p>
      </div>
      <div style="background-color: #fafafa; padding: 16px; text-align: center; border-top: 1px solid #f4f4f5;">
        <p style="font-size: 11px; color: #a1a1aa; margin: 0;">&copy; {datetime.now().year} PanelIQ Solar Systems. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>"""
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))

        logger.info(f"Connecting to SMTP server {smtp_host}:{smtp_port} for {to_email}...")
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Successfully dispatched invitation email to {to_email}")

        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}", exc_info=True)
        return False


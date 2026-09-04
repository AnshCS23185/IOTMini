import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from app.config import settings

SMTP_HOST = settings.SMTP_HOST
SMTP_PORT = settings.SMTP_PORT or 587
SMTP_USERNAME = settings.SMTP_USER or settings.SMTP_USERNAME or ""
SMTP_PASSWORD = settings.SMTP_PASSWORD or ""
FROM_EMAIL = settings.EMAILS_FROM_EMAIL or settings.FROM_EMAIL or "noreply@paneliq.com"
FROM_NAME = settings.EMAILS_FROM_NAME or "PanelIQ"

def send_invitation_email(to_email: str, name: str, pin: str):
    """
    Sends an invitation email with a temporary PIN.
    If SMTP_USERNAME is not configured, logs to console instead.
    """
    if not SMTP_USERNAME:
        print("--------------------------------------------------")
        print(f"MOCK EMAIL DISPATCH TO: {to_email}")
        print(f"Subject: Welcome to PanelIQ - Your Access PIN")
        print(f"PIN: {pin}")
        print("--------------------------------------------------")
        return True

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Welcome to PanelIQ - Your Access PIN"
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email

        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 40px 0; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <div style="background-color: #104C64; padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">PanelIQ</h1>
              </div>
              <div style="padding: 40px 30px; color: #3B2823;">
                <h2 style="margin-top: 0; color: #104C64;">Welcome, {name}!</h2>
                <p style="font-size: 16px; line-height: 1.5; color: #4b5563;">You have been invited to access the PanelIQ Solar Management Platform.</p>
                <p style="font-size: 16px; line-height: 1.5; color: #4b5563;">To securely access your account, use the following temporary PIN:</p>
                
                <div style="background-color: #f4f4f5; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; text-align: center; margin: 30px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #D59D80;">{pin}</span>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="http://localhost:5173/login" style="background-color: #104C64; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Login to PanelIQ</a>
                </div>
                
                <p style="font-size: 14px; line-height: 1.5; color: #6b7280;">You will be prompted to create a permanent password upon your first login.</p>
                <p style="font-size: 14px; line-height: 1.5; color: #6b7280; margin-top: 30px;">
                  Best regards,<br/>
                  <strong>The PanelIQ Team</strong>
                </p>
              </div>
              <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #f3f4f6;">
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">&copy; {datetime.now().year} PanelIQ Systems. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
        """

        part = MIMEText(html_content, 'html')
        msg.attach(part)

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {str(e)}")
        # In a production app, we might raise an exception, but for now we'll just log it.
        return False

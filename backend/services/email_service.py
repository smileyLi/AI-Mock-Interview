import smtplib
from email.mime.text import MIMEText
from email.header import Header
from ..config import Config
from ..logger import get_logger


class EmailService:

    def __init__(self):
        self.logger = get_logger(__name__)

    def send_verification_code(self, to_email: str, code: str, purpose: str = "reset") -> bool:
        if not Config.SMTP_USER or not Config.SMTP_PASSWORD:
            self.logger.warning("SMTP未配置，跳过邮件发送")
            return False

        if purpose == "register":
            subject = "AI面试系统 - 注册验证码"
            body = (
                f"您好！\n\n"
                f"感谢您注册 AI模拟面试系统。\n\n"
                f"您的注册验证码是：{code}\n\n"
                f"该验证码 5 分钟内有效，请勿泄露给他人。\n"
                f"如果这不是您本人的操作，请忽略此邮件。\n\n"
                f"AI模拟面试系统"
            )
        else:
            subject = "AI面试系统 - 密码重置验证码"
            body = (
                f"您好！\n\n"
                f"您在 AI模拟面试系统 申请了密码重置。\n\n"
                f"您的验证码是：{code}\n\n"
                f"该验证码 5 分钟内有效，请勿泄露给他人。\n"
                f"如果这不是您本人的操作，请忽略此邮件。\n\n"
                f"AI模拟面试系统"
            )

        try:
            msg = MIMEText(body, "plain", "utf-8")
            msg["Subject"] = Header(subject, "utf-8")
            msg["From"] = Config.SMTP_USER
            msg["To"] = to_email

            with smtplib.SMTP_SSL(Config.SMTP_HOST, Config.SMTP_PORT) as server:
                server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
                server.sendmail(Config.SMTP_USER, [to_email], msg.as_string())

            self.logger.info(f"验证码邮件已发送至 {to_email}")
            return True
        except Exception as e:
            self.logger.error(f"邮件发送失败: {e}")
            raise e

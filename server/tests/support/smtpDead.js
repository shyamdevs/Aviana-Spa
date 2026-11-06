// A configured-but-unreachable SMTP server: sending fails for real (connection refused).
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = '1';
process.env.SMTP_USER = 'user@example.test';
process.env.SMTP_PASS = 'not-a-real-password';

ALTER TABLE notification_logs ADD COLUMN telegram_message_id BIGINT;
ALTER TABLE notification_logs ADD COLUMN telegram_chat_id VARCHAR(64);

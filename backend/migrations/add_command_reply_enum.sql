ALTER TABLE notification_logs MODIFY COLUMN type ENUM('lost','live','inactive_still_live','website_die','website_alive','command_reply') NOT NULL;

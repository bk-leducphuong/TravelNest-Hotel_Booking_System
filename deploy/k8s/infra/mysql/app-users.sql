-- Least-privilege accounts for the extracted Go services.
--
-- The MySQL image only runs `/docker-entrypoint-initdb.d` on first initialization,
-- so on an EXISTING cluster run this file manually:
--
--   kubectl -n travelnest exec -i statefulset/mysql -- \
--     sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" travelnest' < app-users.sql
--
-- Replace <DB_PASSWORD> with the application database password (the same value
-- as MYSQL_PASSWORD / DB_PASSWORD) before running. Idempotent.
--
-- See wiki/Table-Ownership.md for the ownership model.

CREATE USER IF NOT EXISTS 'travelnest_media'@'%' IDENTIFIED BY '<DB_PASSWORD>';
CREATE USER IF NOT EXISTS 'travelnest_notification'@'%' IDENTIFIED BY '<DB_PASSWORD>';

-- media owns images / image_variants; it may only read users/rooms.
GRANT SELECT, INSERT, UPDATE ON `travelnest`.`images` TO 'travelnest_media'@'%';
GRANT SELECT, INSERT, UPDATE ON `travelnest`.`image_variants` TO 'travelnest_media'@'%';
GRANT SELECT, UPDATE ON `travelnest`.`users` TO 'travelnest_media'@'%';
GRANT SELECT, UPDATE ON `travelnest`.`rooms` TO 'travelnest_media'@'%';

-- notification owns notifications; everything else is read-only.
GRANT SELECT, INSERT, UPDATE ON `travelnest`.`notifications` TO 'travelnest_notification'@'%';
GRANT SELECT ON `travelnest`.`hotels` TO 'travelnest_notification'@'%';
GRANT SELECT ON `travelnest`.`hotel_users` TO 'travelnest_notification'@'%';
GRANT SELECT ON `travelnest`.`user_roles` TO 'travelnest_notification'@'%';
GRANT SELECT ON `travelnest`.`roles` TO 'travelnest_notification'@'%';
GRANT SELECT ON `travelnest`.`users` TO 'travelnest_notification'@'%';

FLUSH PRIVILEGES;

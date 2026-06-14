#!/bin/sh
set -eu

MYSQL_HOST="${MYSQL_HOST:-mysql}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
KEYCLOAK_DB_NAME="${KEYCLOAK_DB_NAME:-keycloak}"
KEYCLOAK_DB_USER="${KEYCLOAK_DB_USER:-keycloak}"
KEYCLOAK_DB_PASSWORD="${KEYCLOAK_DB_PASSWORD:-keycloak}"

attempt=0
until mysqladmin ping -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u root -p"${MYSQL_ROOT_PASSWORD}" --silent; do
  attempt=$((attempt + 1))
  if [ "${attempt}" -ge 20 ]; then
    echo "Unable to connect to MySQL at ${MYSQL_HOST}:${MYSQL_PORT}" >&2
    exit 1
  fi
  sleep 2
done

mysql -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u root -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS \`${KEYCLOAK_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${KEYCLOAK_DB_USER}'@'%' IDENTIFIED BY '${KEYCLOAK_DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${KEYCLOAK_DB_NAME}\`.* TO '${KEYCLOAK_DB_USER}'@'%';
FLUSH PRIVILEGES;
SQL

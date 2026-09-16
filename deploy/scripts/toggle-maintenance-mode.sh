#!/bin/bash

if docker exec travelnest-nginx test -f /etc/nginx/maintenance.flag; then
  docker exec travelnest-nginx rm /etc/nginx/maintenance.flag
  echo "Maintenance OFF"
else
  docker exec travelnest-nginx touch /etc/nginx/maintenance.flag
  echo "Maintenance ON"
fi

docker exec travelnest-nginx nginx -s reload

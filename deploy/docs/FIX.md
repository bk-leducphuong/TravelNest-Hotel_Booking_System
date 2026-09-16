# In VPS

## Fix permission issue

```bash
cd /opt/travelnest
sudo chown -R 1001:1001 logs/api
docker compose up -d --no-deps --force-recreate api
```

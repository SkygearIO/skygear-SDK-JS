# Development notes

## Develop using Docker

The included docker compose is for development purpose. Source code is mounted
as a volume so changes are applied without rebuilding Docker image.

```
# Install dependencies via Docker
docker-compose run --rm node npm install

# Start database and source builder
docker-compose up -d db node

# Start server and plugin process
docker-compose up app plugin
```

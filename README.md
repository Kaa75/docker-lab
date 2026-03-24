# Docker Lab - Node.js Express API with MySQL

A containerized Node.js Express API with MySQL database, designed for Docker Compose and Docker Swarm deployment.

## Project Structure

```
docker-lab/
├── src/
│   └── server.js           # Express API application
├── database/
│   └── init.sql            # MySQL initialization script
├── Dockerfile              # Docker image build instructions
├── docker-compose.yml      # Multi-container orchestration
├── package.json            # Node.js dependencies
├── .env.example            # Environment variables template
├── .dockerignore           # Files to exclude from Docker build
└── README.md               # This file
```

## Features

- **RESTful API** with Express.js
- **MySQL database** with persistent storage
- **Health check endpoint** for monitoring
- **Production-ready** Dockerfile with security best practices
- **Docker Compose** for local development
- **Swarm-ready** configuration for cluster deployment

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check - returns status and container hostname |
| GET | `/api/items` | Get all items from database |
| POST | `/api/items` | Create a new item (requires `name` and `description`) |

## Prerequisites

- Docker Desktop (macOS/Windows) or Docker Engine (Linux)
- Docker Compose v2+
- AWS CLI (for ECR push)
- AWS Account with ECR access

## Local Development

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd docker-lab
```

### 2. Create environment file

```bash
cp .env.example .env
```

Edit `.env` and set a strong password:
```
DB_PASSWORD=MyS3cur3P@ss
```

### 3. Start application with Docker Compose

```bash
# Build and start all services
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down

# Stop and remove volumes (clears database)
docker compose down -v
```

### 4. Test the API

```bash
# Health check
curl http://localhost:3000/api/health

# Get items
curl http://localhost:3000/api/items

# Add new item
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Kubernetes", "description": "Container orchestration platform"}'
```

## Build Docker Image

```bash
# Build the image
docker build -t docker-app:v1 .

# Run standalone container (without database)
docker run -d --name my-app -p 3000:3000 docker-app:v1

# Stop and remove
docker stop my-app && docker rm my-app
```

## Push to Amazon ECR

### 1. Create ECR repository

```bash
aws ecr create-repository \
  --repository-name docker-app \
  --region us-east-1
```

### 2. Authenticate Docker with ECR

```bash
# Replace <account-id> with your AWS account ID
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### 3. Tag and push image

```bash
# Tag the image
docker tag docker-app:v1 \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/docker-app:v1

# Push to ECR
docker push \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/docker-app:v1
```

## Docker Swarm Deployment

### Prerequisites

- 3 EC2 instances (t2.micro or t3.micro)
- Security group with ports: 22, 2377, 7946, 4789, 3000
- Docker installed on all instances

### 1. Initialize Swarm

On the manager node:
```bash
docker swarm init --advertise-addr <MANAGER-PRIVATE-IP>
```

### 2. Join workers

On each worker node, run the join command from step 1:
```bash
docker swarm join --token <TOKEN> <MANAGER-IP>:2377
```

### 3. Verify cluster

```bash
docker node ls
```

### 4. Authenticate with ECR (on all nodes)

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### 5. Create Swarm stack file

Create `docker-compose.swarm.yml`:

```yaml
version: '3.8'

services:
  api:
    image: <account-id>.dkr.ecr.us-east-1.amazonaws.com/docker-app:v1
    ports:
      - "3000:3000"
    environment:
      DB_HOST: db
      DB_USER: root
      DB_PASS: MyS3cur3P@ss
      DB_NAME: docker_lab
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    networks:
      - app-network

  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: MyS3cur3P@ss
      MYSQL_DATABASE: docker_lab
    volumes:
      - db_data:/var/lib/mysql
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
    networks:
      - app-network

networks:
  app-network:
    driver: overlay

volumes:
  db_data:
```

### 6. Deploy stack

```bash
docker stack deploy -c docker-compose.swarm.yml myapp
```

### 7. Verify deployment

```bash
# List services
docker service ls

# Check service details
docker service ps myapp_api

# View logs
docker service logs myapp_api
```

### 8. Test load balancing

```bash
# Test from any node (replace with actual IPs)
curl http://<MANAGER-IP>:3000/api/health
curl http://<WORKER-1-IP>:3000/api/health
curl http://<WORKER-2-IP>:3000/api/health
```

The `container` field in the response will show different hostnames, proving load balancing is working.

### 9. Scale the service

```bash
# Scale up to 5 replicas
docker service scale myapp_api=5

# Scale down to 2 replicas
docker service scale myapp_api=2

# Check status
docker service ps myapp_api
```

### 10. Rolling update

```bash
# Build and push new version
docker build -t docker-app:v2 .
docker tag docker-app:v2 <account-id>.dkr.ecr.us-east-1.amazonaws.com/docker-app:v2
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/docker-app:v2

# Update service
docker service update --image \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/docker-app:v2 \
  myapp_api
```

## Clean Up

### Local Compose

```bash
docker compose down -v
docker rmi docker-app:v1
```

### Swarm

```bash
# Remove stack
docker stack rm myapp

# Leave swarm (on workers)
docker swarm leave

# Leave swarm (on manager)
docker swarm leave --force

# Terminate EC2 instances via AWS Console
```

### ECR

```bash
aws ecr delete-repository \
  --repository-name docker-app \
  --force \
  --region us-east-1
```

## Troubleshooting

### Container logs

```bash
# Compose
docker compose logs -f api

# Swarm
docker service logs -f myapp_api
```

### Database connection issues

```bash
# Check if database is healthy
docker compose ps

# Execute MySQL commands
docker compose exec db mysql -uroot -p${DB_PASSWORD} -e "SHOW DATABASES;"
```

### Cannot connect to API

```bash
# Check running containers
docker compose ps

# Check port mapping
docker ps

# Check API logs
docker compose logs api
```

## Security Best Practices

- Never commit `.env` to Git
- Use strong database passwords
- Run containers as non-root user (implemented in Dockerfile)
- Use Alpine base images for smaller attack surface
- Implement health checks
- Use secrets management for production (AWS Secrets Manager, HashiCorp Vault)

## License

MIT License - feel free to use for educational purposes.

## Author

EECE 503Q - Docker Lab

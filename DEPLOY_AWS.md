# Deploy Adzy.pro on AWS EC2 + Connect Domain

## 1) Launch / prepare EC2

Use Ubuntu 22.04+ and open these inbound security-group ports:
- `22` (SSH) from your IP only
- `80` (HTTP) from `0.0.0.0/0`
- `443` (HTTPS) from `0.0.0.0/0`

Install Docker + Compose plugin:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

## 2) Copy project to EC2

From your local machine:

```bash
scp -i /path/to/key.pem -r /Users/shubhamsharma/Adzy.pro ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/
```

Then SSH:

```bash
ssh -i /path/to/key.pem ubuntu@YOUR_EC2_PUBLIC_IP
cd ~/Adzy.pro
```

## 3) Set production env

```bash
cp .env.production.example .env.production
nano .env.production
```

Set at minimum:
- `APP_DOMAIN` (example: `adzy.pro`)
- `API_DOMAIN` (example: `api.adzy.pro`)
- `ACME_EMAIL`
- `POSTGRES_PASSWORD`
- `SECRET_KEY`
- `REFRESH_SECRET_KEY`
- `SESSION_SECRET`

## 4) Connect domain DNS

At your domain registrar DNS settings, create:
- `A` record for `@` -> `YOUR_EC2_PUBLIC_IP`
- `A` record for `www` -> `YOUR_EC2_PUBLIC_IP`
- `A` record for `api` -> `YOUR_EC2_PUBLIC_IP`

Wait for DNS propagation (usually 5-30 min, sometimes longer).

## 5) Start production stack

```bash
docker network create adzy_edge || true
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Check status:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f caddy
```

When Caddy finishes certificate issuance, your URLs should work:
- `https://APP_DOMAIN`
- `https://www.APP_DOMAIN`
- `https://API_DOMAIN/docs`

## 6) Start independent staging stack

```bash
docker compose --env-file .env.production -f docker-compose.staging.yml up -d --build
```

Check status:

```bash
docker compose --env-file .env.production -f docker-compose.staging.yml ps
```

Staging URLs:
- `https://STAGING_APP_DOMAIN`
- `https://STAGING_API_DOMAIN/docs`

## 7) Update / redeploy later

```bash
cd ~/Adzy.pro
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.staging.yml up -d --build
```

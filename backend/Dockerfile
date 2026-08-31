# ---------- Build stage ----------
FROM python:3.13.5-slim AS build
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        netcat-openbsd \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# ---------- Runner stage ----------
FROM python:3.13.5-slim AS runner
WORKDIR /app

# Installer pg_dump compatible PostgreSQL 16
RUN apt-get update && apt-get install -y wget gnupg lsb-release \
 && wget -q https://www.postgresql.org/media/keys/ACCC4CF8.asc -O- | apt-key add - \
 && echo "deb http://apt.postgresql.org/pub/repos/apt/ bookworm-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
        libpq-dev \
        netcat-openbsd \
        postgresql-client-16 \
 && rm -rf /var/lib/apt/lists/*

# Copier dépendances Python + application
COPY --from=build /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=build /usr/local/bin /usr/local/bin
COPY --from=build /app .

# Copier l’entrypoint
COPY ./docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Variables d'environnement
ARG DB_USER=postgres
ARG DB_PASSWORD=itdcmada
ARG DB_HOST=db
ARG DB_NAME=billet_mahaleo
ARG DB_PORT=5432
ARG PORT=3136

ENV DB_USER=$DB_USER
ENV DB_PASSWORD=$DB_PASSWORD
ENV DB_HOST=$DB_HOST
ENV DB_NAME=$DB_NAME
ENV DB_PORT=$DB_PORT
ENV PORT=$PORT

EXPOSE $PORT
ENTRYPOINT ["/app/docker-entrypoint.sh"]
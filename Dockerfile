# Zat production image: Next.js + ffmpeg pipeline.
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
# Public values are baked into the browser bundle at build time.
ARG NEXT_PUBLIC_ADSENSE_CLIENT=""
ARG NEXT_PUBLIC_IMA_AD_TAG_URL=""
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_ADSENSE_CLIENT=$NEXT_PUBLIC_ADSENSE_CLIENT NEXT_PUBLIC_IMA_AD_TAG_URL=$NEXT_PUBLIC_IMA_AD_TAG_URL
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=build /app ./
RUN mkdir -p storage
EXPOSE 3000
# Sync the database schema, create plans + admin, then start.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run db:init && npm start"]

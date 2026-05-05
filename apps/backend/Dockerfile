FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apk add --no-cache openssl \
  && corepack enable \
  && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/desktop/package.json apps/desktop/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY apps/backend apps/backend

RUN DATABASE_URL="postgresql://ph_user:ph_pass@db:5432/personalhub" pnpm --filter @personal-hub/backend prisma generate
RUN pnpm --filter @personal-hub/backend build

FROM build AS runner

ENV NODE_ENV=production

EXPOSE 3001

CMD ["sh", "-c", "pnpm --filter @personal-hub/backend prisma migrate deploy && if [ \"$SEED_DEMO_DATA\" = \"true\" ]; then pnpm --filter @personal-hub/backend prisma db seed; else echo 'Skipping demo seed for release database'; fi && pnpm --filter @personal-hub/backend start"]

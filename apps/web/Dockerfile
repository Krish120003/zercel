##### DEPENDENCIES

FROM --platform=linux/amd64 node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app


# Install dependencies based on the preferred package manager

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml\* ./

# RUN \
#     if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
#     elif [ -f package-lock.json ]; then npm ci; \
#     elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm i; \
#     else echo "Lockfile not found." && exit 1; \
#     fi

RUN npm i -g pnpm
RUN pnpm i 

##### BUILDER

FROM --platform=linux/amd64 node:20-alpine AS builder
ARG DATABASE_URL
ARG NEXT_PUBLIC_CLIENTVAR
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

# RUN \
#     if [ -f yarn.lock ]; then SKIP_ENV_VALIDATION=1 yarn build; \
#     elif [ -f package-lock.json ]; then SKIP_ENV_VALIDATION=1 npm run build; \
#     elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && SKIP_ENV_VALIDATION=1 pnpm run build; \
#     else echo "Lockfile not found." && exit 1; \
#     fi

RUN npm i -g pnpm
RUN SKIP_ENV_VALIDATION=1 pnpm run build

##### RUNNER

FROM --platform=linux/amd64 gcr.io/distroless/nodejs20-debian12 AS runner
WORKDIR /app

ARG NEXT_PUBLIC_GITHUB_APP_URL
ENV NODE_ENV production
ENV AUTH_TRUST_HOST true
ENV NEXT_PUBLIC_GITHUB_APP_URL $NEXT_PUBLIC_GITHUB_APP_URL
ENV SKIP_ENV_VALIDATION 1

# ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

CMD ["server.js"]

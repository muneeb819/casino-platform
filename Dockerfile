FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps ./apps
COPY packages ./packages
RUN npm install
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/web
RUN npx next build

FROM node:20-alpine AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
FROM public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 AS adapter

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/content ./content
COPY --from=adapter /lambda-adapter /opt/extensions/lambda-adapter
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV AWS_LWA_PORT=3000
ENV AWS_LWA_READINESS_CHECK_PATH=/api/health
ENV AWS_LWA_INVOKE_MODE=buffered
EXPOSE 3000
CMD ["node", "server.js"]

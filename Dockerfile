FROM node:20-alpine AS builder

WORKDIR /app

ENV VITE_SUPABASE_URL=https://thldivljghkjkrgznccb.supabase.co
ENV VITE_SUPABASE_ANON_KEY=sb_publishable_2GcLpjeZ37kpyNv1CvgPBQ_U2rTDEdz
ENV VITE_JOB_API_BASE_URL=https://job-search-gateway-248843403405.europe-west1.run.app/job-search/api/v1
ENV VITE_NOTIFICATION_API_BASE_URL=https://job-search-gateway-248843403405.europe-west1.run.app/notification/api/v1
ENV VITE_AI_API_BASE_URL=https://job-search-gateway-248843403405.europe-west1.run.app/ai/api/v1

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
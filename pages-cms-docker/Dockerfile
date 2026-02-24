# Pages CMS - Docker dev image
FROM node:20-alpine

RUN apk add --no-cache libc6-compat git
WORKDIR /app

# Clone Pages CMS
RUN git clone --depth 1 https://github.com/pages-cms/pages-cms.git . && rm -rf .git

# Install dependencies
RUN npm ci

EXPOSE 3000

# Run migrations then start dev server
CMD ["sh", "-c", "npm run db:migrate && npm run dev"]

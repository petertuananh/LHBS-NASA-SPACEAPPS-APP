# =========================
# Dockerfile cho cosmic-lens
# =========================
FROM node:20-alpine AS builder

# Tạo thư mục làm việc
WORKDIR /app

# Copy file cấu hình
COPY package*.json ./

# Cài dependencies (sử dụng npm ci để build sạch)
RUN npm ci

# Copy toàn bộ source code
COPY . .

# Build production
RUN npm run build

# =========================
# Stage chạy production
# =========================
FROM node:20-alpine AS runner

WORKDIR /app

# Copy file cần thiết từ builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Môi trường production
ENV NODE_ENV=production
ENV PORT=3000

# Mở port Next.js
EXPOSE 3000

# Lệnh khởi chạy
CMD ["npm", "start"]

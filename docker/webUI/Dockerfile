FROM node:20-alpine AS builder

WORKDIR /app

COPY src/webUI/mantaray-control-interface/package*.json .

# Install dependencies
RUN npm install

# Copy the rest of the web UI source code
COPY src/webUI/mantaray-control-interface/ ./

RUN npm run build
RUN npm audit fix

# Use a lightweight Nginx alpine image to serve the static files
FROM nginx:stable-alpine

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the compiled assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 (matches the containerPort in our deployment manifest)
EXPOSE 80

# Nginx runs automatically in the foreground in this base image
CMD ["nginx", "-g", "daemon off;"]
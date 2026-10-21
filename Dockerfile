# Use the official Bun image as base
FROM oven/bun:1.4.3 AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Create a non-root user for security
RUN groupadd --system --gid 1001 coolify && \
    useradd --system --uid 1001 --gid coolify --no-create-home coolify

# Change ownership of the app directory
RUN chown -R coolify:coolify /app

# Switch to non-root user
USER coolify

# Set environment variables
ENV NODE_ENV=production

# Expose port (though this app doesn't serve HTTP, good practice)
EXPOSE 3000

# Health check to ensure the app is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD pgrep -f "bun.*index.ts" || exit 1

# Run the application
CMD ["bun", "run", "index.ts"]
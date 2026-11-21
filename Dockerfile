# Keep the tag in sync with "@playwright/test" in package.json (browsers are baked into this image).
ARG PLAYWRIGHT_VERSION=1.65.1
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble

WORKDIR /app
ENV CI=true NODE_ENV=test PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Dependency layer first for cache hits
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npx tsc --noEmit

# Run as the unprivileged user shipped with the image
RUN mkdir -p test-results playwright-report blob-report .flaky .healing .auth && chown -R pwuser:pwuser /app
USER pwuser

ENTRYPOINT ["npm", "run"]
CMD ["test"]

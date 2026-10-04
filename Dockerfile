FROM denoland/deno:alpine

WORKDIR /app

# Copy configuration and source files
COPY deno.json .
COPY languages.js .
COPY scraper.js .
COPY main.js .

# Cache dependencies
RUN deno cache main.js

# Expose API port
EXPOSE 8000

ENV PORT=8000

# Run with non-root deno user
USER deno

CMD ["run", "--allow-net", "--allow-env", "main.js"]

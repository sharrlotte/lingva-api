# Lingva API

Simple API endpoint based on [Lingva Translate](https://github.com/thedaviddelta/lingva-translate).

- Written in [Deno](https://deno.com/).
- Serverless, on [Deno Deploy](https://deno.com/deploy) or containerized with Docker.
- There's no front-end.

## Development

Requires [Deno](https://deno.com/).

- `deno task dev` - Run the server with watch mode, for development.
- `deno task debug` - Run the server with watch mode and debugging, for development.
- `deno task start` - Run the server.

## Docker

Build and run using Docker:

```bash
# Build the Docker image
docker build -t lingva-api .

# Run the container (maps port 8000)
docker run -d -p 8000:8000 --name lingva-api lingva-api
```

The API will be accessible at `http://localhost:8000`.

## REST API Endpoints

- `GET /` - List all API routes.
- `GET /api/v1/:SOURCE/:TARGET/:QUERY` - Translate text.
- `GET /api/v1/audio/:TARGET/:QUERY` - Get TTS audio for text.
- `GET /api/v1/languages/(source|target)?` - Get supported language codes.

### Parameters:
- `SOURCE` - Source language, default: `auto`.
- `TARGET` - Target language, required.
- `QUERY` - Text to translate, required.

## License

Lingva Translate ©️ [thedaviddelta](https://github.com/thedaviddelta) & contributors.
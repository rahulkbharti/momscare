# mom-care

A minimal TypeScript Node.js starter.

## Scripts

- `npm run build` compiles TypeScript to `dist/`
- `npm run dev` watches TypeScript for changes
- `npm start` runs the compiled output

## Chat Server

The server exposes a Socket.IO chat with these events:

- `chat:join` (client -> server): payload is a string user name
- `chat:message` (client -> server): payload `{ message: string }`
- `chat:message` (server -> clients): payload `{ user, message, sentAt }`
- `chat:ai` (server -> client): payload is a string response from Gemini
- `chat:system` (server -> clients): payload is a string

Health endpoint: `GET /health` returns `{ ok: true }`.

## Document Upload API

Start the server:

```bash
npm run build
npm start
```

Upload using `multipart/form-data`:

```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@./sample.pdf"
```

The response returns `{ fileName, mimeType, size, result }`. Small files are returned as inline base64 data; larger files are uploaded to Gemini and return a file URI.

## Gemini Config

Set `GEMINI_API_KEY` in `.env.development` (or `.env`) to enable AI replies.

# BuchTech Super Intelligence Services Portfolio

A responsive single-page portfolio with a separate Node.js API service for three OpenAI-powered browser demos. The public website never contains the OpenAI API key.

## Website

The existing portfolio is `index.html` and needs no build step. Its deployed Render static site remains separate from the AI API.

## Deploy the AI demo API on Render

1. In Render, create a Blueprint from this repository and apply `render.yaml`. It defines a separate `buchtech-ai-api-promise` web service and does not replace the existing static portfolio service.
2. When Render prompts for the `OPENAI_API_KEY` environment variable, enter the key in Render's private service settings. Do not add it to this repository, the website HTML, or a public issue.
3. Keep `OPENAI_MODEL` at its configured default (`gpt-4.1-mini`) unless you intentionally choose another model available to your OpenAI account.
4. The API's browser CORS allowlist is `https://buchtech-web.onrender.com`. Change `ALLOWED_ORIGINS` only if the portfolio's public domain changes; use exact comma-separated HTTPS origins.
5. The front end calls `https://buchtech-ai-api-promise.onrender.com/api/demo`. If Render assigns a different service hostname, update the `buchtech-ai-api` meta tag in `index.html` to that exact HTTPS origin and redeploy the static site.
6. Verify `https://buchtech-ai-api-promise.onrender.com/api/health` returns `{"ok":true,"service":"buchtech-ai-demo-api"}`. Then try each demo from the portfolio.

The API sends demo input to OpenAI and returns the generated text; it does not store demo input or results. The API imposes a 4,000-character input limit, an in-memory per-IP rate limit, request-size limits, and an exact-origin CORS allowlist. Anonymous public endpoints can still be called outside a browser, so rate limiting is only a basic abuse control. OpenAI usage is billed to the OpenAI account attached to the server key. Render free services may sleep when idle, so the first request after a quiet period can take longer.

## Local development and tests

Run the static site by opening `index.html` in a browser. For the API, use Node.js 20 or newer:

```sh
cd api
npm ci
npm test
OPENAI_API_KEY=your-key ALLOWED_ORIGINS=http://localhost:5500 npm start
```

Keep local secrets in an untracked `.env` file or inject them through your shell; never commit them. The API provides `GET /api/health` and `POST /api/demo` with one of the demo types `summarize`, `explain`, or `ideas`.

# cf_ai_quickchat

Minimal AI-powered chat app on Cloudflare:
- LLM: Workers AI (Meta Llama 3.3)
- Coordination + Memory/State: Durable Objects (stores last messages per session)
- User input: Chat UI (served from Worker)

## Run locally
```bash
npm install
npx wrangler dev

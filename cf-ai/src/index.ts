export { ChatMemory } from "./chatMemory";

export interface Env {
  AI: Ai;
  CHAT: DurableObjectNamespace;
}

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/") {
      return new Response(HTML, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      try {
        const { sessionId, message } = (await req.json()) as {
          sessionId?: string;
          message: string;
        };

        const sid = sessionId?.trim() || crypto.randomUUID();
        const id = env.CHAT.idFromName(sid);
        const stub = env.CHAT.get(id);

        const doRes = await stub.fetch("https://do/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message }),
        });

        const { messages } = (await doRes.json()) as { messages: ChatMsg[] };

        const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"; // official model id :contentReference[oaicite:3]{index=3}

        const aiRes = await env.AI.run(model, {
          messages,
          max_tokens: 256,
          temperature: 0.6,
        });

        const reply =
          (aiRes as any)?.response ??
          (aiRes as any)?.result?.response ??
          JSON.stringify(aiRes);

        // Save assistant message back into memory
        await stub.fetch("https://do/append", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ role: "assistant", content: reply }),
        });

        return Response.json({ sessionId: sid, reply });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown server error";
        return Response.json({ error: message }, { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  },
};

const HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>cf_ai_quickchat</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; max-width: 820px; }
    #log { border: 1px solid #ddd; padding: 12px; height: 420px; overflow: auto; border-radius: 10px; }
    .m { margin: 10px 0; }
    .u { font-weight: 700; }
    .a { font-weight: 700; }
    form { display: flex; gap: 10px; margin-top: 12px; }
    input { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid #ddd; }
    button { padding: 10px 14px; border-radius: 10px; border: 1px solid #ddd; cursor: pointer; }
    small { color: #666; }
  </style>
</head>
<body>
  <h1>cf_ai_quickchat</h1>
  <small>Chat + Workers AI (Llama 3.3) + Durable Objects memory</small>
  <div id="log"></div>

  <form id="f">
    <input id="t" placeholder="Ask something..." autocomplete="off" />
    <button>Send</button>
  </form>

<script>
  const log = document.getElementById('log');
  const f = document.getElementById('f');
  const t = document.getElementById('t');

  let sessionId = localStorage.getItem('sessionId') || '';

  function add(who, text) {
    const div = document.createElement('div');
    div.className = 'm';
    div.innerHTML = '<span class="' + (who === 'You' ? 'u' : 'a') + '">' + who + ':</span> ' + escapeHtml(text);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = t.value.trim();
    if (!msg) return;
    t.value = '';
    add('You', msg);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ sessionId, message: msg })
    });

    if (!res.ok) {
      const text = await res.text();
      add('AI', 'Server error. Check the console/logs for details.');
      console.error('API error:', res.status, text);
      return;
    }

    const data = await res.json();
    sessionId = data.sessionId;
    localStorage.setItem('sessionId', sessionId);
    add('AI', data.reply);
  });
</script>
</body>
</html>`;

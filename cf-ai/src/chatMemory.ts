export interface Env {}

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export class ChatMemory {
  state: DurableObjectState;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/chat") {
      const { message } = (await req.json()) as { message: string };

      const history = (await this.state.storage.get<ChatMsg[]>("messages")) ?? [
        {
          role: "system",
          content:
            "You are a helpful assistant. Keep answers concise and practical.",
        },
      ];

      history.push({ role: "user", content: message });

      // Keep only the last ~12 messages
      const trimmed = history.slice(-12);
      await this.state.storage.put("messages", trimmed);

      return Response.json({ messages: trimmed });
    }

    if (req.method === "POST" && url.pathname === "/append") {
      const msg = (await req.json()) as ChatMsg;
      const history = (await this.state.storage.get<ChatMsg[]>("messages")) ?? [];
      history.push(msg);
      await this.state.storage.put("messages", history.slice(-12));
      return new Response("ok");
    }

    return new Response("Not found", { status: 404 });
  }
}

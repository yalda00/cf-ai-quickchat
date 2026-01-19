type HistoryMsg = { role: "user" | "assistant"; content: string };
type ModelMsg = { role: "system" | "user" | "assistant"; content: string };

function isHistoryMsgArray(x: unknown): x is HistoryMsg[] {
  return (
    Array.isArray(x) &&
    x.every(
      (m) =>
        m &&
        typeof m === "object" &&
        ("role" in m) &&
        ("content" in m) &&
        (((m as any).role === "user") || ((m as any).role === "assistant")) &&
        typeof (m as any).content === "string"
    )
  );
}

export class ChatRoom {
  state: DurableObjectState;
  env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/reset" && req.method === "POST") {
      await this.state.storage.delete("history");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const { message } = (await req.json()) as { message: string };

    const raw = await this.state.storage.get("history");
    const history: HistoryMsg[] = isHistoryMsgArray(raw) ? raw : [];

    const messages: ModelMsg[] = [
      { role: "system", content: "Be concise and helpful." },
      ...history,
      { role: "user", content: message }
    ];

    const result = await this.env.AI.run(
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as any,
      { messages }
    );

    const reply: string =
      result?.response ??
      result?.result?.response ??
      result?.output_text ??
      "(no response)";

    const newHistory: HistoryMsg[] = [
      ...history,
      { role: "user" as const, content: message },
      { role: "assistant" as const, content: reply }
    ].slice(-20);

    await this.state.storage.put("history", newHistory);

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}

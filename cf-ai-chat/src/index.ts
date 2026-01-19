import { ChatRoom } from "./ChatRoom";

export { ChatRoom }; // <-- REQUIRED: export DO class from entrypoint

export interface Env {
  AI: any; // keep simple to avoid AiModels typing issues
  CHAT: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Send a chat message -> Durable Object (memory lives there)
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const id = env.CHAT.idFromName("default");
      const stub = env.CHAT.get(id);
      return stub.fetch("https://do/chat", request);
    }

    // Optional: clear memory
    if (url.pathname === "/api/reset" && request.method === "POST") {
      const id = env.CHAT.idFromName("default");
      const stub = env.CHAT.get(id);
      return stub.fetch("https://do/reset", { method: "POST" });
    }

    // Basic health page
    return new Response(
      "OK. POST /api/chat with JSON {\"message\":\"hi\"}.",
      { headers: { "Content-Type": "text/plain" } }
    );
  }
} satisfies ExportedHandler<Env>;

import { ChatRoom } from "./ChatRoom";
export { ChatRoom };

export interface Env {
  AI: any;
  CHAT: DurableObjectNamespace;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat" && request.method === "POST") {
      const id = env.CHAT.idFromName("default");
      const stub = env.CHAT.get(id);
      return stub.fetch("https://do/chat", request);
    }

    if (url.pathname === "/api/reset" && request.method === "POST") {
      const id = env.CHAT.idFromName("default");
      const stub = env.CHAT.get(id);
      return stub.fetch("https://do/reset", { method: "POST" });
    }

    return env.ASSETS.fetch(request);
  }
};

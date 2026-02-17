import http from "http";

const PORT = 3001;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch (e) { reject(e); }
    });
  });
}

function send(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  res.end(JSON.stringify(obj));
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Нет OPENAI_API_KEY. Добавь в .env и запусти так: OPENAI_API_KEY=... node server.js");
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    });
    return res.end();
  }

  if (req.url === "/chat" && req.method === "POST") {
    try {
      const body = await readJson(req);
      const { writerSystem, mode, message, history } = body;

      if (!writerSystem || !message) {
        return send(res, 400, { error: "writerSystem и message обязательны" });
      }

      const modeHint =
        mode === "short" ? "Отвечай кратко." :
        mode === "teacher" ? "Объясняй как учитель литературы." :
        mode === "novel" ? "Пиши как художественный диалог в романе." :
        "Обычный режим.";

      const safeHistory = Array.isArray(history) ? history.slice(-12) : [];

      const input = [
        { role: "system", content: writerSystem + "\n\n" + modeHint },
        ...safeHistory.map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: String(m.content || "")
        })),
        { role: "user", content: String(message) }
      ];

      const r = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          input,
        }),
      });

      if (!r.ok) {
        const t = await r.text();
        return send(res, 500, { error: t });
      }

      const data = await r.json();
      const text = data.output_text || "(пустой ответ)";

      return send(res, 200, { text });
    } catch (e) {
      return send(res, 500, { error: String(e?.message || e) });
    }
  }

  send(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});

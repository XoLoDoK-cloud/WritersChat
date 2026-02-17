// app.js
(() => {
  const LS_KEY = "lit_chat_v1";

  const el = {
    writersList: document.getElementById("writersList"),
    searchInput: document.getElementById("searchInput"),
    eraFilter: document.getElementById("eraFilter"),
    genreFilter: document.getElementById("genreFilter"),

    writerAvatar: document.getElementById("writerAvatar"),
    writerName: document.getElementById("writerName"),
    writerMeta: document.getElementById("writerMeta"),
    sessionId: document.getElementById("sessionId"),

    messages: document.getElementById("messages"),
    messageInput: document.getElementById("messageInput"),
    btnSend: document.getElementById("btnSend"),

    btnClearChat: document.getElementById("btnClearChat"),
    btnNewSession: document.getElementById("btnNewSession"),
    btnExport: document.getElementById("btnExport"),
    btnClearAll: document.getElementById("btnClearAll"),
  };

  const writers = (window.WRITERS || []).slice();

  const state = loadState();

  // ---------- init ----------
  populateFilters();
  renderWriters();
  ensureSelectedWriter();
  renderChatHeader();
  renderMessages();

  wireEvents();

  // ---------- state ----------
  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);

      // минимальная валидация
      if (!parsed || typeof parsed !== "object") return defaultState();
      if (!parsed.sessions) parsed.sessions = {};
      if (!parsed.ui) parsed.ui = {};

      return parsed;
    } catch {
      return defaultState();
    }
  }

  function defaultState() {
    return {
      ui: {
        selectedWriterId: writers[0]?.id || null,
        search: "",
        era: "",
        genre: "",
        mode: "normal"
      },
      sessions: {
        // writerId: { sessionId, messages: [{role, content, ts}] }
      }
    };
  }

  function saveState() {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }

  function getWriterById(id) {
    return writers.find(w => w.id === id) || null;
  }

  function getMode() {
    const checked = document.querySelector('input[name="mode"]:checked');
    return checked ? checked.value : "normal";
  }

  function ensureSelectedWriter() {
    if (!state.ui.selectedWriterId && writers[0]) state.ui.selectedWriterId = writers[0].id;
    if (state.ui.selectedWriterId && !getWriterById(state.ui.selectedWriterId)) {
      state.ui.selectedWriterId = writers[0]?.id || null;
    }
    saveState();
  }

  function getSession(writerId) {
    if (!state.sessions[writerId]) {
      state.sessions[writerId] = {
        sessionId: crypto.randomUUID(),
        messages: []
      };
      saveState();
    }
    return state.sessions[writerId];
  }

  // ---------- UI ----------
  function populateFilters() {
    const eras = uniq(writers.map(w => w.era).filter(Boolean)).sort();
    const genres = uniq(writers.map(w => w.genre).filter(Boolean)).sort();

    for (const era of eras) {
      const opt = document.createElement("option");
      opt.value = era;
      opt.textContent = `Эпоха: ${era}`;
      el.eraFilter.appendChild(opt);
    }

    for (const g of genres) {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = `Жанр: ${g}`;
      el.genreFilter.appendChild(opt);
    }

    // restore UI filters
    el.searchInput.value = state.ui.search || "";
    el.eraFilter.value = state.ui.era || "";
    el.genreFilter.value = state.ui.genre || "";

    // restore mode
    const mode = state.ui.mode || "normal";
    const radio = document.querySelector(`input[name="mode"][value="${mode}"]`);
    if (radio) radio.checked = true;
  }

  function renderWriters() {
    const q = (state.ui.search || "").trim().toLowerCase();
    const era = state.ui.era || "";
    const genre = state.ui.genre || "";

    const list = writers
      .filter(w => !era || w.era === era)
      .filter(w => !genre || w.genre === genre)
      .filter(w => {
        if (!q) return true;
        const text = `${w.name} ${w.era} ${w.genre}`.toLowerCase();
        return text.includes(q);
      });

    el.writersList.innerHTML = "";

    for (const w of list) {
      const card = document.createElement("div");
      card.className = "writer-card" + (w.id === state.ui.selectedWriterId ? " active" : "");
      card.dataset.id = w.id;

      card.innerHTML = `
        <div class="avatar">${escapeHtml(w.avatar || "📚")}</div>
        <div class="info">
          <div class="name">${escapeHtml(w.name)}</div>
          <div class="meta">${escapeHtml(w.era || "")} · ${escapeHtml(w.genre || "")}</div>
        </div>
      `;

      card.addEventListener("click", () => selectWriter(w.id));
      el.writersList.appendChild(card);
    }
  }

  function selectWriter(writerId) {
    state.ui.selectedWriterId = writerId;
    saveState();
    renderWriters();
    renderChatHeader();
    renderMessages();
  }

  function renderChatHeader() {
    const w = getWriterById(state.ui.selectedWriterId);
    if (!w) {
      el.writerAvatar.textContent = "📚";
      el.writerName.textContent = "Выбери писателя слева";
      el.writerMeta.textContent = "…";
      el.sessionId.textContent = "—";
      return;
    }

    const session = getSession(w.id);

    el.writerAvatar.textContent = w.avatar || "📚";
    el.writerName.textContent = w.name;
    el.writerMeta.textContent = `${w.era || ""}${w.era && w.genre ? " · " : ""}${w.genre || ""}`;
    el.sessionId.textContent = session.sessionId.slice(0, 8);
  }

  function renderMessages() {
    const w = getWriterById(state.ui.selectedWriterId);
    el.messages.innerHTML = "";

    if (!w) {
      el.messages.innerHTML = `<div class="msg ai"><div class="who">ИИ</div>Выбери писателя слева, чтобы начать диалог.</div>`;
      return;
    }

    const session = getSession(w.id);
    if (!session.messages.length) {
      el.messages.innerHTML = `<div class="msg ai"><div class="who">${escapeHtml(w.name)}</div>Здравствуй. О чём поговорим?</div>`;
      return;
    }

    for (const m of session.messages) {
      const msg = document.createElement("div");
      msg.className = "msg " + (m.role === "user" ? "user" : "ai");
      msg.innerHTML = `
        <div class="who">${escapeHtml(m.role === "user" ? "Ты" : w.name)}</div>
        <div>${escapeHtml(m.content)}</div>
      `;
      el.messages.appendChild(msg);
    }

    // автоскролл вниз
    el.messages.scrollTop = el.messages.scrollHeight;
  }

  // ---------- Chat logic ----------
  async function sendMessage() {
    const w = getWriterById(state.ui.selectedWriterId);
    const text = (el.messageInput.value || "").trim();
    if (!w || !text) return;

    const mode = getMode();
    state.ui.mode = mode;

    const session = getSession(w.id);
    session.messages.push({ role: "user", content: text, ts: Date.now() });
    saveState();

    el.messageInput.value = "";
    renderMessages();

    // disable send while "thinking"
    setSending(true);

    try {
      // Сейчас заглушка (чтобы UI был готов).
      // Потом заменим на реальный fetch к вашему серверу/ИИ, как в телеграм-боте.
      const reply = await getAssistantReplyStub(w, session, mode, text);

      session.messages.push({ role: "assistant", content: reply, ts: Date.now() });
      saveState();
      renderMessages();
    } catch (e) {
      session.messages.push({
        role: "assistant",
        content: "Ошибка: не удалось получить ответ. Проверь подключение/сервер.",
        ts: Date.now()
      });
      saveState();
      renderMessages();
    } finally {
      setSending(false);
    }
  }

  function setSending(sending) {
    el.btnSend.disabled = sending;
    el.messageInput.disabled = sending;
    el.btnSend.textContent = sending ? "..." : "Отправить";
  }

  // Заглушка ответа — в следующем шаге поменяем на реальный ИИ
  async function getAssistantReplyStub(writer, session, mode, lastUserText) {
    await sleep(350);

    const modeHint =
      mode === "short" ? "Ответь кратко." :
      mode === "teacher" ? "Объясняй как учитель литературы." :
      mode === "novel" ? "Пиши как художественный диалог в романе." :
      "Обычный режим.";

    // Небольшая имитация "стиля"
    const signature =
      writer.id === "pushkin" ? "— право, забавно…" :
      writer.id === "dostoevsky" ? "…и в этом есть тревога." :
      writer.id === "tolstoy" ? "…всё упирается в нравственный выбор." :
      writer.id === "chekhov" ? "…короче говоря." :
      "…";

    return `${modeHint}\n\nЯ услышал тебя: «${lastUserText}»\n${signature}\n\n(Пока это тестовый ответ. Следующим шагом подключим реальный ИИ как в вашем боте.)`;
  }

  // ---------- actions ----------
  function clearChat() {
    const w = getWriterById(state.ui.selectedWriterId);
    if (!w) return;
    const session = getSession(w.id);
    session.messages = [];
    saveState();
    renderMessages();
  }

  function newSession() {
    const w = getWriterById(state.ui.selectedWriterId);
    if (!w) return;
    state.sessions[w.id] = { sessionId: crypto.randomUUID(), messages: [] };
    saveState();
    renderChatHeader();
    renderMessages();
  }

  function clearAll() {
    localStorage.removeItem(LS_KEY);
    location.reload();
  }

  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      state
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lit_chat_export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- events ----------
  function wireEvents() {
    el.btnSend.addEventListener("click", sendMessage);
    el.messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    el.searchInput.addEventListener("input", () => {
      state.ui.search = el.searchInput.value;
      saveState();
      renderWriters();
    });

    el.eraFilter.addEventListener("change", () => {
      state.ui.era = el.eraFilter.value;
      saveState();
      renderWriters();
    });

    el.genreFilter.addEventListener("change", () => {
      state.ui.genre = el.genreFilter.value;
      saveState();
      renderWriters();
    });

    document.querySelectorAll('input[name="mode"]').forEach(r => {
      r.addEventListener("change", () => {
        state.ui.mode = getMode();
        saveState();
      });
    });

    el.btnClearChat.addEventListener("click", clearChat);
    el.btnNewSession.addEventListener("click", newSession);
    el.btnExport.addEventListener("click", exportData);
    el.btnClearAll.addEventListener("click", clearAll);
  }

  // ---------- helpers ----------
  function uniq(arr) { return [...new Set(arr)]; }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();

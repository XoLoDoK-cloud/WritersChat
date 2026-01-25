// Подсветка активной страницы + мелкие утилиты
(() => {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach(a => {
    if (a.getAttribute("href") === path) {
      a.classList.remove("btn-ghost");
      a.classList.add("btn");
    }
  });

  // Кнопка копировать email (если есть)
  const copyBtn = document.getElementById("copyEmailBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const email = copyBtn.dataset.email;
      try {
        await navigator.clipboard.writeText(email);
        showToast("Скопировано: " + email);
      } catch {
        showToast("Не удалось скопировать. Email: " + email);
      }
    });
  }

  function showToast(text){
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = text;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2200);
  }
})();

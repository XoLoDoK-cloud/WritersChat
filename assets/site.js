(() => {
  const burger = document.getElementById("burgerBtn");
  const nav = document.getElementById("nav");
  if (!burger || !nav) return;

  burger.addEventListener("click", () => nav.classList.toggle("open"));

  // закрыть меню при клике по ссылке
  nav.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => nav.classList.remove("open"));
  });

  // закрыть при клике вне меню
  document.addEventListener("click", (e) => {
    if (!nav.classList.contains("open")) return;
    if (nav.contains(e.target) || burger.contains(e.target)) return;
    nav.classList.remove("open");
  });
})();

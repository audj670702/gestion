// SCaD GESTIÓN · Inicio · v0.5.2
(() => {
  const splash = document.getElementById("appSplash");
  if (!splash) return;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  let ready = false, minimum = false, leaving = false;
  const remove = () => splash.remove();
  const leave = () => {
    if (leaving) return;
    leaving = true;
    clearTimeout(maxTimer);
    clearTimeout(minTimer);
    window.removeEventListener("gestion:ready", onReady);
    splash.classList.add("is-leaving");
    splash.addEventListener("transitionend", e => { if (e.target === splash) remove(); });
    setTimeout(remove, reduced ? 200 : 750);
  };
  const onReady = () => { ready = true; if (minimum) leave(); };
  window.addEventListener("gestion:ready", onReady);
  const minTimer = setTimeout(() => { minimum = true; if (ready) leave(); }, reduced ? 250 : 1200);
  // La entrada nunca bloquea el acceso aunque falle la red o el arranque.
  const maxTimer = setTimeout(leave, 2600);
  splash.querySelector("img").addEventListener("error", leave, { once: true });
})();

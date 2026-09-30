// Scroll-linked fade + parallax on each section's content. Scrolling itself
// stays native. On desktop, sections are sized to fill the screen (html.paged).
(() => {
  const root = document.documentElement;
  const topbar = document.querySelector(".topbar");
  const pages = [...document.querySelectorAll("main > section")];
  const pagedQuery = matchMedia("(min-width: 1000px) and (min-height: 600px) and (pointer: fine)");

  pages.forEach((p) => p.classList.add("page"));

  // Layout-based geometry: ignores the parallax transforms
  const navHeight = () => topbar.offsetHeight;
  const viewTop = (el) => el.offsetTop - window.scrollY;
  const viewBottom = (el) => viewTop(el) + el.offsetHeight;

  const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];

  // --p: 0 when the section sits in the viewport, +1 one screen below, -1 one screen above
  function updateEffects() {
    const nav = navHeight();
    const avail = window.innerHeight - nav;
    for (const el of pages) {
      const top = viewTop(el), bottom = viewBottom(el);
      let p = 0;
      if (top > nav) p = (top - nav) / avail;
      else if (bottom < window.innerHeight) p = -(window.innerHeight - bottom) / avail;
      p = Math.max(-1, Math.min(1, p));
      el.style.setProperty("--p", p.toFixed(4));
      el.style.setProperty("--o", Math.max(0, 1 - Math.abs(p) * 1.4).toFixed(3));
      // Underline the navbar link of the section on screen
      const link = el.id && navLinks.find((a) => a.getAttribute("href") === `#${el.id}`);
      if (link) link.classList.toggle("active", Math.abs(p) < 0.5);
    }
  }

  let queued = false;
  function queueEffects() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      updateEffects();
    });
  }

  function applyMode() {
    root.classList.toggle("paged", pagedQuery.matches);
    updateEffects();
  }

  window.addEventListener("scroll", queueEffects, { passive: true });
  window.addEventListener("resize", queueEffects);
  pagedQuery.addEventListener("change", applyMode);
  applyMode();
})();

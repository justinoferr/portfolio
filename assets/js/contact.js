// Contact form: GitHub Pages has no backend, so the form builds a mailto:
// link and hands the message to the visitor's own email client.
(() => {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const TO = "justino.f@outlook.com";
  const status = form.querySelector(".form-status");
  // form.name is the form's own name attribute, so go through form.elements
  const { name, email, subject, message } = form.elements;

  const t = (key) => {
    const dict = I18N[document.documentElement.lang] || I18N.en;
    return dict[key] || I18N.en[key];
  };

  form.addEventListener("input", (e) => e.target.classList.remove("invalid"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fields = [name, email, message];
    const bad = fields.filter((f) => !f.value.trim() || !f.checkValidity());
    fields.forEach((f) => f.classList.toggle("invalid", bad.includes(f)));
    if (bad.length) {
      status.textContent = t("form.invalid");
      bad[0].focus();
      return;
    }

    const topic = subject.selectedOptions[0].textContent.trim();
    const who = name.value.trim();
    const body = `${message.value.trim()}\n\n— ${who}\n${email.value.trim()}`;
    status.textContent = t("form.opening");
    window.location.href =
      `mailto:${TO}?subject=${encodeURIComponent(`[${topic}] ${who}`)}&body=${encodeURIComponent(body)}`;
  });
})();

const I18N = {
  en: {
    "form.title": "Send a message",
    "form.note": "I'll get back to you as soon as possible.",
    "form.name": "Name",
    "form.name.ph": "Your name",
    "form.email": "Email",
    "form.subject": "Subject",
    "form.subject.general": "General",
    "form.subject.pentest": "Pentest engagement",
    "form.subject.job": "Job opportunity",
    "form.subject.research": "Research / collaboration",
    "form.message": "Message",
    "form.message.ph": "Tell me about your project, opportunity or just say hi...",
    "form.send": "Send message",
    "form.invalid": "Fill in every field with a valid email.",
    "form.opening": "Opening your email app...",
    "nav.contact": "Contact",
    "hero.role": "Offensive Security Analyst",
    "hero.lead": "End-to-end penetration testing across applications, systems, networks, and infrastructure. Breaking things so they can be built stronger.",
    "hero.cta": "Get in touch",
    "cta.title": "Let's talk security.",
    "contact.lead": "Open to conversations about pentesting, red team and security research."
  },
  pt: {
    "form.title": "Envie uma mensagem",
    "form.note": "Respondo assim que possível.",
    "form.name": "Nome",
    "form.name.ph": "Seu nome",
    "form.email": "Email",
    "form.subject": "Assunto",
    "form.subject.general": "Geral",
    "form.subject.pentest": "Contratação de pentest",
    "form.subject.job": "Oportunidade de trabalho",
    "form.subject.research": "Pesquisa / colaboração",
    "form.message": "Mensagem",
    "form.message.ph": "Conte sobre seu projeto, oportunidade ou só diga oi...",
    "form.send": "Enviar mensagem",
    "form.invalid": "Preencha todos os campos com um email válido.",
    "form.opening": "Abrindo seu app de email...",
    "nav.contact": "Contato",
    "hero.role": "Analista de Segurança Ofensiva",
    "hero.lead": "Pentest de ponta a ponta em aplicações, sistemas, redes e infraestrutura. Quebrando as coisas para que sejam construídas mais fortes.",
    "hero.cta": "Entrar em contato",
    "cta.title": "Vamos falar de segurança.",
    "contact.lead": "Aberto a conversas sobre pentest, red team e pesquisa em segurança."
  },
  ja: {
    "form.title": "メッセージを送る",
    "form.note": "できるだけ早くご返信します。",
    "form.name": "お名前",
    "form.name.ph": "お名前",
    "form.email": "メール",
    "form.subject": "件名",
    "form.subject.general": "一般",
    "form.subject.pentest": "ペネトレーションテストのご依頼",
    "form.subject.job": "求人・採用",
    "form.subject.research": "研究・コラボレーション",
    "form.message": "メッセージ",
    "form.message.ph": "プロジェクトやお仕事のご相談、ちょっとしたご挨拶でもどうぞ…",
    "form.send": "送信する",
    "form.invalid": "すべての項目に正しいメールアドレスを入力してください。",
    "form.opening": "メールアプリを開いています…",
    "nav.contact": "連絡先",
    "hero.role": "オフェンシブセキュリティアナリスト",
    "hero.lead": "アプリケーション、システム、ネットワーク、インフラまで、エンドツーエンドのペネトレーションテスト。より強く作り直すために、壊す。",
    "hero.cta": "お問い合わせ",
    "cta.title": "セキュリティの話をしましょう。",
    "contact.lead": "ペネトレーションテスト、レッドチーム、セキュリティ研究についてお気軽にご連絡ください。"
  }
};

function setLang(lang) {
  const dict = I18N[lang] || I18N.en;
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const text = dict[el.dataset.i18n];
    if (text) el.textContent = text;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const text = dict[el.dataset.i18nPlaceholder];
    if (text) el.placeholder = text;
  });
  document.querySelector(".lang-current").textContent = lang.toUpperCase();
  document.querySelectorAll(".lang-menu button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
  try { localStorage.setItem("lang", lang); } catch (e) {}
}

const langToggle = document.querySelector(".lang-toggle");
const langMenu = document.querySelector(".lang-menu");

function setMenuOpen(open) {
  langMenu.hidden = !open;
  langToggle.setAttribute("aria-expanded", String(open));
}

langToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  setMenuOpen(langMenu.hidden);
});
document.addEventListener("click", () => setMenuOpen(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenuOpen(false);
});

function detectLang() {
  try {
    const saved = localStorage.getItem("lang");
    if (saved && I18N[saved]) return saved;
  } catch (e) {}
  const nav = (navigator.language || "en").slice(0, 2);
  return I18N[nav] ? nav : "en";
}

document.querySelectorAll(".lang-menu button").forEach((btn) => {
  btn.addEventListener("click", () => {
    setLang(btn.dataset.lang);
    setMenuOpen(false);
  });
});

setLang(detectLang());

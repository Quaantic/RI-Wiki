import { REDESIGN_TEST } from './redesign-test.js';
// ==== FEEDBACK (rota #/feedback) ====

import { html, esc, qs, qsa } from './utils.js';
import { icon } from './ui.js';

const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwMYl1sTsZIKio0tcpzxWyBO5x7v7PUlnXQAuasCJwFEXoKntLykba4-59JTqck2S27/exec';
const MIN_CHARS = 30;
const MAX_CHARS = 3500; // Matches the Discord embed description limit used by Apps Script.

const CATEGORIES = [
  {
    id: 'suggestion', name: 'Suggestion', icon: 'spark', color: '#F5D442',
    hint: 'Got an idea for the wiki? New pages, layouts, tools…',
    template: 'Got an idea? Tell us what would make the wiki better! (Ex: a calculator, a new section, more examples…)',
  },
  {
    id: 'bugs', name: 'Bugs', icon: 'alert', color: '#FF7A6E',
    hint: 'Something broken? Tell us what happened.',
    template: 'Found a bug? Let us know! (Ex: what happened, what you expected, the page where it happened…)',
  },
  {
    id: 'missinfo', name: 'Missinfo', icon: 'info', color: '#64D75B',
    hint: 'Wrong value, wrong name, wrong table? Point it out.',
    template: 'Spotted wrong info? Tell us the page and what is incorrect. (Ex: a cap, a formula, a drop rate…)',
  },
  {
    id: 'feedback', name: 'Feedback', icon: 'heart', color: '#6FC7FF',
    hint: 'How is the wiki treating you? Honest words help a lot.',
    template: 'How is the wiki treating you? Honest feedback helps a lot. (Ex: what you like, what to improve…)',
  },
];

export const feedbackView = {
  title: () => 'Feedback — RI Gaming Wiki',
  crumbs: () => [{ label: 'Main', href: '#/', icon: 'compass' }, { label: 'Feedback', icon: 'heart' }],
  nav: () => null,

  async render(root) {
    root.innerHTML = html`
      <div class="page-head fb-hero">
        <h1>Feedback</h1>
        <p class="fb-hero__sub">Help us make this wiki the best it can be — suggestions, bugs, wrong info or just your thoughts.</p>
      </div>

      <section class="section">
        <div class="section-head">
          <h2 class="section-title"><span class="hex-dot"></span>What is it about?</h2>
        </div>
        <div class="fb-cats">
          ${CATEGORIES.map((c) => `
            <button class="fb-cat" type="button" data-cat="${c.id}" style="--cat:${c.color}">
              <span class="fb-cat__icon">${icon(c.icon, 20)}</span>
              <span class="fb-cat__body"><b>${esc(c.name)}</b><small>${esc(c.hint)}</small></span>
            </button>`).join('')}
        </div>
      </section>

      <section class="section fb-form-wrap" data-form-wrap hidden>
        <div class="fb-form" style="--cat:${CATEGORIES[0].color}">
          <div class="fb-form__head">
            <span class="fb-form__icon">${icon(CATEGORIES[0].icon, 18)}</span>
            <b data-cat-name>${esc(CATEGORIES[0].name)}</b>
          </div>
          <label class="fb-form__label" for="fb-msg">Message <small>(${MIN_CHARS}–${MAX_CHARS} characters)</small></label>
          <textarea class="fb-form__msg" id="fb-msg" rows="7" maxlength="${MAX_CHARS}" data-msg placeholder="${esc(CATEGORIES[0].template)}"></textarea>
          <div class="fb-form__counter" data-counter aria-live="polite">0 / ${MAX_CHARS}</div>
          <label class="fb-form__label" for="fb-name">Your name <small>(optional)</small></label>
          <input class="fb-form__name" id="fb-name" type="text" maxlength="40" placeholder="Discord username…" data-name>
          <div class="fb-form__foot">
            <span class="fb-form__status" data-status role="status"></span>
            <button class="btn fb-send" type="button" data-send>${icon('arrow-right', 15)} Send</button>
          </div>
        </div>
      </section>
    `;

    let selected = null;
    const wrap = qs('[data-form-wrap]', root);
    const form = qs('.fb-form', root);
    const msg = qs('[data-msg]', root);
    const name = qs('[data-name]', root);
    const status = qs('[data-status]', root);
    const counter = qs('[data-counter]', root);
    const updateCounter = () => { counter.textContent = `${msg.value.length} / ${MAX_CHARS}`; };
    msg.addEventListener('input', updateCounter);
    const send = qs('[data-send]', root);
    const catName = qs('[data-cat-name]', root);
    const catIcon = qs('.fb-form__icon', root);

    qsa('[data-cat]', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        selected = CATEGORIES.find((c) => c.id === btn.dataset.cat);
        qsa('[data-cat]', root).forEach((b) => b.classList.toggle('active', b === btn));
        wrap.hidden = false;
        form.style.setProperty('--cat', selected.color);
        catName.textContent = selected.name;
        catIcon.innerHTML = icon(selected.icon, 18);
        msg.value = '';
        updateCounter();
        msg.placeholder = selected.template;
        status.textContent = '';
        status.className = 'fb-form__status';
        msg.focus();
      });
    });

    send.addEventListener('click', async () => {
      if (!selected) return;
      const text = msg.value.trim();
      if (text.length < MIN_CHARS) {
        status.textContent = `Write at least ${MIN_CHARS} characters describing it.`;
        status.className = 'fb-form__status is-error';
        return;
      }
      if (text.length > MAX_CHARS) {
        status.textContent = `Message must be ${MAX_CHARS} characters or less.`;
        status.className = 'fb-form__status is-error';
        return;
      }
      if (REDESIGN_TEST) {
        status.textContent = 'Test submission accepted. No message was sent.';
        status.className = 'fb-form__status is-ok';
        msg.value = '';
        updateCounter();
        return;
      }
      send.disabled = true;
      status.textContent = 'Sending…';
      status.className = 'fb-form__status';
      try {
        const res = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            category: selected.id,
            message: text,
            name: name.value.trim() || 'anonymous',
            page: window.location.hash || '#/feedback',
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          status.textContent = 'Feedback sent successfully! Thank you for helping the wiki grow.';
          status.className = 'fb-form__status is-ok';
          msg.value = '';
          updateCounter();
        } else {
          status.textContent = data?.error ? `Could not send: ${data.error}` : 'Failed to send feedback. Please try again.';
          status.className = 'fb-form__status is-error';
        }
      } catch {
        status.textContent = 'Failed to send feedback. Please try again.';
        status.className = 'fb-form__status is-error';
      }
      send.disabled = false;
    });

  },
};

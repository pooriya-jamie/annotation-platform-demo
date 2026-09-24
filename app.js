/*
 * Annotation Platform demo — application core
 *
 * State, hash router, event delegation, dialogs, toasts and the animation
 * sequencer. The two view files register themselves in App.views.
 */
window.App = (function () {
  'use strict';
  const E = window.DemoEngine;
  const D = window.DEMO_DATA;

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */

  const clone = (v) => JSON.parse(JSON.stringify(v));

  function initialState() {
    const rng = E.mulberry32(E.fnv1a('annotation-demo-2026-09-23-f'));
    const seed = D.generateAnnotations(rng);
    const training = {};
    Object.keys(D.TOPICS).forEach((t) => {
      training[t] = { phase: 'required', tutorialIndex: 0, quizIndex: 0, quizAnswers: {}, matched: null, covered: {} };
    });
    return {
      today: D.TODAY,
      route: { view: 'annotator', sub: null },
      motion: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      users: clone(D.USERS),
      tasks: clone(D.TASKS),
      datasets: clone(D.DATASETS),
      formVersions: clone(D.FORM_VERSIONS),
      itemSplits: seed.itemSplits,
      annotations: seed.annotations,
      annotator: {
        user: 'u-demo',
        step: 'login',
        consentChecks: [false, false, false, false],
        consentAt: null,
        training,
        trainingTopic: null,
        safety: { status: 'orientation_required', ack: false, acknowledgedAt: null },
        taskId: null,
        itemId: null,
        filter: 'all',
        draft: {},
        draftStatus: 'annotated',
        overlays: { support: false, break: false, cover: null },
        preferNotToView: [],
        removedItems: {},
        withdrawn: false,
      },
      manager: {
        screen: 'progress',
        navOpen: false,
        actingAs: 'u-mgr',
        upload: { file: null, preview: null, progress: 0, done: false, topic: 'MentalHealth', name: 'MH search pilot · October' },
        selectedTaskId: 't-can-b',
        overlap: 2,
        selectedAssignees: null,
        progressTaskId: 't-can-b',
        lab: { flips: {}, thirdReview: 'not_started', thirdLabels: {}, majority: null },
        exports: { taskId: 'all', topic: 'all', annotatorId: 'all', format: 'csv' },
        forms: { topic: 'Immigration', versionId: 'imm-v3' },
        training: { topic: 'MentalHealth' },
      },
      audit: [],
    };
  }

  const S = initialState();

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function icon(name, extra) {
    return '<svg class="ico ' + (extra || '') + '" aria-hidden="true"><use href="#icon-' + name + '"></use></svg>';
  }

  const TONES = {
    positive: ['active', 'acknowledged', 'published', 'complete', 'completed', 'annotated', 'majority', 'ready', 'agree', 'enabled'],
    warning: ['paused', 'draft', 'orientation_required', 'orientation required', 'skipped', 'needs_review', 'needs review', 'pending', 'no_majority', 'prefer_not_to_view', 'training required', 'safety orientation required', 'in review', 'disagree', 'not started'],
    danger: ['archived', 'inactive', 'withdrawn', 'rejected'],
  };

  function tone(value) {
    const v = String(value || '').toLowerCase();
    if (TONES.positive.includes(v)) return '';
    if (TONES.warning.includes(v)) return 'paused';
    if (TONES.danger.includes(v)) return 'archived';
    return 'neutral';
  }

  function chip(value, extra) {
    const label = String(value || '').replace(/_/g, ' ');
    return '<span class="status-chip ' + tone(value) + ' ' + (extra || '') + '">' + esc(label.charAt(0).toUpperCase() + label.slice(1)) + '</span>';
  }

  function rolePill(role) {
    const label = role === 'admin' ? 'Super Admin' : role === 'manager' ? 'Study Manager' : 'Annotator';
    return '<span class="role-pill role-' + esc(role) + '">' + label + '</span>';
  }

  function topicPill(topic) {
    const t = D.TOPICS[topic];
    return '<span class="pill" data-topic="' + esc(topic) + '">' + esc(t ? t.label : topic) + '</span>';
  }

  function user(id) {
    return S.users.find((u) => u.id === id) || null;
  }

  function userName(id) {
    const u = user(id);
    return u ? u.name : id;
  }

  function task(id) {
    return S.tasks.find((t) => t.id === id) || null;
  }

  function form(topic) {
    return D.FORMS[topic];
  }

  function taskItemIds(taskId, userId) {
    const t = task(taskId);
    if (!t) return [];
    const split = S.itemSplits[taskId];
    let ids;
    if (userId && split && split[userId]) ids = split[userId].slice();
    else if (split && !userId) ids = Array.from(new Set(Object.values(split).flat()));
    else ids = D.ITEMS.filter((i) => i.topic === t.topic).map((i) => i.id);
    const removed = S.annotator.removedItems[taskId] || [];
    if (userId === 'u-demo') ids = ids.filter((id) => !removed.includes(id));
    return ids;
  }

  function taskItems(taskId, userId) {
    return taskItemIds(taskId, userId).map((id) => D.itemById(id)).filter(Boolean);
  }

  function annotationFor(taskId, itemId, userId) {
    return S.annotations.find((a) => a.taskId === taskId && a.itemId === itemId && a.annotatorId === userId) || null;
  }

  function saveAnnotation(rec) {
    const existing = annotationFor(rec.taskId, rec.itemId, rec.annotatorId);
    const stamped = Object.assign({ id: 'a-' + rec.taskId + '-' + rec.annotatorId + '-' + rec.itemId, annotatedAt: nowIso(), isNew: true, skipReason: null }, rec);
    if (existing) Object.assign(existing, stamped);
    else S.annotations.push(stamped);
    return existing || stamped;
  }

  function taskCounts(taskId, userId) {
    const ids = taskItemIds(taskId, userId);
    const out = { total: ids.length, annotated: 0, skipped: 0, needsReview: 0, preferNotToView: 0, unannotated: 0 };
    ids.forEach((itemId) => {
      const a = annotationFor(taskId, itemId, userId);
      if (!a) out.unannotated += 1;
      else if (a.status === 'annotated') out.annotated += 1;
      else if (a.status === 'needs_review') out.needsReview += 1;
      else if (a.skipReason === 'prefer_not_to_view') out.preferNotToView += 1;
      else out.skipped += 1;
    });
    out.done = out.total - out.unannotated;
    return out;
  }

  function addAudit(action, actor, summary) {
    S.audit.unshift({ at: nowIso(), action, actor, summary });
  }

  function nowIso() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  /* ------------------------------------------------------------------ */
  /* Router                                                              */
  /* ------------------------------------------------------------------ */

  const VIEWS = ['annotator', 'manager'];
  const TITLES = { annotator: 'Annotator', manager: 'Study manager' };

  function parseHash() {
    const raw = (location.hash || '#annotator').replace(/^#/, '');
    const parts = raw.split('/');
    const view = VIEWS.includes(parts[0]) ? parts[0] : 'annotator';
    return { view, sub: parts.length > 1 ? parts.slice(1).join('/') : null };
  }

  function navigate(hash) {
    const target = hash.startsWith('#') ? hash : '#' + hash;
    if (location.hash === target) {
      render();
      return;
    }
    location.hash = target;
  }

  function syncHash(view, sub) {
    const target = '#' + view + (sub ? '/' + sub : '');
    if (location.hash !== target) history.replaceState(null, '', target);
  }

  let firstRoute = true;

  function onRoute(opts) {
    opts = opts || {};
    const previous = S.route.view;
    S.route = parseHash();
    VIEWS.forEach((name) => {
      document.getElementById('view-' + name).hidden = name !== S.route.view;
    });
    document.querySelectorAll('.tour-link').forEach((link) => {
      if (link.dataset.view === S.route.view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = 'Annotation Platform demo · ' + TITLES[S.route.view];
    render();
    if (!firstRoute && previous !== S.route.view && opts.focus !== false) {
      const heading = document.querySelector('#view-' + S.route.view + ' h1');
      if (heading) heading.focus({ preventScroll: false });
      window.scrollTo({ top: 0, behavior: S.motion ? 'smooth' : 'auto' });
    }
    firstRoute = false;
  }

  const views = {};

  function render() {
    const view = views[S.route.view];
    if (view && typeof view.render === 'function') view.render(S.route.sub);
  }

  function refresh(name) {
    if (S.route.view === name && views[name]) views[name].render(S.route.sub);
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */

  const actions = {};
  const changes = {};
  const inputs = {};

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.action];
    if (!fn) return;
    if (el.tagName === 'A') event.preventDefault();
    fn(el, event);
  });

  document.addEventListener('change', (event) => {
    const el = event.target.closest('[data-change]');
    if (!el) return;
    const fn = changes[el.dataset.change];
    if (fn) fn(el, event);
  });

  document.addEventListener('input', (event) => {
    const el = event.target.closest('[data-input]');
    if (!el) return;
    const fn = inputs[el.dataset.input];
    if (fn) fn(el, event);
  });

  actions['nav'] = (el) => navigate(el.dataset.to);
  actions['reset-demo'] = () => {
    history.replaceState(null, '', '#annotator');
    location.reload();
  };

  /* ------------------------------------------------------------------ */
  /* Dialog                                                              */
  /* ------------------------------------------------------------------ */

  function dialog(options) {
    const dlg = document.getElementById('dlg');
    const title = document.getElementById('dlg-title');
    const body = document.getElementById('dlg-body');
    const actionsEl = document.getElementById('dlg-actions');
    const formEl = document.getElementById('dlg-form');
    const opener = document.activeElement;
    title.textContent = options.title || '';
    let html = options.body || '';
    (options.fields || []).forEach((field, index) => {
      const id = 'dlg-field-' + index;
      html += '<div class="dialog-field">';
      if (field.type === 'checkbox') {
        html += '<label class="check-row"><input type="checkbox" name="' + esc(field.name) + '" ' + (field.checked ? 'checked' : '') + ' /><span>' + esc(field.label) + '</span></label>';
      } else if (field.type === 'select') {
        html += '<label class="field-label" for="' + id + '">' + esc(field.label) + '</label><select class="select-input" id="' + id + '" name="' + esc(field.name) + '">' + field.options.map((o) => '<option value="' + esc(o.value) + '"' + (o.selected ? ' selected' : '') + (o.disabled ? ' disabled' : '') + '>' + esc(o.label) + '</option>').join('') + '</select>';
      } else {
        html += '<label class="field-label" for="' + id + '">' + esc(field.label) + '</label>';
        if (field.type === 'textarea') html += '<textarea class="text-input" id="' + id + '" name="' + esc(field.name) + '" rows="3" placeholder="' + esc(field.placeholder || '') + '" ' + (field.required ? 'required' : '') + '></textarea>';
        else html += '<input class="text-input" id="' + id + '" type="' + esc(field.type || 'text') + '" name="' + esc(field.name) + '" placeholder="' + esc(field.placeholder || '') + '" value="' + esc(field.value || '') + '" ' + (field.required ? 'required' : '') + ' autocomplete="off" />';
        if (field.hint) html += '<div class="xs muted" style="margin-top:0.25rem">' + esc(field.hint) + '</div>';
      }
      html += '</div>';
    });
    body.innerHTML = html;
    actionsEl.innerHTML =
      (options.cancelLabel === null ? '' : '<button type="button" class="btn btn-secondary" data-dlg="cancel">' + esc(options.cancelLabel || 'Cancel') + '</button>') +
      '<button type="submit" class="btn ' + (options.danger ? 'btn-danger' : 'btn-primary') + '" data-dlg="confirm">' + esc(options.confirmLabel || 'Confirm') + '</button>';
    return new Promise((resolve) => {
      let settled = false;
      const cancelBtn = actionsEl.querySelector('[data-dlg=cancel]');
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        const values = {};
        new FormData(formEl).forEach((v, k) => {
          values[k] = v;
        });
        formEl.querySelectorAll('input[type=checkbox]').forEach((cb) => {
          values[cb.name] = cb.checked;
        });
        dlg.removeEventListener('close', onClose);
        formEl.removeEventListener('submit', onSubmit);
        if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
        if (dlg.open) dlg.close();
        if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
        setTimeout(() => resolve({ ok, values }), 0);
      };
      const onSubmit = (event) => {
        event.preventDefault();
        if (!formEl.checkValidity()) {
          formEl.reportValidity();
          return;
        }
        finish(true);
      };
      const onCancel = () => finish(false);
      const onClose = () => {
        if (dlg.open) return;
        finish(false);
      };
      formEl.addEventListener('submit', onSubmit);
      if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
      dlg.addEventListener('close', onClose);
      dlg.showModal();
      const first = body.querySelector('input:not([type=checkbox]), textarea, select');
      if (first) first.focus();
      else actionsEl.querySelector('[data-dlg=confirm]').focus();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Toast                                                               */
  /* ------------------------------------------------------------------ */

  let toastTimer = null;
  let toastHandler = null;

  function toast(text, options) {
    options = options || {};
    const el = document.getElementById('toast');
    const textEl = document.getElementById('toast-text');
    const actionEl = document.getElementById('toast-action');
    textEl.textContent = text;
    if (toastHandler) actionEl.removeEventListener('click', toastHandler);
    if (options.actionLabel) {
      actionEl.hidden = false;
      actionEl.textContent = options.actionLabel;
      toastHandler = () => {
        hideToast();
        options.onAction();
      };
      actionEl.addEventListener('click', toastHandler);
    } else {
      actionEl.hidden = true;
      toastHandler = null;
    }
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, options.duration || 4500);
  }

  function hideToast() {
    document.getElementById('toast').classList.remove('is-visible');
  }

  /* ------------------------------------------------------------------ */
  /* Animation                                                           */
  /* ------------------------------------------------------------------ */

  function sequence(steps, onDone) {
    let index = 0;
    let timer = null;
    let cancelled = false;
    const next = () => {
      if (cancelled) return;
      if (index >= steps.length) {
        if (onDone) onDone();
        return;
      }
      const step = steps[index++];
      timer = setTimeout(() => {
        if (cancelled) return;
        step.run();
        next();
      }, S.motion ? step.delay : 0);
    };
    next();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }

  function animateNumber(el, from, to, ms, format) {
    if (!el) return;
    format = format || ((n) => String(n));
    if (!S.motion || ms <= 0) {
      el.textContent = format(to);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  function boot() {
    window.addEventListener('hashchange', () => onRoute({ focus: true }));
    onRoute({ focus: false });
    window.addEventListener('beforeprint', () => {
      document.querySelectorAll('details').forEach((d) => {
        d.open = true;
      });
    });
  }

  document.addEventListener('DOMContentLoaded', boot);

  return {
    E,
    D,
    S,
    esc,
    icon,
    chip,
    rolePill,
    topicPill,
    tone,
    views,
    render,
    refresh,
    navigate,
    syncHash,
    actions,
    changes,
    inputs,
    dialog,
    toast,
    hideToast,
    sequence,
    animateNumber,
    user,
    userName,
    task,
    form,
    taskItemIds,
    taskItems,
    annotationFor,
    saveAnnotation,
    taskCounts,
    addAudit,
    nowIso,
  };
})();

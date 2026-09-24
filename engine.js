/*
 * Annotation Platform demo — engine
 *
 * Dependency-free ports of the platform's own logic so the demo behaves like
 * the product rather than a mock-up:
 *  - inter-annotator agreement (percent agreement, pairwise Cohen's kappa,
 *    disagreement list) as in backend/app/routers/admin.py task_agreement()
 *  - form evaluation (conditions, required fields, constraints) as in
 *    backend/app/annotation_schemas.py validate_answers()
 *  - item splitting with overlap as in the /distribute endpoint
 *  - keyboard shortcut mapping used by the annotator workspace
 */
window.DemoEngine = (function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Deterministic randomness                                            */
  /* ------------------------------------------------------------------ */

  function fnv1a(value) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function next() {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length)];
  }

  function shuffle(rng, list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Assignment: split items so each is held by exactly `overlap` people */
  /* ------------------------------------------------------------------ */

  function splitItems(itemIds, annotatorIds, overlap) {
    const out = {};
    annotatorIds.forEach((id) => {
      out[id] = [];
    });
    if (!annotatorIds.length) return out;
    const k = Math.max(1, Math.min(overlap, annotatorIds.length));
    itemIds.forEach((itemId, index) => {
      for (let j = 0; j < k; j += 1) {
        out[annotatorIds[(index + j) % annotatorIds.length]].push(itemId);
      }
    });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Agreement — mirrors task_agreement() in routers/admin.py            */
  /* ------------------------------------------------------------------ */

  /**
   * annotations: [{ itemId, annotatorId, status, answers }]
   * field: the form's agreement field id. Skipped (incl. prefer-not-to-view)
   * annotations and empty answers are excluded, exactly as the server does.
   */
  function agreementReport(annotations, field) {
    const byItem = new Map();
    const users = new Set();
    for (const ann of annotations) {
      if (ann.status === 'skipped') continue;
      const value = ann.answers ? ann.answers[field] : undefined;
      if (value === undefined || value === null || value === '') continue;
      if (!byItem.has(ann.itemId)) byItem.set(ann.itemId, new Map());
      byItem.get(ann.itemId).set(ann.annotatorId, value);
      users.add(ann.annotatorId);
    }
    const multi = new Map();
    byItem.forEach((rows, itemId) => {
      if (rows.size >= 2) multi.set(itemId, rows);
    });
    const userIds = Array.from(users).sort();
    const pairwise = [];
    for (let i = 0; i < userIds.length; i += 1) {
      for (let j = i + 1; j < userIds.length; j += 1) {
        const a = userIds[i];
        const b = userIds[j];
        const shared = [];
        multi.forEach((rows) => {
          if (rows.has(a) && rows.has(b)) shared.push([rows.get(a), rows.get(b)]);
        });
        if (!shared.length) continue;
        pairwise.push(Object.assign({ a, b }, pairKappa(shared)));
      }
    }
    const disagreements = [];
    let fullAgreement = 0;
    multi.forEach((rows, itemId) => {
      const labels = new Set(rows.values());
      if (labels.size === 1) fullAgreement += 1;
      else disagreements.push({ itemId, labels: Object.fromEntries(rows) });
    });
    return {
      field,
      itemsWithMultiple: multi.size,
      fullAgreement,
      percent: multi.size ? fullAgreement / multi.size : null,
      pairwise,
      disagreements,
    };
  }

  /** Percent agreement and Cohen's kappa for one pair of label lists. */
  function pairKappa(shared) {
    const n = shared.length;
    let agree = 0;
    const distA = new Map();
    const distB = new Map();
    for (const [x, y] of shared) {
      if (x === y) agree += 1;
      distA.set(x, (distA.get(x) || 0) + 1 / n);
      distB.set(y, (distB.get(y) || 0) + 1 / n);
    }
    const po = agree / n;
    let pe = 0;
    distA.forEach((p, label) => {
      pe += p * (distB.get(label) || 0);
    });
    const kappa = Math.abs(1 - pe) < 1e-9 ? null : (po - pe) / (1 - pe);
    return { shared: n, agree, po, pe, kappa };
  }

  function kappaBand(k) {
    if (k === null || k === undefined || Number.isNaN(k)) return 'not defined';
    if (k < 0) return 'worse than chance';
    if (k < 0.2) return 'slight agreement';
    if (k < 0.4) return 'fair agreement';
    if (k < 0.6) return 'moderate agreement';
    if (k < 0.8) return 'substantial agreement';
    return 'almost perfect agreement';
  }

  function majorityVote(labels) {
    const counts = {};
    labels.forEach((label) => {
      if (label === undefined || label === null || label === '') return;
      counts[label] = (counts[label] || 0) + 1;
    });
    let best = null;
    let bestCount = 0;
    let tie = false;
    Object.keys(counts).forEach((label) => {
      if (counts[label] > bestCount) {
        best = label;
        bestCount = counts[label];
        tie = false;
      } else if (counts[label] === bestCount) {
        tie = true;
      }
    });
    return { label: tie ? null : best, counts, status: tie || best === null ? 'no_majority' : 'majority' };
  }

  /* ------------------------------------------------------------------ */
  /* Form evaluation — mirrors validate_answers() in annotation_schemas  */
  /* ------------------------------------------------------------------ */

  const ANSWER_TYPES = new Set(['single_choice', 'multi_choice', 'boolean', 'nullable_boolean', 'tri_state', 'short_text', 'long_text', 'number', 'range', 'tags', 'repeatable_text']);

  function formFields(schema) {
    const out = [];
    schema.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (ANSWER_TYPES.has(field.type)) out.push(field);
      });
    });
    return out;
  }

  function fieldById(schema, id) {
    return formFields(schema).find((f) => f.id === id) || null;
  }

  function fieldLabel(schema, id) {
    const f = fieldById(schema, id);
    return f ? f.label : id;
  }

  function isEmpty(value) {
    return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  }

  function valueMatches(actual, expected, operator) {
    const matched = Array.isArray(actual) ? actual.includes(expected) : actual === expected;
    return operator === 'neq' ? !matched : matched;
  }

  function conditionMatches(rule, answers) {
    const actual = answers[rule.field];
    switch (rule.operator) {
      case 'eq':
        return valueMatches(actual, rule.value, 'eq');
      case 'neq':
        return valueMatches(actual, rule.value, 'neq');
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(actual);
      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(actual);
      case 'contains':
        return Array.isArray(actual) && actual.includes(rule.value);
      case 'is_empty':
        return isEmpty(actual);
      default:
        return !isEmpty(actual);
    }
  }

  /** → { visible, required, disabled, clearWhenHidden } */
  function fieldState(field, answers) {
    const c = field.conditions;
    if (!c) return { visible: true, required: false, disabled: false, clearWhenHidden: true };
    const matches = c.rules.map((rule) => conditionMatches(rule, answers));
    const triggered = c.mode === 'any' ? matches.some(Boolean) : matches.every(Boolean);
    const effects = Object.assign({ show: true, require: false, disable: false, clear_when_hidden: true }, c.effects || {});
    if (!triggered) return { visible: !effects.show, required: false, disabled: false, clearWhenHidden: effects.clear_when_hidden };
    return { visible: effects.show, required: effects.require, disabled: effects.disable, clearWhenHidden: effects.clear_when_hidden };
  }

  function dependencyOrder(fields) {
    const byId = new Map(fields.map((f) => [f.id, f]));
    const ordered = [];
    const visited = new Set();
    const visit = (id) => {
      if (visited.has(id)) return;
      visited.add(id);
      const f = byId.get(id);
      if (f && f.conditions) f.conditions.rules.forEach((rule) => byId.has(rule.field) && visit(rule.field));
      ordered.push(id);
    };
    fields.forEach((f) => visit(f.id));
    return ordered.map((id) => byId.get(id));
  }

  function textPresent(schema, field, value) {
    if ((field.type === 'short_text' || field.type === 'long_text') && typeof value === 'string' && schema.strictText) {
      return value.trim().length > 0;
    }
    return !isEmpty(value);
  }

  /**
   * Evaluate answers against a form. Returns which fields are visible and
   * required right now, which required ones are missing, any constraint
   * messages, and the canonical answer object the server would store.
   */
  function evaluateForm(schema, answers, status) {
    const fields = formFields(schema);
    const canonical = Object.assign({}, answers);
    const enforceRequired = status !== 'skipped';
    if (enforceRequired) {
      fields.forEach((f) => {
        if (canonical[f.id] === undefined && f.default !== undefined && f.default !== null) canonical[f.id] = f.default;
      });
    }
    const visible = new Set();
    const required = new Set();
    const missing = [];
    for (const field of dependencyOrder(fields)) {
      const state = fieldState(field, canonical);
      if (!state.visible || state.disabled) {
        if (state.clearWhenHidden) delete canonical[field.id];
        else if (isEmpty(canonical[field.id])) delete canonical[field.id];
        continue;
      }
      visible.add(field.id);
      const isRequired = Boolean(field.required || state.required);
      if (isRequired) required.add(field.id);
      const present = textPresent(schema, field, canonical[field.id]);
      if (enforceRequired && isRequired && !present) missing.push({ id: field.id, label: field.label });
      if (!present) delete canonical[field.id];
      else if (field.type === 'multi_choice' && field.min_items && enforceRequired && canonical[field.id].length < field.min_items && !missing.some((m) => m.id === field.id)) {
        missing.push({ id: field.id, label: field.label });
      }
    }
    const errors = enforceRequired ? constraintErrors(schema.constraints || [], canonical) : [];
    return { visible, required, missing, errors, canonical };
  }

  function constraintErrors(constraints, answers) {
    const errors = [];
    for (const c of constraints) {
      const message = c.message || 'Annotation answers violate a form constraint.';
      let violated = false;
      if (c.type === 'exclusive_option') {
        const values = answers[c.field] || [];
        violated = Array.isArray(values) && values.includes(c.option) && values.length > 1;
      } else if (c.type === 'max_selections') {
        const values = answers[c.field] || [];
        violated = Array.isArray(values) && values.length > (c.max_selections || 0);
      } else if (c.type === 'mutually_exclusive_fields') {
        violated = c.fields.filter((f) => !isEmpty(answers[f])).length > 1;
      } else if (c.type === 'different_values') {
        const values = c.fields.map((f) => answers[f]).filter((v) => !isEmpty(v));
        const flat = values.flatMap((v) => (Array.isArray(v) ? v : [v]));
        violated = flat.length !== new Set(flat).size;
      } else if (c.type === 'requires') {
        violated = valueMatches(answers[c.when_field], c.when_value, c.when_operator) && isEmpty(answers[c.required_field]);
      } else if (c.type === 'forbidden_option') {
        const v = answers[c.field];
        violated = v === c.option || (Array.isArray(v) && v.includes(c.option));
      } else if (c.type === 'allowed_values_when') {
        if (valueMatches(answers[c.when_field], c.when_value, c.when_operator)) {
          const actual = answers[c.field];
          if (!isEmpty(actual)) {
            const values = Array.isArray(actual) ? actual : [actual];
            violated = values.some((v) => !c.allowed_values.includes(v));
          }
        }
      } else if (c.type === 'empty_when') {
        violated = valueMatches(answers[c.when_field], c.when_value, c.when_operator) && !isEmpty(answers[c.field]);
      }
      if (violated) errors.push(message);
    }
    return errors;
  }

  /* ------------------------------------------------------------------ */
  /* Keyboard shortcuts — as in the annotator workspace                  */
  /* ------------------------------------------------------------------ */

  function keyAction(event) {
    const target = event.target;
    const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || (target && target.isContentEditable)) return null;
    if (event.metaKey || event.ctrlKey || event.altKey) return null;
    const key = event.key;
    if (key === 'ArrowDown' || key === 'j') return 'next';
    if (key === 'ArrowUp' || key === 'k') return 'prev';
    if (key === 's') return 'save';
    if (key === 'x') return 'skip';
    if (key === 'Escape') return 'escape';
    if (/^[1-9]$/.test(key)) return { label: Number(key) };
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Formatting                                                          */
  /* ------------------------------------------------------------------ */

  const nf = new Intl.NumberFormat('en-US');
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatNumber(n) {
    return nf.format(n);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return formatDate(iso) + ' ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ' UTC';
  }

  function pct(x) {
    return x === null || x === undefined ? '—' : Math.round(x * 100) + '%';
  }

  function kappaText(k) {
    return k === null || k === undefined ? '—' : (Math.round(k * 100) / 100).toFixed(2);
  }

  function titleCase(id) {
    return String(id).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  }

  /* Self-checks at boot. */
  (function selfCheck() {
    const k = pairKappa([['y', 'y'], ['y', 'y'], ['y', 'y'], ['y', 'y'], ['n', 'n'], ['n', 'n'], ['n', 'n'], ['n', 'n'], ['y', 'n'], ['n', 'y']]);
    console.assert(Math.abs(k.po - 0.8) < 1e-9 && Math.abs(k.pe - 0.5) < 1e-9 && Math.abs(k.kappa - 0.6) < 1e-9, 'kappa self-check failed', k);
    const split = splitItems([1, 2, 3, 4], ['a', 'b', 'c'], 2);
    console.assert(split.a.length + split.b.length + split.c.length === 8, 'split self-check failed', split);
  })();

  return {
    fnv1a,
    mulberry32,
    pick,
    shuffle,
    splitItems,
    agreementReport,
    pairKappa,
    kappaBand,
    majorityVote,
    formFields,
    fieldById,
    fieldLabel,
    evaluateForm,
    fieldState,
    isEmpty,
    keyAction,
    formatNumber,
    formatDate,
    formatDateTime,
    pct,
    kappaText,
    titleCase,
  };
})();

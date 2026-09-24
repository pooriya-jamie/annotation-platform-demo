/*
 * Annotation Platform demo — Study manager view
 *
 * Upload → Datasets → Tasks → Progress (agreement + cancer agreement lab) →
 * Accounts → Training & Gold → Topics & Forms → Exports. The numbers are
 * computed from the same synthetic labels the annotator section writes to.
 */
(function () {
  'use strict';
  const App = window.App;
  const { E, D, S, esc, icon, chip, rolePill, topicPill } = App;
  const M = S.manager;

  const NAV = [
    ['upload', 'Upload', 'upload'],
    ['datasets', 'Datasets', 'database'],
    ['tasks', 'Tasks', 'list'],
    ['progress', 'Progress', 'chart'],
    ['accounts', 'Accounts', 'users'],
    ['training', 'Training & Gold', 'graduation'],
    ['forms', 'Topics & Forms', 'layers'],
    ['exports', 'Exports', 'download'],
  ];

  const HEAD = {
    upload: ['Upload a dataset', 'Drop a media bundle and its manifest. The platform checks every row before anything is stored.'],
    datasets: ['Datasets', 'Every uploaded bundle, with what was matched and what the items are used for.'],
    tasks: ['Tasks', 'Create tasks from a dataset, choose who works on them, and split the items so each post is seen by more than one person.'],
    progress: ['Progress and agreement', 'How far each annotator is, which items need a second look, and how often people agree.'],
    accounts: ['Accounts', 'Annotators are created by staff. Nobody signs up on their own.'],
    training: ['Training & Gold', 'The worked examples and practice items each annotator sees before a topic unlocks.'],
    forms: ['Topics & Forms', 'The codebook each topic uses. A form version is frozen once published; edits become a new version.'],
    exports: ['Exports', 'Download labels for analysis. Prefer-not-to-view items are never included.'],
  };

  const NOTES = {
    upload: 'backend/app/routers/admin.py upload_dataset (dry_run=true, then commit) · manifest matching in backend/app/ingest.py',
    datasets: 'Dataset and Item models in backend/app/models.py · purpose = annotation | training',
    tasks: 'POST /api/admin/tasks · assignment_mode topic_pool | explicit | item_split · distribute_items() in backend/app/routers/admin.py',
    progress: 'backend/app/progress.py · task_agreement() in backend/app/routers/admin.py (pairwise percent agreement and Cohen\'s κ, skipped excluded)',
    accounts: 'POST /api/admin/users · one-time password returned once · role checks in backend/app/security.py require_admin / require_manager',
    training: 'TrainingModule + TrainingExample models · backend/app/training_service.py (exactly 5 tutorial + 5 practice)',
    forms: 'FormVersion model · frontend/src/TopicFormsAdmin.tsx · backend/app/annotation_schemas.py validate_answers',
    exports: 'GET /api/admin/exports?format=csv|json · one-use download token · prefer_not_to_view rows filtered in backend/app/exports.py',
  };

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function actor() {
    return App.user(M.actingAs);
  }

  function isAdmin() {
    return actor().role === 'admin';
  }

  function annotators() {
    return S.users.filter((u) => u.role === 'annotator');
  }

  function table(cols, rows, opts) {
    opts = opts || {};
    const template = cols.map((c) => c.width || 'minmax(0,1fr)').join(' ');
    let html = '<div class="grid-table"' + (opts.id ? ' id="' + opts.id + '"' : '') + '><div class="row head" style="grid-template-columns:' + template + '">' + cols.map((c) => '<span>' + esc(c.label) + '</span>').join('') + '</div>';
    rows.forEach((r) => {
      html += '<div class="row' + (r.cls ? ' ' + r.cls : '') + '" style="grid-template-columns:' + template + '"' + (r.attrs || '') + '>' + r.cells.map((cell, i) => '<span data-col="' + esc(cols[i].label) + '">' + cell + '</span>').join('') + '</div>';
    });
    if (!rows.length) html += '<div class="row"><span class="muted small">' + esc(opts.empty || 'Nothing here yet.') + '</span></div>';
    return html + '</div>';
  }

  function tiles(items) {
    return '<div class="summary-grid stat-tiles">' + items.map((t) => '<div><span>' + esc(t[0]) + '</span><strong' + (t[3] ? ' id="' + t[3] + '"' : '') + '>' + t[1] + '</strong>' + (t[2] ? '<small>' + esc(t[2]) + '</small>' : '') + '</div>').join('') + '</div>';
  }

  function panel(title, body, sub, extra) {
    return '<section class="admin-panel"' + (extra || '') + '><div class="admin-panel-heading"><div><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div></div>' + body + '</section>';
  }

  function techNote(screen) {
    return '<details class="plain where"><summary style="font-size:0.78rem;color:var(--muted);padding:0.2rem 0">For technical readers</summary><code class="xs">' + esc(NOTES[screen]) + '</code></details>';
  }

  function lastActivity(taskId, userId) {
    const mine = S.annotations.filter((a) => a.taskId === taskId && a.annotatorId === userId);
    if (!mine.length) return null;
    return mine.map((a) => a.annotatedAt).sort().pop();
  }

  function labelText(topic, fieldId, value) {
    const f = E.fieldById(D.FORMS[topic], fieldId);
    if (!f || !f.options) return String(value);
    const o = f.options.find((x) => x.id === value);
    return o ? o.label : String(value);
  }

  function shortLabel(topic, fieldId, value) {
    const text = labelText(topic, fieldId, value);
    return text.length > 28 ? text.slice(0, 26) + '…' : text;
  }

  /* ------------------------------------------------------------------ */
  /* Screens                                                             */
  /* ------------------------------------------------------------------ */

  function screenUpload() {
    const u = M.upload;
    let body = '';
    if (!u.preview) {
      body += '<div class="dropzone"><p>' + icon('upload') + '<br />Drop a ZIP with media files and a <code>manifest.csv</code>, or</p><button type="button" class="btn btn-primary" data-action="m-upload-sample">Use the sample bundle</button><p class="xs muted" style="margin-top:0.6rem">Sample: mh-search-pilot-october.zip · 30 rows · 33 files</p></div>';
    } else {
      body += '<div class="dropzone has-file"><p><strong>mh-search-pilot-october.zip</strong> · 30 rows · 33 files · checked, nothing stored yet</p></div>';
      body += tiles([['Items', 30, 'rows in manifest'], ['With media', 30, 'video or image matched'], ['Videos', 22, 'plus 8 screenshot sets'], ['Unmatched files', 2, 'files not named in the manifest'], ['Missing files', 0, 'rows without a file']]);
      body += '<div class="notice notice-info">' + icon('info') + '<p>Dry run passed. Two extra files in the bundle are not referenced by the manifest and will be ignored.</p></div>';
      body += table(
        [{ label: 'External id', width: '110px' }, { label: 'Title' }, { label: 'Media', width: '80px' }, { label: 'Frames', width: '70px' }],
        D.ITEMS.filter((i) => i.topic === 'MentalHealth').slice(0, 5).map((i) => ({ cells: [esc(i.externalId), esc(i.title), '<span class="media-chip ' + i.mediaType + '">' + i.mediaType + '</span>', String(i.frames)] })),
      );
      body += '<p class="xs muted" style="margin:0.4rem 0 0.9rem">First 5 of 30 rows</p>';
      body += '<div class="admin-two-column"><div class="field"><label class="field-label" for="up-name">Dataset name</label><input class="text-input" id="up-name" value="' + esc(u.name) + '" data-input="m-upload-name" ' + (u.done ? 'disabled' : '') + ' /></div><div class="field"><label class="field-label" for="up-topic">Topic</label><select class="select-input" id="up-topic" data-change="m-upload-topic" ' + (u.done ? 'disabled' : '') + '>' + Object.keys(D.TOPICS).map((t) => '<option value="' + t + '"' + (u.topic === t ? ' selected' : '') + '>' + esc(D.TOPICS[t].label) + '</option>').join('') + '</select></div></div>';
      if (u.progress > 0 || u.done) body += '<div class="upload-track"><i style="width:' + u.progress + '%"></i></div><p class="xs muted" id="upload-status">' + (u.done ? 'Stored. Dataset and a draft task were created.' : 'Storing media and rows… ' + u.progress + '%') + '</p>';
      if (u.done) body += '<div class="notice notice-success">' + icon('check-circle') + '<p><strong>Dataset created.</strong> A draft task named “' + esc(u.name) + '” is waiting in <button type="button" class="link-btn" data-action="m-nav" data-screen="tasks">Tasks</button>. Activate it when the assignees are set.</p></div>';
      else body += '<div class="btn-row"><button type="button" class="btn btn-primary" data-action="m-upload-commit" ' + (u.progress > 0 ? 'disabled' : '') + '>' + icon('database', 'ico-sm') + ' Create dataset</button><button type="button" class="btn btn-ghost" data-action="m-upload-reset">Start over</button></div>';
    }
    return panel('Upload bundle', body, 'Step 1 checks the manifest against the files. Step 2 stores the items and creates a draft task.') + techNote('upload');
  }

  function screenDatasets() {
    const rows = S.datasets.map((d) => ({
      cls: d.isNew ? 'is-new' : '',
      cells: [esc(d.name), topicPill(d.topic), String(d.itemCount), d.withMedia + ' media · ' + d.videos + ' videos', esc(E.formatDate(d.uploadedAt)) + '<br /><small class="muted">' + esc(d.uploadedBy) + '</small>', chip(d.purpose === 'training' ? 'training' : 'annotation')],
    }));
    return panel('All datasets', table([{ label: 'Dataset' }, { label: 'Topic', width: '150px' }, { label: 'Items', width: '70px' }, { label: 'Media', width: '140px' }, { label: 'Uploaded', width: '130px' }, { label: 'Purpose', width: '110px' }], rows), 'Training datasets are kept apart from annotation datasets so practice items never appear in a task.') + techNote('datasets');
  }

  function progressCell(t) {
    if (t.status === 'draft') return '<span class="muted small">Not started</span>';
    return t.assignees.map((uid) => {
      const c = App.taskCounts(t.id, uid);
      return '<div class="xs" style="display:flex;gap:0.4rem;align-items:center"><span style="width:92px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(App.userName(uid)) + '</span><span class="progress-bar" style="flex:1"><i style="width:' + (c.total ? Math.round((c.done / c.total) * 100) : 0) + '%"></i></span><span style="width:48px;text-align:right">' + c.done + '/' + c.total + '</span></div>';
    }).join('');
  }

  function taskActions(t) {
    let html = '<div class="btn-row" style="gap:0.3rem">';
    if (t.status === 'active') html += '<button type="button" class="btn btn-secondary btn-sm" data-action="m-task-pause" data-task="' + t.id + '">' + icon('pause', 'ico-sm') + ' Pause</button>';
    else if (t.status !== 'archived') html += '<button type="button" class="btn btn-primary btn-sm" data-action="m-task-activate" data-task="' + t.id + '">' + icon('play', 'ico-sm') + ' Activate</button>';
    if (t.status !== 'archived') html += '<button type="button" class="btn btn-ghost btn-sm" data-action="m-task-archive" data-task="' + t.id + '">' + icon('archive', 'ico-sm') + ' Archive</button>';
    return html + '</div>';
  }

  function splitGrid(t) {
    const split = S.itemSplits[t.id];
    if (!split) return '<p class="small muted">Items are not split yet. Everyone assigned sees the whole set.</p>';
    const people = t.assignees.filter((a) => split[a]);
    const items = App.taskItemIds(t.id).slice(0, 12);
    let html = '<div class="split-grid" style="--cols:' + people.length + '"><div class="split-row head" style="--cols:' + people.length + '"><span class="label">Item</span>' + people.map((p) => '<span class="split-cell" title="' + esc(App.userName(p)) + '">' + esc(App.userName(p).split(' ')[0]) + '</span>').join('') + '</div>';
    items.forEach((id) => {
      html += '<div class="split-row" style="--cols:' + people.length + '"><span class="label">' + esc(id) + '</span>' + people.map((p) => '<span class="split-cell' + (split[p].includes(id) ? ' is-on' : '') + '"></span>').join('') + '</div>';
    });
    const total = App.taskItemIds(t.id).length;
    return html + '</div><p class="xs muted" style="margin-top:0.4rem">First 12 of ' + total + ' items. Each item is held by exactly ' + t.overlap + ' ' + (t.overlap === 1 ? 'person' : 'people') + '; each person holds about ' + Math.round((total * t.overlap) / people.length) + '.</p>';
  }

  function screenTasks() {
    const rows = S.tasks.map((t) => ({
      cls: (t.id === M.selectedTaskId ? '' : '') + (t.isNew ? ' is-new' : ''),
      attrs: '',
      cells: ['<button type="button" class="link-btn" style="font-weight:700;text-align:left" data-action="m-task-select" data-task="' + t.id + '">' + esc(t.name) + '</button><br /><small class="muted">' + esc(t.instructions.slice(0, 70)) + (t.instructions.length > 70 ? '…' : '') + '</small>', topicPill(t.topic), progressCell(t), '<span class="xs">' + esc(t.mode.replace('_', ' ')) + (t.mode === 'item_split' ? ' · overlap ' + t.overlap : '') + '</span>', chip(t.status), taskActions(t)],
    }));
    let html = panel('All tasks', table([{ label: 'Task' }, { label: 'Topic', width: '140px' }, { label: 'Progress', width: '220px' }, { label: 'Mode', width: '110px' }, { label: 'Status', width: '90px' }, { label: 'Actions', width: '190px' }], rows), 'Pausing a task locks it for annotators immediately. Archiving hides it once the export is done.');

    const t = App.task(M.selectedTaskId) || S.tasks[0];
    if (t) {
      const eligible = annotators().filter((u) => u.active && u.topics.includes(t.topic));
      const selected = M.selectedAssignees || t.assignees.slice();
      const left =
        '<h3 style="font-size:0.95rem;margin:0 0 0.4rem">' + esc(t.name) + ' ' + topicPill(t.topic) + '</h3><p class="small muted">Who works on this task? Only annotators trained for ' + esc(D.TOPICS[t.topic].label) + ' are listed.</p><div class="checkbox-list">' +
        eligible.map((u) => '<label class="check-row"><input type="checkbox" data-change="m-assignee" data-user="' + u.id + '" ' + (selected.includes(u.id) ? 'checked' : '') + ' ' + (t.status === 'archived' ? 'disabled' : '') + ' /><span>' + esc(u.name) + ' <span class="xs muted">@' + esc(u.username) + (u.mhSafety === 'paused' && t.topic === 'MentalHealth' ? ' · paused MH assignments' : '') + '</span></span></label>').join('') +
        '</div><div class="field" style="margin-top:0.8rem"><span class="field-label">How many people see each item?</span><div class="seg">' + [1, 2, 3].map((n) => '<button type="button" aria-pressed="' + (M.overlap === n ? 'true' : 'false') + '" data-action="m-overlap" data-n="' + n + '">' + n + '</button>').join('') + '</div></div>' +
        '<div class="btn-row"><button type="button" class="btn btn-primary" data-action="m-distribute" ' + (t.status === 'archived' || selected.length < M.overlap ? 'disabled' : '') + '>' + icon('shuffle', 'ico-sm') + ' Distribute items among selected</button></div>' +
        (selected.length < M.overlap ? '<p class="xs muted">Select at least ' + M.overlap + ' people for an overlap of ' + M.overlap + '.</p>' : '');
      const right = '<h3 style="font-size:0.95rem;margin:0 0 0.4rem">Who holds which item</h3>' + splitGrid(t);
      html += panel('Assign and split', '<div class="admin-two-column"><div>' + left + '</div><div id="split-panel">' + right + '</div></div>', 'Select a task in the table to work on it. Splitting keeps each annotator blind to what the others chose.');
    }
    return html + techNote('tasks');
  }

  /* Progress ---------------------------------------------------------- */

  function effectiveAnnotations(taskId) {
    const t = App.task(taskId);
    const field = D.FORMS[t.topic].settings.agreement_field;
    return S.annotations.filter((a) => a.taskId === taskId).map((a) => {
      const key = a.itemId + '|' + a.annotatorId;
      if (taskId === 't-can-b' && M.lab.flips[key]) return Object.assign({}, a, { answers: Object.assign({}, a.answers, { [field]: M.lab.flips[key] }) });
      return a;
    });
  }

  function agreementPanel(t) {
    const field = D.FORMS[t.topic].settings.agreement_field;
    const report = E.agreementReport(effectiveAnnotations(t.id), field);
    const fieldLabel = E.fieldLabel(D.FORMS[t.topic], field);
    let html = tiles([
      ['Items labelled by 2+ people', report.itemsWithMultiple, 'skipped items excluded'],
      ['Everyone agreed', report.fullAgreement, 'same ' + fieldLabel.toLowerCase()],
      ['Percent agreement', report.percent === null ? '—' : E.pct(report.percent), 'across those items', 'agree-pct'],
    ]);
    if (report.pairwise.length) {
      html += table(
        [{ label: 'Pair' }, { label: 'Shared items', width: '110px' }, { label: 'Agreed', width: '90px' }, { label: 'Cohen’s κ', width: '150px' }],
        report.pairwise.map((p) => ({ cells: [esc(App.userName(p.a)) + ' &amp; ' + esc(App.userName(p.b)), String(p.shared), E.pct(p.po), '<strong title="' + esc(E.kappaBand(p.kappa)) + '">' + E.kappaText(p.kappa) + '</strong> <span class="xs muted">' + esc(E.kappaBand(p.kappa)) + '</span>'] })),
      );
    } else html += '<p class="small muted">No two annotators have labelled the same item yet.</p>';
    html += '<p class="xs muted" style="margin-top:0.5rem">κ (kappa) corrects percent agreement for agreement expected by chance. Above 0.6 is usually read as substantial.</p>';
    return { html, report };
  }

  function labPanel(t, report) {
    const field = D.FORMS[t.topic].settings.agreement_field;
    const anns = effectiveAnnotations(t.id);
    const byItem = new Map();
    anns.forEach((a) => {
      if (a.status === 'skipped' || !a.answers || !a.answers[field]) return;
      if (!byItem.has(a.itemId)) byItem.set(a.itemId, []);
      byItem.get(a.itemId).push(a);
    });
    const allRows = Array.from(byItem.entries()).filter(([, list]) => list.length >= 2);
    const original = (a) => (App.annotationFor(t.id, a.itemId, a.annotatorId) || a).answers[field];
    const disagreeFirst = (row) => (original(row[1][0]) === original(row[1][1]) ? 1 : 0);
    allRows.sort((x, y) => disagreeFirst(x) - disagreeFirst(y));
    const rows = allRows.slice(0, 12);
    const third = M.lab.thirdReview !== 'not_started';
    const cols = third ? 3 : 2;
    let html = '<p class="small muted">Each post in this task was reviewed by two people. Click a label to change it and watch the agreement numbers move. Click again to put it back.</p>';
    html += '<div class="lab-grid" id="lab-grid"><div class="lab-row head" style="--cols:' + cols + '"><span>Post</span><span>Reviewer 1</span><span>Reviewer 2</span>' + (third ? '<span>Third (blind)</span>' : '') + '<span>Result</span></div>';
    rows.forEach(([itemId, list]) => {
      const item = D.itemById(itemId);
      const labels = list.slice(0, 2).map((a) => a.answers[field]);
      const disagree = labels[0] !== labels[1];
      const thirdLabel = M.lab.thirdLabels[itemId];
      let result;
      if (third && thirdLabel) {
        const mv = E.majorityVote(labels.concat(thirdLabel));
        result = M.lab.majority ? '<span class="lab-chip ' + mv.label + '" disabled title="Majority label">' + (mv.label === 'yes' ? 'Yes' : 'No') + ' ✓</span>' : '<span class="lab-result">majority ' + mv.label + '</span>';
      } else result = '<span class="lab-result ' + (disagree ? 'text-danger' : '') + '" style="color:' + (disagree ? 'var(--status-needs-review)' : 'var(--status-annotated)') + '">' + (disagree ? 'disagree' : 'agree') + '</span>';
      html += '<div class="lab-row' + (disagree ? ' is-disagree' : '') + '" style="--cols:' + cols + '" data-item="' + itemId + '"><span class="title" title="' + esc(item.title) + '">' + esc(item.externalId) + ' · ' + esc(item.title) + '</span>' +
        list.slice(0, 2).map((a) => {
          const key = a.itemId + '|' + a.annotatorId;
          return '<button type="button" class="lab-chip ' + a.answers[field] + (M.lab.flips[key] ? ' is-flipped' : '') + '" data-action="m-lab-flip" data-key="' + key + '" title="' + esc(App.userName(a.annotatorId)) + '" ' + (M.lab.majority ? 'disabled' : '') + '>' + (a.answers[field] === 'yes' ? 'Yes' : 'No') + '</button>';
        }).join('') +
        (third ? (thirdLabel ? '<span class="lab-chip ' + thirdLabel + '" style="text-align:center">' + (thirdLabel === 'yes' ? 'Yes' : 'No') + '</span>' : disagree ? '<span class="lab-result muted">pending</span>' : '<span class="lab-result muted">—</span>') : '') +
        result + '</div>';
    });
    html += '</div>';
    if (allRows.length > rows.length) html += '<p class="xs muted" style="margin-top:0.4rem">Showing ' + rows.length + ' of ' + allRows.length + ' posts, disagreements first. The numbers above use all of them.</p>';
    const flips = Object.keys(M.lab.flips).length;
    const disagreements = report.disagreements.length;
    html += '<div class="btn-row" style="margin-top:0.8rem">';
    if (flips && !M.lab.majority) html += '<button type="button" class="btn btn-ghost btn-sm" data-action="m-lab-reset">Undo my ' + flips + ' change' + (flips > 1 ? 's' : '') + '</button>';
    if (M.lab.thirdReview === 'not_started') html += '<button type="button" class="btn btn-primary" data-action="m-lab-third" ' + (disagreements ? '' : 'disabled') + '>' + icon('eye-off', 'ico-sm') + ' Assign the ' + disagreements + ' disagreement' + (disagreements === 1 ? '' : 's') + ' to a blinded third reviewer</button>';
    else if (M.lab.thirdReview === 'running') html += '<span class="small muted">Third reviewer is labelling…</span>';
    else if (!M.lab.majority) html += '<button type="button" class="btn btn-primary" data-action="m-lab-majority">' + icon('scale', 'ico-sm') + ' Apply majority labels</button><button type="button" class="btn btn-ghost btn-sm" data-action="m-lab-restart">Start the lab over</button>';
    else html += '<span class="status-chip">Majority labels applied</span><button type="button" class="btn btn-ghost btn-sm" data-action="m-lab-restart">Start the lab over</button>';
    html += '</div>';
    if (M.lab.thirdReview === 'done') html += '<p class="xs muted" style="margin-top:0.5rem">The third reviewer never sees the first two labels. Blind third-review majority; not expert adjudication.</p>';
    if (report.disagreements.length && !third) {
      html += '<h3 style="font-size:0.9rem;margin:1rem 0 0.4rem">Where they disagreed</h3><div class="disagreement-cards">' + report.disagreements.slice(0, 6).map((d) => {
        const item = D.itemById(d.itemId);
        return '<div class="disagreement-card"><strong>' + esc(item.externalId) + ' · ' + esc(item.title) + '</strong><span class="xs muted">' + esc(item.snippet.slice(0, 90)) + '…</span><div class="labels">' + Object.entries(d.labels).map(([uid, v]) => '<span class="pill">' + esc(App.userName(uid).split(' ')[0]) + ': ' + esc(shortLabel(t.topic, field, v)) + '</span>').join('') + '</div></div>';
      }).join('') + '</div>';
    }
    html += '<details class="plain" style="margin-top:0.8rem"><summary style="font-size:0.78rem;color:var(--muted);padding:0.2rem 0">How κ is computed</summary><p class="xs muted">For each pair: p<sub>o</sub> = share of shared items with the same label; p<sub>e</sub> = Σ over labels of (share reviewer 1 used it × share reviewer 2 used it); κ = (p<sub>o</sub> − p<sub>e</sub>) / (1 − p<sub>e</sub>). Skipped and prefer-not-to-view items are left out, exactly as in task_agreement().</p></details>';
    return html;
  }

  function screenProgress() {
    const options = S.tasks.filter((t) => t.status !== 'draft');
    const t = App.task(M.progressTaskId) || options[0];
    const field = D.FORMS[t.topic].settings.agreement_field;
    let html = '<div class="field" style="max-width:420px"><label class="field-label" for="progress-task">Task</label><select class="select-input" id="progress-task" data-change="m-progress-task">' + options.map((o) => '<option value="' + o.id + '"' + (o.id === t.id ? ' selected' : '') + '>' + esc(o.name) + ' (' + o.status + ')</option>').join('') + '</select></div>';

    const rows = t.assignees.map((uid) => {
      const c = App.taskCounts(t.id, uid);
      const last = lastActivity(t.id, uid);
      return {
        cls: uid === 'u-demo' ? 'is-new' : '',
        attrs: ' data-user="' + uid + '"',
        cells: [esc(App.userName(uid)) + (uid === 'u-demo' ? ' <span class="xs muted">(you, in section 1)</span>' : ''), String(c.total), String(c.annotated), String(c.skipped), String(c.preferNotToView), String(c.needsReview), last ? esc(E.formatDateTime(last)) : '<span class="muted">none yet</span>'],
      };
    });
    html += panel('Per annotator', table([{ label: 'Annotator' }, { label: 'Assigned', width: '80px' }, { label: 'Annotated', width: '90px' }, { label: 'Skipped', width: '80px' }, { label: 'Prefer not to view', width: '120px' }, { label: t.topic === 'MentalHealth' ? 'Needs expert review' : 'Needs review', width: '120px' }, { label: 'Last activity', width: '150px' }], rows, { id: 'progress-table' }), 'Prefer-not-to-view is recorded without a reason and is never counted against the annotator.');

    const review = S.annotations.filter((a) => a.taskId === t.id && a.status === 'needs_review');
    if (review.length) {
      html += panel(icon('flag', 'ico-sm') + ' ' + (t.topic === 'MentalHealth' ? 'Needs expert review' : 'Needs review'), '<div class="disagreement-cards">' + review.map((a) => {
        const item = D.itemById(a.itemId);
        return '<div class="disagreement-card"><strong>' + esc(item.externalId) + ' · ' + esc(item.title) + '</strong><span class="xs muted">Flagged by ' + esc(App.userName(a.annotatorId)) + ' · ' + esc(E.formatDateTime(a.annotatedAt)) + '</span>' + (a.answers && a.answers.annotator_notes ? '<div class="small">' + esc(a.answers.annotator_notes) + '</div>' : '') + '</div>';
      }).join('') + '</div>', 'Items the annotator asked the study team to look at, as the protocol allows.');
    }

    const agreement = agreementPanel(t);
    html += panel('Inter-annotator agreement', agreement.html, 'On the field “' + esc(E.fieldLabel(D.FORMS[t.topic], field)) + '”. Only items labelled by at least two people count.', ' id="agreement-panel"');
    if (t.id === 't-can-b') html += panel(icon('scale', 'ico-sm') + ' Agreement lab · two reviews per post', labPanel(t, agreement.report), 'The cancer study asks two people per post, sends disagreements to a blinded third reviewer, and keeps the majority label.', ' id="lab-panel"');
    return html + techNote('progress');
  }

  /* Accounts ------------------------------------------------------------ */

  function screenAccounts() {
    const admin = isAdmin();
    const rows = S.users.map((u) => ({
      cls: u.isNew ? 'is-new' : '',
      cells: [
        '<strong>' + esc(u.name) + '</strong><br /><small class="muted">@' + esc(u.username) + ' · ' + esc(u.email) + '</small>',
        rolePill(u.role) + (u.delegatedBy ? '<br /><small class="muted">delegated by ' + esc(u.delegatedBy) + '</small>' : ''),
        u.topics.length ? u.topics.map(topicPill).join(' ') : '<span class="muted xs">all (staff)</span>',
        u.role === 'annotator' && u.topics.includes('MentalHealth') ? chip(u.mhSafety) : '<span class="muted xs">n/a</span>',
        chip(u.active ? 'active' : 'inactive'),
        u.role === 'annotator' ? '<button type="button" class="btn btn-ghost btn-sm" data-action="m-user-toggle" data-user="' + u.id + '">' + (u.active ? 'Deactivate' : 'Reactivate') + '</button>' : u.role === 'manager' && admin ? '<button type="button" class="btn btn-ghost btn-sm" data-action="m-user-toggle" data-user="' + u.id + '">' + (u.active ? 'Revoke' : 'Restore') + '</button>' : '',
      ],
    }));
    const head = '<div class="btn-row" style="margin-bottom:0.8rem"><button type="button" class="btn btn-primary" data-action="m-user-create">' + icon('plus', 'ico-sm') + ' Create account</button>' + (admin ? '<span class="xs muted">As Super Admin you can also create Study Managers and Super Admins.</span>' : '<span class="xs muted">As a Study Manager you can create annotators only. Switch to the Super Admin in the sidebar to create staff.</span>') + '</div>';
    return panel('All accounts', head + table([{ label: 'Person' }, { label: 'Role', width: '130px' }, { label: 'Domains', width: '220px' }, { label: 'MH safety', width: '150px' }, { label: 'Status', width: '90px' }, { label: '', width: '100px' }], rows), 'New accounts get a one-time password that is shown exactly once.') + techNote('accounts');
  }

  /* Training & Gold ----------------------------------------------------- */

  function screenTraining() {
    const topic = M.training.topic;
    const T = D.TRAINING[topic];
    const field = D.FORMS[topic].settings.agreement_field;
    const slots = (list, kind) => '<div class="slot-grid">' + Array.from({ length: 5 }).map((_, i) => {
      const ex = list[i];
      if (!ex) return '<div class="slot"><span class="muted">Slot ' + (i + 1) + ' · empty</span></div>';
      const item = D.itemById(ex.itemId);
      return '<div class="slot is-filled"><span><strong>' + (i + 1) + '.</strong> ' + esc(item.title) + '<br /><small>' + esc(item.externalId) + (item.sensitiveCover && kind === 'tutorial' ? ' · starts covered' : '') + '</small></span><span class="pill">' + esc(shortLabel(topic, field, ex.answers[field])) + '</span></div>';
    }).join('') + '</div>';
    const tabs = '<div class="seg" style="margin-bottom:0.9rem">' + Object.keys(D.TOPICS).map((t) => '<button type="button" aria-pressed="' + (t === topic ? 'true' : 'false') + '" data-action="m-training-topic" data-topic="' + t + '">' + esc(D.TOPICS[t].label) + '</button>').join('') + '</div>';
    const body = tabs + '<div class="admin-two-column"><div><h3 style="font-size:0.95rem;margin:0 0 0.4rem">Tutorial · 5 worked examples</h3><p class="xs muted">Shown with the expert answer and a one-line reason.</p>' + slots(T.tutorial, 'tutorial') + '</div><div><h3 style="font-size:0.95rem;margin:0 0 0.4rem">Practice · 5 quiz items</h3><p class="xs muted">Answered blind; the expert answer appears after all five are submitted.</p>' + slots(T.practice, 'practice') + '</div></div>' +
      '<div class="notice notice-info" style="margin-top:0.9rem">' + icon('info') + '<p>Exactly five and five. Training items are reserved and never appear in an annotation task, so nobody labels an item they have already seen the answer to.</p></div>' +
      '<div class="btn-row"><button type="button" class="btn btn-secondary btn-sm" disabled>' + icon('plus', 'ico-sm') + ' Replace an example (full app)</button></div>';
    return panel('Training module', body, 'One module per topic. Changing an example re-opens training for annotators who have not yet finished it.') + techNote('training');
  }

  /* Topics & Forms ------------------------------------------------------ */

  function screenForms() {
    const topic = M.forms.topic;
    const versions = S.formVersions[topic];
    const selected = versions.find((v) => v.id === M.forms.versionId) || versions.find((v) => v.status === 'active');
    const schema = D.FORMS[topic];
    const topicList = '<div class="version-rail">' + Object.keys(D.TOPICS).map((t) => '<button type="button" class="version-item' + (t === topic ? ' is-selected' : '') + '" data-action="m-form-topic" data-topic="' + t + '"><span>' + topicPill(t) + '<br /><small class="muted">' + esc(D.TOPICS[t].taxonomy) + '</small></span><span class="xs muted">' + S.formVersions[t].length + ' version' + (S.formVersions[t].length > 1 ? 's' : '') + '</span></button>').join('') + '</div>';
    const rail = '<div class="version-rail" style="margin-top:0.9rem">' + versions.slice().reverse().map((v) => '<button type="button" class="version-item' + (v.id === selected.id ? ' is-selected' : '') + '" data-action="m-form-version" data-version="' + v.id + '"><span><strong>v' + v.version + '</strong> <small class="muted">' + esc(v.summary) + '</small></span>' + chip(v.status) + '</button>').join('') + '</div>';
    let actions = '<div class="btn-row" style="margin-top:0.7rem">';
    if (selected.status === 'draft') actions += '<button type="button" class="btn btn-primary btn-sm" data-action="m-form-publish" data-version="' + selected.id + '">Publish v' + selected.version + '</button><span class="xs muted">Publishing freezes the fields.</span>';
    else if (selected.status === 'published') actions += '<button type="button" class="btn btn-primary btn-sm" data-action="m-form-activate" data-version="' + selected.id + '">Make v' + selected.version + ' active</button><span class="xs muted">New tasks will use it; running tasks keep their version.</span>';
    else actions += '<span class="status-chip">Active · used by new tasks</span>';
    actions += '</div>';

    let builder = '<p class="xs muted">Read-only view of v' + selected.version + (selected.id === versions.find((v) => v.status === 'active').id ? '' : ' (shown with the current field layout)') + '. Agreement field: <strong>' + esc(E.fieldLabel(schema, schema.settings.agreement_field)) + '</strong></p>';
    schema.sections.forEach((section) => {
      builder += '<h3 style="font-size:0.9rem;margin:0.8rem 0 0.4rem">' + esc(section.number) + ' · ' + esc(section.title) + '</h3>';
      section.fields.forEach((f) => {
        const conds = f.conditions && f.conditions.rules ? Object.keys(f.conditions.effects || {}).filter((k) => f.conditions.effects[k] && k !== 'clear_when_hidden').join(' + ') + ' when ' + f.conditions.rules.map((r) => r.field + ' ' + String(r.operator || r.op || '').replace('_', ' ') + ' ' + (Array.isArray(r.value) ? r.value.join('/') : r.value)).join(f.conditions.mode === 'any' ? ' or ' : ' and ') : '';
        builder += '<div class="builder-field"><span>' + esc(f.label) + (f.id === schema.settings.agreement_field ? ' <span class="pill">agreement field</span>' : '') + (f.required ? ' <span class="req">*</span>' : '') + '<small>' + esc(f.id) + (f.options ? ' · ' + f.options.length + ' options' : '') + (conds ? ' · ' + esc(conds) : '') + '</small></span><span class="field-type-chip">' + esc(f.type) + '</span></div>';
      });
    });
    if (schema.constraints && schema.constraints.length) builder += '<h3 style="font-size:0.9rem;margin:0.8rem 0 0.4rem">Rules</h3><ul class="small muted" style="margin:0;padding-left:1.1rem">' + schema.constraints.map((c) => '<li>' + esc(c.message) + ' <span class="field-type-chip">' + esc(c.type) + '</span></li>').join('') + '</ul>';
    builder += '<details class="plain" style="margin-top:0.8rem"><summary style="font-size:0.78rem;color:var(--muted);padding:0.2rem 0">The 12 field types a form can use</summary><ul class="xs muted" style="margin:0.3rem 0 0;padding-left:1.1rem">' + D.FIELD_TYPES.map(([t, d]) => '<li><span class="field-type-chip">' + t + '</span> ' + esc(d) + '</li>').join('') + '</ul></details>';

    return panel('Topics and versions', '<div class="admin-two-column wide-left"><div>' + builder + '</div><div>' + topicList + rail + actions + '</div></div>', 'A published version cannot be edited. A running task keeps the version it started with, so its labels stay comparable.') + techNote('forms');
  }

  /* Exports -------------------------------------------------------------- */

  function exportRows() {
    const x = M.exports;
    return S.annotations
      .filter((a) => (x.taskId === 'all' || a.taskId === x.taskId) && (x.topic === 'all' || App.task(a.taskId).topic === x.topic) && (x.annotatorId === 'all' || a.annotatorId === x.annotatorId))
      .filter((a) => a.skipReason !== 'prefer_not_to_view')
      .map((a) => {
        const t = App.task(a.taskId);
        const item = D.itemById(a.itemId);
        const field = D.FORMS[t.topic].settings.agreement_field;
        return { task: t.name, item: item.externalId, annotator: App.user(a.annotatorId).username, status: a.status, label: a.answers && a.answers[field] ? a.answers[field] : '', at: a.annotatedAt };
      })
      .sort((a, b) => (a.task + a.item).localeCompare(b.task + b.item));
  }

  function csvOf(rows) {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    return ['task,item_external_id,annotator,status,agreement_label,annotated_at'].concat(rows.map((r) => [r.task, r.item, r.annotator, r.status, r.label, r.at].map(q).join(','))).join('\n');
  }

  function screenExports() {
    const x = M.exports;
    const rows = exportRows();
    const excluded = S.annotations.filter((a) => a.skipReason === 'prefer_not_to_view').length;
    const sel = (id, label, opts, key) => '<div class="field"><label class="field-label" for="' + id + '">' + label + '</label><select class="select-input" id="' + id + '" data-change="m-export-filter" data-key="' + key + '">' + opts.map((o) => '<option value="' + o[0] + '"' + (x[key] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div>';
    const filters = '<div class="admin-two-column" style="grid-template-columns:repeat(4,minmax(0,1fr))">' +
      sel('ex-task', 'Task', [['all', 'All tasks']].concat(S.tasks.map((t) => [t.id, t.name])), 'taskId') +
      sel('ex-topic', 'Topic', [['all', 'All topics']].concat(Object.keys(D.TOPICS).map((t) => [t, D.TOPICS[t].label])), 'topic') +
      sel('ex-annotator', 'Annotator', [['all', 'All annotators']].concat(annotators().map((u) => [u.id, u.name])), 'annotatorId') +
      sel('ex-format', 'Format', [['csv', 'CSV'], ['json', 'JSON']], 'format') + '</div>';
    const preview = table([{ label: 'Task' }, { label: 'Item', width: '100px' }, { label: 'Annotator', width: '140px' }, { label: 'Status', width: '100px' }, { label: 'Label', width: '120px' }], rows.slice(0, 6).map((r) => ({ cells: [esc(r.task), esc(r.item), esc(r.annotator), chip(r.status), esc(r.label || '—')] })), { empty: 'No labels match these filters.' });
    const body = filters + '<p class="small" style="margin:0.4rem 0 0.8rem"><strong id="export-count">' + E.formatNumber(rows.length) + '</strong> labels match · ' + excluded + ' prefer-not-to-view item' + (excluded === 1 ? '' : 's') + ' excluded</p>' + preview + '<p class="xs muted" style="margin:0.4rem 0 0.9rem">Preview of the first 6 rows</p><div class="btn-row"><button type="button" class="btn btn-primary" data-action="m-export-download" ' + (rows.length ? '' : 'disabled') + '>' + icon('download', 'ico-sm') + ' Prepare download</button></div>';
    return panel('Export labels', body, 'Each download link works once and expires. The file contains labels, not the media.') + techNote('exports');
  }

  const SCREENS = { upload: screenUpload, datasets: screenDatasets, tasks: screenTasks, progress: screenProgress, accounts: screenAccounts, training: screenTraining, forms: screenForms, exports: screenExports };

  /* ------------------------------------------------------------------ */
  /* Shell + render                                                      */
  /* ------------------------------------------------------------------ */

  function renderManager() {
    const shell = document.getElementById('manager-shell');
    if (!shell) return;
    if (!SCREENS[M.screen]) M.screen = 'progress';
    const a = actor();
    const title = isAdmin() ? 'Admin Dashboard' : 'Study Manager Dashboard';
    const sidebar =
      '<aside class="admin-sidebar" id="admin-sidebar"><div class="admin-sidebar-brand"><span class="brand-mark" aria-hidden="true">A</span><span><strong>Annotation Platform</strong><small>' + esc(title) + '</small></span></div>' +
      '<nav class="admin-nav" aria-label="Manager screens">' + NAV.map(([id, label, ic]) => '<button type="button" class="' + (M.screen === id ? 'is-active' : '') + '" data-action="m-nav" data-screen="' + id + '" aria-current="' + (M.screen === id ? 'page' : 'false') + '">' + icon(ic, 'ico-sm') + ' ' + esc(label) + '</button>').join('') + '</nav>' +
      '<div class="admin-account"><div class="who"><span class="admin-avatar">' + esc(a.name.split(' ').map((w) => w[0]).join('')) + '</span><span><strong>' + esc(a.name) + '</strong>' + rolePill(a.role) + '</span></div><span class="xs muted">Try the demo as</span><div class="seg" style="display:flex"><button type="button" aria-pressed="' + (M.actingAs === 'u-mgr' ? 'true' : 'false') + '" data-action="m-act-as" data-user="u-mgr" style="flex:1">Manager</button><button type="button" aria-pressed="' + (M.actingAs === 'u-super' ? 'true' : 'false') + '" data-action="m-act-as" data-user="u-super" style="flex:1">Super Admin</button></div></div></aside>';
    const mobile = '<div class="admin-mobile-header"><button type="button" class="icon-btn" data-action="m-nav-toggle" aria-label="Open menu" aria-expanded="' + (M.navOpen ? 'true' : 'false') + '">' + icon('list') + '</button><span><strong>' + esc(HEAD[M.screen][0]) + '</strong><small>' + esc(title) + '</small></span></div>';
    const main = '<div class="admin-main">' + mobile + '<header class="admin-page-header"><div><span class="eyebrow">' + esc(title) + '</span><h1>' + esc(HEAD[M.screen][0]) + '</h1><p>' + esc(HEAD[M.screen][1]) + '</p></div><span class="xs muted">Signed in as ' + esc(a.name) + '</span></header>' + SCREENS[M.screen]() + '</div>';
    shell.classList.toggle('nav-open', M.navOpen);
    shell.innerHTML = sidebar + '<button type="button" class="admin-nav-scrim" data-action="m-nav-toggle" aria-label="Close menu"></button>' + main;
    App.syncHash('manager', M.screen);
  }

  function goScreen(screen) {
    M.screen = screen;
    M.navOpen = false;
    renderManager();
    const frame = document.querySelector('#view-manager .admin-frame');
    if (frame && S.route.view === 'manager') {
      const top = frame.getBoundingClientRect().top + window.scrollY - 76;
      if (window.scrollY > top) window.scrollTo({ top, behavior: S.motion ? 'smooth' : 'auto' });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */

  App.actions['m-nav'] = (el) => goScreen(el.dataset.screen);
  App.actions['m-nav-toggle'] = () => {
    M.navOpen = !M.navOpen;
    renderManager();
  };
  App.actions['m-act-as'] = (el) => {
    M.actingAs = el.dataset.user;
    App.toast('Now acting as ' + App.userName(M.actingAs));
    renderManager();
  };

  // Upload
  App.actions['m-upload-sample'] = () => {
    M.upload.preview = true;
    renderManager();
  };
  App.actions['m-upload-reset'] = () => {
    Object.assign(M.upload, { preview: null, progress: 0, done: false });
    renderManager();
  };
  App.inputs['m-upload-name'] = (el) => {
    M.upload.name = el.value;
  };
  App.changes['m-upload-topic'] = (el) => {
    M.upload.topic = el.value;
  };
  App.actions['m-upload-commit'] = () => {
    const steps = [15, 38, 62, 84, 100].map((p) => ({
      delay: 260,
      run: () => {
        M.upload.progress = p;
        renderManager();
      },
    }));
    M.upload.progress = 4;
    renderManager();
    App.sequence(steps, () => {
      M.upload.done = true;
      const id = 'ds-new-' + Date.now().toString(36);
      S.datasets.unshift({ id, name: M.upload.name || 'New dataset', topic: M.upload.topic, itemCount: 30, withMedia: 30, videos: 22, uploadedAt: S.today, uploadedBy: actor().name, purpose: 'annotation', isNew: true });
      const active = S.formVersions[M.upload.topic].find((v) => v.status === 'active');
      S.tasks.unshift({ id: 't-new-' + Date.now().toString(36), name: M.upload.name || 'New task', topic: M.upload.topic, datasetId: id, status: 'draft', mode: 'topic_pool', overlap: 1, assignees: [], formVersionId: active.id, instructions: 'Draft created from the upload. Add assignees, then activate.', isNew: true });
      App.addAudit('dataset.created', actor().username, 'Dataset "' + M.upload.name + '" created with 30 items.');
      App.toast('Dataset created · draft task added');
      renderManager();
    });
  };

  // Tasks
  App.actions['m-task-select'] = (el) => {
    M.selectedTaskId = el.dataset.task;
    M.selectedAssignees = null;
    const t = App.task(M.selectedTaskId);
    M.overlap = Math.min(3, Math.max(1, t.overlap || 2));
    renderManager();
    const p = document.getElementById('split-panel');
    if (p) p.scrollIntoView({ block: 'nearest', behavior: S.motion ? 'smooth' : 'auto' });
  };
  App.actions['m-task-pause'] = (el) => {
    const t = App.task(el.dataset.task);
    t.status = 'paused';
    App.addAudit('task.paused', actor().username, t.name + ' paused.');
    App.toast(t.name + ' paused. Annotators see it locked.', { actionLabel: 'Undo', onAction: () => { t.status = 'active'; renderManager(); App.refresh('annotator'); } });
    renderManager();
    App.refresh('annotator');
  };
  App.actions['m-task-activate'] = (el) => {
    const t = App.task(el.dataset.task);
    if (!t.assignees.length) {
      App.toast('Add at least one assignee before activating.');
      M.selectedTaskId = t.id;
      renderManager();
      return;
    }
    t.status = 'active';
    App.addAudit('task.activated', actor().username, t.name + ' activated.');
    App.toast(t.name + ' is active.');
    renderManager();
    App.refresh('annotator');
  };
  App.actions['m-task-archive'] = async (el) => {
    const t = App.task(el.dataset.task);
    const r = await App.dialog({ title: 'Archive “' + t.name + '”?', body: '<p>Annotators lose access immediately. Labels stay available for export.</p>', confirmLabel: 'Archive task', danger: true });
    if (!r.ok) return;
    t.status = 'archived';
    App.addAudit('task.archived', actor().username, t.name + ' archived.');
    renderManager();
    App.refresh('annotator');
  };
  App.changes['m-assignee'] = (el) => {
    const t = App.task(M.selectedTaskId);
    const set = new Set(M.selectedAssignees || t.assignees);
    if (el.checked) set.add(el.dataset.user);
    else set.delete(el.dataset.user);
    M.selectedAssignees = Array.from(set);
    renderManager();
  };
  App.actions['m-overlap'] = (el) => {
    M.overlap = Number(el.dataset.n);
    renderManager();
  };
  App.actions['m-distribute'] = () => {
    const t = App.task(M.selectedTaskId);
    const people = (M.selectedAssignees || t.assignees).slice();
    if (people.length < M.overlap) return;
    const ids = D.ITEMS.filter((i) => i.topic === t.topic).slice(0, (S.datasets.find((d) => d.id === t.datasetId) || { itemCount: 30 }).itemCount).map((i) => i.id);
    t.assignees = people;
    t.overlap = M.overlap;
    t.mode = 'item_split';
    S.itemSplits[t.id] = E.splitItems(ids, people, M.overlap);
    M.selectedAssignees = null;
    App.addAudit('task.distributed', actor().username, t.name + ': ' + ids.length + ' items split among ' + people.length + ' people, overlap ' + M.overlap + '.');
    App.toast(ids.length + ' items split among ' + people.length + ' people · each seen by ' + M.overlap);
    renderManager();
    App.refresh('annotator');
  };

  // Progress / lab
  App.changes['m-progress-task'] = (el) => {
    M.progressTaskId = el.value;
    renderManager();
  };
  App.actions['m-lab-flip'] = (el) => {
    const key = el.dataset.key;
    const [itemId, annotatorId] = key.split('|');
    const a = App.annotationFor('t-can-b', itemId, annotatorId);
    const field = 'possible_misinformation';
    const current = M.lab.flips[key] || a.answers[field];
    const next = current === 'yes' ? 'no' : 'yes';
    if (next === a.answers[field]) delete M.lab.flips[key];
    else M.lab.flips[key] = next;
    if (M.lab.thirdReview !== 'not_started') {
      M.lab.thirdReview = 'not_started';
      M.lab.thirdLabels = {};
      M.lab.majority = null;
    }
    renderManager();
    const pctEl = document.getElementById('agree-pct');
    if (pctEl) {
      pctEl.classList.add('is-flash');
      setTimeout(() => pctEl.classList.remove('is-flash'), 400);
    }
  };
  App.actions['m-lab-reset'] = () => {
    M.lab.flips = {};
    renderManager();
  };
  App.actions['m-lab-restart'] = () => {
    M.lab = { flips: {}, thirdReview: 'not_started', thirdLabels: {}, majority: null };
    renderManager();
  };
  App.actions['m-lab-third'] = () => {
    const t = App.task('t-can-b');
    const field = 'possible_misinformation';
    const report = E.agreementReport(effectiveAnnotations(t.id), field);
    M.lab.thirdReview = 'running';
    M.lab.thirdLabels = {};
    renderManager();
    const rng = E.mulberry32(E.fnv1a('third-review-' + report.disagreements.map((d) => d.itemId).join(',')));
    App.sequence(
      report.disagreements.map((d) => ({
        delay: 420,
        run: () => {
          const item = D.itemById(d.itemId);
          const truth = item.truth.relevance === 'no' ? 'no' : item.truth.misinformation;
          M.lab.thirdLabels[d.itemId] = rng() < 0.85 ? truth : truth === 'yes' ? 'no' : 'yes';
          renderManager();
        },
      })),
      () => {
        M.lab.thirdReview = 'done';
        App.toast('Third reviewer finished ' + report.disagreements.length + ' item' + (report.disagreements.length === 1 ? '' : 's') + '.');
        renderManager();
      },
    );
  };
  App.actions['m-lab-majority'] = () => {
    M.lab.majority = true;
    App.addAudit('cancer.majority_applied', actor().username, 'Majority labels applied after blinded third review.');
    App.toast('Majority labels applied.');
    renderManager();
  };

  // Accounts
  App.actions['m-user-create'] = async () => {
    const admin = isAdmin();
    const r = await App.dialog({
      title: 'Create account',
      body: '<p class="small muted">A one-time password is generated and shown once.</p>',
      fields: [
        { name: 'name', label: 'Full name', type: 'text', required: true, placeholder: 'e.g. Alex Rivera' },
        { name: 'username', label: 'Username', type: 'text', required: true, placeholder: 'annotator.alex' },
        { name: 'role', label: 'Role', type: 'select', options: [{ value: 'annotator', label: 'Annotator', selected: true }, { value: 'manager', label: 'Study Manager' + (admin ? '' : ' (Super Admin only)'), disabled: !admin }, { value: 'admin', label: 'Super Admin' + (admin ? '' : ' (Super Admin only)'), disabled: !admin }] },
        { name: 'MentalHealth', label: 'Mental Health', type: 'checkbox' },
        { name: 'Immigration', label: 'Immigration', type: 'checkbox', checked: true },
        { name: 'CancerMisinformation', label: 'Cancer misinformation', type: 'checkbox' },
      ],
      confirmLabel: 'Create account',
    });
    if (!r.ok) return;
    const v = r.values;
    if (v.role !== 'annotator' && !admin) return;
    const topics = v.role === 'annotator' ? Object.keys(D.TOPICS).filter((t) => v[t]) : [];
    const username = (v.username || 'user').toLowerCase().replace(/[^a-z0-9.]/g, '.');
    const id = 'u-' + username.replace(/\./g, '-') + '-' + Date.now().toString(36);
    S.users.push({ id, username, name: v.name, role: v.role, email: username + '@oasislab.example', topics, mhSafety: topics.includes('MentalHealth') ? 'orientation_required' : 'not_applicable', active: true, created: S.today, isNew: true, delegatedBy: v.role === 'manager' ? actor().name : undefined });
    App.addAudit('user.created', actor().username, 'Account ' + username + ' (' + v.role + ') created.');
    renderManager();
    const rng = E.mulberry32(E.fnv1a(id));
    const words = ['maple', 'river', 'quiet', 'lantern', 'harbor', 'meadow', 'copper', 'cedar', 'summit', 'violet'];
    const pw = E.pick(rng, words) + '-' + E.pick(rng, words) + '-' + Math.floor(rng() * 900 + 100);
    await App.dialog({ title: 'One-time password', body: '<p>Share this with ' + esc(v.name) + ' out of band. It is shown only once and must be changed at first sign-in.</p><p class="external-id" style="font-size:1.1rem;text-align:center;padding:0.6rem;background:var(--surface-soft);border-radius:6px">' + esc(pw) + '</p>', confirmLabel: 'I have copied it', cancelLabel: null });
  };
  App.actions['m-user-toggle'] = (el) => {
    const u = App.user(el.dataset.user);
    u.active = !u.active;
    App.addAudit(u.active ? 'user.reactivated' : 'user.deactivated', actor().username, u.username + (u.active ? ' reactivated.' : ' deactivated.'));
    renderManager();
  };

  // Training
  App.actions['m-training-topic'] = (el) => {
    M.training.topic = el.dataset.topic;
    renderManager();
  };

  // Forms
  App.actions['m-form-topic'] = (el) => {
    M.forms.topic = el.dataset.topic;
    M.forms.versionId = (S.formVersions[M.forms.topic].find((v) => v.status === 'active') || S.formVersions[M.forms.topic][0]).id;
    renderManager();
  };
  App.actions['m-form-version'] = (el) => {
    M.forms.versionId = el.dataset.version;
    renderManager();
  };
  App.actions['m-form-publish'] = async (el) => {
    const v = S.formVersions[M.forms.topic].find((x) => x.id === el.dataset.version);
    const r = await App.dialog({ title: 'Publish v' + v.version + '?', body: '<p>Once published the fields are frozen. Any later change becomes v' + (v.version + 1) + '.</p>', confirmLabel: 'Publish' });
    if (!r.ok) return;
    v.status = 'published';
    v.publishedAt = S.today;
    App.addAudit('form.published', actor().username, D.TOPICS[M.forms.topic].label + ' form v' + v.version + ' published.');
    App.toast('v' + v.version + ' published');
    renderManager();
  };
  App.actions['m-form-activate'] = async (el) => {
    const list = S.formVersions[M.forms.topic];
    const v = list.find((x) => x.id === el.dataset.version);
    const current = list.find((x) => x.status === 'active');
    const r = await App.dialog({ title: 'Make v' + v.version + ' the active version?', body: '<p>New tasks for ' + esc(D.TOPICS[M.forms.topic].label) + ' will use v' + v.version + '. Tasks already running keep v' + (current ? current.version : '?') + ' so their labels stay comparable.</p>', confirmLabel: 'Activate v' + v.version });
    if (!r.ok) return;
    if (current) current.status = 'published';
    v.status = 'active';
    App.addAudit('form.activated', actor().username, D.TOPICS[M.forms.topic].label + ' form v' + v.version + ' activated.');
    App.toast('v' + v.version + ' is now active');
    renderManager();
  };

  // Exports
  App.changes['m-export-filter'] = (el) => {
    M.exports[el.dataset.key] = el.value;
    renderManager();
  };
  App.actions['m-export-download'] = async () => {
    const rows = exportRows();
    const r = await App.dialog({ title: 'Download ready', body: '<p><strong>' + rows.length + '</strong> labels · ' + M.exports.format.toUpperCase() + '. This link works once and expires in 10 minutes.</p><p class="external-id">/api/admin/exports/download/one-use-' + Date.now().toString(36) + '</p>', confirmLabel: 'Download file' });
    if (!r.ok) return;
    const content = M.exports.format === 'json' ? JSON.stringify(rows, null, 2) : csvOf(rows);
    const blob = new Blob([content], { type: M.exports.format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotation-labels-' + S.today + '.' + M.exports.format;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    App.addAudit('export.downloaded', actor().username, rows.length + ' labels exported as ' + M.exports.format.toUpperCase() + '.');
    App.toast('Downloaded ' + a.download);
  };

  App.views.manager = {
    render(sub) {
      if (sub && SCREENS[sub]) M.screen = sub;
      renderManager();
    },
  };
})();

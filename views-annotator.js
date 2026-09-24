/*
 * Annotation Platform demo — Annotator view
 *
 * Login → consent → My Tasks → training → Mental Health safety orientation →
 * per-task advisory → workspace → task complete. The form, validation,
 * keyboard shortcuts and agreement data are real; the media is drawn.
 */
(function () {
  'use strict';
  const App = window.App;
  const { E, D, S, esc, icon, chip, topicPill } = App;
  const A = S.annotator;
  const ME = 'u-demo';

  const STEPS = ['login', 'consent', 'tasks', 'training', 'safety', 'advisory', 'workspace', 'complete'];

  /* ------------------------------------------------------------------ */
  /* Notes per step                                                      */
  /* ------------------------------------------------------------------ */

  const NOTES = {
    login: {
      title: 'Signing in',
      bullets: ['Annotators get a username and a temporary password from the study team. There is no public sign-up.', 'The demo does not check the password. Just press Sign in.'],
      where: 'frontend/src/App.tsx AuthScreen · backend/app/routers/auth.py login',
    },
    consent: {
      title: 'Consent comes first',
      bullets: ['Nothing can be opened until the four statements are confirmed. The platform records the consent version and the time.', 'Declining signs the person out and records nothing.'],
      where: 'ParticipantConsent model · require_participant_consent in backend/app/security.py',
    },
    tasks: {
      title: 'Only what is assigned',
      bullets: ['Each card is a task the study team assigned. A task stays locked until training for its topic is done, and Mental Health also needs the safety orientation.', 'The count on each card is this annotator\'s own progress.'],
      where: 'AnnotatorDashboard in frontend/src/App.tsx · GET /api/tasks',
    },
    training: {
      title: 'Learn the codebook first',
      bullets: ['Five worked examples show the expert answer and why. Then five practice items are answered blind; the expert answers appear only after submitting.', 'The score is for learning. The topic unlocks either way.'],
      where: 'backend/app/training_service.py · TrainingModule with exactly 5 + 5 examples',
    },
    safety: {
      title: 'A safety orientation for sensitive topics',
      bullets: ['Mental Health annotators read this advisory once per policy version and confirm it before any media is shown.', 'It explains the three choices that are always available: take a break, save and leave, or prefer not to view.'],
      where: 'backend/app/safety_policy.py (versioned) · routers/safety.py acknowledge',
    },
    advisory: {
      title: 'One more pause before the task',
      bullets: ['The advisory repeats before each Mental Health task. No item or media has been opened yet.', 'The annotator can still go back without consequence.'],
      where: 'MentalHealthTaskAdvisory in frontend/src/App.tsx',
    },
    workspace: {
      title: 'The workspace',
      bullets: ['Queue on the left, the post in the middle, the codebook form on the right. The form is the real one, with its rules.', 'Keyboard: ↑/↓ or j/k move between items, 1–9 pick the primary label, s saves and moves on, x skips.'],
      where: 'AnnotationForm in frontend/src/App.tsx · validate_answers in backend/app/annotation_schemas.py',
    },
    complete: {
      title: 'Task complete',
      bullets: ['Every assigned item now has a saved answer or a recorded skip.', 'Open the Study manager section: this annotator\'s row in Progress and the agreement numbers already include this work.'],
      where: 'backend/app/progress.py · GET /api/admin/tasks/{id}/agreement',
    },
  };

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function me() {
    return App.user(ME);
  }

  function myTasks() {
    return S.tasks.filter((t) => t.assignees.includes(ME) && t.status !== 'archived');
  }

  function trainingDone(topic) {
    return A.training[topic].phase === 'completed';
  }

  function taskLock(t) {
    if (t.status === 'paused') return { label: 'Assignments paused', button: 'Paused', action: null };
    if (!trainingDone(t.topic)) return { label: 'Training required', button: 'Complete training', action: 'an-training-open' };
    if (t.topic === 'MentalHealth' && A.safety.status !== 'acknowledged') return { label: A.safety.status === 'paused' ? 'Assignments paused' : 'Safety orientation required', button: A.safety.status === 'paused' ? 'Paused' : 'Review safety', action: A.safety.status === 'paused' ? null : 'an-safety-open' };
    const c = App.taskCounts(t.id, ME);
    if (c.total > 0 && c.done === c.total) return { label: 'Complete', button: 'Review', action: 'an-open-task' };
    return { label: c.done ? 'In progress' : 'Ready', button: c.done ? 'Continue' : 'Start', action: 'an-open-task' };
  }

  function appTopbar() {
    const u = me();
    return (
      '<div class="app-topbar"><span class="tour-brand"><span class="brand-mark" aria-hidden="true">A</span><span class="brand-text"><span class="brand-name">Annotation Platform</span><span class="brand-sub">Multimodal research annotation workspace</span></span></span>' +
      '<div class="user-strip"><span><strong>' + esc(u.name) + '</strong><small>@' + esc(u.username) + '</small></span>' + App.rolePill('annotator') +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="an-training-hub">' + icon('graduation', 'ico-sm') + ' Training</button>' +
      '<button type="button" class="icon-btn" data-action="an-logout" aria-label="Log out" title="Log out">' + icon('log-out', 'ico-sm') + '</button></div></div>'
    );
  }

  const TOPIC_COLORS = { MentalHealth: ['#356f91', '#9cc4dd'], Immigration: ['#8a6425', '#e0c58c'], CancerMisinformation: ['#9f2447', '#e6a3b6'] };

  function mediaSvg(item, kind) {
    const [c1, c2] = TOPIC_COLORS[item.topic];
    const seed = E.fnv1a(item.id);
    const w = kind === 'frame' ? 90 : 320;
    const h = kind === 'frame' ? 160 : 180;
    let shapes = '';
    for (let i = 0; i < 5; i += 1) {
      const x = ((seed >>> (i * 3)) % 100) / 100;
      const y = ((seed >>> (i * 5 + 1)) % 100) / 100;
      const r = 12 + ((seed >>> (i * 2)) % 30);
      shapes += '<circle cx="' + (x * w).toFixed(1) + '" cy="' + (y * h).toFixed(1) + '" r="' + r + '" fill="' + (i % 2 ? c1 : c2) + '" opacity="0.' + (35 + (i * 11) % 40) + '"/>';
    }
    const label = kind === 'frame' ? 'Frame' : item.mediaType === 'video' ? 'Synthetic video placeholder' : 'Synthetic image placeholder';
    return (
      '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(label) + '">' +
      '<rect width="' + w + '" height="' + h + '" fill="' + (kind === 'frame' ? '#f4f6f8' : '#10202a') + '"/>' + shapes +
      (kind === 'frame' ? '' : item.mediaType === 'video' ? '<circle cx="' + w / 2 + '" cy="' + h / 2 + '" r="22" fill="rgba(255,255,255,0.9)"/><path d="M' + (w / 2 - 6) + ' ' + (h / 2 - 11) + 'l18 11-18 11z" fill="#10202a"/><rect x="16" y="' + (h - 18) + '" width="' + (w - 32) + '" height="4" rx="2" fill="rgba(255,255,255,0.35)"/><rect x="16" y="' + (h - 18) + '" width="' + ((w - 32) * 0.3).toFixed(0) + '" height="4" rx="2" fill="#fff"/>' : '') +
      (kind === 'frame' ? '<text x="' + w / 2 + '" y="' + (h - 8) + '" text-anchor="middle" font-size="9" fill="#687784" font-family="sans-serif">synthetic</text>' : '<text x="' + w / 2 + '" y="22" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.7)" font-family="sans-serif" letter-spacing="1">' + esc(label.toUpperCase()) + ' · NO REAL CONTENT</text>') +
      '</svg>'
    );
  }

  function labelFor(topic, fieldId, value) {
    const f = E.fieldById(D.FORMS[topic], fieldId);
    if (!f || !f.options) return String(value);
    if (Array.isArray(value)) return value.map((v) => labelFor(topic, fieldId, v)).join(', ') || '—';
    const o = f.options.find((x) => x.id === value);
    return o ? o.label : String(value);
  }

  function keyFields(topic) {
    if (topic === 'MentalHealth') return ['relevance', 'mental_health_primary_category', 'stance_valence'];
    if (topic === 'Immigration') return ['relevance', 'immigration_primary_frame', 'immigration_frame_relationship'];
    return ['cancer_relevance', 'possible_misinformation', 'misinformation_types'];
  }

  function plausibleAnswers(topic, item) {
    const t = item.truth;
    if (topic === 'MentalHealth') return { relevance: t.primary === 'off_topic_ambiguous' ? 'off_topic' : 'on_topic', content_genre: t.genre, stance_valence: t.stance, confidence: 'high', mental_health_primary_category: t.primary, mental_health_secondary_categories: [], clinical_condition_mapping: 'not_applicable', risk_flags: t.primary === 'misinformation_pseudoscience' ? ['misinformation'] : ['none'], annotator_notes: '' };
    if (topic === 'Immigration') return { relevance: 'on_topic', content_genre: t.genre, stance_valence: t.stance, confidence: 'high', immigration_primary_frame: t.primary, immigration_secondary_frames: [], immigration_frame_relationship: t.relationship, annotator_notes: '' };
    const out = { cancer_relevance: t.relevance, possible_misinformation: t.misinformation, evidence_explanation: t.misinformation === 'yes' ? 'The on-screen text makes a treatment claim with no evidence.' : t.relevance === 'yes' ? 'Cancer is discussed factually; no unsupported claim.' : 'The post is not about cancer.' };
    if (t.misinformation === 'yes') out.misinformation_types = t.types.length ? t.types : ['other'];
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Screens                                                             */
  /* ------------------------------------------------------------------ */

  function screenLogin() {
    return (
      '<div class="auth-shell"><div class="auth-panel"><span class="eyebrow">Annotation Platform</span><h1>Welcome back</h1><p class="small muted">Sign in to manage or annotate research datasets with images, videos, and domain-specific codebooks.</p>' +
      '<div class="field"><label class="field-label" for="login-user">Username or email</label><input class="text-input" id="login-user" value="annotator.demo" readonly /></div>' +
      '<div class="field"><label class="field-label" for="login-pass">Password</label><input class="text-input" id="login-pass" type="password" value="demo-password" readonly /></div>' +
      '<button type="button" class="btn btn-primary btn-block" data-action="an-login">Sign in</button><p class="xs muted" style="margin:0.6rem 0 0">Demo account. The password is not checked.</p></div></div>'
    );
  }

  function screenConsent() {
    const all = A.consentChecks.every(Boolean);
    return (
      appTopbar() +
      '<div class="consent-shell"><div class="consent-head"><div><span class="eyebrow">Before you begin</span><h1>Research participation consent</h1><p class="muted">Hello ' + esc(me().name) + '. Please review the full consent form before beginning annotation.</p></div><span class="consent-irb">' + esc(D.CONSENT.irb) + '</span></div>' +
      '<div class="notice notice-advisory">' + icon('alert') + '<p><strong>Content advisory.</strong> Tasks may include sensitive public social-media content. Participation is voluntary; you may skip content or stop at any time.</p></div>' +
      '<div class="consent-grid"><div class="consent-doc" id="consent-doc" tabindex="0"><h3>Consent to take part in research</h3>' + D.CONSENT.paragraphs.map((p) => '<p>' + esc(p) + '</p>').join('') + '<p class="xs muted">Version ' + esc(D.CONSENT.version) + ' · synthetic text for the demo</p></div>' +
      '<div class="card consent-decision"><span class="eyebrow">Your decision</span><h2>Confirm each statement</h2>' +
      D.CONSENT.confirmations.map((c, i) => '<label class="check-row"><input type="checkbox" data-change="an-consent-check" data-index="' + i + '" ' + (A.consentChecks[i] ? 'checked' : '') + ' /><span>' + esc(c) + '</span></label>').join('') +
      '<div class="btn-row" style="margin-top:0.8rem"><button type="button" class="btn btn-primary" data-action="an-consent-agree" ' + (all ? '' : 'disabled') + '>I agree to participate</button><button type="button" class="btn btn-secondary" data-action="an-consent-decline">I do not wish to participate</button></div>' +
      '<p class="xs muted" style="margin:0.6rem 0 0">Declining signs you out and records no consent. You may also log out at any time.</p></div></div></div>'
    );
  }

  function taskCard(t) {
    const lock = taskLock(t);
    const c = App.taskCounts(t.id, ME);
    const pctDone = c.total ? Math.round((c.done / c.total) * 100) : 0;
    return (
      '<article class="task-card' + (t.status === 'paused' ? ' is-paused' : '') + '"><div class="task-card-head"><div>' + topicPill(t.topic) + '<h3>' + esc(t.name) + '</h3></div>' + chip(lock.label) + '</div>' +
      '<p class="instructions">' + esc(t.instructions) + '</p>' +
      '<div class="meta"><b>' + c.done + '/' + c.total + '</b> completed · ' + (c.total - c.done) + ' remaining</div><div class="progress-bar" aria-label="Progress"><i style="width:' + pctDone + '%"></i></div>' +
      '<div class="task-card-foot"><span>' + (t.mode === 'topic_pool' ? 'Shared pool' : 'Assigned to you') + '</span>' + (lock.action ? '<button type="button" class="btn btn-primary btn-sm" data-action="' + lock.action + '" data-task="' + t.id + '" data-topic="' + t.topic + '">' + esc(lock.button) + '</button>' : '<button type="button" class="btn btn-secondary btn-sm" disabled>' + esc(lock.button) + '</button>') + '</div></article>'
    );
  }

  function screenTasks() {
    const tasks = myTasks();
    const remaining = tasks.filter((t) => t.status === 'active' && App.taskCounts(t.id, ME).done < App.taskCounts(t.id, ME).total).length;
    return (
      appTopbar() +
      '<div class="app-screen"><div class="tasks-head"><div><span class="eyebrow">Annotator workspace</span><h1>My Tasks</h1><p>Choose which assignment to work on. Incomplete required assignments are shown first.</p><div class="domain-pills">' + me().topics.map(topicPill).join('') + '</div></div><div class="small muted">' + remaining + ' required remaining</div></div>' +
      (A.safety.status === 'paused' ? '<div class="notice notice-info">' + icon('info') + '<p>You stopped Mental Health assignments. Other domains stay available. The study team has been notified to reassign your Mental Health items.</p></div>' : '') +
      '<div class="section-label"><h2>Assigned work</h2><p>These tasks were assigned to you. Complete all of them in the order that works best for you.</p></div>' +
      '<div class="task-card-grid">' + tasks.map(taskCard).join('') + '</div>' +
      '<div class="section-label"><h2>Training &amp; examples</h2><p>Five worked examples plus five practice items per topic.</p></div>' +
      '<div class="task-card-grid">' + Object.keys(D.TOPICS).map((topic) => {
        const tr = A.training[topic];
        const status = tr.phase === 'completed' ? 'Completed · matched ' + tr.matched + ' of 5' : tr.phase === 'required' ? 'Not started' : 'In progress';
        return '<article class="task-card"><div class="task-card-head"><div>' + topicPill(topic) + '<h3>' + esc(D.TOPICS[topic].label) + ' training</h3></div>' + chip(tr.phase === 'completed' ? 'complete' : tr.phase === 'required' ? 'not started' : 'in progress') + '</div><p class="instructions">5 examples + 5 practice items · ' + esc(status) + '</p><div class="task-card-foot"><span>About 15–25 min</span><button type="button" class="btn btn-secondary btn-sm" data-action="an-training-open" data-topic="' + topic + '">' + (tr.phase === 'completed' ? 'Review' : tr.phase === 'required' ? 'Begin training' : 'Continue') + '</button></div></article>';
      }).join('') + '</div></div>'
    );
  }

  function compactItem(item) {
    return (
      '<div class="item-viewer"><span class="eyebrow">' + (item.mediaType === 'video' ? 'Video evidence' : 'Image evidence') + '</span><h1 style="font-size:1.05rem">' + esc(item.title) + '</h1><span class="external-id">' + esc(item.externalId) + '</span>' +
      '<div class="media-stage" style="max-height:170px">' + mediaSvg(item) + '</div>' +
      '<div class="text-block"><h4>Transcript</h4><p>' + esc(item.transcript) + '</p></div></div>'
    );
  }

  function goldCard(topic, answers, explanation, title) {
    const rows = keyFields(topic).filter((f) => answers[f] !== undefined).map((f) => '<dt>' + esc(E.fieldLabel(D.FORMS[topic], f)) + '</dt><dd>' + esc(labelFor(topic, f, answers[f])) + '</dd>').join('');
    return '<div class="gold-answer"><span class="eyebrow">' + esc(title) + '</span><dl>' + rows + '</dl></div>' + (explanation ? '<div class="definition"><strong>Why this is the gold answer.</strong> ' + esc(explanation) + '</div>' : '');
  }

  function screenTraining() {
    const topic = A.trainingTopic;
    if (!topic) {
      return (
        appTopbar() +
        '<div class="app-screen"><div class="training-hub-head"><div><span class="eyebrow">Guided practice</span><h1>Learn the task before you begin</h1><p class="muted">Review five worked examples, then annotate five practice items. The quiz teaches the coding approach—it is not a test of you.</p></div><div class="training-time">About 15–25 min<br />per domain · progress is saved</div></div>' +
        '<div class="notice notice-info">' + icon('info') + '<p>Tasks unlock separately after you finish the tutorial and submit all five practice answers for that domain.</p></div>' +
        '<div class="domain-card-grid">' + Object.keys(D.TOPICS).map((t) => {
          const tr = A.training[t];
          return '<article class="domain-card">' + topicPill(t) + '<h3 style="margin-top:0.4rem">' + esc(D.TOPICS[t].label) + '</h3><div class="step-meter"><div><span class="dot ' + (tr.phase !== 'required' && tr.phase !== 'tutorial' ? 'is-done' : '') + '">1</span> 5 guided examples</div><div><span class="dot ' + (tr.phase === 'completed' ? 'is-done' : '') + '">2</span> 5 practice items</div></div><button type="button" class="btn ' + (tr.phase === 'completed' ? 'btn-secondary' : 'btn-primary') + ' btn-sm" data-action="an-training-start" data-topic="' + t + '">' + (tr.phase === 'completed' ? 'Review or practice again' : tr.phase === 'required' ? 'Begin training' : 'Continue training') + '</button></article>';
        }).join('') + '</div><div class="btn-row"><button type="button" class="btn btn-ghost" data-action="an-go-tasks">Back to My Tasks</button></div></div>'
      );
    }
    const tr = A.training[topic];
    const T = D.TRAINING[topic];
    const label = D.TOPICS[topic].label;
    if (tr.phase === 'tutorial') {
      const ex = T.tutorial[tr.tutorialIndex];
      const item = D.itemById(ex.itemId);
      const covered = item.sensitiveCover && !tr.covered[tr.tutorialIndex];
      const dots = T.tutorial.map((_, i) => '<i class="' + (i < tr.tutorialIndex ? 'is-done' : i === tr.tutorialIndex ? 'is-current' : '') + '"></i>').join('');
      return (
        appTopbar() +
        '<div class="app-screen"><div class="training-stage-head"><div><span class="eyebrow">Guided example · ' + esc(label) + '</span><h1 style="font-size:1.2rem">' + (tr.tutorialIndex + 1) + '/5 examples</h1></div><div class="btn-row"><span class="progress-dots" aria-hidden="true">' + dots + '</span><button type="button" class="btn btn-ghost btn-sm" data-action="an-training-leave">Leave training</button></div></div>' +
        (covered
          ? '<div class="training-cover"><span class="eyebrow">Sensitive example covered</span><h2>Choose whether to view guided example ' + (tr.tutorialIndex + 1) + '</h2><p class="small muted">Mental Health examples start hidden. You may view it, skip it without a reason, or open the support resources.</p><div class="btn-row" style="justify-content:center"><button type="button" class="btn btn-primary" data-action="an-cover-reveal">View this example</button><button type="button" class="btn btn-secondary" data-action="an-tutorial-next">Prefer not to view</button><button type="button" class="btn btn-ghost" data-action="an-support-open">Safety &amp; Support</button></div></div>'
          : '<div class="training-stage">' + compactItem(item) + '<div><div class="card">' + goldCard(topic, ex.answers, ex.explanation, 'Expert answer') + '</div></div></div>') +
        '<div class="btn-row" style="margin-top:0.9rem"><button type="button" class="btn btn-secondary" data-action="an-tutorial-prev" ' + (tr.tutorialIndex === 0 ? 'disabled' : '') + '>Previous</button><button type="button" class="btn btn-primary" data-action="an-tutorial-next">' + (tr.tutorialIndex === 4 ? 'Finish tutorial' : 'Next example') + '</button></div></div>'
      );
    }
    if (tr.phase === 'quiz') {
      const ex = T.practice[tr.quizIndex];
      const item = D.itemById(ex.itemId);
      const schema = D.FORMS[topic];
      const primaryId = schema.settings.agreement_field;
      const field = E.fieldById(schema, primaryId);
      const answer = (tr.quizAnswers[tr.quizIndex] || {})[primaryId];
      const saved = Object.keys(tr.quizAnswers).length;
      const dots = T.practice.map((_, i) => '<i class="' + (tr.quizAnswers[i] ? 'is-done' : i === tr.quizIndex ? 'is-current' : '') + '"></i>').join('');
      return (
        appTopbar() +
        '<div class="app-screen"><div class="training-stage-head"><div><span class="eyebrow">Practice quiz · ' + esc(label) + '</span><h1 style="font-size:1.2rem">Practice item ' + (tr.quizIndex + 1) + ' of 5</h1></div><div class="btn-row"><span class="progress-dots" aria-hidden="true">' + dots + '</span><span class="xs muted">' + saved + ' of 5 answers saved</span></div></div>' +
        '<div class="training-stage">' + compactItem(item) + '<div class="card"><span class="eyebrow">Your answer</span><div class="field"><label class="field-label" for="quiz-primary">' + esc(field.label) + ' <span class="req">*</span></label><select class="select-input" id="quiz-primary" data-change="an-quiz-answer"><option value="">Choose…</option>' + field.options.map((o, i) => '<option value="' + o.id + '"' + (answer === o.id ? ' selected' : '') + '>' + (field.options.length > 4 ? i + 1 + '. ' : '') + esc(o.label) + '</option>').join('') + '</select></div>' +
        (answer && field.options.find((o) => o.id === answer && o.definition) ? '<div class="definition">' + esc(field.options.find((o) => o.id === answer).definition) + '</div>' : '') +
        '<p class="xs muted">The expert answer stays hidden until you submit all five.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-action="an-quiz-next" ' + (answer ? '' : 'disabled') + '>' + (tr.quizIndex === 4 ? 'Submit and compare answers' : 'Save &amp; next') + '</button><button type="button" class="btn btn-ghost btn-sm" data-action="an-quiz-autofill">Fill with the expert answer (demo)</button></div></div></div></div>'
      );
    }
    if (tr.phase === 'review' || tr.phase === 'completed') {
      const schema = D.FORMS[topic];
      const primaryId = schema.settings.agreement_field;
      const rows = T.practice.map((ex, i) => {
        const mine = (tr.quizAnswers[i] || {})[primaryId];
        const match = mine === ex.answers[primaryId];
        return '<div class="quiz-review-row"><span class="mark ' + (match ? 'is-match' : '') + '">' + icon(match ? 'check' : 'x', 'ico-sm') + '</span><div><small>Your answer · item ' + (i + 1) + '</small>' + esc(mine ? labelFor(topic, primaryId, mine) : '—') + '</div><div><small>Expert answer</small>' + esc(labelFor(topic, primaryId, ex.answers[primaryId])) + '<div class="xs muted">' + esc(ex.explanation) + '</div></div></div>';
      }).join('');
      return (
        appTopbar() +
        '<div class="app-screen"><span class="eyebrow">Training complete</span><h1>' + esc(label) + ' tasks are unlocked</h1><p class="muted">You matched <strong>' + tr.matched + ' of 5</strong> expert examples. Your score helps you learn and is not a pass/fail judgment.</p>' + rows +
        '<div class="btn-row" style="margin-top:0.9rem"><button type="button" class="btn btn-primary" data-action="an-go-tasks">Go to My Tasks</button><button type="button" class="btn btn-secondary" data-action="an-training-start" data-topic="' + topic + '" data-again="1">Practice again</button></div></div>'
      );
    }
    // overview before starting
    return (
      appTopbar() +
      '<div class="app-screen">' + topicPill(topic) + '<h1 style="margin-top:0.4rem">' + esc(label) + ' training</h1><div class="step-meter" style="max-width:420px"><div><span class="dot">1</span> Learn from experts: five worked examples with the expert answer explained</div><div><span class="dot">2</span> Try five yourself: answer blind, then compare with the expert</div></div><p class="small muted">Every completed quiz unlocks the domain. Your score helps you learn and is not a pass/fail judgment.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-action="an-tutorial-begin">Start tutorial</button><button type="button" class="btn btn-ghost" data-action="an-training-leave">Back</button></div></div>'
    );
  }

  function resourcesHtml() {
    return D.SAFETY_POLICY.resources.map((r) => '<div class="resource' + (r.emergency ? ' urgent' : '') + '"><strong>' + esc(r.label) + '</strong><span class="small">' + esc(r.description) + '</span><div class="contacts">' + (r.email ? '<span class="pill">Email ' + esc(r.email) + '</span>' : '') + (r.phone ? '<span class="pill">Call ' + esc(r.phone) + '</span>' : '') + (r.url ? '<span class="pill">Website</span>' : '') + '</div></div>').join('');
  }

  function screenSafety() {
    const p = D.SAFETY_POLICY;
    const list = (items) => '<ul>' + items.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>';
    return (
      appTopbar() +
      '<div class="app-screen"><div class="mh-safety-card"><div class="mh-safety-head"><div><span class="eyebrow">Mental Health safety orientation</span><h1>' + esc(p.title) + '</h1></div><button type="button" class="btn btn-secondary btn-sm" data-action="an-support-open">' + icon('shield-alert', 'ico-sm') + ' Safety &amp; Support</button></div>' +
      '<div class="notice notice-advisory">' + icon('alert') + '<p>' + esc(p.advisory) + '</p></div>' +
      '<div class="mh-orientation-grid"><section><h2>Content you may encounter</h2>' + list(p.contentTopics) + '</section><section><h2>Your role and boundaries</h2>' + list(p.boundaries) + '</section><section><h2>Your choices</h2>' + list(p.choices) + '</section></div>' +
      '<div class="mh-session-guidance">' + esc(p.sessionGuidance) + '</div>' +
      '<div class="mh-ack"><label class="check-row"><input type="checkbox" data-change="an-safety-ack" ' + (A.safety.ack ? 'checked' : '') + ' /><span>I have read this advisory, understand my choices, and want to begin Mental Health annotation.</span></label></div>' +
      '<div class="btn-row"><button type="button" class="btn btn-primary" data-action="an-safety-continue" ' + (A.safety.ack ? '' : 'disabled') + '>I understand and want to continue</button><button type="button" class="btn btn-secondary" data-action="an-go-tasks">Not now</button><button type="button" class="text-danger" data-action="an-safety-stop">Stop Mental Health assignments</button></div>' +
      '<p class="xs muted" style="margin:0.8rem 0 0">Policy version ' + esc(p.version) + ' · recorded once per version</p></div></div>'
    );
  }

  function screenAdvisory() {
    const t = App.task(A.taskId);
    const p = D.SAFETY_POLICY;
    const count = App.taskItemIds(t.id, ME).length;
    return (
      appTopbar() +
      '<div class="app-screen"><div class="mh-safety-card compact">' + topicPill('MentalHealth') + '<span class="eyebrow" style="margin-top:0.5rem">Before opening this task</span><h1>' + esc(t.name) + '</h1><p class="small"><strong>' + count + ' items.</strong> ' + esc(t.instructions) + '</p>' +
      '<div class="notice notice-advisory">' + icon('alert') + '<p>' + esc(p.advisory) + '</p></div><div class="mh-session-guidance">' + esc(p.sessionGuidance) + '</div>' +
      '<p class="small muted">No task items or media have been opened yet. You may return to My Tasks instead.</p>' +
      '<div class="btn-row"><button type="button" class="btn btn-primary" data-action="an-advisory-begin">Begin task</button><button type="button" class="btn btn-secondary" data-action="an-go-tasks">Back to My Tasks</button><button type="button" class="btn btn-ghost" data-action="an-support-open">Safety &amp; Support</button></div></div></div>'
    );
  }

  /* Workspace ---------------------------------------------------------- */

  function currentTask() {
    return App.task(A.taskId);
  }

  function itemStatus(itemId) {
    const a = App.annotationFor(A.taskId, itemId, ME);
    if (!a) return 'unannotated';
    if (a.status === 'skipped') return a.skipReason === 'prefer_not_to_view' ? 'skipped' : 'skipped';
    return a.status;
  }

  function filteredItems() {
    const items = App.taskItems(A.taskId, ME);
    if (A.filter === 'all') return items;
    return items.filter((i) => itemStatus(i.id) === A.filter);
  }

  function statusCounts() {
    const items = App.taskItems(A.taskId, ME);
    const c = { all: items.length, unannotated: 0, annotated: 0, skipped: 0, needs_review: 0 };
    items.forEach((i) => {
      c[itemStatus(i.id)] += 1;
    });
    return c;
  }

  function currentEval() {
    const t = currentTask();
    return E.evaluateForm(D.FORMS[t.topic], A.draft, A.draftStatus);
  }

  function renderField(schema, field, answers, ev, topic) {
    if (!ev.visible.has(field.id) && field.type !== 'info') return '';
    const req = ev.required.has(field.id) ? ' <span class="req">*</span>' : '';
    const help = field.help ? '<p class="help">' + esc(field.help) + '</p>' : '';
    if (field.type === 'info') {
      return '<div class="field"><div class="definition"><strong>' + esc(field.label) + '.</strong> ' + field.text.map(esc).join(' ') + '</div></div>';
    }
    if (field.type === 'single_choice') {
      const value = answers[field.id];
      const selected = field.options.find((o) => o.id === value);
      if (field.options.length <= 4 && field.options.every((o) => !o.definition)) {
        return '<div class="field"><span class="field-label">' + esc(field.label) + req + '</span><div class="choice-row">' + field.options.map((o) => '<label class="option-card' + (value === o.id ? ' is-selected' : '') + '"><input type="radio" name="' + field.id + '" value="' + o.id + '" data-change="an-field" data-field="' + field.id + '" data-kind="single" ' + (value === o.id ? 'checked' : '') + ' />' + esc(o.label) + '</label>').join('') + '</div>' + (field.definition ? '<details class="plain"><summary>Definition</summary><p class="small muted">' + esc(field.definition) + '</p></details>' : '') + help + '</div>';
      }
      const numbered = field.options.length > 4;
      return '<div class="field"><label class="field-label" for="f-' + field.id + '">' + esc(field.label) + req + '</label><select class="select-input" id="f-' + field.id + '" data-change="an-field" data-field="' + field.id + '" data-kind="single"><option value="">Choose…</option>' + field.options.map((o, i) => '<option value="' + o.id + '"' + (value === o.id ? ' selected' : '') + '>' + (numbered ? i + 1 + '. ' : '') + esc(o.label) + '</option>').join('') + '</select>' + (selected && selected.definition ? '<div class="definition">' + esc(selected.definition) + '</div>' : '') + help + '</div>';
    }
    if (field.type === 'multi_choice') {
      const values = answers[field.id] || [];
      const list = field.options.map((o) => '<label class="check-row"><input type="checkbox" data-change="an-field" data-field="' + field.id + '" data-kind="multi" value="' + o.id + '" ' + (values.includes(o.id) ? 'checked' : '') + ' /><span>' + esc(o.label) + (o.definition ? '<span class="check-desc">' + esc(o.definition) + '</span>' : '') + '</span></label>').join('');
      if (field.options.length > 9) {
        return '<div class="field"><details class="plain"><summary>' + esc(field.label) + req + ' <span class="xs muted">· ' + values.length + ' selected</span></summary><div class="checkbox-list">' + list + '</div></details></div>';
      }
      return '<div class="field"><span class="field-label">' + esc(field.label) + req + ' <span class="xs muted">· select all that apply</span></span><div class="checkbox-list">' + list + '</div>' + help + '</div>';
    }
    if (field.type === 'long_text' || field.type === 'short_text') {
      return '<div class="field"><label class="field-label" for="f-' + field.id + '">' + esc(field.label) + req + '</label><textarea class="text-input" id="f-' + field.id + '" data-input="an-text" data-field="' + field.id + '" placeholder="' + esc(field.placeholder || '') + '">' + esc(answers[field.id] || '') + '</textarea>' + help + '</div>';
    }
    return '';
  }

  function renderForm(topic, answers, ev) {
    const schema = D.FORMS[topic];
    const statusOptions = [['annotated', 'Annotated'], ['skipped', 'Skipped'], ['needs_review', topic === 'MentalHealth' ? 'Needs expert review' : 'Needs review']];
    let html = '<div class="annotation-form" data-topic="' + topic + '"><div class="form-head"><span class="form-icon">' + icon('clipboard') + '</span><div><span class="eyebrow">' + esc(D.TOPICS[topic].label) + ' annotation</span><h2>Evidence assessment</h2><small>' + esc(schema.title) + ' · form v' + schema.version + '</small></div></div>';
    schema.sections.forEach((section, index) => {
      html += '<section class="form-section"><div class="form-section-head"><span class="form-section-number">' + esc(section.number) + '</span><div><h3>' + esc(section.title) + '</h3><p>' + esc(section.description) + '</p></div></div>';
      if (index === 0) {
        html += '<div class="field"><label class="field-label" for="f-status">Workflow status</label><select class="select-input" id="f-status" data-change="an-status">' + statusOptions.map(([v, l]) => '<option value="' + v + '"' + (A.draftStatus === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>';
      }
      section.fields.forEach((f) => {
        html += renderField(schema, f, answers, ev, topic);
      });
      html += '</section>';
    });
    const ready = ev.missing.length === 0 && ev.errors.length === 0;
    let summary;
    if (A.draftStatus === 'skipped') summary = '<div class="required-summary is-ready">Skipping records no answers. The item stays in your queue as skipped.</div>';
    else if (ev.errors.length) summary = '<div class="required-summary is-error">' + ev.errors.map(esc).join('<br />') + '</div>';
    else if (ev.missing.length) summary = '<div class="required-summary" id="required-summary">Complete ' + ev.missing.length + ' required field' + (ev.missing.length > 1 ? 's' : '') + ': ' + ev.missing.map((m) => esc(m.label)).join(' · ') + '</div>';
    else summary = '<div class="required-summary is-ready" id="required-summary">All required fields are complete. Press Save &amp; next or <kbd>s</kbd>.</div>';
    html += summary;
    html += '<div class="sticky-actions"><div class="btn-row"><button type="button" class="btn btn-primary" data-action="an-save" ' + (ready || A.draftStatus === 'skipped' ? '' : 'disabled') + '>' + icon('save', 'ico-sm') + ' Save &amp; next</button><button type="button" class="btn btn-secondary" data-action="an-skip">' + icon('skip', 'ico-sm') + ' Skip</button></div>' + (topic === 'MentalHealth' ? '<button type="button" class="btn mh-prefer-not-view" data-action="an-pnv">' + icon('eye-off', 'ico-sm') + ' Prefer not to view</button>' : '') + '</div></div>';
    return html;
  }

  function screenWorkspace() {
    const t = currentTask();
    const items = App.taskItems(A.taskId, ME);
    if (!A.itemId || !items.some((i) => i.id === A.itemId)) {
      const first = items.find((i) => itemStatus(i.id) === 'unannotated') || items[0];
      if (first) selectItem(first.id, true);
    }
    const item = D.itemById(A.itemId);
    if (!item) return screenComplete();
    const counts = statusCounts();
    const c = App.taskCounts(A.taskId, ME);
    const list = filteredItems();
    const index = items.findIndex((i) => i.id === A.itemId);
    const ev = currentEval();
    const covered = A.overlays.break;
    const mh = t.topic === 'MentalHealth';
    const filterLabel = (key, label) => '<option value="' + key + '"' + (A.filter === key ? ' selected' : '') + '>' + label + ' (' + counts[key] + ')</option>';

    let queue = '<aside class="queue-panel"><div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-action="an-go-tasks">' + icon('chevron-left', 'ico-sm') + ' My Tasks</button></div>';
    queue += '<div class="workspace-task-summary">' + topicPill(t.topic) + '<h3>' + esc(t.name) + '</h3><p>' + esc(t.instructions) + '</p><div class="progress-bar"><i style="width:' + (c.total ? Math.round((c.done / c.total) * 100) : 0) + '%"></i></div><div class="count">' + c.done + ' of ' + c.total + ' done · ' + (c.total - c.done) + ' remaining</div></div>';
    queue += '<div><label class="field-label" for="item-filter">Item status</label><select class="select-input" id="item-filter" data-change="an-filter">' + filterLabel('all', 'All') + filterLabel('unannotated', 'Unannotated') + filterLabel('annotated', 'Annotated') + filterLabel('skipped', 'Skipped') + filterLabel('needs_review', mh ? 'Needs expert review' : 'Needs review') + '</select></div>';
    queue += '<ul class="item-list" id="item-list">' + list.map((i) => {
      const st = itemStatus(i.id);
      const pos = items.findIndex((x) => x.id === i.id) + 1;
      return '<li><button type="button" class="item-button' + (i.id === A.itemId ? ' is-active' : '') + '" data-action="an-select-item" data-item="' + i.id + '" id="item-btn-' + i.id + '"><span class="status-text ' + st + '">' + st.replace('_', ' ') + '</span><span class="title">' + pos + '. ' + esc(i.title) + '</span><span class="sub"><span class="media-chip ' + i.mediaType + '">' + i.mediaType + '</span>' + esc(i.platform) + '</span></button></li>';
    }).join('') + '</ul>';
    queue += '<div class="shortcut-hints"><strong>Shortcuts</strong><kbd>↑</kbd>/<kbd>↓</kbd> or <kbd>j</kbd>/<kbd>k</kbd> — items · <kbd>1</kbd>-<kbd>9</kbd> — primary label · <kbd>s</kbd> — save &amp; next · <kbd>x</kbd> — skip</div></aside>';

    let panel = '<section class="item-panel">';
    if (mh) panel += '<div class="mh-safety-toolbar">' + icon('shield-alert', 'ico-sm') + ' Safety controls <span style="flex:1"></span><button type="button" class="btn btn-secondary" data-action="an-support-open">Safety &amp; Support</button><button type="button" class="btn btn-secondary" data-action="an-break">' + icon('pause', 'ico-sm') + ' Take a break</button><button type="button" class="btn btn-secondary" data-action="an-save-leave">' + icon('save', 'ico-sm') + ' Save &amp; leave</button></div>';
    panel += '<div class="task-banner"><span>' + esc(t.name) + '</span><span>Item ' + (index + 1) + ' of ' + items.length + '</span></div>';
    panel += '<div class="item-viewer"><div class="item-viewer-head"><div><span class="eyebrow">' + (item.mediaType === 'video' ? 'Video evidence' : 'Image evidence') + '</span><h1>' + esc(item.title) + '</h1><span class="external-id">' + esc(item.externalId) + '</span></div><div class="btn-row"><span class="media-chip ' + item.mediaType + '">' + item.mediaType + '</span>' + chip(itemStatus(item.id)) + '</div></div>';
    panel += '<div class="summary-grid"><div><span>Seed query</span><strong style="font-size:0.95rem">' + esc(item.seedQuery) + '</strong></div><div><span>Platform</span><strong style="font-size:0.95rem">' + esc(item.platform) + '</strong></div><div><span>Rank</span><strong style="font-size:0.95rem">' + item.rank + '</strong></div></div>';
    if (item.mediaType === 'video') panel += '<div class="media-stage' + (covered ? ' is-covered' : '') + '">' + mediaSvg(item) + (covered ? '<span class="covered-label">Media paused and covered</span>' : '') + '</div><p class="media-guidance">Watch the full video and listen to the audio before recording your assessment. (' + item.durationSec + ' s)</p>';
    panel += '<p class="small" style="margin:0.4rem 0 0.2rem"><strong>Companion screenshots</strong> · ' + item.frames + ' still frames available</p><div class="frame-grid' + (covered ? ' is-covered' : '') + '">' + Array.from({ length: item.frames }).map((_, i) => '<div class="frame">' + mediaSvg(Object.assign({}, item, { id: item.id + '-' + i }), 'frame') + '</div>').join('') + (covered ? '<span class="covered-label">Covered</span>' : '') + '</div>';
    if (t.topic === 'CancerMisinformation') panel += '<div class="btn-row"><button type="button" class="btn btn-secondary btn-sm" disabled>' + icon('external', 'ico-sm') + ' Load the supplied post (disabled in demo)</button></div>';
    panel += '<div class="text-block"><h4>Snippet</h4><p>' + esc(item.snippet) + '</p></div><div class="text-block"><h4>Description</h4><p>' + esc(item.description) + '</p></div><div class="text-block"><h4>Transcript</h4><p>' + esc(item.transcript) + '</p></div></div></section>';

    const formPanel = '<aside class="form-panel" id="form-panel">' + renderForm(t.topic, A.draft, ev) + '</aside>';

    let overlays = '';
    if (A.overlays.support) {
      overlays += '<div class="support-drawer" role="dialog" aria-label="Safety and support"><div class="drawer"><span class="eyebrow">Mental Health annotation</span><h2>Safety &amp; Support</h2><div class="notice notice-info">' + icon('info') + '<p>The platform is not a crisis service, and the research team does not monitor annotations in real time.</p></div><p class="small">You may pause, save and leave, or prefer not to view an item without giving a reason.</p>' + resourcesHtml() + '<div class="btn-row" style="margin-top:0.8rem"><button type="button" class="btn btn-primary" data-action="an-support-close">Return to annotation</button></div></div></div>';
    }
    if (A.overlays.break) {
      overlays += '<div class="break-screen" role="dialog" aria-label="Break"><div class="inner"><span class="eyebrow">Media paused and covered</span><h1>Take the time you need</h1><p class="muted">Your current work is preserved. Continue only when you are ready.</p><div class="btn-row" style="justify-content:center"><button type="button" class="btn btn-primary" data-action="an-resume">Continue</button><button type="button" class="btn btn-secondary" data-action="an-save-leave">Save &amp; leave</button><button type="button" class="btn btn-ghost" data-action="an-support-open">Safety &amp; Support</button></div></div></div>';
    }
    if (A.overlays.cover) {
      overlays += '<div class="item-cover"><div class="inner"><span class="eyebrow" style="color:rgba(255,255,255,0.75)">Media covered</span><h2>Recording your preference</h2><p>This item will not be shown to you again, and no replacement item will be added.</p></div></div>';
    }
    return appTopbar() + '<div class="workspace" id="annotator-workspace" data-topic="' + t.topic + '" style="position:relative">' + queue + panel + formPanel + overlays + '</div>';
  }

  function screenComplete() {
    const t = currentTask();
    const c = t ? App.taskCounts(t.id, ME) : { total: 0 };
    return (
      appTopbar() +
      '<div class="app-screen"><div class="card task-complete"><span class="eyebrow">Task complete</span><h2>Your annotation task is complete</h2><p>All ' + c.total + ' assigned items have saved answers. Thank you for your contribution. You can review your answers or return to My Tasks.</p><p class="small muted">These items were presented for research; their views are not endorsed by the study team. Take a break if you need one.</p>' +
      (t && t.topic === 'MentalHealth' ? '<div class="notice notice-info" style="text-align:left">' + icon('info') + '<p>Before moving on, you may pause here or open Safety &amp; Support.</p></div>' : '') +
      '<div class="btn-row" style="justify-content:center"><button type="button" class="btn btn-primary" data-action="an-go-tasks">Back to My Tasks</button><button type="button" class="btn btn-secondary" data-action="an-open-task" data-task="' + (t ? t.id : '') + '">Review answers</button><a class="btn btn-ghost" href="#manager/progress">See it in Progress</a></div></div></div>'
    );
  }

  const SCREENS = { login: screenLogin, consent: screenConsent, tasks: screenTasks, training: screenTraining, safety: screenSafety, advisory: screenAdvisory, workspace: screenWorkspace, complete: screenComplete };

  const URLS = { login: '/login', consent: '/consent', tasks: '/tasks', training: '/training', safety: '/safety/mental-health', advisory: '/tasks/advisory', workspace: '/tasks/items', complete: '/tasks/complete' };

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  function helpersHtml() {
    if (A.step === 'workspace') {
      return '<div class="helpers"><span class="xs muted">Demo shortcuts</span><button type="button" class="btn btn-secondary btn-sm" data-action="an-autofill">' + icon('wand', 'ico-sm') + ' Fill this item with a plausible answer</button><button type="button" class="btn btn-secondary btn-sm" data-action="an-autofinish">' + icon('shuffle', 'ico-sm') + ' Finish the rest of this task for me</button></div>';
    }
    if (A.step === 'training' && A.trainingTopic && (A.training[A.trainingTopic].phase === 'tutorial' || A.training[A.trainingTopic].phase === 'quiz')) {
      return '<div class="helpers"><span class="xs muted">Demo shortcut</span><button type="button" class="btn btn-secondary btn-sm" data-action="an-training-fast">' + icon('wand', 'ico-sm') + ' Complete this training for me</button></div>';
    }
    if (A.step === 'consent') return '<div class="helpers"><button type="button" class="btn btn-secondary btn-sm" data-action="an-consent-all">' + icon('wand', 'ico-sm') + ' Tick all four for me</button></div>';
    return '';
  }

  function renderAnnotator() {
    const mount = document.getElementById('device-screen');
    if (!mount) return;
    if (!SCREENS[A.step]) A.step = 'login';
    if ((A.step === 'workspace' || A.step === 'advisory' || A.step === 'complete') && !A.taskId) A.step = 'tasks';
    mount.innerHTML = SCREENS[A.step]();
    document.getElementById('journey-layout').classList.toggle('is-wide', A.step === 'workspace');
    const url = document.getElementById('device-url');
    if (url) url.innerHTML = '<span class="device-lock">' + icon('lock', 'ico-sm') + '</span> annotate.oasislab.example<b>' + esc(URLS[A.step]) + '</b>';
    const notes = NOTES[A.step];
    const notesEl = document.getElementById('tour-notes');
    if (notesEl && notes) {
      notesEl.innerHTML = '<div><span class="eyebrow">What is happening</span><h2>' + icon('info', 'ico-sm') + esc(notes.title) + '</h2><ul>' + notes.bullets.map((b) => '<li>' + esc(b) + '</li>').join('') + '</ul></div>' + helpersHtml() + '<details class="plain where"><summary style="padding:0.2rem 0;font-size:0.78rem;color:var(--muted)">For technical readers</summary><code>' + esc(notes.where) + '</code></details>';
    }
    App.syncHash('annotator', A.step);
  }

  function go(step) {
    A.step = step;
    renderAnnotator();
    const device = document.querySelector('#view-annotator .device');
    if (device && S.route.view === 'annotator') {
      const top = device.getBoundingClientRect().top + window.scrollY - 76;
      if (window.scrollY > top) window.scrollTo({ top, behavior: S.motion ? 'smooth' : 'auto' });
    }
  }

  function selectItem(itemId, silent) {
    A.itemId = itemId;
    const existing = App.annotationFor(A.taskId, itemId, ME);
    A.draft = existing && existing.answers ? JSON.parse(JSON.stringify(existing.answers)) : {};
    A.draftStatus = existing ? (existing.status === 'skipped' ? 'annotated' : existing.status) : 'annotated';
    if (!silent) renderAnnotator();
  }

  function nextUnannotated(fromId) {
    const items = App.taskItems(A.taskId, ME);
    const start = items.findIndex((i) => i.id === fromId);
    for (let k = 1; k <= items.length; k += 1) {
      const candidate = items[(start + k) % items.length];
      if (itemStatus(candidate.id) === 'unannotated') return candidate.id;
    }
    return null;
  }

  function finishOrNext(fromId) {
    const next = nextUnannotated(fromId);
    if (next) {
      selectItem(next);
      const btn = document.getElementById('item-btn-' + next);
      if (btn) btn.scrollIntoView({ block: 'nearest' });
    } else {
      go('complete');
    }
    App.refresh('manager');
  }

  function saveCurrent(status) {
    const t = currentTask();
    const ev = currentEval();
    if (status !== 'skipped' && (ev.missing.length || ev.errors.length)) {
      const summary = document.getElementById('required-summary');
      if (summary) summary.focus && summary.focus();
      App.toast(ev.errors[0] || 'Complete the required fields first.');
      return false;
    }
    App.saveAnnotation({ taskId: t.id, itemId: A.itemId, annotatorId: ME, status, answers: status === 'skipped' ? {} : ev.canonical, skipReason: null });
    const c = App.taskCounts(t.id, ME);
    App.toast((status === 'skipped' ? 'Skipped' : 'Saved') + ' · ' + c.done + ' of ' + c.total + ' done');
    finishOrNext(A.itemId);
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Keyboard                                                            */
  /* ------------------------------------------------------------------ */

  document.addEventListener('keydown', (event) => {
    if (S.route.view !== 'annotator' || A.step !== 'workspace') return;
    if (document.getElementById('dlg').open) return;
    const action = E.keyAction(event);
    if (!action) return;
    if (action === 'escape') {
      if (A.overlays.support || A.overlays.break) {
        A.overlays.support = false;
        A.overlays.break = false;
        renderAnnotator();
      }
      return;
    }
    if (A.overlays.support || A.overlays.break || A.overlays.cover) return;
    event.preventDefault();
    const items = App.taskItems(A.taskId, ME);
    const index = items.findIndex((i) => i.id === A.itemId);
    if (action === 'next' || action === 'prev') {
      const target = items[(index + (action === 'next' ? 1 : -1) + items.length) % items.length];
      if (target) selectItem(target.id);
      return;
    }
    if (action === 'save') {
      saveCurrent(A.draftStatus);
      return;
    }
    if (action === 'skip') {
      A.draftStatus = 'skipped';
      saveCurrent('skipped');
      return;
    }
    if (action.label) {
      const t = currentTask();
      const schema = D.FORMS[t.topic];
      const primary = E.formFields(schema).find((f) => f.primary);
      if (!primary || !currentEval().visible.has(primary.id)) return;
      const option = primary.options[action.label - 1];
      if (!option) return;
      A.draft[primary.id] = option.id;
      renderAnnotator();
      const el = document.getElementById('f-' + primary.id) || document.querySelector('input[name="' + primary.id + '"][value="' + option.id + '"]');
      if (el) {
        const card = el.closest('.option-card') || el;
        card.classList.add('is-flash');
        setTimeout(() => card.classList.remove('is-flash'), 400);
      }
    }
  });

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */

  App.actions['an-login'] = () => {
    App.toast('Signed in as annotator.demo');
    go(A.consentAt ? 'tasks' : 'consent');
  };
  App.actions['an-logout'] = () => {
    go('login');
  };
  App.changes['an-consent-check'] = (el) => {
    A.consentChecks[Number(el.dataset.index)] = el.checked;
    renderAnnotator();
  };
  App.actions['an-consent-all'] = () => {
    A.consentChecks = [true, true, true, true];
    renderAnnotator();
  };
  App.actions['an-consent-agree'] = () => {
    if (!A.consentChecks.every(Boolean)) return;
    A.consentAt = App.nowIso();
    App.addAudit('consent.accepted', 'annotator.demo', 'Consent ' + D.CONSENT.version + ' accepted.');
    App.toast('Consent recorded · ' + D.CONSENT.version);
    go('tasks');
  };
  App.actions['an-consent-decline'] = async () => {
    const r = await App.dialog({ title: 'Decline participation?', body: '<p>Declining signs you out and records no consent. You can sign in again later.</p>', confirmLabel: 'Decline and sign out', danger: true });
    if (r.ok) go('login');
  };
  App.actions['an-go-tasks'] = () => {
    A.overlays = { support: false, break: false, cover: null };
    go('tasks');
  };
  App.actions['an-training-hub'] = () => {
    A.trainingTopic = null;
    go('training');
  };
  App.actions['an-training-open'] = (el) => {
    A.trainingTopic = el.dataset.topic;
    go('training');
  };
  App.actions['an-training-start'] = (el) => {
    const topic = el.dataset.topic;
    A.trainingTopic = topic;
    const tr = A.training[topic];
    if (el.dataset.again || tr.phase === 'completed') {
      Object.assign(tr, { phase: 'overview', tutorialIndex: 0, quizIndex: 0, quizAnswers: {}, covered: {} });
      tr.phase = 'tutorial';
    } else if (tr.phase === 'required') tr.phase = 'overview';
    go('training');
  };
  App.actions['an-tutorial-begin'] = () => {
    A.training[A.trainingTopic].phase = 'tutorial';
    renderAnnotator();
  };
  App.actions['an-training-leave'] = () => {
    if (A.training[A.trainingTopic].phase === 'overview') A.training[A.trainingTopic].phase = 'required';
    A.trainingTopic = null;
    renderAnnotator();
  };
  App.actions['an-cover-reveal'] = () => {
    const tr = A.training[A.trainingTopic];
    tr.covered[tr.tutorialIndex] = true;
    renderAnnotator();
  };
  App.actions['an-tutorial-prev'] = () => {
    const tr = A.training[A.trainingTopic];
    tr.tutorialIndex = Math.max(0, tr.tutorialIndex - 1);
    renderAnnotator();
  };
  App.actions['an-tutorial-next'] = () => {
    const tr = A.training[A.trainingTopic];
    if (tr.tutorialIndex >= 4) {
      tr.phase = 'quiz';
      tr.quizIndex = 0;
    } else tr.tutorialIndex += 1;
    renderAnnotator();
  };
  App.changes['an-quiz-answer'] = (el) => {
    const tr = A.training[A.trainingTopic];
    const primaryId = D.FORMS[A.trainingTopic].settings.agreement_field;
    tr.quizAnswers[tr.quizIndex] = Object.assign({}, tr.quizAnswers[tr.quizIndex], { [primaryId]: el.value });
    if (!el.value) delete tr.quizAnswers[tr.quizIndex];
    renderAnnotator();
  };
  App.actions['an-quiz-autofill'] = () => {
    const tr = A.training[A.trainingTopic];
    const primaryId = D.FORMS[A.trainingTopic].settings.agreement_field;
    tr.quizAnswers[tr.quizIndex] = { [primaryId]: D.TRAINING[A.trainingTopic].practice[tr.quizIndex].answers[primaryId] };
    renderAnnotator();
  };
  function submitQuiz() {
    const topic = A.trainingTopic;
    const tr = A.training[topic];
    const primaryId = D.FORMS[topic].settings.agreement_field;
    tr.matched = D.TRAINING[topic].practice.filter((ex, i) => (tr.quizAnswers[i] || {})[primaryId] === ex.answers[primaryId]).length;
    tr.phase = 'completed';
    App.addAudit('training.completed', 'annotator.demo', D.TOPICS[topic].label + ' training completed, matched ' + tr.matched + '/5.');
  }
  App.actions['an-quiz-next'] = () => {
    const tr = A.training[A.trainingTopic];
    if (!tr.quizAnswers[tr.quizIndex]) return;
    if (tr.quizIndex >= 4) submitQuiz();
    else tr.quizIndex += 1;
    renderAnnotator();
  };
  App.actions['an-training-fast'] = () => {
    const topic = A.trainingTopic;
    const tr = A.training[topic];
    const primaryId = D.FORMS[topic].settings.agreement_field;
    D.TRAINING[topic].practice.forEach((ex, i) => {
      tr.quizAnswers[i] = { [primaryId]: i === 3 ? ex.answers[primaryId] : ex.answers[primaryId] };
    });
    // leave one deliberately different so the review shows a miss
    const alt = D.FORMS[topic];
    const f = E.fieldById(alt, primaryId);
    const wrong = f.options.find((o) => o.id !== D.TRAINING[topic].practice[1].answers[primaryId]);
    tr.quizAnswers[1] = { [primaryId]: wrong.id };
    submitQuiz();
    renderAnnotator();
  };

  App.actions['an-safety-open'] = () => go('safety');
  App.changes['an-safety-ack'] = (el) => {
    A.safety.ack = el.checked;
    renderAnnotator();
  };
  App.actions['an-safety-continue'] = () => {
    if (!A.safety.ack) return;
    A.safety.status = 'acknowledged';
    A.safety.acknowledgedAt = App.nowIso();
    const u = me();
    u.mhSafety = 'acknowledged';
    App.addAudit('safety.acknowledged', 'annotator.demo', 'Mental Health safety policy ' + D.SAFETY_POLICY.version + ' acknowledged.');
    App.toast('Safety orientation recorded.');
    go('tasks');
  };
  App.actions['an-safety-stop'] = async () => {
    const r = await App.dialog({ title: 'Stop Mental Health assignments?', body: '<p>Your Mental Health tasks will be paused and the study team will reassign them. Other domains stay available. You do not need to give a reason.</p>', confirmLabel: 'Stop Mental Health assignments', danger: true });
    if (!r.ok) return;
    A.safety.status = 'paused';
    me().mhSafety = 'paused';
    App.addAudit('safety.paused', 'annotator.demo', 'Mental Health assignments paused by the annotator.');
    go('tasks');
  };

  App.actions['an-open-task'] = (el) => {
    const t = App.task(el.dataset.task);
    if (!t) return;
    A.taskId = t.id;
    A.itemId = null;
    A.filter = 'all';
    A.overlays = { support: false, break: false, cover: null };
    if (t.topic === 'MentalHealth' && A.safety.status !== 'acknowledged') return go('safety');
    if (t.topic === 'MentalHealth' && A.step !== 'complete') return go('advisory');
    go('workspace');
  };
  App.actions['an-advisory-begin'] = () => go('workspace');
  App.actions['an-select-item'] = (el) => selectItem(el.dataset.item);
  App.changes['an-filter'] = (el) => {
    A.filter = el.value;
    renderAnnotator();
  };
  App.changes['an-status'] = (el) => {
    A.draftStatus = el.value;
    renderAnnotator();
  };
  App.changes['an-field'] = (el) => {
    const field = el.dataset.field;
    if (el.dataset.kind === 'multi') {
      const values = new Set(A.draft[field] || []);
      if (el.checked) values.add(el.value);
      else values.delete(el.value);
      A.draft[field] = Array.from(values);
    } else {
      if (el.value) A.draft[field] = el.value;
      else delete A.draft[field];
    }
    renderAnnotator();
    const again = document.getElementById(el.id);
    if (again) again.focus({ preventScroll: true });
  };
  App.inputs['an-text'] = (el) => {
    A.draft[el.dataset.field] = el.value;
    const ev = currentEval();
    const summary = document.getElementById('required-summary');
    const saveBtn = document.querySelector('[data-action="an-save"]');
    if (saveBtn) saveBtn.disabled = !(ev.missing.length === 0 && ev.errors.length === 0) && A.draftStatus !== 'skipped';
    if (summary) {
      if (ev.missing.length) {
        summary.className = 'required-summary';
        summary.textContent = 'Complete ' + ev.missing.length + ' required field' + (ev.missing.length > 1 ? 's' : '') + ': ' + ev.missing.map((m) => m.label).join(' · ');
      } else {
        summary.className = 'required-summary is-ready';
        summary.textContent = 'All required fields are complete. Press Save & next or s.';
      }
    }
  };
  App.actions['an-save'] = () => saveCurrent(A.draftStatus);
  App.actions['an-skip'] = () => {
    A.draftStatus = 'skipped';
    saveCurrent('skipped');
  };
  App.actions['an-pnv'] = async () => {
    const r = await App.dialog({ title: 'Prefer not to view this item?', body: '<p>It will be skipped, will not be shown to you again, and no replacement will be added. You do not need to provide a reason.</p>', confirmLabel: 'Prefer not to view' });
    if (!r.ok) return;
    const t = currentTask();
    const itemId = A.itemId;
    App.saveAnnotation({ taskId: t.id, itemId, annotatorId: ME, status: 'skipped', answers: {}, skipReason: 'prefer_not_to_view' });
    A.preferNotToView.push(itemId);
    A.overlays.cover = itemId;
    renderAnnotator();
    App.sequence([
      {
        delay: 800,
        run: () => {
          A.removedItems[t.id] = (A.removedItems[t.id] || []).concat(itemId);
          A.overlays.cover = null;
          App.toast('Recorded. The item was removed from your queue without a replacement.');
          finishOrNext(itemId);
        },
      },
    ]);
  };
  App.actions['an-support-open'] = () => {
    A.overlays.support = true;
    if (A.step === 'workspace') renderAnnotator();
    else App.dialog({ title: 'Safety & Support', body: '<div class="notice notice-info"><p>The platform is not a crisis service, and the research team does not monitor annotations in real time.</p></div>' + resourcesHtml(), confirmLabel: 'Close', cancelLabel: null }).then(() => {
      A.overlays.support = false;
    });
  };
  App.actions['an-support-close'] = () => {
    A.overlays.support = false;
    renderAnnotator();
  };
  App.actions['an-break'] = () => {
    A.overlays.break = true;
    renderAnnotator();
  };
  App.actions['an-resume'] = () => {
    A.overlays.break = false;
    renderAnnotator();
  };
  App.actions['an-save-leave'] = () => {
    A.overlays = { support: false, break: false, cover: null };
    App.toast('Your work is saved. Continue whenever you are ready.');
    go('tasks');
  };
  App.actions['an-autofill'] = () => {
    const t = currentTask();
    const item = D.itemById(A.itemId);
    A.draft = plausibleAnswers(t.topic, item);
    A.draftStatus = 'annotated';
    renderAnnotator();
  };
  App.actions['an-autofinish'] = () => {
    const t = currentTask();
    const remaining = App.taskItems(t.id, ME).filter((i) => itemStatus(i.id) === 'unannotated');
    if (!remaining.length) return go('complete');
    App.sequence(
      remaining.map((item) => ({
        delay: 140,
        run: () => {
          selectItem(item.id, true);
          A.draft = plausibleAnswers(t.topic, item);
          A.draftStatus = 'annotated';
          const ev = currentEval();
          App.saveAnnotation({ taskId: t.id, itemId: item.id, annotatorId: ME, status: 'annotated', answers: ev.canonical });
          renderAnnotator();
        },
      })),
      () => {
        App.toast('All ' + App.taskCounts(t.id, ME).total + ' items saved.');
        go('complete');
        App.refresh('manager');
      },
    );
  };

  App.views.annotator = {
    render(sub) {
      if (sub && STEPS.includes(sub) && sub !== A.step) {
        const allowed = sub === 'login' || (A.consentAt && ['tasks', 'training', 'safety'].includes(sub)) || (A.taskId && ['advisory', 'workspace', 'complete'].includes(sub)) || sub === 'consent';
        if (allowed) A.step = sub;
      }
      renderAnnotator();
    },
  };
})();

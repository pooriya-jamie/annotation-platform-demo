/* Politics relevance: isolated, in-memory preview. No API, storage or media requests. */
(function () {
  'use strict';
  const A = window.App;
  const h = A.esc;
  const icon = A.icon;
  const title = 'Politics — Video Relevance';
  const choices = [
    ['political', 'Political'],
    ['not_political/insufficient_visible_evidence', 'Not political / insufficient visible evidence'],
  ];
  const flagChoices = [
    ['video_inaccessible', 'Video inaccessible'],
    ['language_not_understood', 'Language cannot be understood'],
  ];
  // Layout illustrations only; never items or assignments in the research platform.
  const scenes = [
    { platform: 'TikTok', frames: 3, shape: 'portrait' },
    { platform: 'YouTube', frames: 5, shape: 'landscape' },
    { platform: 'TikTok', frames: 3, shape: 'portrait', unavailable: true },
  ];
  const s = {
    step: 'instructions', index: 0, drafts: {}, saved: {}, skipped: new Set(),
    playing: false, screenshots: false, tools: false, error: '', failNext: false,
    fullFrame: 0, policy: 'count_flags',
  };
  const root = () => document.getElementById('politics-preview-root');
  const current = () => scenes[s.index];
  const emptyRecord = () => ({ political_relevance: null, assessment_flags: [] });
  const draft = () => s.drafts[s.index] || emptyRecord();
  const recordKey = (record) => JSON.stringify(record || emptyRecord());
  const dirty = () => recordKey(draft()) !== recordKey(s.saved[s.index]);
  const completed = (record) => s.policy !== 'pending' && !!record && (choices.some(([value]) => value === record.political_relevance) || (s.policy === 'count_flags' && record.assessment_flags.length > 0));
  const done = () => Object.values(s.saved).filter(completed).length;
  const flagged = () => Object.values(s.saved).filter((record) => record.assessment_flags.length > 0).length;
  const button = (action, text, style = 'btn-secondary', attrs = '') => '<button type="button" class="btn ' + style + '" data-action="pol-' + action + '" ' + attrs + '>' + text + '</button>';

  function instructions() {
    return '<p>Consider <strong>politics from any country</strong>, not US politics only.</p>' +
      '<p><strong>Watch the full video with sound.</strong> Consider its spoken content, imagery, on-screen text, subtitles and captions visibly displayed with the post.</p>' +
      '<div class="pol-guidance-grid"><div class="pol-guidance"><span class="pol-choice-tag">Political</span><p>Politics or public policy is a <strong>substantive topic</strong> of the video.</p><p>Examples include government actions or institutions, laws, regulation, enforcement, courts acting in a public capacity, elections, candidates, political parties, political advocacy, immigration policy, foreign policy, war and national security.</p><p>These are examples, not an exhaustive list. Reporting or explaining politics counts; expressing a political opinion or supporting a party is not required.</p></div>' +
      '<div class="pol-guidance"><span class="pol-choice-tag neutral">Not political / insufficient visible evidence</span><p>The video concerns something else, political content is merely incidental, or there is insufficient evidence to establish substantive political content.</p><p>A politician’s appearance, passing mention, background symbol or brief quotation does not automatically make a video political.</p><p>Personal stories, crime reports, celebrity content and everyday disagreements are not automatically political. Consider whether the video substantively discusses government, public policy or political issues.</p></div></div>' +
      '<div class="pol-access-note">' + icon('flag') + '<div><strong>Access and language problems</strong><p>If the video is inaccessible or its language cannot be understood, flag that separately and <strong>leave the political answer blank</strong>. Do not count access or language problems as nonpolitical.</p><p>Screenshots are supplemental evidence. They do not replace the full video when it is inaccessible or its language cannot be understood.</p></div></div>';
  }

  function policyText() {
    if (s.policy === 'count_flags') return 'Demo example: saved access/language flags count as completed, with a blank political answer.';
    if (s.policy === 'require_political_answers') return 'Demo example: only saved political answers count as completed; flagged items stay unfinished.';
    return 'Demo example: completion is blocked while the flag-completion policy is pending.';
  }

  function header() {
    return '<div class="pol-preview-notice">' + icon('eye') + '<span><strong>Illustrative preview · no study media</strong><span>Responses stay temporarily in this tab and reset on reload. Nothing is submitted.</span></span></div>' +
      '<header class="pol-page-heading"><div><span class="eyebrow">Politics · any country</span><h1 tabindex="-1">' + title + '</h1></div><span class="pol-preview-chip">Annotator preview</span></header>';
  }

  function intro() {
    return '<section class="card pol-instructions"><div class="pol-section-heading">' + icon('book') + '<h2>Before you begin</h2></div>' +
      '<p class="pol-intro-question">Does this video contain <strong>political or public-policy content</strong>?</p>' + instructions() +
      '<div class="pol-intro-actions">' + button('start', 'Open annotation preview ' + icon('arrow-right'), 'btn-primary') + '</div>' +
      '<p class="pol-plan-note">Study plan: <strong>100 videos · 8 reviewer sets · 25 videos per set · 2 independent reviews per video.</strong> Participants enter the study, sign in, read consent and instructions, then start or resume their set. Completion is checked after saved assessments. This page shows three layout illustrations; it does not claim a real set or show participant records.</p>' +
      '<p class="pol-policy-note"><strong>Actual study decision pending:</strong> whether saved access/language flags count toward Prolific completion. Preview tools let you try illustrative policies without changing the study.</p></section>';
  }

  function placeholder(frame, large = false) {
    return '<div class="pol-frame-art ' + (large ? 'large' : '') + '"><div class="pol-frame-orbit"></div><span class="pol-frame-number">' + frame + '</span>' + icon('image') + '<strong>Illustrative screenshot ' + frame + '</strong><span>Supplemental evidence layout · no real post</span></div>';
  }

  function player() {
    const item = current();
    return '<div class="pol-video-card"><div class="pol-video-bar"><strong>' + icon('video') + ' Supplied video</strong><span>' + item.platform + ' · Preview</span></div>' +
      '<div class="pol-player ' + item.shape + ' ' + (s.playing ? 'is-playing' : '') + '"><div class="pol-player-inner"><span class="pol-platform-label">' + item.platform + '</span><div class="pol-placeholder-art" aria-hidden="true"><span></span><span></span><span></span></div>' +
      (item.unavailable ? icon('video') + '<h2>Video unavailable</h2><p>Illustrative access problem.<br>Flag it and leave the political answer blank.</p>' : '<h2>Study video</h2><p>Illustrative player placeholder<br>No real video is loaded</p>' + button('play', icon(s.playing ? 'pause' : 'play'), 'pol-play-button', 'aria-label="' + (s.playing ? 'Pause preview' : 'Play preview') + '"') + '<span class="pol-player-status" aria-live="polite">' + (s.playing ? 'Playing preview · no audio or video' : 'Press Play to preview · use sound in the study') + '</span>') + '</div></div>' +
      '<div class="pol-player-tools">' + button('external', icon('external') + ' Open supplied video', 'btn-ghost btn-sm') + (item.unavailable ? '' : button('replay', icon('refresh') + ' Replay', 'btn-ghost btn-sm')) + '</div><p class="pol-media-privacy">No real source URL or player is included. This preview makes no connection to ' + item.platform + '.</p></div>' +
      '<details class="pol-screenshots" ' + (s.screenshots ? 'open' : '') + '><summary>Supplemental evidence: ' + item.frames + ' screenshots</summary><p>Select an image to enlarge it. Screenshots do not replace an inaccessible or incomprehensible video: flag the problem and leave the political answer blank.</p><div class="pol-frame-list">' + Array.from({ length: item.frames }, (_, i) => button('frame', placeholder(i + 1), 'pol-frame-button', 'data-frame="' + i + '" aria-label="Enlarge screenshot ' + (i + 1) + '"')).join('') + '</div></details>';
  }

  function feedback() {
    if (s.error) return '<span class="pol-error">' + h(s.error) + '</span>';
    const rec = s.saved[s.index];
    if (rec && !dirty()) return rec.assessment_flags.length ? 'Flags saved in this preview · political answer blank' + (completed(rec) ? ' · completed under the demo policy.' : ' · unfinished under the demo policy.') : 'Saved in this preview.';
    if (draft().political_relevance || draft().assessment_flags.length) return 'Draft kept in this tab · not yet completed';
    return 'Choose one political answer, or flag an access/language problem, then save.';
  }

  function answer() {
    const rec = draft();
    const blocked = rec.assessment_flags.length > 0 || current().unavailable;
    return '<aside class="card pol-answer-panel"><span class="eyebrow">Your assessment</span><form id="pol-answer-form"><fieldset><legend>Does this video contain <strong>political or public-policy content</strong>?</legend>' +
      '<section class="pol-quick-guide" aria-labelledby="pol-quick-guide-title"><h3 id="pol-quick-guide-title">Quick guide</h3><p>Watch the full video with sound. Consider spoken content, imagery, on-screen text, subtitles and captions visibly displayed with the post.</p><p>Choose <strong>Political</strong> when politics or public policy is a <strong>substantive topic</strong>, from <strong>any country</strong>. Examples include government, laws, regulation, enforcement, public courts, elections, political advocacy, immigration policy, foreign policy, war and national security. Reporting or explaining politics counts.</p><p>Choose <strong>Not political / insufficient visible evidence</strong> when political content is absent, merely incidental, or cannot be established. A politician’s appearance or passing mention alone is not enough.</p></section>' +
      '<div class="pol-answer-options">' + choices.map(([value, text]) => '<label class="pol-answer-option ' + (rec.political_relevance === value ? 'selected' : '') + (blocked ? ' disabled' : '') + '"><input type="radio" name="political_relevance" value="' + h(value) + '" data-change="pol-answer" ' + (rec.political_relevance === value ? 'checked ' : '') + (blocked ? 'disabled' : '') + '/><span>' + h(text) + '</span></label>').join('') + '</div></fieldset>' +
      '<fieldset class="pol-flags"><legend>Access or language problem <span>(only if applicable)</span></legend>' + flagChoices.map(([value, text]) => '<label class="pol-flag-option"><input type="checkbox" name="assessment_flags" value="' + value + '" data-change="pol-flag" ' + (rec.assessment_flags.includes(value) ? 'checked' : '') + '/><span>' + text + '</span></label>').join('') + '</fieldset>' +
      '<p class="pol-answer-reminder">If the video is inaccessible or its language cannot be understood, flag that separately and <strong>leave the political answer blank</strong>. Do not count access or language problems as nonpolitical.</p><div class="pol-feedback" role="status" aria-live="polite">' + feedback() + '</div>' +
      button('save', icon('save') + ' Save &amp; next', 'btn-primary pol-save') + button('skip', 'Skip for now', 'btn-ghost pol-skip') + '</form><div class="pol-answer-footer">' + policyText() + '<span>Actual study flag-completion policy is pending.</span></div></aside>';
  }

  function previewTools() {
    return '<details class="pol-preview-tools" ' + (s.tools ? 'open' : '') + '><summary>Preview tools</summary><label for="pol-completion-policy">Illustrative completion policy</label><select class="select-input" id="pol-completion-policy" data-change="pol-policy">' +
      [['count_flags', 'Demo: saved flags count as completed'], ['require_political_answers', 'Demo: require political answers'], ['pending', 'Demo: policy pending; block completion']].map(([value, text]) => '<option value="' + value + '" ' + (s.policy === value ? 'selected' : '') + '>' + text + '</option>').join('') + '</select><p>These examples do not set the actual study policy or submit responses. Flags always retain a blank political answer.</p><div>' + button('fail', 'Simulate next save failing', 'btn-secondary btn-sm') + button('reset', 'Reset this preview', 'btn-secondary btn-sm') + '</div></details>';
  }

  function workspace() {
    return '<div class="pol-workspace-top"><div class="pol-progress"><div><strong>' + done() + ' of 3 preview items completed</strong><span>Layout ' + (s.index + 1) + ' of 3</span></div><progress value="' + done() + '" max="3" aria-label="Completed preview assessments"></progress><p>' + flagged() + ' saved flagged item' + (flagged() === 1 ? '' : 's') + ' · political answer blank</p></div>' + button('instructions', icon('book') + ' Instructions', 'btn-secondary btn-sm') + '</div>' +
      '<div class="pol-session-bar"><span>' + icon('info') + ' Save an answer or flag before moving on.</span><div>' + button('break', icon('coffee') + ' Take a break', 'btn-ghost btn-sm') + button('leave', icon('log-out') + ' Save &amp; leave', 'btn-ghost btn-sm') + '</div></div>' +
      '<div class="pol-layout"><section aria-label="Video and supplemental screenshots">' + player() + '</section>' + answer() + '</div>' +
      '<div class="pol-preview-controls"><span>Try another layout:</span>' + scenes.map((scene, index) => button('scene', (index + 1) + '. ' + scene.platform + (scene.unavailable ? ' unavailable' : ''), 'btn-ghost btn-sm', 'data-scene="' + index + '" ' + (index === s.index ? 'disabled' : ''))).join('') + previewTools() + '</div>';
  }

  function paused() {
    return '<section class="card pol-rest-screen">' + icon('coffee') + '<h2>' + (s.step === 'break' ? 'Take your time' : 'Your draft is kept in this tab') + '</h2><p>The media is covered. Return whenever you are ready.</p><p>Save &amp; leave keeps a temporary draft; it does not mark an item completed. Reloading the page resets all preview responses.</p>' + button('resume', 'Return to preview', 'btn-primary') + '</section>';
  }

  function finish() {
    const complete = done() === scenes.length && s.policy !== 'pending';
    return '<section class="card pol-rest-screen">' + icon(complete ? 'check-circle' : 'info') + '<h2>' + (complete ? 'Preview complete' : 'Preview unfinished') + '</h2><p>' + done() + ' of 3 preview items completed under the illustrative policy. ' + flagged() + ' saved flagged item' + (flagged() === 1 ? '' : 's') + ' retain a blank political answer.</p><p>' + policyText() + '</p><p><strong>Actual study flag-completion policy is pending.</strong> Nothing has been submitted to the research platform, and no Prolific completion code is shown.</p>' + button('resume', 'Review preview items', 'btn-primary') + button('reset', 'Reset preview', 'btn-secondary') + previewTools() + '</section>';
  }

  function render() {
    root().innerHTML = '<div class="pol-preview-shell">' + header() + (s.step === 'instructions' ? intro() : s.step === 'workspace' ? workspace() : s.step === 'complete' ? finish() : paused()) + '</div>';
    const details = root().querySelector('.pol-screenshots');
    if (details) details.addEventListener('toggle', () => { s.screenshots = details.open; });
    const tools = root().querySelector('.pol-preview-tools');
    if (tools) tools.addEventListener('toggle', () => { s.tools = tools.open; });
    const form = root().querySelector('#pol-answer-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); A.actions['pol-save'](); });
  }

  function move(index) {
    s.index = index; s.playing = false; s.screenshots = false; s.error = ''; render();
  }
  function next() {
    const nextIndex = scenes.findIndex((_, index) => index > s.index && !s.saved[index]);
    const remaining = scenes.findIndex((_, index) => index !== s.index && !s.saved[index]);
    if (nextIndex >= 0) move(nextIndex);
    else if (remaining >= 0) move(remaining);
    else { s.step = 'complete'; s.playing = false; render(); }
  }
  async function confirmMove(action) {
    if (dirty()) {
      const result = await A.dialog({ title: 'Leave this assessment unfinished?', body: '<p>Your current selection or flags will remain as a draft in this tab. They will not count toward completion until you use Save &amp; next.</p>', confirmLabel: 'Continue', cancelLabel: 'Stay here' });
      if (!result.ok) return;
    }
    action();
  }

  A.views['politics-relevance'] = { render };
  A.actions['pol-start'] = () => { s.step = 'workspace'; render(); window.scrollTo(0, 0); };
  A.actions['pol-instructions'] = () => { s.playing = false; render(); A.dialog({ title: 'Instructions', body: instructions(), confirmLabel: 'Back to annotation', cancelLabel: null }); };
  A.actions['pol-play'] = () => { if (!current().unavailable) { s.playing = !s.playing; render(); } };
  A.actions['pol-replay'] = () => { if (!current().unavailable) { s.playing = true; render(); } };
  A.actions['pol-external'] = () => A.toast('In the study this opens only the supplied video. This preview includes no real source URL.');
  A.changes['pol-answer'] = (el) => {
    if (draft().assessment_flags.length || current().unavailable || !choices.some(([value]) => value === el.value)) return;
    s.drafts[s.index] = { political_relevance: el.value, assessment_flags: [] }; s.error = '';
    root().querySelectorAll('.pol-answer-option').forEach((node) => node.classList.toggle('selected', node.querySelector('input').checked));
    root().querySelector('.pol-feedback').innerHTML = feedback();
  };
  A.changes['pol-flag'] = (el) => {
    if (!flagChoices.some(([value]) => value === el.value)) return;
    const flags = new Set(draft().assessment_flags);
    if (el.checked) flags.add(el.value); else flags.delete(el.value);
    s.drafts[s.index] = { political_relevance: null, assessment_flags: flagChoices.map(([value]) => value).filter((value) => flags.has(value)) };
    s.error = ''; render();
    root().querySelector('input[name="assessment_flags"][value="' + el.value + '"]').focus();
  };
  A.changes['pol-policy'] = (el) => {
    if (!['count_flags', 'require_political_answers', 'pending'].includes(el.value)) return;
    s.policy = el.value; render();
    root().querySelector('#pol-completion-policy').focus();
  };
  A.actions['pol-save'] = () => {
    const rec = draft();
    if (current().unavailable && !rec.assessment_flags.includes('video_inaccessible')) {
      s.error = 'This preview video is unavailable. Select Video inaccessible and leave the political answer blank.';
      render(); root().querySelector('input[value="video_inaccessible"]').focus(); return;
    }
    if (!rec.assessment_flags.length && !choices.some(([value]) => value === rec.political_relevance)) {
      s.error = 'Choose one political answer, or flag an access/language problem, before saving.';
      render(); root().querySelector('input[name="political_relevance"]:not(:disabled), input[name="assessment_flags"]').focus(); return;
    }
    if (rec.assessment_flags.length && rec.political_relevance !== null) {
      s.error = 'A flagged assessment must leave the political answer blank.'; render(); return;
    }
    if (s.failNext) { s.failNext = false; s.error = 'Example save failure. Your selection and flags are safe in this tab. Please try Save & next again.'; render(); return; }
    s.saved[s.index] = { political_relevance: rec.political_relevance, assessment_flags: rec.assessment_flags.slice() };
    s.skipped.delete(s.index); s.error = ''; next();
  };
  A.actions['pol-skip'] = () => confirmMove(() => { s.skipped.add(s.index); next(); });
  A.actions['pol-scene'] = (el) => confirmMove(() => { const index = Number(el.dataset.scene); if (Number.isInteger(index) && index >= 0 && index < scenes.length) move(index); });
  A.actions['pol-break'] = () => { s.playing = false; s.step = 'break'; render(); };
  A.actions['pol-leave'] = () => { s.playing = false; s.step = 'leave'; render(); };
  A.actions['pol-resume'] = () => { s.step = 'workspace'; render(); };
  A.actions['pol-fail'] = () => { s.failNext = true; A.toast('The next preview save will show a retry message without losing your selection or flags.'); };
  A.actions['pol-reset'] = () => {
    const dlg = document.getElementById('pol-image-dialog'); if (dlg && dlg.open) dlg.close();
    s.step = 'instructions'; s.index = 0; s.saved = {}; s.drafts = {}; s.skipped.clear();
    s.error = ''; s.failNext = false; s.playing = false; s.screenshots = false; s.tools = false; s.fullFrame = 0; s.policy = 'count_flags';
    A.hideToast(); render();
  };

  let frameOpener = null;
  function showFrame(index) {
    s.fullFrame = index;
    let dlg = document.getElementById('pol-image-dialog');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'pol-image-dialog'; dlg.className = 'pol-image-dialog'; dlg.setAttribute('aria-labelledby', 'pol-image-title'); document.body.appendChild(dlg);
      dlg.addEventListener('keydown', (event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); showFrame((s.fullFrame + (event.key === 'ArrowRight' ? 1 : -1) + current().frames) % current().frames); } });
      dlg.addEventListener('close', () => { if (frameOpener && document.contains(frameOpener)) frameOpener.focus(); });
    }
    dlg.innerHTML = '<div class="pol-lightbox-head"><h2 id="pol-image-title">Screenshot ' + (index + 1) + ' of ' + current().frames + '</h2>' + button('close-frame', icon('x'), 'btn-ghost', 'aria-label="Close screenshot"') + '</div>' + placeholder(index + 1, true) + '<div class="pol-lightbox-nav">' + button('prev-frame', icon('chevron-left') + ' Previous', 'btn-secondary') + '<span>Arrow keys to navigate · Esc to close</span>' + button('next-frame', 'Next ' + icon('chevron-right'), 'btn-secondary') + '</div>';
    if (!dlg.open) dlg.showModal();
    dlg.querySelector('[data-action="pol-close-frame"]').focus();
  }
  A.actions['pol-frame'] = (el) => {
    const index = Number(el.dataset.frame);
    s.playing = false; render();
    frameOpener = root().querySelector('[data-action="pol-frame"][data-frame="' + index + '"]');
    showFrame(index);
  };
  A.actions['pol-close-frame'] = () => document.getElementById('pol-image-dialog').close();
  A.actions['pol-next-frame'] = () => showFrame((s.fullFrame + 1) % current().frames);
  A.actions['pol-prev-frame'] = () => showFrame((s.fullFrame - 1 + current().frames) % current().frames);
  window.addEventListener('beforeunload', (event) => { if (A.S.route.view === 'politics-relevance' && s.step === 'workspace' && dirty()) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('hashchange', () => {
    const route = (location.hash || '#annotator').replace(/^#/, '').split('/')[0];
    if (route !== 'politics-relevance') {
      s.playing = false;
      const dlg = document.getElementById('pol-image-dialog'); if (dlg && dlg.open) dlg.close();
    }
  });
})();

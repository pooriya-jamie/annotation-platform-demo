/* Mental Health relevance: isolated, in-memory UI preview. No API, storage or media requests. */
(function () {
  'use strict';
  const A = window.App;
  const h = A.esc;
  const icon = A.icon;
  const title = 'Mental Health — Video Relevance';
  const choices = [
    ['related', 'Related'],
    ['not_related_or_insufficient_evidence', 'Not related / insufficient evidence'],
  ];
  // Layout scenarios only; never records in the research dataset or the old demo's annotation store.
  const scenes = [
    { platform: 'TikTok', frames: 3, shape: 'portrait' },
    { platform: 'YouTube', frames: 2, shape: 'landscape' },
    { platform: 'TikTok', frames: 1, shape: 'portrait', unavailable: true },
  ];
  const s = { step: 'instructions', index: 0, drafts: {}, saved: {}, skipped: new Set(), hidden: new Set(), playing: false, screenshots: false, error: '', failNext: false, fullFrame: 0 };
  const root = () => document.getElementById('mh-preview-root');
  const current = () => scenes[s.index];
  const done = () => Object.keys(s.saved).length;
  const dirty = () => (s.drafts[s.index] || '') !== (s.saved[s.index] || '');
  const button = (action, text, style = 'btn-secondary', attrs = '') => '<button type="button" class="btn ' + style + '" data-action="mh-' + action + '" ' + attrs + '>' + text + '</button>';

  function instructions() {
    return '<p>Watch the <strong>whole video with sound</strong> and read the text shown in it. Base your answer on the video itself, not the creator’s profile, comments, or appearance.</p>' +
      '<div class="mh-guidance-grid"><div class="mh-guidance"><span class="mh-choice-tag">Related</span><p>Choose <strong>Related</strong> when mental health is a <strong>substantial topic</strong> of the video. Examples include <strong>depression and anxiety</strong>, other mental-health conditions, personal experiences or symptoms, suicide or self-harm, coping, treatment, access to care, stigma, support, and recovery.</p><p>The video does <strong>not</strong> have to name a diagnosis or use the words “mental health.” Its content and context can establish the connection.</p></div>' +
      '<div class="mh-guidance"><span class="mh-choice-tag neutral">Not related / insufficient evidence</span><p>Choose <strong>Not related / insufficient evidence</strong> when the video is about something else, mentions mental health only incidentally, or does not provide enough information to establish a mental-health connection.</p></div></div>' +
      '<p class="mh-fallback-note">If the video cannot be played, use the available screenshots. <strong>Do not choose Not related merely because the video cannot be played.</strong> If neither can be assessed, leave the answer unfinished and use Skip for now or contact study staff.</p>';
  }

  function header() {
    return '<div class="mh-preview-notice">' + icon('eye') + '<span><strong>Preview—study videos will be added later</strong><span>Illustrative placeholders only. Responses stay temporarily in this tab and reset on reload.</span></span></div>' +
      '<header class="mh-page-heading"><div><span class="eyebrow">Mental Health</span><h1 tabindex="-1">' + title + '</h1></div><span class="mh-preview-chip">Annotator preview</span></header>';
  }

  function intro() {
    return '<section class="card mh-instructions"><div class="mh-section-heading">' + icon('book') + '<h2>Before you begin</h2></div>' + instructions() +
      '<div class="mh-advisory">' + icon('shield') + '<div><strong>Look after yourself</strong><p>Study videos may discuss distress, mental-health conditions, suicide, or self-harm. You can take a break, save and leave, or choose <strong>Prefer not to view</strong> without giving a reason. A safety skip is never a negative answer.</p></div></div>' +
      '<div class="mh-intro-actions">' + button('start', 'Open annotation preview ' + icon('arrow-right'), 'btn-primary') + button('support', icon('shield') + ' Safety &amp; Support', 'btn-ghost') + '</div>' +
      '<p class="mh-plan-note">Planned study: <strong>100 videos · 8 annotators · 25 videos each · 2 reviews per video.</strong> Data and assignments have not been added. This preview contains three layout scenarios, not study items.</p></section>';
  }

  function placeholder(frame, large = false) {
    return '<div class="mh-frame-art ' + (large ? 'large' : '') + '"><div class="mh-frame-orbit"></div><span class="mh-frame-number">' + frame + '</span>' + icon('image') + '<strong>Illustrative screenshot ' + frame + '</strong><span>Study evidence will appear here</span></div>';
  }

  function player() {
    const item = current();
    return '<div class="mh-video-card"><div class="mh-video-bar"><strong>' + icon('video') + ' Supplied video</strong><span>' + item.platform + ' · Preview</span></div>' +
      '<div class="mh-player ' + item.shape + ' ' + (s.playing ? 'is-playing' : '') + '"><div class="mh-player-inner"><span class="mh-platform-label">' + item.platform + '</span><div class="mh-placeholder-art" aria-hidden="true"><span></span><span></span><span></span></div>' +
      (item.unavailable ? icon('video') + '<h2>Video unavailable</h2><p>Example of the fallback view.<br>Open the screenshot below.</p>' : '<h2>Study video</h2><p>Illustrative player placeholder<br>No real video is loaded</p>' + button('play', icon(s.playing ? 'pause' : 'play'), 'mh-play-button', 'aria-label="' + (s.playing ? 'Pause preview' : 'Play preview') + '"') + '<span class="mh-player-status" aria-live="polite">' + (s.playing ? 'Playing preview · no audio or video' : 'Press Play to view · use sound in the study') + '</span>') + '</div></div>' +
      '<div class="mh-player-tools">' + button('external', icon('external') + ' Open supplied video', 'btn-ghost btn-sm') + (item.unavailable ? '' : button('replay', icon('refresh') + ' Replay', 'btn-ghost btn-sm')) + '</div><p class="mh-media-privacy">In the study, the player connects to ' + item.platform + '. This preview makes no connection to it.</p></div>' +
      '<details class="mh-screenshots" ' + (s.screenshots ? 'open' : '') + '><summary>Video unavailable? View ' + item.frames + ' screenshot' + (item.frames === 1 ? '' : 's') + '</summary><p>Use these if the video is unavailable. Select an image to enlarge it.</p><div class="mh-frame-list">' + Array.from({ length: item.frames }, (_, i) => button('frame', placeholder(i + 1), 'mh-frame-button', 'data-frame="' + i + '" aria-label="Enlarge screenshot ' + (i + 1) + '"')).join('') + '</div></details>';
  }

  function answer() {
    return '<aside class="card mh-answer-panel"><span class="eyebrow">Your assessment</span><form id="mh-answer-form"><fieldset><legend>Is this video related to <strong>mental health</strong>? <span class="mh-required" aria-label="Required">*</span></legend>' +
      '<section class="mh-quick-guide" aria-labelledby="mh-quick-guide-title"><h3 id="mh-quick-guide-title">Quick guide</h3><p>Watch the whole video with sound and read the on-screen text.</p><p>Choose <strong>Related</strong> when mental health is a <strong>substantial topic</strong> of the video. Examples include <strong>depression and anxiety</strong>, other mental-health conditions, personal experiences or symptoms, suicide or self-harm, coping, treatment, access to care, stigma, support, and recovery.</p><p>A named diagnosis or the words “mental health” are not required; the content and context can establish the connection.</p><p>Choose <strong>Not related / insufficient evidence</strong> when the connection is absent, only incidental, or cannot be established from the available evidence.</p></section>' +
      '<div class="mh-answer-options">' + choices.map(([value, text]) => '<label class="mh-answer-option ' + (s.drafts[s.index] === value ? 'selected' : '') + '"><input type="radio" name="mental_health_relevance" value="' + value + '" data-change="mh-answer" required ' + (s.drafts[s.index] === value ? 'checked' : '') + '/><span>' + text + '</span></label>').join('') + '</div></fieldset>' +
      '<p class="mh-answer-reminder">Do not choose <strong>Not related</strong> merely because the video cannot be played.</p><div class="mh-feedback" role="status" aria-live="polite">' + (s.error ? '<span class="mh-error">' + h(s.error) + '</span>' : s.saved[s.index] && !dirty() ? 'Saved in this preview.' : s.drafts[s.index] ? 'Draft kept in this tab · not yet completed' : 'Choose one answer, then save.') + '</div>' +
      button('save', icon('save') + ' Save &amp; next', 'btn-primary mh-save') + button('skip', 'Skip for now', 'btn-ghost mh-skip') + '</form><div class="mh-answer-footer">Only saved answers count as completed.</div></aside>';
  }

  function workspace() {
    return '<div class="mh-workspace-top"><div class="mh-progress"><div><strong>' + done() + ' of 3 preview items completed</strong><span>Layout ' + (s.index + 1) + ' of 3</span></div><progress value="' + done() + '" max="3" aria-label="Saved preview answers"></progress></div><div class="mh-top-tools">' + button('instructions', icon('book') + ' Instructions', 'btn-secondary btn-sm') + button('support', icon('shield') + ' Safety &amp; Support', 'btn-secondary btn-sm') + '</div></div>' +
      '<div class="mh-safety-bar"><span>' + icon('shield') + ' Your wellbeing comes first.</span><div>' + button('break', icon('coffee') + ' Take a break', 'btn-ghost btn-sm') + button('leave', icon('log-out') + ' Save &amp; leave', 'btn-ghost btn-sm') + button('prefer', icon('eye-off') + ' Prefer not to view', 'btn-ghost btn-sm') + '</div></div>' +
      '<div class="mh-layout"><section aria-label="Video and fallback screenshots">' + player() + '</section>' + answer() + '</div>' +
      '<div class="mh-preview-controls"><span>Try another layout:</span>' + scenes.map((scene, index) => button('scene', (index + 1) + '. ' + scene.platform + (scene.unavailable ? ' unavailable' : ''), 'btn-ghost btn-sm', 'data-scene="' + index + '" ' + (index === s.index || s.hidden.has(index) ? 'disabled' : ''))).join('') + '<details><summary>Preview tools</summary>' + button('fail', 'Simulate next save failing', 'btn-secondary btn-sm') + button('reset', 'Reset this preview', 'btn-secondary btn-sm') + '<p>These controls are for demonstrating the interface, not shown to participants.</p></details></div>';
  }

  function paused() {
    return '<section class="card mh-rest-screen">' + icon('coffee') + '<h2>' + (s.step === 'break' ? 'Take your time' : 'Your draft is kept in this tab') + '</h2><p>The media is covered. Return whenever you are ready.</p><p class="muted">This is a temporary preview. Reloading the page resets your responses.</p>' + button('resume', 'Return to preview', 'btn-primary') + button('support', 'Safety &amp; Support', 'btn-secondary') + '</section>';
  }

  function finish() {
    return '<section class="card mh-rest-screen">' + icon('check-circle') + '<h2>Preview complete</h2><p>' + done() + ' of 3 preview items have saved answers. Skips and safety skips are not negative answers or completed assessments.</p><p>Nothing has been submitted to the research platform. The study is awaiting data.</p>' + button('resume', 'Review preview items', 'btn-primary') + button('reset', 'Reset preview', 'btn-secondary') + '</section>';
  }

  function render() {
    root().innerHTML = '<div class="mh-preview-shell">' + header() + (s.step === 'instructions' ? intro() : s.step === 'workspace' ? workspace() : s.step === 'complete' ? finish() : paused()) + '</div>';
    const details = root().querySelector('.mh-screenshots');
    if (details) details.addEventListener('toggle', () => { s.screenshots = details.open; });
    const form = root().querySelector('#mh-answer-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); A.actions['mh-save'](); });
  }

  function move(index) {
    s.index = index; s.playing = false; s.screenshots = false; s.error = ''; render();
  }
  function next() {
    const nextIndex = scenes.findIndex((_, index) => index > s.index && !s.hidden.has(index) && !s.saved[index]);
    const remaining = scenes.findIndex((_, index) => !s.hidden.has(index) && !s.saved[index]);
    if (nextIndex >= 0) move(nextIndex);
    else if (remaining >= 0 && remaining !== s.index) move(remaining);
    else { s.step = 'complete'; s.playing = false; render(); }
  }
  async function confirmMove(action) {
    if (dirty()) {
      const result = await A.dialog({ title: 'Leave this answer unfinished?', body: '<p>Your current selection will remain as a draft in this tab. It will not count as completed until you use Save &amp; next.</p>', confirmLabel: 'Continue', cancelLabel: 'Stay here' });
      if (!result.ok) return;
    }
    action();
  }

  A.views['mental-health-relevance'] = { render };
  A.actions['mh-start'] = () => { s.step = 'workspace'; render(); window.scrollTo(0, 0); };
  A.actions['mh-instructions'] = () => { s.playing = false; render(); A.dialog({ title: 'Instructions', body: instructions(), confirmLabel: 'Back to annotation', cancelLabel: null }); };
  A.actions['mh-support'] = () => {
    s.playing = false; render();
    A.dialog({ title: 'Safety & Support', body: '<p>You can pause, save and leave, or choose <strong>Prefer not to view</strong> at any time without explaining why.</p><p>Prefer not to view removes the item from your preview and does not save a negative answer. No replacement is added.</p><p>If an item is unavailable or you need help with the study, contact the research team using the study contact details. This preview does not send a message.</p><p>If content is distressing, step away and consider reaching out to someone you trust or a support service available where you live.</p>', confirmLabel: 'Close', cancelLabel: null });
  };
  A.actions['mh-play'] = () => { s.playing = !s.playing; render(); };
  A.actions['mh-replay'] = () => { s.playing = true; render(); };
  A.actions['mh-external'] = () => A.toast('In the study this opens only the supplied video. No real source URL is included in the preview.');
  A.changes['mh-answer'] = (el) => {
    s.drafts[s.index] = el.value; s.error = '';
    root().querySelectorAll('.mh-answer-option').forEach((node) => node.classList.toggle('selected', node.querySelector('input').checked));
    root().querySelector('.mh-feedback').textContent = dirty() ? 'Draft kept in this tab · not yet completed' : 'Saved in this preview.';
  };
  A.actions['mh-save'] = () => {
    if (!choices.some(([value]) => value === s.drafts[s.index])) { s.error = 'Choose one answer before saving.'; render(); root().querySelector('input[name="mental_health_relevance"]').focus(); return; }
    if (s.failNext) { s.failNext = false; s.error = 'Example save failure. Your selection is safe in this tab. Please try Save & next again.'; render(); return; }
    s.saved[s.index] = s.drafts[s.index]; s.skipped.delete(s.index); s.error = ''; next();
  };
  A.actions['mh-skip'] = () => confirmMove(() => { s.skipped.add(s.index); next(); });
  A.actions['mh-scene'] = (el) => confirmMove(() => move(Number(el.dataset.scene)));
  A.actions['mh-break'] = () => { s.playing = false; s.step = 'break'; render(); };
  A.actions['mh-leave'] = () => { s.playing = false; s.step = 'leave'; render(); };
  A.actions['mh-resume'] = () => { s.step = 'workspace'; const index = scenes.findIndex((_, i) => !s.hidden.has(i)); if (index < 0) { A.toast('All preview items were removed. Reset the preview to try again.'); s.step = 'complete'; } else if (s.hidden.has(s.index)) s.index = index; render(); };
  A.actions['mh-prefer'] = async () => {
    s.playing = false; render();
    const result = await A.dialog({ title: 'Prefer not to view this item?', body: '<p>No reason is required. This item will be hidden for the rest of this preview. It will not be labeled Not related, counted as completed, or replaced.</p>', confirmLabel: 'Hide this item', cancelLabel: 'Keep viewing' });
    if (result.ok) { delete s.saved[s.index]; delete s.drafts[s.index]; s.hidden.add(s.index); next(); }
  };
  A.actions['mh-fail'] = () => { s.failNext = true; A.toast('The next preview save will show a retry message without losing your selection.'); };
  A.actions['mh-reset'] = () => { s.step = 'instructions'; s.index = 0; s.saved = {}; s.drafts = {}; s.hidden.clear(); s.skipped.clear(); s.error = ''; s.failNext = false; s.playing = false; A.hideToast(); render(); };

  let frameOpener = null;
  function showFrame(index) {
    s.fullFrame = index;
    let dlg = document.getElementById('mh-image-dialog');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'mh-image-dialog'; dlg.className = 'mh-image-dialog'; dlg.setAttribute('aria-labelledby', 'mh-image-title'); document.body.appendChild(dlg);
      dlg.addEventListener('keydown', (event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); showFrame((s.fullFrame + (event.key === 'ArrowRight' ? 1 : -1) + current().frames) % current().frames); } });
      dlg.addEventListener('close', () => { if (frameOpener && document.contains(frameOpener)) frameOpener.focus(); });
    }
    dlg.innerHTML = '<div class="mh-lightbox-head"><h2 id="mh-image-title">Screenshot ' + (index + 1) + ' of ' + current().frames + '</h2>' + button('close-frame', icon('x'), 'btn-ghost', 'aria-label="Close screenshot"') + '</div>' + placeholder(index + 1, true) + '<div class="mh-lightbox-nav">' + button('prev-frame', icon('chevron-left') + ' Previous', 'btn-secondary') + '<span>Arrow keys to navigate · Esc to close</span>' + button('next-frame', 'Next ' + icon('chevron-right'), 'btn-secondary') + '</div>';
    if (!dlg.open) dlg.showModal();
    dlg.querySelector('[data-action="mh-close-frame"]').focus();
  }
  A.actions['mh-frame'] = (el) => { frameOpener = el; s.playing = false; showFrame(Number(el.dataset.frame)); };
  A.actions['mh-close-frame'] = () => document.getElementById('mh-image-dialog').close();
  A.actions['mh-next-frame'] = () => showFrame((s.fullFrame + 1) % current().frames);
  A.actions['mh-prev-frame'] = () => showFrame((s.fullFrame - 1 + current().frames) % current().frames);
  window.addEventListener('beforeunload', (event) => { if (A.S.route.view === 'mental-health-relevance' && s.step === 'workspace' && dirty()) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('hashchange', () => { if (location.hash !== '#mental-health-relevance') s.playing = false; });
})();

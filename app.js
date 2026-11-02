(() => {
  'use strict';
  function initialize(scope = document) {
  const root = scope.matches?.('#tw-portfolio') ? scope : scope.querySelector('#tw-portfolio');
  if (!root || root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';
  const data = window.TAMHEED_DATA || { projects: [], plans: [] };
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const plans = Array.isArray(data.plans) ? data.plans : [];
  const base = root.dataset.assetsBase || './';
  const asset = path => /^(https?:)?\/\//.test(path || '') ? path : base + (path || '');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const price = value => Number(value).toLocaleString('en-US');
  const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 18 6 6M6 17V6h11" stroke="currentColor" stroke-width="1.5"/></svg>';
  const safeUrl = url => { try { const parsed = new URL(url); return parsed.protocol === 'https:' ? parsed.href : null; } catch { return null; } };
  root.querySelectorAll('img[src^="assets/"]').forEach(img => { img.src = asset(img.getAttribute('src')); });

  const preferred = ['dar-alezz', 'kinaz', 'madar', 'araya', 'unique', 'dawrq', 'era'];
  const ordered = [...projects].sort((a, b) => {
    const ai = preferred.indexOf(a.id), bi = preferred.indexOf(b.id);
    return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi);
  });
  let filter = 'all';
  const grid = root.querySelector('#tw-projects');
  const carouselMedia = window.matchMedia('(max-width: 760px)');
  const carouselTools = root.querySelector('#tw-carousel-tools');
  const carouselPrev = root.querySelector('#tw-carousel-prev');
  const carouselNext = root.querySelector('#tw-carousel-next');
  const carouselDots = root.querySelector('#tw-carousel-dots');
  const carouselPosition = root.querySelector('#tw-carousel-position');
  const carouselAnnouncement = root.querySelector('#tw-carousel-announcement');
  let carouselProjects = [], carouselIndex = 0, carouselRaf = 0, carouselSettleTimer = 0, lastAnnouncedIndex = -1, carouselFocusing = false;
  function galleryCards() { return Array.from(grid.querySelectorAll('[data-project-card]')); }
  function updateCarousel(announce = false) {
    if (!carouselMedia.matches) return;
    const cards = galleryCards(), bounds = grid.getBoundingClientRect(), center = bounds.left + bounds.width / 2;
    let nearest = 0, distance = Infinity;
    cards.forEach((card, index) => { const box = card.getBoundingClientRect(); const delta = Math.abs(box.left + box.width / 2 - center); if (delta < distance) { distance = delta; nearest = index; } });
    carouselIndex = nearest;
    carouselPosition.textContent = `${String(cards.length ? nearest + 1 : 0).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    carouselPrev.disabled = !cards.length || nearest === 0;
    carouselNext.disabled = !cards.length || nearest === cards.length - 1;
    carouselDots.querySelectorAll('button').forEach((dot, index) => { const current = index === nearest; dot.classList.toggle('is-current', current); if (current) dot.setAttribute('aria-current', 'true'); else dot.removeAttribute('aria-current'); });
    if (announce && nearest !== lastAnnouncedIndex && carouselProjects[nearest]) { carouselAnnouncement.textContent = `المشروع ${nearest + 1} من ${cards.length}: ${carouselProjects[nearest].name}`; lastAnnouncedIndex = nearest; }
  }
  function moveCarousel(index, focusCard = false, immediate = false) {
    if (!carouselMedia.matches) return;
    const cards = galleryCards(), target = cards[Math.max(0, Math.min(cards.length - 1, index))];
    if (!target) return;
    if (focusCard) {
      carouselFocusing = true;
      target.querySelector('[data-project]')?.focus({ preventScroll: true });
      carouselFocusing = false;
    }
    const viewport = grid.getBoundingClientRect(), card = target.getBoundingClientRect();
    const horizontalDelta = card.left + card.width / 2 - (viewport.left + viewport.width / 2);
    grid.scrollBy({ left: horizontalDelta, top: 0, behavior: immediate || reduced.matches ? 'auto' : 'smooth' });
    if (immediate) updateCarousel(true);
  }
  function configureCarousel(reset = false) {
    const mobile = carouselMedia.matches, cards = galleryCards();
    carouselTools.hidden = !mobile || cards.length < 2;
    if (mobile) {
      grid.setAttribute('role', 'region'); grid.setAttribute('aria-roledescription', 'معرض شرائح'); grid.setAttribute('aria-label', 'معرض أعمال تمهيد، اسحب أفقيًا أو استخدم الأسهم للتنقل'); grid.tabIndex = 0;
      cards.forEach((card, index) => { card.setAttribute('role', 'group'); card.setAttribute('aria-roledescription', 'شريحة'); card.setAttribute('aria-label', `${index + 1} من ${cards.length}: ${carouselProjects[index].name}`); card.classList.add('is-visible'); });
    } else {
      ['role', 'aria-roledescription', 'aria-label', 'tabindex'].forEach(attr => grid.removeAttribute(attr));
      cards.forEach(card => ['role', 'aria-roledescription', 'aria-label'].forEach(attr => card.removeAttribute(attr)));
    }
    carouselDots.innerHTML = carouselProjects.map((p, index) => `<button type="button" data-gallery-index="${index}" aria-controls="tw-projects" aria-label="انتقل إلى مشروع ${esc(p.name)}، ${index + 1} من ${cards.length}"><span aria-hidden="true"></span></button>`).join('');
    if (reset) { carouselIndex = 0; lastAnnouncedIndex = -1; }
    requestAnimationFrame(() => { if (mobile && reset) moveCarousel(0, false, true); else updateCarousel(false); });
  }
  function renderProjects() {
    const eligible = ordered.filter(p => filter === 'all' || (filter === 'local' ? p.status !== 'published' : p.category === filter));
    grid.innerHTML = eligible.map((p, i) => `<article class="tw-project tw-project-${esc(p.id)} ${['dar-alezz', 'kinaz', 'madar'].includes(p.id) ? 'tw-project-priority' : ''} tw-reveal" data-project-card="${esc(p.id)}">
      <button class="tw-project-open" type="button" data-project="${esc(p.id)}" aria-label="استعرض تفاصيل مشروع ${esc(p.name)}">
        <div class="tw-project-visual"><div class="tw-project-browser-top"><span></span><span></span><span></span><i>${esc(p.platform || '')} / ${esc(p.name)}</i></div><div class="tw-project-image"><img src="${esc(asset(p.image))}" alt="واجهة ${esc(p.name)} كاملة" width="1200" height="800" loading="lazy" decoding="async"></div></div>
        <div class="tw-project-caption"><div><p>${esc(p.category === 'stores' ? 'المتاجر الإلكترونية' : 'مواقع الشركات')}</p><h3>${esc(p.name)}</h3></div><span class="tw-project-arrow">${arrow}</span></div><p class="tw-project-description">${esc(p.description)}</p><div class="tw-project-meta"><span class="tw-project-status ${p.status !== 'published' ? 'is-local' : ''}"><i></i>${esc(p.statusLabel)}</span><span class="tw-project-detail-link">تفاصيل العمل <span aria-hidden="true">↖</span></span></div>
      </button></article>`).join('');
    root.querySelector('#tw-results').textContent = `${eligible.length} مشروعًا معروضًا`;
    carouselProjects = eligible;
    configureCarousel(true);
    observeReveals();
  }
  carouselPrev.addEventListener('click', () => moveCarousel(carouselIndex - 1));
  carouselNext.addEventListener('click', () => moveCarousel(carouselIndex + 1));
  carouselDots.addEventListener('click', event => { const dot = event.target.closest('[data-gallery-index]'); if (dot) moveCarousel(Number(dot.dataset.galleryIndex)); });
  grid.addEventListener('scroll', () => {
    if (!carouselMedia.matches) return;
    if (!carouselRaf) carouselRaf = requestAnimationFrame(() => { updateCarousel(false); carouselRaf = 0; });
    clearTimeout(carouselSettleTimer); carouselSettleTimer = setTimeout(() => updateCarousel(true), 160);
  }, { passive: true });
  grid.addEventListener('focusin', event => { if (!carouselMedia.matches || carouselFocusing) return; const card = event.target.closest('[data-project-card]'); if (card) moveCarousel(galleryCards().indexOf(card)); });
  grid.addEventListener('keydown', event => {
    if (!carouselMedia.matches || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const focusedCard = event.target.closest('[data-project-card]');
    const currentIndex = focusedCard ? galleryCards().indexOf(focusedCard) : carouselIndex;
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? carouselProjects.length - 1 : currentIndex + (event.key === 'ArrowLeft' ? 1 : -1);
    moveCarousel(index, true);
  });
  carouselMedia.addEventListener('change', () => configureCarousel(true));
  if ('ResizeObserver' in window) { const galleryResizeObserver = new ResizeObserver(() => { if (carouselMedia.matches) { clearTimeout(carouselSettleTimer); carouselSettleTimer = setTimeout(() => updateCarousel(false), 80); } }); galleryResizeObserver.observe(grid); }

  let activeExperience = 'dar', sceneStarted = false, sequenceTimer = null, sequencePlaying = false;
  const sequenceRange = root.querySelector('#tw-kinaz-range');
  const sequenceImage = root.querySelector('#tw-kinaz-frame');
  const sequencePlay = root.querySelector('#tw-kinaz-play');
  function stopSequence() { clearTimeout(sequenceTimer); sequencePlaying = false; sequencePlay.innerHTML = '<span aria-hidden="true">▷</span> شغّل التسلسل'; sequencePlay.setAttribute('aria-label', 'تشغيل تسلسل بناء كيناز'); }
  function setSequenceFrame(value) {
    const frame = Math.max(1, Math.min(20, Number(value)));
    sequenceRange.value = frame;
    sequenceRange.setAttribute('aria-valuetext', `الإطار ${frame} من 20`);
    root.querySelector('#tw-kinaz-output').textContent = `${String(frame).padStart(2, '0')} / 20`;
    sequenceImage.src = asset(`assets/kinaz-sequence/kinaz-${String(frame).padStart(3, '0')}.webp`);
    sequenceImage.alt = `الإطار ${frame} من تسلسل بناء كيناز`;
  }
  function selectExperience(id, focus = false) {
    if (!['dar', 'kinaz', 'madar'].includes(id)) return;
    activeExperience = id;
    if (id !== 'kinaz') stopSequence();
    if (id !== 'dar' && sceneStarted) unloadScene();
    root.querySelectorAll('[data-experience]').forEach(tab => { const active = tab.dataset.experience === id; tab.classList.toggle('is-active', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; if (active && focus) tab.focus(); });
    root.querySelectorAll('.tw-experience-panel').forEach(panel => { panel.hidden = panel.id !== `tw-exp-panel-${id}`; });
  }
  function startScene() {
    if (sceneStarted) return;
    sceneStarted = true;
    const stage = root.querySelector('#tw-dar-stage');
    const iframe = document.createElement('iframe');
    iframe.src = asset('assets/three-dar/index.html');
    iframe.title = 'مشهد دار العز التفاعلي ثلاثي الأبعاد';
    iframe.allow = 'fullscreen';
    iframe.setAttribute('allowfullscreen', '');
    iframe.addEventListener('load', () => { if (!iframe.isConnected || !sceneStarted || activeExperience !== 'dar') return; stage.classList.add('is-scene-ready'); stage.querySelector('[data-start-scene]').hidden = true; });
    stage.append(iframe);
    stage.querySelector('[data-start-scene]').innerHTML = '<strong>نجهّز المشهد التفاعلي…</strong><small>من النموذج الأصلي لدار العز</small>';
  }
  function unloadScene() {
    const stage = root.querySelector('#tw-dar-stage');
    stage.querySelector('iframe')?.remove();
    sceneStarted = false;
    stage.classList.remove('is-scene-ready');
    const button = stage.querySelector('[data-start-scene]');
    button.hidden = false;
    button.innerHTML = '<span class="tw-scene-start-icon" aria-hidden="true">◇</span><strong>ادخل إلى الخريطة</strong><small>جرّب الدوران والتقريب واختيار المشاريع</small><span aria-hidden="true">↖</span>';
  }
  sequenceRange.addEventListener('input', () => { stopSequence(); setSequenceFrame(sequenceRange.value); });
  sequencePlay.addEventListener('click', () => {
    if (sequencePlaying) { stopSequence(); return; }
    sequencePlaying = true;
    sequencePlay.innerHTML = '<span aria-hidden="true">Ⅱ</span> إيقاف التسلسل';
    sequencePlay.setAttribute('aria-label', 'إيقاف تسلسل بناء كيناز');
    let frame = 1;
    const tick = () => {
      if (!sequencePlaying || activeExperience !== 'kinaz') { stopSequence(); return; }
      setSequenceFrame(frame);
      if (frame < 20) { const next = new Image(); next.src = asset(`assets/kinaz-sequence/kinaz-${String(frame + 1).padStart(3, '0')}.webp`); frame += 1; sequenceTimer = setTimeout(tick, 150); } else stopSequence();
    };
    tick();
  });
  root.querySelector('.tw-experience-tabs').addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const ids = ['dar', 'kinaz', 'madar']; let index = ids.indexOf(activeExperience);
    if (event.key === 'Home') index = 0; else if (event.key === 'End') index = 2; else index = (index + (['ArrowLeft', 'ArrowDown'].includes(event.key) ? 1 : 2)) % 3;
    selectExperience(ids[index], true);
  });

  root.querySelector('#tw-plans').innerHTML = plans.map(p => `<article class="tw-plan ${p.featured ? 'tw-plan-featured' : ''} ${p.platform === 'salla' ? 'tw-plan-salla' : ''} tw-reveal">
    ${p.featured ? '<div class="tw-plan-ribbon">مساحة أوسع لطموحك <span aria-hidden="true">✦</span></div>' : ''}
    <div class="tw-platform"><span class="tw-platform-logo"><img src="${esc(asset(`assets/${p.platform === 'salla' ? 'salla' : 'wordpress'}.svg`))}" alt="${p.platform === 'salla' ? 'سلة' : 'WordPress'}" width="38" height="38" loading="lazy"></span><span>${p.platform === 'salla' ? 'برمجة وتخصيص متجر سلة' : 'تطوير ووردبريس مخصص'}</span></div>
    <h3>${esc(p.name)}</h3><p class="tw-plan-tagline">${esc(p.tagline)}</p><div class="tw-plan-price"><strong>${price(p.price)}</strong><span>ريال سعودي<br><small>مقترح للمراجعة</small></span></div><p class="tw-one-time">تكلفة تنفيذ لمرة واحدة</p>
    <button class="tw-button ${p.featured ? 'tw-button-primary' : 'tw-button-outline'}" type="button" data-plan="${esc(p.id)}">${p.platform === 'salla' ? 'جهّز متجرك' : 'ناقش باقتك'} <span aria-hidden="true">↖</span></button>
    <div class="tw-plan-rule"><span>الخدمات التي تصنع الفرق</span></div><ul class="tw-plan-features">${p.features.map(f => `<li><span aria-hidden="true">✓</span>${esc(f)}</li>`).join('')}</ul>
    <div class="tw-plan-aftercare"><span>جولات التعديل: <strong>${Number(p.revisions)}</strong></span><span>دعم <strong>${Number(p.support)}</strong> يومًا</span></div><div class="tw-plan-delivery"><span>مدة التنفيذ</span><strong>${Number(p.days)} ${Number(p.days) === 10 ? 'أيام' : 'يومًا'}</strong></div>
  </article>`).join('');

  function setupPlansCarousel() {
    const viewport = root.querySelector('#tw-plans');
    const cards = Array.from(viewport.querySelectorAll('.tw-plan'));
    const tools = root.querySelector('#tw-plans-carousel-tools');
    const previous = root.querySelector('#tw-plans-carousel-prev');
    const next = root.querySelector('#tw-plans-carousel-next');
    const dots = root.querySelector('#tw-plans-carousel-dots');
    const position = root.querySelector('#tw-plans-carousel-position');
    const announcement = root.querySelector('#tw-plans-carousel-announcement');
    const media = window.matchMedia('(max-width: 760px)');
    let current = 0, frame = 0, settleTimer = 0, announced = -1, focusing = false;

    function update(announce = false) {
      if (!media.matches) return;
      const bounds = viewport.getBoundingClientRect(), center = bounds.left + bounds.width / 2;
      let distance = Infinity;
      cards.forEach((card, index) => { const box = card.getBoundingClientRect(); const delta = Math.abs(box.left + box.width / 2 - center); if (delta < distance) { distance = delta; current = index; } });
      position.textContent = `${String(cards.length ? current + 1 : 0).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
      previous.disabled = !cards.length || current === 0;
      next.disabled = !cards.length || current === cards.length - 1;
      dots.querySelectorAll('button').forEach((dot, index) => { const active = index === current; dot.classList.toggle('is-current', active); if (active) dot.setAttribute('aria-current', 'true'); else dot.removeAttribute('aria-current'); });
      if (announce && current !== announced && plans[current]) { announcement.textContent = `الباقة ${current + 1} من ${cards.length}: ${plans[current].name}`; announced = current; }
    }
    function move(index, focusCard = false, immediate = false) {
      if (!media.matches) return;
      const target = cards[Math.max(0, Math.min(cards.length - 1, index))];
      if (!target) return;
      if (focusCard) { focusing = true; target.querySelector('[data-plan]')?.focus({ preventScroll: true }); focusing = false; }
      const bounds = viewport.getBoundingClientRect(), box = target.getBoundingClientRect();
      const horizontalDelta = box.left + box.width / 2 - (bounds.left + bounds.width / 2);
      viewport.scrollBy({ left: horizontalDelta, top: 0, behavior: immediate || reduced.matches ? 'auto' : 'smooth' });
      if (immediate) update(true);
    }
    function configure(reset = false) {
      tools.hidden = !media.matches || cards.length < 2;
      if (media.matches) {
        viewport.setAttribute('role', 'region'); viewport.setAttribute('aria-roledescription', 'معرض شرائح'); viewport.setAttribute('aria-label', 'باقات تمهيد، اسحب أفقيًا أو استخدم الأسهم للتنقل'); viewport.tabIndex = 0;
        cards.forEach((card, index) => { card.setAttribute('role', 'group'); card.setAttribute('aria-roledescription', 'شريحة'); card.setAttribute('aria-label', `الباقة ${index + 1} من ${cards.length}: ${plans[index].name}`); card.classList.add('is-visible'); });
      } else {
        ['role', 'aria-roledescription', 'aria-label', 'tabindex'].forEach(attr => viewport.removeAttribute(attr));
        cards.forEach(card => ['role', 'aria-roledescription', 'aria-label'].forEach(attr => card.removeAttribute(attr)));
      }
      if (reset) { current = 0; announced = -1; }
      requestAnimationFrame(() => { if (media.matches && reset) move(0, false, true); else update(false); });
    }
    dots.innerHTML = plans.map((plan, index) => `<button type="button" data-plan-slide-index="${index}" aria-controls="tw-plans" aria-label="انتقل إلى باقة ${esc(plan.name)}، ${index + 1} من ${cards.length}"><span aria-hidden="true"></span></button>`).join('');
    previous.addEventListener('click', () => move(current - 1));
    next.addEventListener('click', () => move(current + 1));
    dots.addEventListener('click', event => { const dot = event.target.closest('[data-plan-slide-index]'); if (dot) move(Number(dot.dataset.planSlideIndex)); });
    viewport.addEventListener('scroll', () => {
      if (!media.matches) return;
      if (!frame) frame = requestAnimationFrame(() => { update(false); frame = 0; });
      clearTimeout(settleTimer); settleTimer = setTimeout(() => update(true), 160);
    }, { passive: true });
    viewport.addEventListener('focusin', event => { if (!media.matches || focusing) return; const card = event.target.closest('.tw-plan'); if (card) move(cards.indexOf(card)); });
    viewport.addEventListener('keydown', event => {
      if (!media.matches || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.isComposing || event.target.closest('input,select,textarea,[contenteditable="true"],[role="slider"]')) return;
      event.preventDefault();
      const focused = event.target.closest('.tw-plan'), index = focused ? cards.indexOf(focused) : current;
      move(event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : index + (event.key === 'ArrowLeft' ? 1 : -1), true);
    });
    media.addEventListener('change', () => configure(true));
    if ('ResizeObserver' in window) { const resizeObserver = new ResizeObserver(() => { if (media.matches) { clearTimeout(settleTimer); settleTimer = setTimeout(() => update(false), 80); } }); resizeObserver.observe(viewport); }
    configure(true);
  }

  const projectDialog = root.querySelector('#tw-project-dialog');
  const planDialog = root.querySelector('#tw-plan-dialog');
  let returnFocus = null;
  function openDialog(dialog, trigger) {
    returnFocus = trigger || document.activeElement;
    dialog.showModal();
    root.classList.add('tw-dialog-is-open');
  }
  function openProject(id, trigger) {
    const p = projects.find(item => item.id === id); if (!p) return;
    const url = safeUrl(p.url);
    root.querySelector('#tw-project-detail').innerHTML = `<div class="tw-detail-image"><img src="${esc(asset(p.image))}" alt="واجهة ${esc(p.name)} كاملة" width="1280" height="800"></div><div class="tw-detail-content"><div class="tw-eyebrow">${esc(p.platform || '')} <span aria-hidden="true">/</span> ${esc(p.year || '2026')}</div><h2 id="tw-project-dialog-title">${esc(p.name)}</h2><span class="tw-detail-status">${esc(p.statusLabel)}</span><p>${esc(p.description)}</p><h3>ما قدمناه في المشروع</h3><ul>${(p.scope || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul>${url ? `<a class="tw-button tw-button-primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">زيارة الموقع ${arrow}</a>` : '<p class="tw-local-explanation">معاينة من النموذج المحلي للمشروع.</p>'}</div>`;
    openDialog(projectDialog, trigger);
  }
  function openPlan(id, trigger) {
    const p = plans.find(item => item.id === id);
    const title = p ? `باقة ${p.name}` : 'خلّنا نتعرف على مشروعك';
    root.querySelector('#tw-plan-dialog-title').textContent = title;
    root.querySelector('#tw-plan-summary').textContent = p ? `${price(p.price)} ريال سعودي — سعر مقترح للمراجعة · تنفيذ خلال ${p.days} ${p.days === 10 ? 'أيام' : 'يومًا'}` : 'موقع لشركتك، تجربة عقارية، أو متجر إلكتروني… احكِ لنا عن فكرتك.';
    const text = p ? `مرحبًا تمهيد، أود مناقشة باقة ${p.name}. شاهدت السعر المقترح ${price(p.price)} ريال ومدة التنفيذ ${p.days} يومًا، وأرغب في تأكيد الخدمات والسعر المناسب لمشروعي.` : 'مرحبًا تمهيد، أود مناقشة تصميم وتطوير موقع أو متجر لمشروعي.';
    root.querySelector('#tw-whatsapp-link').href = `https://wa.me/${String(data.whatsapp || '966547652184').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    openDialog(planDialog, trigger);
  }
  root.addEventListener('click', event => {
    const experienceTab = event.target.closest('[data-experience]'); if (experienceTab) { selectExperience(experienceTab.dataset.experience); return; }
    const experienceJump = event.target.closest('[data-experience-jump]'); if (experienceJump) { selectExperience(experienceJump.dataset.experienceJump); root.querySelector('#tw-experience').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' }); if (experienceJump.dataset.experienceJump === 'dar') startScene(); return; }
    const start = event.target.closest('[data-start-scene]'); if (start) { startScene(); return; }
    const fullscreen = event.target.closest('[data-scene-fullscreen]'); if (fullscreen) { const panel = root.querySelector(`#tw-exp-panel-${fullscreen.dataset.sceneFullscreen}`); if (document.fullscreenElement) document.exitFullscreen?.(); else panel.requestFullscreen?.().catch(() => {}); return; }
    const anchor = event.target.closest('a[href^="#tw-"]');
    if (anchor) { const target = root.querySelector(anchor.getAttribute('href')); if (target) { event.preventDefault(); target.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' }); } }
    const project = event.target.closest('[data-project]'); if (project) { openProject(project.dataset.project, project); return; }
    const plan = event.target.closest('[data-plan]'); if (plan) { openPlan(plan.dataset.plan, plan); return; }
    const consult = event.target.closest('[data-consult]'); if (consult) { openPlan(null, consult); return; }
    const close = event.target.closest('[data-close-dialog]'); if (close) { close.closest('dialog').close(); return; }
    const btn = event.target.closest('[data-filter]');
    if (btn) { filter = btn.dataset.filter; root.querySelectorAll('[data-filter]').forEach(b => { const active = b === btn; b.classList.toggle('is-active', active); b.setAttribute('aria-pressed', String(active)); }); renderProjects(); }
  });
  [projectDialog, planDialog].forEach(dialog => {
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
    dialog.addEventListener('close', () => { root.classList.remove('tw-dialog-is-open'); if (returnFocus && document.contains(returnFocus)) returnFocus.focus(); });
  });
  const menu = root.querySelector('.tw-menu');
  const nav = root.querySelector('#tw-navigation');
  if (menu && nav) menu.addEventListener('click', () => { const isOpen = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(isOpen)); menu.setAttribute('aria-label', isOpen ? 'إغلاق القائمة' : 'فتح القائمة'); nav.classList.toggle('is-open', isOpen); });
  if (menu && nav) nav.addEventListener('click', event => { if (event.target.closest('a')) { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); } });
  root.addEventListener('keydown', event => { if (menu && nav && event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'فتح القائمة'); nav.classList.remove('is-open'); menu.focus(); } });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer;
  if ('IntersectionObserver' in window && !reduced.matches) {
    observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }); }, { threshold: 0.06, rootMargin: '0px 0px 18px 0px' });
  }
  function observeReveals() { root.querySelectorAll('.tw-reveal').forEach(el => { if (observer) observer.observe(el); else el.classList.add('is-visible'); }); }
  renderProjects(); setupPlansCarousel(); observeReveals();
  root.classList.add('tw-ready');

  if (window.matchMedia('(min-width: 1025px) and (hover: hover) and (pointer: fine)').matches && !reduced.matches && !root.classList.contains('tw-embedded')) {
    const cursor = root.querySelector('.tw-cursor'); let raf = 0, x = 0, y = 0;
    root.addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(() => { cursor.style.transform = `translate3d(${x}px,${y}px,0)`; cursor.classList.add('is-visible'); raf = 0; }); }, { passive: true });
    root.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
    root.addEventListener('pointerover', e => cursor.classList.toggle('is-hovering', !!e.target.closest('a,button,summary')));
  }
  }
  window.TamheedPortfolio = { init: initialize };
  initialize();
  let elementorHookRegistered = false;
  function registerElementorHook() {
    if (elementorHookRegistered || !window.elementorFrontend?.hooks) return;
    elementorHookRegistered = true;
    window.elementorFrontend.hooks.addAction('frontend/element_ready/shortcode.default', scope => initialize(scope?.[0] || document));
    window.elementorFrontend.hooks.addAction('frontend/element_ready/html.default', scope => initialize(scope?.[0] || document));
  }
  registerElementorHook();
  if (window.jQuery) window.jQuery(window).on('elementor/frontend/init.twPortfolio', registerElementorHook);
})();


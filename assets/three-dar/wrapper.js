(() => {
  const status = document.querySelector('.scene-loading');
  document.addEventListener('dar-map-ready', (event) => {
    event.detail.enterCity();
    status?.classList.add('is-ready');
    setTimeout(() => status?.remove(), 500);
  }, { once: true });
  setTimeout(() => {
    if (!document.querySelector('.dar-map-canvas')) {
      if (status) status.textContent = 'يمكنك استعراض المشاريع من القائمة إذا تعذّر العرض ثلاثي الأبعاد.';
      setTimeout(() => status?.remove(), 2800);
    }
  }, 8000);
})();

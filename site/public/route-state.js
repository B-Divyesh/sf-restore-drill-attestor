(() => {
  const query = new URLSearchParams(window.location.search);
  if (query.get('demo') === '1') document.documentElement.dataset.demo = 'true';
})();

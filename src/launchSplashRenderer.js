window.sealLaunch.onProgress(state => {
  document.title = 'Seal Account Manager — ' + state.username;
  document.getElementById('status').textContent = state.message;
  const bar = document.getElementById('progress');
  // Startup phases have no measurable percentage. Keep the marquee moving
  // through all updates; only a completed launch ends the animation.
  bar.classList.toggle('complete', state.outcome === 'success');
  bar.classList.toggle('failed', state.outcome === 'error');
  bar.setAttribute('aria-label', state.message);
  bar.setAttribute('aria-busy', String(!state.outcome));
  if (state.outcome === 'success') bar.setAttribute('aria-valuenow', '100');
  else bar.removeAttribute('aria-valuenow');
});
document.getElementById('hide').onclick = () => window.close();

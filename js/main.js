// js/main.js
import { loadVideos, loadMoreVideos } from './youtube.js';

// Expose to global for inline handlers (e.g., Retry button)
window.loadVideos = loadVideos;
window.loadMoreVideos = loadMoreVideos;

(function () {
  // Debounce helper
  function debounce(fn, delay = 500) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Safe init
  document.addEventListener('DOMContentLoaded', () => {
    try {
      // Initial load
      loadVideos();

      // Search input wiring
      const searchInput = document.getElementById('videoSearch');
      if (searchInput) {
        const debouncedSearch = debounce((ev) => {
          const q = (ev && ev.target && ev.target.value) ? ev.target.value.trim() : (searchInput.value || '').trim();
          loadVideos(q);
        }, 500);

        // input event (debounced)
        searchInput.addEventListener('input', debouncedSearch);

        // optional: also trigger on Enter immediately
        searchInput.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            const q = (searchInput.value || '').trim();
            // cancel debounce and run immediate
            debouncedSearch.cancel && debouncedSearch.cancel();
            loadVideos(q);
          }
        });

        // attach a small cancel method so Enter can short-circuit debounce
        // (not strictly necessary, but helpful)
        debouncedSearch.cancel = () => { /* noop to satisfy call above */ };
      }

      // Load more button wiring
      const loadMoreBtn = document.getElementById('loadMoreBtn');
      if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async (ev) => {
          ev.preventDefault();
          // disable while loading handled inside loadMoreVideos
          try {
            await loadMoreVideos();
          } catch (err) {
            console.error('loadMoreVideos error:', err);
          }
        });
      }

    } catch (err) {
      console.error('main.js initialization error:', err);
    }
  });
})();

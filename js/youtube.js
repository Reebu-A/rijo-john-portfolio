// js/youtube.js
import { CHANNEL_ID, YOUTUBE_API_KEY, MAX_VIDEOS, RSS_PROXY } from './config.js';

let nextPageToken = '';
let currentSearchTerm = '';

/**
 * Public: load and display videos
 */
export async function loadVideos(searchTerm = '') {
  currentSearchTerm = searchTerm || '';
  const container = document.getElementById('videosContainer');
  const errorState = document.getElementById('errorState');
  const loadMoreContainer = document.getElementById('loadMoreContainer');

  if (!container) {
    console.error('videosContainer element not found in DOM');
    return;
  }

  try {
    // Loading UI
    container.innerHTML = `
      <div class="col-span-3 text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p class="text-gray-600">Loading videos...</p>
      </div>
    `;
    // Decide source
    let videos = [];
    if (YOUTUBE_API_KEY && YOUTUBE_API_KEY.trim().length > 0) {
      videos = await fetchFromYouTubeAPI(searchTerm);
    } else {
      videos = await fetchFromRSS();
    }

    if (!videos || videos.length === 0) {
      showNoVideosMessage(container);
      loadMoreContainer?.classList.add('hidden');
      return;
    }

    // Render
    container.innerHTML = ''; // clear loading
    displayVideos(container, videos);
    updateLoadMoreButton(loadMoreContainer, !!(nextPageToken && YOUTUBE_API_KEY && !currentSearchTerm));

    // Hide error if any
    if (errorState) errorState.classList.add('hidden');

  } catch (err) {
    console.error('Error loading videos:', err);
    showErrorState(container, errorState);
  }
}

/**
 * Fetch using YouTube Data API (if key provided)
 */
async function fetchFromYouTubeAPI(searchTerm = '') {
  let url = `https://www.googleapis.com/youtube/v3/search?key=${encodeURIComponent(YOUTUBE_API_KEY)}&channelId=${encodeURIComponent(CHANNEL_ID)}&part=snippet,id&order=date&maxResults=${MAX_VIDEOS}`;
  if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;
  if (nextPageToken && !searchTerm) url += `&pageToken=${encodeURIComponent(nextPageToken)}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`YouTube API error: ${resp.status}`);
  const data = await resp.json();

  nextPageToken = data.nextPageToken || '';
  const items = (data.items || []).filter(i => i.id && i.id.kind === 'youtube#video');
  return items.map(item => ({
    id: item.id.videoId,
    title: item.snippet.title || '',
    description: item.snippet.description || '',
    thumbnail: (item.snippet.thumbnails && item.snippet.thumbnails.medium && item.snippet.thumbnails.medium.url) || '',
    publishedAt: item.snippet.publishedAt || '',
    channelTitle: item.snippet.channelTitle || ''
  }));
}

/**
 * Fetch via RSS proxy (Apps Script) to avoid CORS
 */
async function fetchFromRSS() {
  if (!RSS_PROXY || !CHANNEL_ID) {
    throw new Error('RSS_PROXY or CHANNEL_ID not configured in config.js');
  }

  // Build proxy URL and include origin param for server-side validation
  const proxyUrl = `${RSS_PROXY}?channel=${encodeURIComponent(CHANNEL_ID)}&origin=${encodeURIComponent(window.location.origin)}`;
  const resp = await fetch(proxyUrl, { method: 'GET' });

  if (!resp.ok) {
    // Try to parse JSON error body if present
    const text = await resp.text();
    try {
      const maybeJson = JSON.parse(text);
      throw new Error(`RSS proxy error: ${maybeJson.message || resp.status}`);
    } catch (e) {
      throw new Error(`RSS fetch error: ${resp.status}`);
    }
  }

  const text = await resp.text();
  // If proxy returned JSON (error), handle
  if (text.trim().startsWith('{')) {
    try {
      const j = JSON.parse(text);
      throw new Error(`Proxy error: ${j.message || JSON.stringify(j)}`);
    } catch (e) {
      throw new Error('Unexpected proxy response');
    }
  }

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');

  // Either Atom <entry> or RSS <item>
  const entries = Array.from(xml.querySelectorAll('entry, item'));
  const videos = entries.map(entry => {
    // try multiple selectors for id
    const ytIdEl = entry.querySelector('yt\\:videoId, videoId, guid, id');
    let id = ytIdEl ? (ytIdEl.textContent || '') : '';
    // sometimes <id> holds full URL or urn:yt:video:VIDEOID
    if (id && id.includes('youtube.com')) {
      // extract query param v= if present
      try {
        const url = new URL(id);
        id = url.searchParams.get('v') || id.split('/').pop();
      } catch (e) { /* ignore */ }
    } else if (id && id.includes(':')) {
      id = id.split(':').pop();
    }

    const title = entry.querySelector('title')?.textContent || '';
    // description can be media:description or description
    const desc = entry.querySelector('media\\:description, description')?.textContent || '';
    const published = entry.querySelector('published, pubDate')?.textContent || '';
    const author = entry.querySelector('author name')?.textContent || entry.querySelector('author')?.textContent || '';

    const thumb = id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : '';

    return {
      id: id,
      title: title,
      description: desc,
      thumbnail: thumb,
      publishedAt: published,
      channelTitle: author
    };
  });

  // Return up to MAX_VIDEOS
  return videos.slice(0, MAX_VIDEOS);
}

/**
 * Render videos (initial load)
 */
function displayVideos(container, videos) {
  if (!container) return;
  const html = videos.map(videoCardHTML).join('');
  container.innerHTML = html;
}

/**
 * Create HTML for a single video card (matches your prior markup)
 */
function videoCardHTML(video) {
  const titleEsc = escapeHtml(video.title || '');
  const descEsc = escapeHtml(video.description || '');
  const pub = formatDate(video.publishedAt || '');

  return `
    <div class="video-card">
      <div class="relative group">
        <img src="${video.thumbnail}" alt="${titleEsc}" class="video-thumbnail w-full h-48 object-cover" loading="lazy">
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
          <div class="bg-red-600 rounded-full p-3 transform scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
      <div class="p-4">
        <h3 class="font-semibold text-lg mb-2 line-clamp-2" title="${titleEsc}">${titleEsc}</h3>
        <p class="text-gray-600 text-sm mb-3 line-clamp-2">${descEsc}</p>
        <div class="flex justify-between items-center text-sm text-gray-500">
          <span>${pub}</span>
          <a href="https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}" target="_blank" rel="noopener noreferrer" class="btn-primary text-sm px-4 py-2 flex items-center">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
            Watch
          </a>
        </div>
      </div>
    </div>
  `;
}

/**
 * Append more videos (for load more)
 */
export function appendVideos(videos) {
  const container = document.getElementById('videosContainer');
  if (!container || !videos || videos.length === 0) return;
  const html = videos.map(videoCardHTML).join('');
  // append without destroying event listeners outside
  container.insertAdjacentHTML('beforeend', html);
}

/**
 * Show no videos
 */
function showNoVideosMessage(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="col-span-3 text-center py-12">
      <div class="text-gray-400 text-6xl mb-4">🎥</div>
      <h3 class="text-xl font-bold mb-2">No videos found</h3>
      <p class="text-gray-600">${currentSearchTerm ? 'Try a different search term' : 'Check back later for new content'}</p>
    </div>
  `;
}

/**
 * Error state UI
 */
function showErrorState(container, errorState) {
  if (container) container.innerHTML = '';
  if (errorState) errorState.classList.remove('hidden');
}

/**
 * Update load more visibility
 */
function updateLoadMoreButton(container, hasMore) {
  if (!container) return;
  if (hasMore) container.classList.remove('hidden');
  else container.classList.add('hidden');
}

/**
 * Format date into human text
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date)) return '';
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Escape HTML to avoid injection
 */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function (m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
  });
}

/**
 * Load more videos using nextPageToken (YouTube Data API only)
 */
export async function loadMoreVideos() {
  if (!YOUTUBE_API_KEY || currentSearchTerm) return;
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (!loadMoreBtn) return;
  const originalText = loadMoreBtn.textContent;
  loadMoreBtn.textContent = 'Loading...';
  loadMoreBtn.disabled = true;

  try {
    const moreVideos = await fetchFromYouTubeAPI();
    if (moreVideos && moreVideos.length) {
      appendVideos(moreVideos);
      updateLoadMoreButton(document.getElementById('loadMoreContainer'), !!nextPageToken);
    } else {
      updateLoadMoreButton(document.getElementById('loadMoreContainer'), false);
    }
  } catch (err) {
    console.error('Error loading more videos:', err);
  } finally {
    loadMoreBtn.textContent = originalText;
    loadMoreBtn.disabled = false;
  }
}

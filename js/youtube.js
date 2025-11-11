import { CHANNEL_ID, YOUTUBE_API_KEY, MAX_VIDEOS } from './config.js';

let nextPageToken = '';
let currentSearchTerm = '';

export async function loadVideos(searchTerm = '') {
    currentSearchTerm = searchTerm;
    const container = document.getElementById('videosContainer');
    const errorState = document.getElementById('errorState');
    const loadMoreContainer = document.getElementById('loadMoreContainer');

    try {
        // Show loading state
        container.innerHTML = `
            <div class="col-span-3 text-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p class="text-gray-600">Loading videos...</p>
            </div>
        `;

        let videos = [];
        
        if (YOUTUBE_API_KEY) {
            videos = await fetchFromYouTubeAPI(searchTerm);
        } else {
            videos = await fetchFromRSS();
        }

        if (videos.length === 0) {
            showNoVideosMessage(container);
            return;
        }

        displayVideos(container, videos);
        updateLoadMoreButton(loadMoreContainer, videos.length >= MAX_VIDEOS);

        // Hide error state if previously shown
        errorState.classList.add('hidden');
        
    } catch (error) {
        console.error('Error loading videos:', error);
        showErrorState(container, errorState);
    }
}

async function fetchFromYouTubeAPI(searchTerm = '') {
    let url = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=${MAX_VIDEOS}`;
    
    if (searchTerm) {
        url += `&q=${encodeURIComponent(searchTerm)}`;
    }
    
    if (nextPageToken && !searchTerm) {
        url += `&pageToken=${nextPageToken}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    nextPageToken = data.nextPageToken || '';

    return data.items
        .filter(item => item.id.kind === 'youtube#video')
        .map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.medium.url,
            publishedAt: item.snippet.publishedAt,
            channelTitle: item.snippet.channelTitle
        }));
}

async function fetchFromRSS() {
    const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`);
    
    if (!response.ok) {
        throw new Error(`RSS fetch error: ${response.status}`);
    }

    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    
    const entries = xml.querySelectorAll('entry');
    return Array.from(entries).map(entry => {
        const id = entry.querySelector('videoid')?.textContent || 
                  entry.querySelector('id')?.textContent?.split(':').pop() || '';
        return {
            id: id,
            title: entry.querySelector('title')?.textContent || '',
            description: entry.querySelector('media\\:description, description')?.textContent || '',
            thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
            publishedAt: entry.querySelector('published')?.textContent || '',
            channelTitle: entry.querySelector('author name')?.textContent || ''
        };
    }).slice(0, MAX_VIDEOS);
}

function displayVideos(container, videos) {
    if (videos.length === 0) {
        showNoVideosMessage(container);
        return;
    }

    container.innerHTML = videos.map(video => `
        <div class="video-card">
            <div class="relative">
                <img src="${video.thumbnail}" 
                     alt="${video.title}"
                     class="video-thumbnail w-full h-48 object-cover"
                     loading="lazy">
                <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                    <div class="bg-red-600 rounded-full p-3 transform scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200">
                        <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-semibold text-lg mb-2 line-clamp-2" title="${video.title}">
                    ${video.title}
                </h3>
                <p class="text-gray-600 text-sm mb-3 line-clamp-2">
                    ${video.description}
                </p>
                <div class="flex justify-between items-center text-sm text-gray-500">
                    <span>${formatDate(video.publishedAt)}</span>
                    <a href="https://www.youtube.com/watch?v=${video.id}" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       class="btn-primary text-sm px-4 py-2 flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                        </svg>
                        Watch
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

function showNoVideosMessage(container) {
    container.innerHTML = `
        <div class="col-span-3 text-center py-12">
            <div class="text-gray-400 text-6xl mb-4">🎥</div>
            <h3 class="text-xl font-bold mb-2">No videos found</h3>
            <p class="text-gray-600">${currentSearchTerm ? 'Try a different search term' : 'Check back later for new content'}</p>
        </div>
    `;
}

function showErrorState(container, errorState) {
    container.innerHTML = '';
    errorState.classList.remove('hidden');
}

function updateLoadMoreButton(container, hasMore) {
    if (hasMore && YOUTUBE_API_KEY && !currentSearchTerm) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Load more videos function
export async function loadMoreVideos() {
    if (!YOUTUBE_API_KEY || currentSearchTerm) return;
    
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const originalText = loadMoreBtn.textContent;
    
    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.disabled = true;
    
    try {
        const moreVideos = await fetchFromYouTubeAPI();
        const container = document.getElementById('videosContainer');
        
        if (moreVideos.length > 0) {
            const currentVideos = Array.from(container.children).map(child => child.outerHTML).join('');
            const newVideos = moreVideos.map(video => `
                <div class="video-card">
                    <div class="relative">
                        <img src="${video.thumbnail}" 
                             alt="${video.title}"
                             class="video-thumbnail w-full h-48 object-cover"
                             loading="lazy">
                        <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                            <div class="bg-red-600 rounded-full p-3 transform scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200">
                                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div class="p-4">
                        <h3 class="font-semibold text-lg mb-2 line-clamp-2" title="${video.title}">
                            ${video.title}
                        </h3>
                        <p class="text-gray-600 text-sm mb-3 line-clamp-2">
                            ${video.description}
                        </p>
                        <div class="flex justify-between items-center text-sm text-gray-500">
                            <span>${formatDate(video.publishedAt)}</span>
                            <a href="https://www.youtube.com/watch?v=${video.id}" 
                               target="_blank" 
                               rel="noopener noreferrer"
                               class="btn-primary text-sm px-4 py-2 flex items-center">
                                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                                </svg>
                                Watch
                            </a>
                        </div>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = currentVideos + newVideos;
            updateLoadMoreButton(document.getElementById('loadMoreContainer'), nextPageToken !== '');
        }
    } catch (error) {
        console.error('Error loading more videos:', error);
    } finally {
        loadMoreBtn.textContent = originalText;
        loadMoreBtn.disabled = false;
    }
}

// Initialize load more button
// document.addEventListener('DOMContentLoaded', () => {
 //   const loadMoreBtn = document.getElementById('loadMoreBtn');
 //   if (loadMoreBtn) {
  //      loadMoreBtn.addEventListener('click', loadMoreVideos);
  //  }
// });
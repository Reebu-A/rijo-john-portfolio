let map;
let markers = [];

export async function initMap() {
    // Initialize map
    map = L.map('map').setView([10.8505, 76.2711], 7); // Center on Kerala

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
    }).addTo(map);

    // Load places data
    try {
        const response = await fetch('./data/places.json');  
        const places = await response.json();
        addMarkersToMap(places);
        updateDestinationsList(places);
    } catch (error) {
        console.error('Error loading places data:', error);
        showMapError();
    }
}

function addMarkersToMap(places) {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    places.forEach(place => {
        const marker = L.marker([place.lat, place.lng])
            .addTo(map)
            .bindPopup(createPopupContent(place));
        
        markers.push(marker);
    });

    // Fit map to show all markers
    if (places.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

function createPopupContent(place) {
    return `
        <div class="w-64">
            <img src="${place.image}" 
                 alt="${place.title}"
                 class="w-full h-32 object-cover rounded-t-lg mb-3"
                 loading="lazy">
            <h3 class="font-semibold text-lg mb-2">${place.title}</h3>
            <a href="${place.youtubeUrl}" 
               target="_blank" 
               rel="noopener noreferrer"
               class="btn-primary w-full text-center py-2 text-sm inline-block">
                <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
                Watch Vlog
            </a>
        </div>
    `;
}

function updateDestinationsList(places) {
    const container = document.getElementById('destinationsList');
    
    if (!container) return;

    if (places.length === 0) {
        container.innerHTML = `
            <div class="col-span-3 text-center py-12">
                <div class="text-gray-400 text-6xl mb-4">🗺️</div>
                <h3 class="text-xl font-bold mb-2">No destinations found</h3>
                <p class="text-gray-600">Check back later for travel updates</p>
            </div>
        `;
        return;
    }

    container.innerHTML = places.map(place => `
        <div class="card-hover cursor-pointer" onclick="focusOnMarker(${place.lat}, ${place.lng})">
            <img src="${place.image}" 
                 alt="${place.title}"
                 class="w-full h-48 object-cover rounded-t-lg"
                 loading="lazy">
            <div class="p-6">
                <h3 class="text-xl font-bold mb-3">${place.title}</h3>
                <div class="flex justify-between items-center">
                    <a href="${place.youtubeUrl}" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       class="btn-primary text-sm px-4 py-2 flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                        </svg>
                        Watch Vlog
                    </a>
                    <span class="text-sm text-gray-500">
                        ${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

function showMapError() {
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.innerHTML = `
            <div class="h-full flex items-center justify-center bg-red-50 rounded-lg">
                <div class="text-center">
                    <div class="text-red-500 text-6xl mb-4">⚠️</div>
                    <h3 class="text-xl font-bold mb-2">Map Loading Error</h3>
                    <p class="text-gray-600">Unable to load the map. Please check your connection.</p>
                </div>
            </div>
        `;
    }
}

// Global function to focus on marker
window.focusOnMarker = function(lat, lng) {
    if (map) {
        map.setView([lat, lng], 12);
        
        // Find and open the marker popup
        const marker = markers.find(m => 
            m.getLatLng().lat === lat && m.getLatLng().lng === lng
        );
        if (marker) {
            marker.openPopup();
        }
    }
};


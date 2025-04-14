// Spotify API Configuration
const CLIENT_ID = '176512190ebc4cfa95fc8fdd8fd20e68';
const REDIRECT_URI = 'http://127.0.0.1:5500/index.html';
const SCOPES = [
    'user-read-private', 'user-read-email', 
    'user-modify-playback-state', 'user-read-playback-state', 
    'streaming'
];

let player;
let deviceId;
let currentTrack = {};
let isPlaying = false;

const elements = {
    loginBtn: document.getElementById('loginBtn'),
    playerSection: document.getElementById('playerSection'),
    trackList: document.getElementById('trackList'),
    searchInput: document.getElementById('searchInput'),
    playBtn: document.getElementById('playBtn'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    progressBar: document.getElementById('progressBar')
};

window.onSpotifyWebPlaybackSDKReady = () => {
    player = new Spotify.Player({
        name: 'Web Player',
        getOAuthToken: cb => { cb(localStorage.getItem('spotify_token')); }
    });

    player.addListener('ready', ({ device_id }) => {
        deviceId = device_id;
        console.log('Ready with Device ID', device_id);
    });

    player.addListener('player_state_changed', state => {
        if (!state) return;
        currentTrack = state.track_window.current_track;
        elements.progressBar.style.width = 
            (state.position / state.duration) * 100 + '%';
        isPlaying = !state.paused;
        elements.playBtn.innerHTML = isPlaying ? 
            '<i class="fas fa-pause"></i>' : 
            '<i class="fas fa-play"></i>';
    });

    player.connect();
};

elements.loginBtn.addEventListener('click', () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID
        }&redirect_uri=${encodeURIComponent(REDIRECT_URI)
        }&scope=${encodeURIComponent(SCOPES.join(' '))
        }&response_type=token&show_dialog=true`;
    window.location.href = authUrl;
});

function handleAuth() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');

    if (token) {
        localStorage.setItem('spotify_token', token);
        elements.loginBtn.style.display = 'none';
        elements.playerSection.style.display = 'block';
        window.history.replaceState({}, document.title, '/');
    }
}

async function searchTracks(query) {
    const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=10`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('spotify_token')}`
        }
    });

    const data = await response.json();
    displayTracks(data.tracks.items);
}

function displayTracks(tracks) {
    elements.trackList.innerHTML = tracks.map(track => `
        <div class="track-item" data-uri="${track.uri}">
            <img src="${track.album.images[0].url}" class="album-art">
            <div>
                <h3>${track.name}</h3>
                <p>${track.artists.map(artist => artist.name).join(', ')}</p>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.track-item').forEach(item => {
        item.addEventListener('click', () => playTrack(item.dataset.uri));
    });
}

async function playTrack(uri) {
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('spotify_token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: [uri] })
    });
}

elements.playBtn.addEventListener('click', () => togglePlay());
elements.prevBtn.addEventListener('click', () => skip('previous'));
elements.nextBtn.addEventListener('click', () => skip('next'));

async function togglePlay() {
    await fetch(`https://api.spotify.com/v1/me/player/${isPlaying ? 'pause' : 'play'}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('spotify_token')}`
        }
    });
}

async function skip(direction) {
    await fetch(`https://api.spotify.com/v1/me/player/${direction}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('spotify_token')}`
        }
    });
}

elements.searchInput.addEventListener('input', (e) => {
    if (e.target.value.length > 2) searchTracks(e.target.value);
});

handleAuth();

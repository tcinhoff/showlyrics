const { ipcRenderer, shell } = require('electron');
const SpotifyAPI = require('./spotify-api');
const LyricsAPI = require('./lyrics-api');

const spotify = new SpotifyAPI();
const lyricsAPI = new LyricsAPI();

let currentTrack = null;
let lyricsCheckInterval = null;

// DOM Elements
const connectButton = document.getElementById('connectSpotify');
const testConnectionButton = document.getElementById('testConnection');
const toggleLyricsButton = document.getElementById('toggleLyrics');
const testLyricsButton = document.getElementById('testLyrics');
const statusDiv = document.getElementById('status');
const currentSongDiv = document.getElementById('currentSong');
const autoStartCheckbox = document.getElementById('autoStartCheckbox');

const settingsPanel = document.getElementById('settingsPanel');

// Load saved tokens
const savedTokens = localStorage.getItem('spotifyTokens');
if (savedTokens) {
    const { accessToken, refreshToken, tokenExpiry } = JSON.parse(savedTokens);
    spotify.accessToken = accessToken;
    spotify.refreshToken = refreshToken;
    spotify.tokenExpiry = tokenExpiry;
    if (accessToken) {
        testConnectionButton.disabled = false;
        showStatus('Gespeicherte Verbindung gefunden', 'info');
        startLyricsMonitoring();
    }
}


// Initialize auto-start checkbox
initializeAutoStart();

function showStatus(message, type = 'info') {
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
}


function saveTokens() {
    const tokens = {
        accessToken: spotify.accessToken,
        refreshToken: spotify.refreshToken,
        tokenExpiry: spotify.tokenExpiry
    };
    localStorage.setItem('spotifyTokens', JSON.stringify(tokens));
}

connectButton.addEventListener('click', async () => {
    try {
        const authUrl = await spotify.getAuthUrl();
        showStatus('Browser wird geöffnet für Spotify Autorisierung...', 'info');
        
        // Open auth URL in default browser
        shell.openExternal(authUrl);
        
        // Start a simple HTTP server to catch the callback
        startCallbackServer();
        
    } catch (error) {
        showStatus('Fehler beim Erstellen der Autorisierungs-URL: ' + error.message, 'error');
    }
});

function startCallbackServer() {
    const http = require('http');
    const url = require('url');
    
    const server = http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url, true);
        
        if (parsedUrl.pathname === '/callback') {
            const code = parsedUrl.query.code;
            const error = parsedUrl.query.error;
            
            if (error) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<h1>Autorisierung fehlgeschlagen</h1><p>Sie können dieses Fenster schließen.</p>');
                showStatus('Autorisierung abgebrochen', 'error');
                server.close();
                return;
            }
            
            if (code) {
                const success = await spotify.exchangeCodeForToken(code);
                
                if (success) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<h1>Erfolgreich verbunden!</h1><p>Sie können dieses Fenster schließen.</p>');
                    showStatus('Erfolgreich mit Spotify verbunden!', 'connected');
                    testConnectionButton.disabled = false;
                    saveTokens();
                    startLyricsMonitoring();
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<h1>Verbindung fehlgeschlagen</h1><p>Sie können dieses Fenster schließen.</p>');
                    showStatus('Token-Austausch fehlgeschlagen', 'error');
                }
                
                server.close();
            }
        }
    });
    
    server.listen(8888, () => {
        console.log('Callback server listening on port 8888');
    });
    
    // Close server after 5 minutes
    setTimeout(() => {
        server.close();
    }, 300000);
}

testConnectionButton.addEventListener('click', async () => {
    try {
        showStatus('Teste Verbindung...', 'info');
        const track = await spotify.getCurrentlyPlaying();
        
        if (track) {
            showStatus('Verbindung erfolgreich!', 'connected');
            updateCurrentSong(track);
        } else {
            showStatus('Verbindung OK, aber kein Song wird abgespielt', 'info');
            currentSongDiv.textContent = 'Kein Song wird abgespielt';
        }
    } catch (error) {
        showStatus('Verbindungstest fehlgeschlagen: ' + error.message, 'error');
    }
});

toggleLyricsButton.addEventListener('click', () => {
    ipcRenderer.send('toggle-lyrics-window');
});


testLyricsButton.addEventListener('click', () => {
    const testLyrics = {
        songInfo: 'Test Song - Test Artist',
        lyrics: [
            'This is a test line 1',
            'This is a test line 2',
            'This is a test line 3',
            'This is a test line 4',
            'This is a test line 5'
        ]
    };
    ipcRenderer.send('update-lyrics', testLyrics);
});

function updateCurrentSong(track) {
    const songInfo = `
        <strong>${track.name}</strong><br>
        ${track.artist}<br>
        <small>${track.album}</small>
    `;
    currentSongDiv.innerHTML = songInfo;
}

async function startLyricsMonitoring() {
    if (lyricsCheckInterval) {
        clearInterval(lyricsCheckInterval);
    }
    
    lyricsCheckInterval = setInterval(async () => {
        try {
            const track = await spotify.getCurrentlyPlaying();
            
            if (track && track.isPlaying) {
                updateCurrentSong(track);
                
                // Check if song changed
                if (!currentTrack || currentTrack.id !== track.id) {
                    currentTrack = track;
                    await fetchAndDisplayLyrics(track);
                } else {
                    // Song hasn't changed, but update playback position for auto-scroll
                    ipcRenderer.send('update-playback-position', {
                        progress: track.progress,
                        duration: track.duration,
                        isPlaying: track.isPlaying
                    });
                }
            } else if (track && !track.isPlaying) {
                updateCurrentSong(track);
                // Send paused state
                ipcRenderer.send('update-playback-position', {
                    progress: track.progress,
                    duration: track.duration,
                    isPlaying: false
                });
            } else {
                currentSongDiv.textContent = 'Kein Song wird abgespielt';
                currentTrack = null;
            }
        } catch (error) {
            console.error('Error monitoring Spotify:', error);
        }
    }, 500); // Check every 500ms for better sync
}

async function fetchAndDisplayLyrics(track) {
    try {
        showStatus('Lade Lyrics...', 'info');
        const lyrics = await lyricsAPI.searchLyrics(track.artist, track.name, track.duration);
        
        if (lyrics) {
            let lyricsData;
            
            if (lyrics.type === 'synchronized' && lyrics.syncedLyrics) {
                // Parse synchronized lyrics
                const timestampedLines = lyricsAPI.parseLRCLyrics(lyrics.syncedLyrics);
                lyricsData = {
                    songInfo: `${track.name} - ${track.artist}`,
                    lyrics: timestampedLines.map(line => line.text),
                    timestampedLyrics: timestampedLines,
                    trackDuration: track.duration,
                    trackProgress: track.progress,
                    isSynchronized: true,
                    source: lyrics.source
                };
                showStatus(`Synchronisierte Lyrics gefunden! (${lyrics.source})`, 'connected');
            } else if (lyrics.type === 'plain' && lyrics.plainLyrics) {
                // Use plain lyrics with fallback timing
                const lyricsLines = lyrics.plainLyrics.split('\n').filter(line => line.trim() !== '');
                lyricsData = {
                    songInfo: `${track.name} - ${track.artist}`,
                    lyrics: lyricsLines,
                    trackDuration: track.duration,
                    trackProgress: track.progress,
                    isSynchronized: false,
                    source: lyrics.source
                };
                showStatus(`Lyrics gefunden (${lyrics.source})`, 'connected');
            } else if (typeof lyrics === 'string') {
                // Legacy string response
                const lyricsLines = lyrics.split('\n').filter(line => line.trim() !== '');
                lyricsData = {
                    songInfo: `${track.name} - ${track.artist}`,
                    lyrics: lyricsLines,
                    trackDuration: track.duration,
                    trackProgress: track.progress,
                    isSynchronized: false
                };
                showStatus('Lyrics gefunden!', 'connected');
            }
            
            ipcRenderer.send('update-lyrics', lyricsData);
        } else {
            const noLyricsData = {
                songInfo: `${track.name} - ${track.artist}`,
                lyrics: ['Keine Lyrics gefunden für diesen Song'],
                trackDuration: track.duration,
                trackProgress: track.progress,
                isSynchronized: false
            };
            ipcRenderer.send('update-lyrics', noLyricsData);
            showStatus('Keine Lyrics gefunden', 'info');
        }
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        showStatus('Fehler beim Laden der Lyrics', 'error');
    }
}

// Auto-start functionality
async function initializeAutoStart() {
    try {
        const isEnabled = await ipcRenderer.invoke('get-auto-start-enabled');
        autoStartCheckbox.checked = isEnabled;
    } catch (error) {
        console.error('Error checking auto-start status:', error);
    }
}

autoStartCheckbox.addEventListener('change', async () => {
    try {
        const success = await ipcRenderer.invoke('set-auto-start', autoStartCheckbox.checked);
        if (success) {
            showStatus(
                autoStartCheckbox.checked ? 
                'Auto-Start aktiviert' : 
                'Auto-Start deaktiviert', 
                'info'
            );
        } else {
            showStatus('Fehler beim Ändern der Auto-Start Einstellung', 'error');
            // Revert checkbox state
            autoStartCheckbox.checked = !autoStartCheckbox.checked;
        }
    } catch (error) {
        console.error('Error setting auto-start:', error);
        showStatus('Fehler beim Ändern der Auto-Start Einstellung', 'error');
        // Revert checkbox state
        autoStartCheckbox.checked = !autoStartCheckbox.checked;
    }
});
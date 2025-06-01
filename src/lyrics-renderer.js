const { ipcRenderer } = require('electron');

let currentLyrics = [];
let currentLineIndex = 0;
let autoScrollEnabled = true;
let trackDuration = 0;
let trackProgress = 0;
let isPlaying = false;

// DOM Elements
const songInfoElement = document.getElementById('songInfo');
const lyricsContainer = document.getElementById('lyricsContainer');
const closeBtn = document.getElementById('closeBtn');

// Handle close button
closeBtn.addEventListener('click', () => {
    const { remote } = require('electron');
    remote.getCurrentWindow().hide();
});

// Listen for lyrics updates from main process
ipcRenderer.on('lyrics-updated', (event, lyricsData) => {
    updateLyricsDisplay(lyricsData);
});

// Listen for playback position updates
ipcRenderer.on('playback-position-updated', (event, positionData) => {
    updatePlaybackPosition(positionData);
});

function updateLyricsDisplay(lyricsData) {
    // Update song info
    songInfoElement.textContent = lyricsData.songInfo;
    
    // Update lyrics and track info
    currentLyrics = lyricsData.lyrics;
    trackDuration = lyricsData.trackDuration || 0;
    trackProgress = lyricsData.trackProgress || 0;
    currentLineIndex = 0;
    
    if (currentLyrics && currentLyrics.length > 0) {
        renderLyrics();
        // Calculate initial position based on current progress
        if (trackDuration > 0) {
            const progressPercent = trackProgress / trackDuration;
            const estimatedLineIndex = Math.floor(progressPercent * currentLyrics.length);
            setCurrentLine(Math.min(estimatedLineIndex, currentLyrics.length - 1));
        }
    } else {
        showNoLyrics();
    }
}

function updatePlaybackPosition(positionData) {
    trackProgress = positionData.progress;
    trackDuration = positionData.duration;
    isPlaying = positionData.isPlaying;
    
    if (autoScrollEnabled && isPlaying && trackDuration > 0 && currentLyrics.length > 0) {
        // Calculate which line should be current based on playback position
        const progressPercent = trackProgress / trackDuration;
        const estimatedLineIndex = Math.floor(progressPercent * currentLyrics.length);
        const targetLine = Math.min(Math.max(estimatedLineIndex, 0), currentLyrics.length - 1);
        
        // Only update if we're not too close to the current line (avoid jittery movement)
        if (Math.abs(targetLine - currentLineIndex) > 0) {
            setCurrentLine(targetLine);
        }
    }
}

function renderLyrics() {
    lyricsContainer.innerHTML = '';
    
    currentLyrics.forEach((line, index) => {
        const lineElement = document.createElement('div');
        lineElement.className = 'lyrics-line';
        lineElement.textContent = line;
        lineElement.id = `line-${index}`;
        
        // Add click handler to jump to line
        lineElement.addEventListener('click', () => {
            setCurrentLine(index);
        });
        
        lyricsContainer.appendChild(lineElement);
    });
    
    setCurrentLine(0);
}

function setCurrentLine(index) {
    // Remove previous highlighting
    document.querySelectorAll('.lyrics-line').forEach(line => {
        line.classList.remove('current', 'past', 'future');
    });
    
    // Add new highlighting
    currentLyrics.forEach((_, i) => {
        const lineElement = document.getElementById(`line-${i}`);
        if (lineElement) {
            if (i < index) {
                lineElement.classList.add('past');
            } else if (i === index) {
                lineElement.classList.add('current');
            } else {
                lineElement.classList.add('future');
            }
        }
    });
    
    currentLineIndex = index;
    
    // Scroll current line into view
    const currentElement = document.getElementById(`line-${index}`);
    if (currentElement) {
        currentElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

function startAutoScroll() {
    // Auto-scroll is now handled by playback position updates
    // This function is kept for backward compatibility
    autoScrollEnabled = true;
}

function stopAutoScroll() {
    autoScrollEnabled = false;
}

function showNoLyrics() {
    lyricsContainer.innerHTML = `
        <div class="no-lyrics">
            🎵 Keine Lyrics verfügbar<br>
            für den aktuellen Song
        </div>
    `;
}

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    switch(event.key) {
        case 'ArrowUp':
            event.preventDefault();
            if (currentLineIndex > 0) {
                setCurrentLine(currentLineIndex - 1);
            }
            break;
        case 'ArrowDown':
            event.preventDefault();
            if (currentLineIndex < currentLyrics.length - 1) {
                setCurrentLine(currentLineIndex + 1);
            }
            break;
        case ' ':
            event.preventDefault();
            autoScrollEnabled = !autoScrollEnabled;
            if (autoScrollEnabled) {
                startAutoScroll();
            } else {
                stopAutoScroll();
            }
            break;
        case 'Escape':
            const { remote } = require('electron');
            remote.getCurrentWindow().hide();
            break;
    }
});

// Mouse wheel support for scrolling through lyrics
lyricsContainer.addEventListener('wheel', (event) => {
    event.preventDefault();
    
    if (event.deltaY > 0 && currentLineIndex < currentLyrics.length - 1) {
        setCurrentLine(currentLineIndex + 1);
    } else if (event.deltaY < 0 && currentLineIndex > 0) {
        setCurrentLine(currentLineIndex - 1);
    }
});

// Double-click to toggle auto-scroll
lyricsContainer.addEventListener('dblclick', () => {
    autoScrollEnabled = !autoScrollEnabled;
    if (autoScrollEnabled) {
        startAutoScroll();
    } else {
        stopAutoScroll();
    }
});

// Initialize with welcome message
showNoLyrics();
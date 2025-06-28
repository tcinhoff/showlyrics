const { ipcRenderer } = require('electron');

let currentLyrics = [];
let timestampedLyrics = [];
let currentLineIndex = 0;
let autoScrollEnabled = true;
let trackDuration = 0;
let trackProgress = 0;
let isPlaying = false;
let timingOffset = 2000; // Default 2 second offset to compensate for delay (in ms)
let isSynchronized = false;

// DOM Elements
const songInfoElement = document.getElementById('songInfo');
const lyricsContainer = document.getElementById('lyricsContainer');
const closeBtn = document.getElementById('closeBtn');

// Handle close button
closeBtn.addEventListener('click', () => {
    ipcRenderer.send('hide-lyrics-window');
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
    // Update song info with sync indicator
    let songInfo = lyricsData.songInfo;
    if (lyricsData.isSynchronized && lyricsData.source) {
        songInfo += ` • Synced (${lyricsData.source})`;
    } else if (lyricsData.source) {
        songInfo += ` • ${lyricsData.source}`;
    }
    songInfoElement.textContent = songInfo;
    
    // Update lyrics and track info
    currentLyrics = lyricsData.lyrics;
    timestampedLyrics = lyricsData.timestampedLyrics || [];
    trackDuration = lyricsData.trackDuration || 0;
    trackProgress = lyricsData.trackProgress || 0;
    isSynchronized = lyricsData.isSynchronized || false;
    currentLineIndex = 0;
    
    console.log(`Lyrics loaded: ${isSynchronized ? 'SYNCHRONIZED' : 'fallback timing'} (${timestampedLyrics.length} timestamped lines)`);
    
    if (currentLyrics && currentLyrics.length > 0) {
        renderLyrics();
        // Calculate initial position based on current progress
        if (trackDuration > 0) {
            const adjustedProgress = Math.max(0, trackProgress + timingOffset);
            let estimatedLineIndex;
            
            if (isSynchronized && timestampedLyrics.length > 0) {
                estimatedLineIndex = findCurrentLineByTimestamp(adjustedProgress);
            } else {
                estimatedLineIndex = calculateLyricsPosition(adjustedProgress, trackDuration);
            }
            
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
        // Calculate which line should be current based on playback position with timing offset
        const adjustedProgress = Math.max(0, trackProgress + timingOffset);
        let targetLine;
        
        if (isSynchronized && timestampedLyrics.length > 0) {
            // Use precise timestamp-based positioning
            targetLine = findCurrentLineByTimestamp(adjustedProgress);
        } else {
            // Fall back to estimated positioning
            const estimatedLineIndex = calculateLyricsPosition(adjustedProgress, trackDuration);
            targetLine = Math.min(Math.max(estimatedLineIndex, 0), currentLyrics.length - 1);
        }
        
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

function findCurrentLineByTimestamp(currentTime) {
    // Find the current line based on exact timestamps
    if (!timestampedLyrics || timestampedLyrics.length === 0) {
        return 0;
    }
    
    // Find the last line that should have started by now
    let currentLineIndex = 0;
    for (let i = 0; i < timestampedLyrics.length; i++) {
        if (timestampedLyrics[i].timestamp <= currentTime) {
            currentLineIndex = i;
        } else {
            break;
        }
    }
    
    return currentLineIndex;
}

function calculateLyricsPosition(adjustedProgress, trackDuration) {
    // Improved lyrics timing algorithm that accounts for song structure
    // Only used as fallback when synchronized lyrics are not available
    const progressPercent = adjustedProgress / trackDuration;
    
    // Account for typical song structure (intro, verse, chorus, outro)
    let adjustedPercent = progressPercent;
    
    // Songs typically start with intro (first 10-15% often instrumental)
    // and end with outro (last 5-10% often instrumental/fade)
    const introEnd = 0.12; // 12% for intro
    const outroStart = 0.92; // 92% for outro start
    
    if (progressPercent < introEnd) {
        // During intro, lyrics should progress slower
        adjustedPercent = progressPercent * 0.3;
    } else if (progressPercent > outroStart) {
        // During outro, lyrics should be nearly complete
        adjustedPercent = 0.85 + (progressPercent - outroStart) * 1.5;
    } else {
        // Main content (verses/chorus) - map the middle 80% of song to middle 85% of lyrics
        const mainProgress = (progressPercent - introEnd) / (outroStart - introEnd);
        adjustedPercent = 0.3 + mainProgress * 0.55;
    }
    
    // Ensure we don't exceed bounds
    adjustedPercent = Math.max(0, Math.min(1, adjustedPercent));
    
    return Math.floor(adjustedPercent * currentLyrics.length);
}

function showTimingOffsetFeedback() {
    // Create or update timing feedback element
    let feedbackElement = document.getElementById('timing-feedback');
    if (!feedbackElement) {
        feedbackElement = document.createElement('div');
        feedbackElement.id = 'timing-feedback';
        feedbackElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-size: 16px;
            pointer-events: none;
        `;
        document.body.appendChild(feedbackElement);
    }
    
    const offsetSeconds = (timingOffset / 1000).toFixed(1);
    feedbackElement.textContent = `Timing-Offset: ${offsetSeconds}s`;
    feedbackElement.style.display = 'block';
    
    // Hide after 2 seconds
    clearTimeout(feedbackElement.hideTimeout);
    feedbackElement.hideTimeout = setTimeout(() => {
        feedbackElement.style.display = 'none';
    }, 2000);
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
        case 'ArrowLeft':
            event.preventDefault();
            // Decrease timing offset (make lyrics appear earlier)
            timingOffset = Math.max(-5000, timingOffset - 250);
            showTimingOffsetFeedback();
            break;
        case 'ArrowRight':
            event.preventDefault();
            // Increase timing offset (make lyrics appear later)
            timingOffset = Math.min(10000, timingOffset + 250);
            showTimingOffsetFeedback();
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
            ipcRenderer.send('hide-lyrics-window');
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

// Window dragging functionality
let isDragging = false;
let dragStart = { x: 0, y: 0 };

// Make the entire window draggable
document.addEventListener('mousedown', (event) => {
    // Don't start dragging if clicking on close button
    if (event.target.id === 'closeBtn' || event.target.closest('#closeBtn')) {
        return;
    }
    
    isDragging = true;
    dragStart.x = event.clientX;
    dragStart.y = event.clientY;
    
    // Prevent text selection during drag
    event.preventDefault();
    document.body.style.userSelect = 'none';
    document.body.classList.add('dragging');
});

document.addEventListener('mousemove', (event) => {
    if (!isDragging) return;
    
    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;
    
    ipcRenderer.send('move-lyrics-window', { deltaX, deltaY });
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        document.body.style.userSelect = '';
        document.body.classList.remove('dragging');
        
        // Send interaction event to prevent auto-hide
        ipcRenderer.send('lyrics-interaction');
    }
});

// Prevent default drag behavior on images and other elements
document.addEventListener('dragstart', (event) => {
    event.preventDefault();
});

// Initialize with welcome message
showNoLyrics();
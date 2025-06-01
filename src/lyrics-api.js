const axios = require('axios');

class LyricsAPI {
    constructor() {
        this.geniusAccessToken = null; // You can set this if you have a Genius API token
    }

    async searchLyrics(artist, title, duration = null) {
        // Try multiple methods to get lyrics, prioritizing synchronized lyrics
        let lyrics = null;
        
        // Clean the search terms for better matching
        const cleanArtist = this.cleanSearchTerm(artist);
        const cleanTitle = this.cleanSearchTerm(title);
        
        console.log(`Searching lyrics for: "${cleanTitle}" by "${cleanArtist}"`);
        
        // Method 1: Try LRCLIB for synchronized lyrics (BEST OPTION)
        lyrics = await this.getSynchronizedLyricsFromLRCLIB(cleanArtist, cleanTitle, duration);
        if (lyrics) {
            console.log('Found synchronized lyrics from LRCLIB!');
            return lyrics;
        }
        
        // Method 2: Try LRCLIB with original terms
        lyrics = await this.getSynchronizedLyricsFromLRCLIB(artist, title, duration);
        if (lyrics) {
            console.log('Found synchronized lyrics from LRCLIB (original terms)!');
            return lyrics;
        }
        
        // Method 3: Try Lyrics.ovh (free, no API key required)
        lyrics = await this.getLyricsFromLyricsOvh(cleanArtist, cleanTitle);
        if (lyrics) return lyrics;
        
        // Method 4: Try alternative APIs
        lyrics = await this.getLyricsFromAlternatives(cleanArtist, cleanTitle);
        if (lyrics) return lyrics;
        
        // Method 5: Try with original terms (sometimes cleaning removes important parts)
        lyrics = await this.getLyricsFromLyricsOvh(artist, title);
        if (lyrics) return lyrics;
        
        // Method 6: Try simplified search
        lyrics = await this.getLyricsSimplified(cleanArtist, cleanTitle);
        if (lyrics) return lyrics;
        
        return null;
    }

    async getLyricsFromLyricsOvh(artist, title) {
        try {
            const cleanArtist = this.cleanSearchTerm(artist);
            const cleanTitle = this.cleanSearchTerm(title);
            
            const response = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`, {
                timeout: 10000
            });
            
            if (response.data && response.data.lyrics) {
                return response.data.lyrics.trim();
            }
        } catch (error) {
            console.log('Lyrics.ovh failed:', error.message);
        }
        return null;
    }

    async getLyricsFromAlternatives(artist, title) {
        const alternatives = [
            // LyricsAPI.net
            {
                url: `https://lyricsapi.net/api/lyrics/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
                extract: (data) => data.lyrics
            },
            // Lyrist
            {
                url: `https://lyrist.vercel.app/api/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
                extract: (data) => data.lyrics
            },
            // Another lyrics API
            {
                url: `https://api.popcat.xyz/lyrics?song=${encodeURIComponent(title + ' ' + artist)}`,
                extract: (data) => data.lyrics
            }
        ];
        
        for (const api of alternatives) {
            try {
                console.log(`Trying alternative API: ${api.url}`);
                const response = await axios.get(api.url, { 
                    timeout: 8000,
                    headers: {
                        'User-Agent': 'ShowLyrics/1.0'
                    }
                });
                
                if (response.data) {
                    const lyrics = api.extract(response.data);
                    if (lyrics && typeof lyrics === 'string' && lyrics.trim().length > 50) {
                        console.log('Found lyrics from alternative API');
                        return lyrics.trim();
                    }
                }
            } catch (apiError) {
                console.log(`Alternative API failed: ${apiError.message}`);
                continue;
            }
        }
        return null;
    }

    async getLyricsSimplified(artist, title) {
        // Try with just the main artist name (first artist)
        const mainArtist = artist.split(',')[0].split('feat')[0].split('ft.')[0].trim();
        
        // Try with simplified title (remove everything after first parenthesis or bracket)
        const simpleTitle = title.split('(')[0].split('[')[0].trim();
        
        console.log(`Trying simplified search: "${simpleTitle}" by "${mainArtist}"`);
        
        try {
            const response = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(mainArtist)}/${encodeURIComponent(simpleTitle)}`, {
                timeout: 10000
            });
            
            if (response.data && response.data.lyrics) {
                return response.data.lyrics.trim();
            }
        } catch (error) {
            console.log('Simplified search failed:', error.message);
        }
        return null;
    }

    cleanSearchTerm(term) {
        return term
            .replace(/\(.*?\)/g, '') // Remove content in parentheses
            .replace(/\[.*?\]/g, '') // Remove content in brackets
            .replace(/feat\..*$/i, '') // Remove "feat." and everything after
            .replace(/ft\..*$/i, '') // Remove "ft." and everything after
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
    }

    // Method to search for lyrics using a simple web scraping approach
    async searchLyricsSimple(artist, title) {
        try {
            // This is a simple implementation that could be extended
            // to scrape from various lyrics websites
            const searchQuery = `${artist} ${title} lyrics`;
            
            // For now, return a placeholder
            return `Lyrics für "${title}" von ${artist} konnten nicht automatisch geladen werden.\n\nBitte versuchen Sie es manuell auf einer Lyrics-Website.`;
        } catch (error) {
            console.error('Simple lyrics search failed:', error);
            return null;
        }
    }

    // Method to format lyrics for display
    formatLyrics(lyrics) {
        if (!lyrics) return [];
        
        return lyrics
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .filter(line => !line.match(/^\[.*\]$/)) // Remove section markers like [Verse 1]
            .slice(0, 50); // Limit to 50 lines to prevent overly long displays
    }

    // Method to get synchronized lyrics from LRCLIB
    async getSynchronizedLyricsFromLRCLIB(artist, title, duration = null) {
        try {
            // LRCLIB API endpoint
            let url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
            
            // Add duration if available for better matching
            if (duration) {
                const durationSeconds = Math.round(duration / 1000);
                url += `&duration=${durationSeconds}`;
            }
            
            console.log(`Trying LRCLIB: ${url}`);
            
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'ShowLyrics/1.0'
                }
            });
            
            if (response.data && response.data.syncedLyrics) {
                console.log('Found synchronized lyrics from LRCLIB!');
                return {
                    type: 'synchronized',
                    syncedLyrics: response.data.syncedLyrics,
                    plainLyrics: response.data.plainLyrics,
                    source: 'LRCLIB'
                };
            } else if (response.data && response.data.plainLyrics) {
                console.log('Found plain lyrics from LRCLIB');
                return {
                    type: 'plain',
                    plainLyrics: response.data.plainLyrics,
                    source: 'LRCLIB'
                };
            }
        } catch (error) {
            console.log('LRCLIB failed:', error.message);
        }
        return null;
    }

    // Method to parse LRC format lyrics into timestamped lines
    parseLRCLyrics(lrcText) {
        if (!lrcText) return [];
        
        const lines = lrcText.split('\n');
        const timestampedLines = [];
        
        for (const line of lines) {
            // Match LRC format: [mm:ss.xx]lyric text
            const match = line.match(/^\[(\d{1,2}):(\d{2})\.(\d{2})\](.*)$/);
            if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const centiseconds = parseInt(match[3]);
                const text = match[4].trim();
                
                // Convert to milliseconds
                const timestamp = (minutes * 60 + seconds) * 1000 + centiseconds * 10;
                
                if (text.length > 0) { // Only include non-empty lines
                    timestampedLines.push({
                        timestamp: timestamp,
                        text: text
                    });
                }
            }
        }
        
        // Sort by timestamp (should already be sorted, but just in case)
        timestampedLines.sort((a, b) => a.timestamp - b.timestamp);
        
        return timestampedLines;
    }

    // Method to get synchronized lyrics (updated to use LRCLIB)
    async getSynchronizedLyrics(artist, title, duration = null) {
        return await this.getSynchronizedLyricsFromLRCLIB(artist, title, duration);
    }
}

module.exports = LyricsAPI;
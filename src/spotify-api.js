const axios = require('axios');
const crypto = require('crypto');

class SpotifyAPI {
    constructor() {
        // Built-in app credentials - replace with your actual Spotify app Client ID
        this.clientId = '0db981a94b1e4e4e8f0ddb48311223d9';
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.lastApiCallTime = 0;
        this.avgLatency = 0;
        this.latencyMeasurements = [];
        
        // PKCE (Proof Key for Code Exchange) parameters
        this.codeVerifier = null;
        this.codeChallenge = null;
    }

    // Generate PKCE parameters for secure OAuth without client secret
    generatePKCEParams() {
        this.codeVerifier = crypto.randomBytes(32).toString('base64url');
        this.codeChallenge = crypto.createHash('sha256').update(this.codeVerifier).digest('base64url');
    }

    async getAuthUrl() {
        this.generatePKCEParams();
        
        const scopes = 'user-read-currently-playing user-read-playback-state';
        const redirectUri = 'http://127.0.0.1:8888/callback';
        const state = Math.random().toString(36).substring(7);
        
        return `https://accounts.spotify.com/authorize?` +
            `response_type=code&` +
            `client_id=${this.clientId}&` +
            `scope=${encodeURIComponent(scopes)}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${state}&` +
            `code_challenge_method=S256&` +
            `code_challenge=${this.codeChallenge}`;
    }

    async exchangeCodeForToken(code) {
        try {
            const response = await axios.post('https://accounts.spotify.com/api/token', 
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: 'http://127.0.0.1:8888/callback',
                    client_id: this.clientId,
                    code_verifier: this.codeVerifier
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            this.refreshToken = response.data.refresh_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
            
            return true;
        } catch (error) {
            console.error('Token exchange failed:', error.response?.data || error.message);
            return false;
        }
    }

    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await axios.post('https://accounts.spotify.com/api/token',
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken,
                    client_id: this.clientId
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
            
            if (response.data.refresh_token) {
                this.refreshToken = response.data.refresh_token;
            }

            return true;
        } catch (error) {
            console.error('Token refresh failed:', error.response?.data || error.message);
            return false;
        }
    }

    async ensureValidToken() {
        if (!this.accessToken) {
            throw new Error('No access token available');
        }

        if (Date.now() >= this.tokenExpiry - 60000) { // Refresh 1 minute before expiry
            await this.refreshAccessToken();
        }
    }

    async getCurrentlyPlaying() {
        await this.ensureValidToken();

        try {
            const startTime = Date.now();
            const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            const endTime = Date.now();
            
            // Track latency for compensation
            this.trackLatency(endTime - startTime);
            this.lastApiCallTime = startTime;

            if (response.status === 204 || !response.data.item) {
                return null; // Nothing playing
            }

            const track = response.data.item;
            const apiCallLatency = endTime - startTime;
            
            return {
                name: track.name,
                artist: track.artists.map(artist => artist.name).join(', '),
                album: track.album.name,
                duration: track.duration_ms,
                progress: response.data.progress_ms + apiCallLatency, // Compensate for API latency
                isPlaying: response.data.is_playing,
                id: track.id,
                uri: track.uri,
                apiLatency: apiCallLatency
            };
        } catch (error) {
            if (error.response?.status === 401) {
                // Token expired, try to refresh
                if (await this.refreshAccessToken()) {
                    return this.getCurrentlyPlaying();
                }
            }
            console.error('Failed to get currently playing:', error.response?.data || error.message);
            return null;
        }
    }

    trackLatency(latency) {
        this.latencyMeasurements.push(latency);
        
        // Keep only last 20 measurements for rolling average
        if (this.latencyMeasurements.length > 20) {
            this.latencyMeasurements.shift();
        }
        
        // Calculate average latency
        this.avgLatency = this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length;
    }

    getAverageLatency() {
        return this.avgLatency;
    }

    async searchTrack(artist, title) {
        await this.ensureValidToken();

        try {
            const query = `artist:"${artist}" track:"${title}"`;
            const response = await axios.get('https://api.spotify.com/v1/search', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                params: {
                    q: query,
                    type: 'track',
                    limit: 1
                }
            });

            if (response.data.tracks.items.length > 0) {
                return response.data.tracks.items[0];
            }
            return null;
        } catch (error) {
            console.error('Search failed:', error.response?.data || error.message);
            return null;
        }
    }
}

module.exports = SpotifyAPI;
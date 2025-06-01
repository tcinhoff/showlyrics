const axios = require('axios');

class SpotifyAPI {
    constructor() {
        this.clientId = null;
        this.clientSecret = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
    }

    setCredentials(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    async getAuthUrl() {
        const scopes = 'user-read-currently-playing user-read-playback-state';
        const redirectUri = 'http://127.0.0.1:8888/callback';
        const state = Math.random().toString(36).substring(7);
        
        return `https://accounts.spotify.com/authorize?` +
            `response_type=code&` +
            `client_id=${this.clientId}&` +
            `scope=${encodeURIComponent(scopes)}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${state}`;
    }

    async exchangeCodeForToken(code) {
        try {
            const response = await axios.post('https://accounts.spotify.com/api/token', 
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: 'http://127.0.0.1:8888/callback',
                    client_id: this.clientId,
                    client_secret: this.clientSecret
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
                    client_id: this.clientId,
                    client_secret: this.clientSecret
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
            const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (response.status === 204 || !response.data.item) {
                return null; // Nothing playing
            }

            const track = response.data.item;
            return {
                name: track.name,
                artist: track.artists.map(artist => artist.name).join(', '),
                album: track.album.name,
                duration: track.duration_ms,
                progress: response.data.progress_ms,
                isPlaying: response.data.is_playing,
                id: track.id,
                uri: track.uri
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
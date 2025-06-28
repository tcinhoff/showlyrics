# Spotify API Setup Guide

Um die Spotify-Integration in ShowLyrics zu verwenden, müssen Sie eine Spotify-App registrieren und die Client ID in den Code einfügen.

## Schritt 1: Spotify App erstellen

1. Gehen Sie zu [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Loggen Sie sich mit Ihrem Spotify-Account ein
3. Klicken Sie auf "Create app"
4. Füllen Sie die folgenden Felder aus:
   - **App name**: ShowLyrics (oder ein beliebiger Name)
   - **App description**: Desktop app for displaying Spotify lyrics
   - **Redirect URI**: `http://127.0.0.1:8888/callback`
   - **Which API/SDKs are you planning to use?**: Web API
5. Akzeptieren Sie die Spotify Developer Terms of Service
6. Klicken Sie auf "Save"

## Schritt 2: Client ID abrufen

1. Klicken Sie auf Ihre neu erstellte App
2. Gehen Sie zu "Settings"
3. Kopieren Sie die **Client ID** (eine lange Zeichenkette)

## Schritt 3: Client ID in den Code einfügen

1. Öffnen Sie die Datei `src/spotify-api.js`
2. Suchen Sie nach der Zeile:
   ```javascript
   this.clientId = 'your_spotify_client_id_here';
   ```
3. Ersetzen Sie `'your_spotify_client_id_here'` mit Ihrer echten Client ID:
   ```javascript
   this.clientId = 'ihre_echte_client_id_hier';
   ```
4. Speichern Sie die Datei

## Schritt 4: App neu starten

1. Starten Sie ShowLyrics neu
2. Klicken Sie auf "Mit Spotify verbinden"
3. Ein Browser-Fenster öffnet sich für die Spotify-Autorisierung
4. Loggen Sie sich ein und gewähren Sie die Berechtigung
5. Die App ist jetzt mit Spotify verbunden!

## Hinweise

- Die **Client Secret** wird NICHT benötigt, da die App PKCE (Proof Key for Code Exchange) für sichere Authentifizierung verwendet
- Ihre Client ID ist öffentlich sichtbar und nicht geheim
- Die Redirect URI muss exakt `http://127.0.0.1:8888/callback` sein
- Wenn Sie die App verteilen möchten, sollten Sie Ihre eigene Client ID verwenden

## Warum diese Lösung?

Diese Lösung:
- ✅ Erfordert keine API-Schlüssel von Benutzern
- ✅ Ist sicher (PKCE OAuth Flow)
- ✅ Bietet eine nahtlose Benutzererfahrung
- ✅ Entspricht den Spotify-Richtlinien
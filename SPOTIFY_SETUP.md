# Spotify API Setup Guide

Um die Spotify-Integration in ShowLyrics zu verwenden, müssen Sie eine Spotify-App registrieren und die Client ID in einer `.env` Datei konfigurieren.

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

## Schritt 3: .env Datei konfigurieren

1. Kopieren Sie die Datei `.env.example` zu `.env`:
   ```bash
   cp .env.example .env
   ```
2. Öffnen Sie die `.env` Datei in einem Texteditor
3. Ersetzen Sie `your_spotify_client_id_here` mit Ihrer echten Client ID:
   ```
   SPOTIFY_CLIENT_ID=ihre_echte_client_id_hier
   ```
4. Speichern Sie die Datei

**Wichtig:** Committen Sie die `.env` Datei niemals in Git! Sie ist bereits in der `.gitignore` enthalten.

## Schritt 4: App neu starten

1. Starten Sie ShowLyrics neu
2. Klicken Sie auf "Mit Spotify verbinden"
3. Ein Browser-Fenster öffnet sich für die Spotify-Autorisierung
4. Loggen Sie sich ein und gewähren Sie die Berechtigung
5. Die App ist jetzt mit Spotify verbunden!

## Hinweise

- Die **Client Secret** wird NICHT benötigt, da die App PKCE (Proof Key for Code Exchange) für sichere Authentifizierung verwendet
- Ihre Client ID sollte in der `.env` Datei gespeichert und nicht öffentlich geteilt werden
- Die Redirect URI muss exakt `http://127.0.0.1:8888/callback` sein
- Jeder Benutzer sollte seine eigene Spotify App und Client ID verwenden

## Warum diese Lösung?

Diese Lösung:
- ✅ Schützt Ihre persönlichen API-Credentials
- ✅ Ist sicher (PKCE OAuth Flow ohne Client Secret)
- ✅ Ermöglicht einfache Konfiguration über `.env` Datei
- ✅ Entspricht den Spotify-Richtlinien und Best Practices
# ShowLyrics 🎵

Eine Desktop-Anwendung, die Spotify-Lyrics in einem schwebenden Fenster anzeigt, damit Sie beim Arbeiten mitlesen und mitsingen können.

## Features

- **Schwebendes Lyrics-Fenster**: Immer im Vordergrund, in der Ecke des Bildschirms
- **Spotify Integration**: Automatische Erkennung des aktuell spielenden Songs
- **Lyrics-Anzeige**: Automatisches Laden von Lyrics aus verschiedenen Quellen
- **Auto-Scroll**: Automatisches Durchlaufen der Lyrics (kann ein-/ausgeschaltet werden)
- **Benutzerfreundlich**: Einfache Einrichtung und Bedienung

## Installation

1. Repository klonen oder herunterladen
2. Dependencies installieren:
```bash
npm install
```

## Einrichtung

### 1. Spotify API Credentials

1. Gehen Sie zu [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Erstellen Sie eine neue App
3. Notieren Sie sich die **Client ID** (Client Secret wird nicht benötigt!)
4. Fügen Sie `http://127.0.0.1:8888/callback` als Redirect URI hinzu

### 2. Environment-Datei konfigurieren

1. Kopieren Sie die Datei `.env.example` zu `.env`:
```bash
cp .env.example .env
```

2. Öffnen Sie die `.env` Datei und tragen Sie Ihre Spotify Client ID ein:
```
SPOTIFY_CLIENT_ID=ihre_echte_client_id_hier
```

**Wichtig:** Die `.env` Datei enthält Ihre persönlichen API-Credentials und sollte niemals in Git committed werden!

### 3. App starten

```bash
# Entwicklungsmodus
npm run dev

# Normale Ausführung
npm start
```

## Nutzung

1. **Erste Einrichtung**:
   - Stellen Sie sicher, dass die `.env` Datei korrekt konfiguriert ist
   - Starten Sie die App
   - Klicken Sie auf "Mit Spotify verbinden"
   - Autorisieren Sie die App in Ihrem Browser

2. **Lyrics anzeigen**:
   - Spielen Sie einen Song in Spotify ab
   - Die App erkennt automatisch den Song und lädt die Lyrics
   - Das Lyrics-Fenster erscheint in der unteren rechten Ecke

3. **Steuerung**:
   - **Pfeiltasten**: Manuell durch Lyrics navigieren
   - **Leertaste**: Auto-Scroll ein/ausschalten
   - **Doppelklick**: Auto-Scroll umschalten
   - **Escape**: Lyrics-Fenster ausblenden
   - **Mausrad**: Durch Lyrics scrollen

## Tastenkürzel

- `↑/↓`: Vorherige/Nächste Zeile
- `Leertaste`: Auto-Scroll umschalten
- `Escape`: Fenster schließen
- `Doppelklick`: Auto-Scroll umschalten

## Build

```bash
# App für Ihr Betriebssystem bauen
npm run build

# Distributables erstellen
npm run dist
```

## Unterstützte Plattformen

- Windows
- macOS
- Linux

## Lyrics-Quellen

Die App verwendet verschiedene Lyrics-APIs:
- Lyrics.ovh (primär)
- Verschiedene Fallback-APIs

## Troubleshooting

### "Keine Lyrics gefunden"
- Versuchen Sie es mit einem anderen Song
- Stellen Sie sicher, dass Artist und Titel korrekt erkannt wurden
- Einige Songs haben möglicherweise keine verfügbaren Lyrics

### "Verbindung zu Spotify fehlgeschlagen"
- Überprüfen Sie Ihre Client ID in der `.env` Datei
- Stellen Sie sicher, dass die Redirect URI korrekt konfiguriert ist (`http://127.0.0.1:8888/callback`)
- Stellen Sie sicher, dass Spotify läuft und ein Song abgespielt wird
- Autorisieren Sie die App erneut

### Lyrics-Fenster ist nicht sichtbar
- Verwenden Sie den "Lyrics Fenster ein/ausblenden" Button
- Das Fenster könnte außerhalb des sichtbaren Bereichs sein

## Entwicklung

```bash
# Mit DevTools starten
npm run dev
```

## Lizenz

MIT License
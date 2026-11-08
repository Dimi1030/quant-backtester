# Gipfelquiz – das Familienquiz vom Kilimandscharo

Ein Weihnachtsquiz für die ganze Familie, gespielt auf **einem** Bildschirm (Laptop am Fernseher).
Teams („Seilschaften“) klettern mit jeder richtigen Antwort den Kilimandscharo hinauf:
Start am Marangu Gate (1.870 m), Ziel Uhuru Peak (5.895 m).

## Spielen

- **Online:** den Artifact-Link auf claude.ai öffnen.
- **Offline:** `Gipfelquiz.html` herunterladen und im Browser öffnen (Chrome, Edge, Firefox oder Safari).
  Die Datei enthält alle Fotos, Klänge und Fragen und braucht kein Internet.
  Ohne Internet fehlen nur die Schriftarten; dann nutzt das Spiel die Systemschrift.

Tasten für die Spielleitung: `Leertaste` weiter · `P` Pause · `M` Ton · `F` Vollbild ·
`1`–`4` Antworten der Teams der Reihe nach eintragen (bei Wahr/Falsch `W` und `F`).

## Inhalt

- 10 Runden plus Finale, 103 Fragen im Pool; pro Spiel werden zufällig welche gezogen.
  Bereits gespielte Fragen kommen erst wieder, wenn eine Runde durch ist.
- Runden: Jambo Tansania, Big Five & Co., Fußball, Zoom-Safari (Bilderrätsel),
  Pferdestärken, Swahili für Anfänger, Spitzentanz (Ballett), Wahr oder Falsch,
  Schätzen wie die Profis, Weihnachten weltweit, Gipfelsturm (Finale mit Einsatz).
- Joker „Rückenwind“: einmal pro Spiel doppelte Höhenmeter.
- Der Spielstand wird im Browser gespeichert; nach einem Neuladen geht es mit „Weiterspielen“ weiter.

## Fragen ändern

Die Fragen stehen in `src/questions.js` (und genauso im Klartext in `Gipfelquiz.html`,
Suche nach `const ROUNDS`). Bei Multiple-Choice-Fragen steht die richtige Antwort immer an
erster Stelle; das Spiel mischt die Reihenfolge selbst.

## Bildnachweise

Alle Fotos stammen von Wikimedia Commons (u. a. viele Serengeti-Aufnahmen von Giles Laurent)
und stehen unter freien Lizenzen (CC BY, CC BY-SA, CC0, gemeinfrei). Die vollständige Liste
mit Urheber, Lizenz und Link steht im Spiel unter „Bildnachweise“.

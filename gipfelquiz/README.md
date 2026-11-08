# Gipfelquiz – das Familienquiz vom Kilimandscharo

Ein Weihnachtsquiz für die ganze Familie. Teams („Seilschaften“) klettern mit jeder richtigen
Antwort den Kilimandscharo hinauf: Start am Marangu Gate (1.870 m), Ziel Uhuru Peak (5.895 m).

## Zwei Spielweisen

**Ein Bildschirm** (Laptop am Fernseher, keine weiteren Geräte nötig)
Ist die Bedenkzeit um, zählt das Spiel bis drei, und alle Teams zeigen gleichzeitig ihre Antwort:
mit 1 bis 4 Fingern oder mit der Antwortkarte auf dem Handy („Am Handy mitspielen“).
Die Spielleitung tippt ein, was die Teams gezeigt haben.

**Live mit Handys** (wie Kahoot)
Die Fragen laufen auf dem Fernseher, jedes Team tippt seine Antwort auf dem eigenen Handy.
Wer schneller richtig liegt, bekommt bis zu 50 % Bonus-Meter. Schätzungen werden am Handy
eingetippt, die Einsätze im Finale werden geheim am Handy gesetzt. Sobald alle getippt haben,
löst das Spiel automatisch auf. Teams ohne Handy trägt die Spielleitung ein.

Voraussetzung für den Live-Modus: Das Quiz läuft online bei claude.ai, und auf jedem Handy ist
das Quiz geöffnet und jemand bei claude.ai angemeldet (z. B. das eigene Konto auf den
Team-Handys). Danach auf dem Handy „Am Handy mitspielen“ tippen und das Team wählen.
Die Offline-Datei kann den Live-Modus nicht, dort dienen die Handys als Antwortkarte.

## Spielen

- **Online:** den Artifact-Link auf claude.ai öffnen (am Fernseher-Laptop „Expedition planen“).
- **Offline:** `Gipfelquiz.html` im Browser öffnen. Die Datei enthält alle Fotos, Klänge und
  Fragen. Ohne Internet fehlen nur die Schriftarten; dann nutzt das Spiel die Systemschrift.

Tasten für die Spielleitung: `Leertaste` weiter · `P` Pause · `M` Ton · `F` Vollbild ·
`1`–`4` Antworten der Teams der Reihe nach eintragen (bei Wahr/Falsch `W` und `F`).

## Inhalt

- 14 Runden plus Finale, über 150 Fragen; pro Spiel werden zufällig welche gezogen.
  Bereits gespielte Fragen kommen erst wieder, wenn eine Runde durch ist.
- Allgemeinwissen, Rund um die Welt (mit Flaggen), Wissenschaft & Weltall,
  Kino/Musik/Bücher, Big Five & Co., Zoom-Safari (Bilderrätsel), Jambo Tansania,
  Fußball, Pferdestärken, Spitzentanz (Ballett), Wahr oder Falsch, Schätzfragen,
  Weihnachten weltweit, Swahili für Anfänger (standardmäßig aus) und das Finale „Gipfelsturm“.
- Joker „Rückenwind“: einmal pro Spiel doppelte Höhenmeter.
- Der Spielstand wird im Browser gespeichert; nach einem Neuladen geht es mit „Weiterspielen“ weiter.

## Fragen ändern

Die Fragen stehen in `src/questions.js` und `src/questions_more.js` (und genauso im Klartext in
`Gipfelquiz.html`, Suche nach `const ROUNDS`). Bei Multiple-Choice-Fragen steht die richtige
Antwort immer an erster Stelle; das Spiel mischt die Reihenfolge selbst.

## Bildnachweise

Alle Fotos stammen von Wikimedia Commons (u. a. viele Serengeti-Aufnahmen von Giles Laurent,
NASA-Bilder) und stehen unter freien Lizenzen (CC BY, CC BY-SA, CC0, gemeinfrei). Die
vollständige Liste mit Urheber, Lizenz und Link steht im Spiel unter „Bildnachweise“.

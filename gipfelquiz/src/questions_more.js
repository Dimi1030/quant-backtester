/* Version 2: mehr Allgemeinwissen, damit es für die ganze Familie fair ist.
   Flaggen-Fragen (flags: true) nutzen Ländercodes statt Text; das Spiel zeichnet die Flaggen selbst. */
ROUNDS.push(
  {
    id: "allgemein", kind: "mc", title: "Allgemeinwissen", sub: "Quer durch alles, was man wissen kann",
    colors: ["anga", "safran"], img: "ill_allgemein",
    saying: { sw: "Elimu ni bahari.", de: "Wissen ist ein Ozean." },
    questions: [
      { q: "Wie viele Tasten hat ein klassisches Klavier?", o: ["52", "76", "88", "100"], fixed: 2,
        f: "52 weiße und 36 schwarze Tasten – zusammen 88." },
      { q: "Wie viele Herzen hat ein Oktopus?", o: ["1", "2", "3", "8"], fixed: 2, img: "octopus",
        f: "Drei! Zwei pumpen das Blut durch die Kiemen, eines durch den Körper. Und sein Blut ist blau." },
      { q: "Was ist das größte Organ des Menschen?", o: ["Die Haut", "Die Leber", "Die Lunge", "Das Gehirn"],
        f: "Die Haut eines Erwachsenen ist etwa 1,5 bis 2 Quadratmeter groß." },
      { q: "Welches ist das größte Tier, das je auf der Erde gelebt hat?", o: ["Blauwal", "Afrikanischer Elefant", "Walhai", "Brachiosaurus"], ri: "whale",
        f: "Ein Blauwal wird über 30 m lang und bis zu 150 Tonnen schwer – schwerer als jeder Dinosaurier." },
      { q: "Wer malte die „Mona Lisa“?", o: ["Leonardo da Vinci", "Michelangelo", "Pablo Picasso", "Vincent van Gogh"], img: "monalisa",
        f: "Sie hängt im Louvre in Paris hinter Panzerglas – und ist mit 77 × 53 cm kleiner, als viele denken." },
      { q: "Wie viele Bundesländer hat Deutschland?", o: ["12", "14", "16", "18"], fixed: 2,
        f: "Das größte ist Bayern, das kleinste Bremen." },
      { q: "Aus welchem Land kommen die LEGO-Steine?", o: ["Dänemark", "Schweden", "Deutschland", "Niederlande"], img: "lego",
        f: "„Lego“ kommt vom dänischen „leg godt“ – „spiel gut“." },
      { q: "In welchem Jahr fiel die Berliner Mauer?", o: ["1961", "1979", "1989", "1990"], fixed: 2, img: "berlinwall",
        f: "Am 9. November 1989. Knapp ein Jahr später, am 3. Oktober 1990, wurde Deutschland wiedervereinigt." },
      { q: "Wofür steht „WWW“ in Internetadressen?", o: ["World Wide Web", "Wide World Window", "World Wireless Web", "Web Wide World"],
        f: "Die Idee dazu hatte 1989 der Brite Tim Berners-Lee am Forschungszentrum CERN in der Schweiz." },
      { q: "Wie viele Zähne hat ein Erwachsener normalerweise – Weisheitszähne mitgezählt?", o: ["24", "28", "32", "36"], fixed: 2,
        f: "Kinder haben 20 Milchzähne. Weisheitszähne kommen oft erst zwischen 17 und 25 – oder gar nicht." },
      { q: "Wie viele Saiten hat eine normale Gitarre?", o: ["4", "5", "6", "8"], fixed: 2,
        f: "Eine E-Bassgitarre hat dagegen meistens nur vier." },
      { q: "Welche Sprache haben die meisten Menschen als Muttersprache?", o: ["Chinesisch (Mandarin)", "Englisch", "Spanisch", "Hindi"],
        f: "Rund 900 Millionen Menschen wachsen mit Mandarin auf. Zählt man alle mit, die eine Sprache gelernt haben, liegt Englisch vorne." }
    ]
  },
  {
    id: "welt", kind: "mc", title: "Rund um die Welt", sub: "Länder, Hauptstädte & Flaggen",
    colors: ["bahari", "majani"], img: "earth",
    saying: { sw: "Dunia ni duara.", de: "Die Welt ist rund. (Alles kommt irgendwann zurück.)" },
    questions: [
      { q: "Was ist die Hauptstadt von Australien?", o: ["Canberra", "Sydney", "Melbourne", "Perth"], ri: "canberra",
        f: "Sydney und Melbourne konnten sich nicht einigen – deshalb wurde Canberra extra als Hauptstadt gebaut." },
      { q: "Welcher ist der längste Fluss Europas?", o: ["Wolga", "Donau", "Rhein", "Loire"],
        f: "Die Wolga ist rund 3.500 km lang. Die Donau fließt dafür durch zehn Länder – mehr als jeder andere Fluss der Welt." },
      { q: "Welches ist das flächenmäßig größte Land der Welt?", o: ["Russland", "Kanada", "China", "USA"], ri: "moscow",
        f: "Russland ist fast 50-mal so groß wie Deutschland und erstreckt sich über elf Zeitzonen." },
      { q: "Welcher Ozean ist der größte?", o: ["Pazifik", "Atlantik", "Indischer Ozean", "Arktischer Ozean"],
        f: "Der Pazifik ist größer als alle Landflächen der Erde zusammen." },
      { q: "Wie viele Kontinente gibt es nach der in Deutschland üblichen Zählung?", o: ["5", "6", "7", "8"], fixed: 2,
        f: "Afrika, Antarktika, Asien, Australien, Europa, Nordamerika und Südamerika." },
      { q: "In welchem Land liegt die Inka-Stadt Machu Picchu?", o: ["Peru", "Mexiko", "Chile", "Bolivien"], img: "machupicchu",
        f: "Sie liegt auf rund 2.400 m Höhe in den Anden – fast so hoch wie die Mandara Hut am Kilimandscharo." },
      { q: "Welches Land hat die meisten Einwohner?", o: ["Indien", "China", "USA", "Indonesien"],
        f: "2023 hat Indien China überholt. Beide Länder haben jeweils über 1,4 Milliarden Einwohner." },
      { q: "Welche Millionenstadt liegt auf zwei Kontinenten?", o: ["Istanbul", "Kairo", "Moskau", "Athen"], ri: "istanbul",
        f: "Die Meerenge Bosporus trennt den europäischen und den asiatischen Teil von Istanbul." },
      { q: "Was ist die Hauptstadt von Kanada?", o: ["Ottawa", "Toronto", "Vancouver", "Montreal"],
        f: "Toronto ist zwar die größte Stadt, regiert wird aber in Ottawa." },
      { q: "Welche Flagge gehört zu Irland?", flags: true, o: ["ie", "ci", "it", "hu"],
        f: "Grün steht für die irisch-katholische Tradition, Orange für die Protestanten, Weiß für den Frieden. Die Elfenbeinküste hat dieselben Farben – nur andersherum." },
      { q: "Welche Flagge gehört zu Norwegen?", flags: true, o: ["no", "dk", "is", "fi"],
        f: "Alle nordischen Länder tragen ein Kreuz in der Flagge. Die dänische gilt als älteste noch benutzte Nationalflagge der Welt." },
      { q: "Welche Flagge gehört zu Österreich?", flags: true, o: ["at", "lv", "pl", "pe"],
        f: "Lettlands Flagge sieht fast gleich aus – sie ist aber dunkler rot und hat einen schmaleren weißen Streifen." }
    ]
  },
  {
    id: "wissen", kind: "mc", title: "Wissenschaft & Weltall", sub: "Planeten, Körper & kluge Köpfe",
    colors: ["anga", "theluji"], img: "hubble",
    saying: { sw: "Akili ni mali.", de: "Klugheit ist ein Schatz." },
    questions: [
      { q: "Welcher Planet ist der Sonne am nächsten?", o: ["Merkur", "Venus", "Mars", "Erde"],
        f: "Ein Jahr auf dem Merkur dauert nur 88 Erdtage." },
      { q: "Welcher Planet wird „der Rote Planet“ genannt?", o: ["Mars", "Jupiter", "Venus", "Saturn"], ri: "mars",
        f: "Rostiges Eisen im Staub färbt ihn rot. Dort steht auch der höchste Vulkan des Sonnensystems, der Olympus Mons – mehr als doppelt so hoch wie der Mount Everest." },
      { q: "Wie lange braucht das Licht der Sonne bis zur Erde?", o: ["8 Sekunden", "8 Minuten", "8 Stunden", "8 Tage"], fixed: 1,
        f: "Etwa 8 Minuten und 20 Sekunden. Wir sehen die Sonne also immer so, wie sie vor acht Minuten war." },
      { q: "Welches Gas holen sich Pflanzen für die Photosynthese aus der Luft?", o: ["Kohlendioxid", "Sauerstoff", "Stickstoff", "Helium"],
        f: "Mit Sonnenlicht machen sie daraus Zucker – und geben dabei Sauerstoff ab." },
      { q: "Welches Metall ist bei Zimmertemperatur flüssig?", o: ["Quecksilber", "Blei", "Aluminium", "Zinn"], ri: "mercury_liquid",
        f: "Früher steckte es in Fieberthermometern. Weil es giftig ist, gibt es solche Thermometer in der EU heute nicht mehr zu kaufen." },
      { q: "Was ist der härteste natürliche Stoff der Welt?", o: ["Diamant", "Granit", "Stahl", "Gold"],
        f: "Diamanten bestehen aus reinem Kohlenstoff – genau wie die Mine in deinem Bleistift." },
      { q: "Wer betrat 1969 als erster Mensch den Mond?", o: ["Neil Armstrong", "Juri Gagarin", "Buzz Aldrin", "Alexander Gerst"], ri: "aldrin",
        f: "Auf dem berühmten Foto ist übrigens Buzz Aldrin zu sehen – Armstrong hielt die Kamera. Juri Gagarin war 1961 der erste Mensch im Weltall." },
      { q: "Wie viele Planeten hat unser Sonnensystem?", o: ["7", "8", "9", "10"], fixed: 1,
        f: "Pluto zählt seit 2006 nicht mehr dazu – er gilt jetzt als Zwergplanet." },
      { q: "Wie schnell ist der Schall in der Luft ungefähr?", o: ["34 m pro Sekunde", "343 m pro Sekunde", "3.430 m pro Sekunde", "300.000 km pro Sekunde"], fixed: 1,
        f: "Faustregel bei Gewitter: Sekunden zwischen Blitz und Donner geteilt durch drei ergibt die Entfernung in Kilometern." },
      { q: "Welcher Planet hat die auffälligsten Ringe?", o: ["Saturn", "Jupiter", "Uranus", "Neptun"], ri: "saturn",
        f: "Die Ringe bestehen aus Milliarden Eis- und Gesteinsbrocken. Jupiter, Uranus und Neptun haben auch Ringe – nur viel schwächere." },
      { q: "Wofür ist Albert Einstein vor allem berühmt?", o: ["Die Relativitätstheorie", "Die Erfindung der Glühbirne", "Die Entdeckung des Penicillins", "Die Dampfmaschine"], img: "einstein",
        f: "Seine bekannteste Formel ist E = mc². Den Nobelpreis bekam er 1921 aber für eine andere Entdeckung." }
    ]
  },
  {
    id: "kino", kind: "mc", title: "Kino, Musik & Bücher", sub: "Von Hogwarts bis Hollywood",
    colors: ["hibiskus", "anga"], img: "ill_kino",
    saying: { sw: "Hadithi njoo, uongo njoo, utamu kolea!", de: "Geschichte, komm! Flunkerei, komm! Mach es schön spannend! (So beginnen Märchen auf Swahili.)" },
    questions: [
      { q: "Wie heißt die Zauberschule, die Harry Potter besucht?", o: ["Hogwarts", "Durmstrang", "Beauxbatons", "Ilvermorny"],
        f: "Durmstrang, Beauxbatons und Ilvermorny sind ebenfalls Zauberschulen aus der Harry-Potter-Welt." },
      { q: "Wie viele Bände hat die Harry-Potter-Hauptreihe?", o: ["5", "6", "7", "8"], fixed: 2,
        f: "Der erste Band erschien 1997: „Harry Potter und der Stein der Weisen“." },
      { q: "Wie heißt die Königin mit den Eiskräften in „Die Eiskönigin“?", o: ["Elsa", "Anna", "Merida", "Rapunzel"],
        f: "Ihr Lied „Let It Go“ heißt auf Deutsch „Lass jetzt los“." },
      { q: "Wie heißt der Schneemann in „Die Eiskönigin“?", o: ["Olaf", "Sven", "Kristoff", "Hans"],
        f: "Sven ist das Rentier, Kristoff der Eislieferant und Hans der falsche Prinz." },
      { q: "Welche Band sang „Bohemian Rhapsody“?", o: ["Queen", "The Beatles", "ABBA", "The Rolling Stones"],
        f: "Ihr Sänger Freddie Mercury wurde übrigens auf Sansibar in Tansania geboren!" },
      { q: "Wie heißt der böse Onkel in „Der König der Löwen“?", o: ["Scar", "Mufasa", "Zazu", "Rafiki"],
        f: "Mufasa ist Simbas Vater, Zazu der Nashornvogel und Rafiki der weise Affe." },
      { q: "Wer schrieb „Romeo und Julia“?", o: ["William Shakespeare", "Johann W. von Goethe", "Charles Dickens", "Friedrich Schiller"],
        f: "Die Geschichte spielt in der italienischen Stadt Verona." },
      { q: "Welcher Zauberer ruft in „Der Herr der Ringe“: „Du kannst nicht vorbei!“?", o: ["Gandalf", "Dumbledore", "Merlin", "Saruman"],
        f: "Im Original heißt es „You shall not pass!“ – er stellt sich damit dem Feuerdämon Balrog entgegen." },
      { q: "Welcher Komponist war fast taub und schrieb trotzdem die Melodie der „Ode an die Freude“?", o: ["Ludwig van Beethoven", "Wolfgang A. Mozart", "Johann S. Bach", "Joseph Haydn"],
        f: "Die Melodie ist heute die Hymne der Europäischen Union." },
      { q: "Welche Figur vergisst in „Findet Nemo“ ständig alles?", o: ["Dorie", "Marlin", "Crush", "Bruce"],
        f: "2016 bekam sie ihren eigenen Film: „Findet Dorie“." },
      { q: "Wer wird „King of Pop“ genannt?", o: ["Michael Jackson", "Elvis Presley", "Prince", "Justin Bieber"],
        f: "Elvis Presley heißt dagegen „King of Rock ’n’ Roll“." },
      { q: "In welchem Film heißt es: „Möge die Macht mit dir sein“?", o: ["Star Wars", "Star Trek", "Harry Potter", "Avatar"],
        f: "Der erste Star-Wars-Film kam 1977 in die Kinos." }
    ]
  }
);

(() => {
  const R = (id) => ROUNDS.find((r) => r.id === id);
  R("jambo").questions.push(
    { q: "Welche Flagge gehört zu Tansania?", flags: true, o: ["tz", "na", "cg", "tt"],
      f: "Grün steht für das Land, Gelb für die Bodenschätze, Schwarz für die Menschen und Blau für Seen, Flüsse und den Indischen Ozean." }
  );
  R("wahrfalsch").questions.push(
    { q: "Der Eiffelturm ist im Sommer ein bisschen höher als im Winter.", a: true, img: "eiffel",
      f: "Das Metall dehnt sich bei Hitze aus – um bis zu 15 Zentimeter." },
    { q: "Die Chinesische Mauer kann man mit bloßem Auge vom Mond aus sehen.", a: false, img: "greatwall",
      f: "Ein Mythos! Die Mauer ist zwar sehr lang, aber viel zu schmal." },
    { q: "Bananen sind botanisch gesehen Beeren.", a: true, img: "banana",
      f: "Erdbeeren dagegen sind keine echten Beeren, sondern Sammelnussfrüchte." },
    { q: "Ein Tag auf der Venus dauert länger als ein Jahr auf der Venus.", a: true, img: "venus",
      f: "Eine Drehung um sich selbst dauert 243 Erdtage, eine Runde um die Sonne nur 225." },
    { q: "Goldfische können sich nur drei Sekunden lang an etwas erinnern.", a: false, img: "goldfish",
      f: "Ein Mythos! Versuche zeigen, dass sich Goldfische monatelang an Dinge erinnern können." },
    { q: "Vom Fuß bis zur Spitze gemessen ist der Mauna Kea auf Hawaii höher als der Mount Everest.", a: true, img: "maunakea",
      f: "Der größte Teil liegt unter Wasser. Vom Meeresgrund aus misst er über 10.000 m." },
    { q: "Ein Blitz schlägt nie zweimal an derselben Stelle ein.", a: false, img: "lightning",
      f: "Das Empire State Building in New York wird jedes Jahr ungefähr 20-mal getroffen." },
    { q: "Deutschland hat neun Nachbarländer.", a: true,
      f: "Dänemark, Polen, Tschechien, Österreich, die Schweiz, Frankreich, Luxemburg, Belgien und die Niederlande." }
  );
  R("schaetzen").questions.push(
    { q: "Wie weit ist der Mond im Durchschnitt von der Erde entfernt?", a: 384400, u: "km", img: "moon",
      f: "Mit dem Auto bei 100 km/h wärst du über fünf Monate ohne Pause unterwegs." },
    { q: "Wie hoch ist der Eiffelturm mit seinen Antennen?", a: 330, u: "m", img: "eiffel",
      f: "Bei der Eröffnung 1889 war er 312 m hoch. Durch neue Antennen ist er seitdem gewachsen." },
    { q: "Wie viele Staaten sind Mitglied der Vereinten Nationen?", a: 193, u: "Staaten",
      f: "Dazu kommen zwei Beobachterstaaten: der Vatikan und Palästina." },
    { q: "Wie viele Einwohner hat Deutschland ungefähr?", a: 84, u: "Millionen",
      f: "Fast jeder Fünfte davon lebt in Nordrhein-Westfalen." }
  );
  R("swahili").def = false;
  const ORDER = ["allgemein", "bigfive", "welt", "fussball", "zoom", "jambo", "wissen", "pferde", "kino", "ballett", "wahrfalsch", "swahili", "schaetzen", "weihnachten"];
  ROUNDS.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
})();

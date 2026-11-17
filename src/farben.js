// Farben der Bedienoberfläche, an einer Stelle (17.11.2026). Bis dahin stand das alte Blau
// #185FA5 an rund 90 Stellen direkt im Code; seit der Schrittleiste (960e322) ist der Akzent grün.
//
// Hierher gehört nur, was die BEDIENUNG färbt: Auswahl, Schalter, aktive Chips, Knöpfe, Hover,
// Markierungen. NICHT hierher gehören Inhaltsfarben (Möbel, Wandfarben, Glas, Himmel, Licht) und
// die Farbcodierung der Katalog-Kategorien — die bleiben in constants.js und den Szenen-Dateien.
//
// Dieselben Werte stehen in index.css als :root-Variablen (--akzent, --akzent-dunkel, --akzent-hell,
// --akzent-rand). Bei einer Änderung beide Stellen anpassen.

// Dunkles Grün: Auswahlrand, eingeschalteter Schalter, aktiver Chip, Knopf, Akzenttext.
// Weiße Schrift darauf: 9,6 : 1.
export const AKZENT = '#2F4B39'

// Noch dunkleres Grün für den Hover dunkler Knöpfe und das Hinweiskästchen der Schrittleiste.
export const AKZENT_DUNKEL = '#1F3327'

// Heller Hintergrund einer Auswahl oder eines Hovers. AKZENT als Schrift darauf: 8,3 : 1.
export const AKZENT_HELL = '#E8F0EA'

// Etwas grauerer heller Ton für Avatar-Kreise (Topbar, Dashboard) und die gewählte Gruppe im
// Dashboard. Bewusst nicht mit AKZENT_HELL zusammengelegt, damit sich dort nichts verschiebt.
export const AKZENT_ZART = '#EDF1EC'

// Mittlerer Ton für Schmuckränder ohne Text, etwa den Rahmen um den Grundriss.
export const AKZENT_RAND = '#B8CCBE'

// Weicher Schatten im Akzentton (Grundriss-Fläche).
export const AKZENT_SCHATTEN = 'rgba(47, 75, 57, 0.08)'

// Durchscheinende Markierungen in 3D (Vorschau beim Malen einer Wandfläche mit 35 %, Ring um
// die ausgewählte Leuchte mit 60 % Deckkraft). Heller als AKZENT, weil Dunkelgrün halb
// durchsichtig auf hellen Wänden grau wirkt.
export const AKZENT_3D = '#4F7A5E'

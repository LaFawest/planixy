export function moebelIconTyp(name) {
  const n = name.toLowerCase()
  if (n.includes('kühlschrank'))                       return 'kuehlschrank'
  if (n.includes('geschirrspüler'))                     return 'geschirrspueler'
  if (n.includes('waschbecken'))                        return 'waschbecken'
  if (n.includes('waschmaschine'))                       return 'waschmaschine'
  if (n.includes('handtuchhalter'))                     return 'balken'
  if (n.includes('badewanne'))                          return 'badewanne'
  if (n.includes('dusche'))                             return 'dusche'
  if (n.includes('mikrowelle'))                         return 'mikrowelle'
  if (n.includes('board') || n.includes('sideboard'))   return 'schrank'
  if (n.includes('insel'))                              return 'tisch'
  if (n.includes('schrank'))                            return 'schrank'
  if (n.includes('regal'))                               return 'regal'
  // Die vier LED- und Spot-Zeilen stehen bewusst VOR den allgemeinen Leuchten-Zeilen: "Spot-Reihe"
  // muss vor "Spot" geprüft werden, sonst gewinnt die kürzere Zeichenfolge, und "Pendelleuchte"
  // würde sonst von der allgemeinen leuchte-Zeile abgefangen.
  if (n.includes('led-panel'))                          return 'ledPanel'
  if (n.includes('led-streifen'))                       return 'ledStreifen'
  if (n.includes('spot-reihe'))                         return 'spotReihe'
  if (n.includes('spot'))                               return 'spot'
  if (n.includes('kronleuchter'))                       return 'kronleuchter'
  if (n.includes('pendelleuchte'))                      return 'pendelleuchte'
  if (n.includes('deckenlampe'))                        return 'deckenlampe'
  if (n.includes('tischlampe') || n.includes('wandleuchte') || n.includes('leuchte')) return 'lampe'
  if (n.includes('dunstabzug'))                         return 'dunstabzug'
  if (n.includes('ofen'))                               return 'herd'
  if (n.includes('bidet'))                              return 'wc'
  if (n.includes('container'))                          return 'schrank'
  if (n.includes('bank'))                               return 'bank'
  if (n.includes('vase'))                               return 'vase'
  if (n.includes('kerze'))                              return 'kerze'
  if (n.includes('wanduhr'))                            return 'wanduhr'
  if (n.includes('kissen'))                             return 'kissen'
  if (n.includes('globus'))                             return 'globus'
  if (n.includes('skulptur'))                           return 'skulptur'
  if (n.includes('kaktus'))                             return 'kaktus'
  if (n.includes('lichterkette'))                       return 'girlande'
  if (n.includes('tisch'))                               return 'tisch'
  if (n.includes('stuhl') || n.includes('hocker'))       return 'stuhl'
  if (n.includes('ecksofa'))                            return 'ecksofa'
  if (n.includes('sofa') || n.includes('sessel'))        return 'sofa'
  if (n.includes('bett'))                                return 'bett'
  if (n === 'tv' || n.includes('fernseh') || n.includes('monitor')) return 'bildschirm'
  if (n.includes('pflanze'))                            return 'pflanze'
  if (n.includes('lampe'))                               return 'lampe'
  if (n.includes('teppich'))                             return 'teppich'
  if (n === 'bild')                                      return 'bild'
  if (n.includes('spiegel'))                            return 'spiegel'
  if (n.includes('kamin'))                               return 'kamin'
  if (n === 'wc')                                        return 'wc'
  if (n.includes('spüle'))                               return 'spuele'
  if (n.includes('herd'))                                return 'herd'
  if (n.includes('drucker'))                             return 'drucker'
  if (n.includes('lautsprecher'))                       return 'lautsprecher'
  if (n.includes('konsole'))                            return 'konsole'
  if (n.includes('laptop'))                             return 'laptop'
  if (n.includes('router'))                             return 'router'
  if (n.includes('toaster'))                            return 'toaster'
  if (n.includes('wasserkocher'))                       return 'wasserkocher'
  if (n.includes('kaffeemaschine'))                     return 'kaffeemaschine'
  if (n.includes('ventilator'))                         return 'ventilator'
  return 'standard'
}

export function moebelShapes(f, s) {
  return {
    sofa: <>
      <rect x="2" y="9" width="24" height="6" rx="2" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="2" y="13" width="24" height="9" rx="2" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="1" y="9" width="4" height="13" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="23" y="9" width="4" height="13" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
    </>,
    ecksofa: <>
      <path d="M2,2 L14,2 L14,14 L26,14 L26,26 L2,26 Z" fill={f} stroke={s} strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="2" y="2" width="3.5" height="24" fill={s} opacity="0.3" />
      <rect x="2" y="22.5" width="24" height="3.5" fill={s} opacity="0.3" />
    </>,
    bett: <>
      <rect x="3" y="4" width="22" height="4" rx="1" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="3" y="8" width="22" height="15" rx="2" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="5" y="10" width="7" height="5" rx="1.5" fill="white" stroke={s} strokeWidth="1" opacity="0.85" />
    </>,
    tisch: <>
      <rect x="3" y="6" width="22" height="4" rx="1" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="4" y="10" width="2.2" height="12" fill={s} />
      <rect x="21.8" y="10" width="2.2" height="12" fill={s} />
    </>,
    stuhl: <>
      <rect x="6" y="3" width="16" height="6" rx="2" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="6" y="10" width="16" height="13" rx="2" fill={f} stroke={s} strokeWidth="1.3" />
    </>,
    schrank: <>
      <rect x="4" y="3" width="20" height="22" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
      <line x1="14" y1="4" x2="14" y2="24" stroke={s} strokeWidth="1" />
      <circle cx="12" cy="14" r="0.9" fill={s} />
      <circle cx="16" cy="14" r="0.9" fill={s} />
    </>,
    regal: <>
      <rect x="4" y="3" width="20" height="22" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
      <line x1="5" y1="11" x2="23" y2="11" stroke={s} strokeWidth="1" />
      <line x1="5" y1="18" x2="23" y2="18" stroke={s} strokeWidth="1" />
    </>,
    bildschirm: <>
      <rect x="2" y="5" width="24" height="14" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="11" y="19" width="6" height="3" fill={s} />
      <rect x="8" y="22" width="12" height="2" rx="1" fill={s} />
    </>,
    pflanze: <>
      <circle cx="14" cy="10" r="8" fill={f} stroke={s} strokeWidth="1.3" />
      <path d="M9,18 L19,18 L17,25 L11,25 Z" fill={s} />
    </>,
    lampe: <>
      <path d="M8,4 L20,4 L23,13 L5,13 Z" fill={f} stroke={s} strokeWidth="1.3" />
      <line x1="14" y1="13" x2="14" y2="22" stroke={s} strokeWidth="1.3" />
      <ellipse cx="14" cy="23.5" rx="5" ry="1.8" fill={s} />
    </>,
    teppich: <>
      <rect x="2" y="6" width="24" height="16" rx="3" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="6" y="9.5" width="16" height="9" rx="2" fill="none" stroke={s} strokeWidth="1" opacity="0.7" />
    </>,
    bild: <>
      <rect x="3" y="3" width="22" height="22" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
      <circle cx="9" cy="9" r="2" fill={s} />
      <path d="M5,20 L11,12 L15,16 L21,8 L23,20 Z" fill="none" stroke={s} strokeWidth="1.3" strokeLinejoin="round" />
    </>,
    spiegel: <ellipse cx="14" cy="14" rx="9" ry="11" fill={f} stroke={s} strokeWidth="2" />,
    kamin: <>
      <rect x="3" y="3" width="22" height="22" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
      <path d="M9,24 L9,15 A5,5 0 0 1 19,15 L19,24" fill="#FFFFFF" stroke={s} strokeWidth="1.3" />
    </>,
    badewanne: <rect x="2" y="9" width="24" height="12" rx="6" fill={f} stroke={s} strokeWidth="1.3" />,
    dusche: <>
      <rect x="3" y="3" width="22" height="22" rx="2" fill={f} stroke={s} strokeWidth="1.3" />
      <circle cx="14" cy="14" r="2.5" fill="none" stroke={s} strokeWidth="1.2" />
    </>,
    wc: <>
      <rect x="8" y="3" width="12" height="5" rx="1.5" fill={f} stroke={s} strokeWidth="1.2" />
      <path d="M7,10 A7,8 0 0 0 21,10 L20,20 A6,5 0 0 1 8,20 Z" fill={f} stroke={s} strokeWidth="1.2" />
    </>,
    waschbecken: <>
      <rect x="3" y="5" width="22" height="8" rx="3" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="12" y="13" width="4" height="8" fill={s} />
    </>,
    waschmaschine: <>
      <rect x="3" y="3" width="22" height="22" rx="2" fill={f} stroke={s} strokeWidth="1.3" />
      <circle cx="14" cy="16" r="6" fill="none" stroke={s} strokeWidth="1.3" />
      <circle cx="6" cy="6" r="1" fill={s} />
    </>,
    herd: <>
      <rect x="3" y="3" width="22" height="22" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
      <circle cx="10" cy="10" r="2.6" fill="none" stroke={s} strokeWidth="1.1" />
      <circle cx="18" cy="10" r="2.6" fill="none" stroke={s} strokeWidth="1.1" />
      <circle cx="10" cy="18" r="2.6" fill="none" stroke={s} strokeWidth="1.1" />
      <circle cx="18" cy="18" r="2.6" fill="none" stroke={s} strokeWidth="1.1" />
    </>,
    kuehlschrank: <>
      <rect x="6" y="2" width="16" height="24" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
      <line x1="6" y1="9" x2="22" y2="9" stroke={s} strokeWidth="1" />
      <rect x="8" y="4" width="1.6" height="3" fill={s} />
      <rect x="8" y="11" width="1.6" height="3" fill={s} />
    </>,
    spuele: <>
      <rect x="3" y="5" width="22" height="16" rx="2" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="6" y="8" width="8" height="8" rx="1.5" fill="none" stroke={s} strokeWidth="1" />
      <path d="M19,6 L19,10" stroke={s} strokeWidth="1.3" />
    </>,
    geschirrspueler: <>
      <rect x="3" y="3" width="22" height="22" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
      <line x1="3" y1="9" x2="25" y2="9" stroke={s} strokeWidth="1" />
      <rect x="12" y="4" width="4" height="1.6" fill={s} />
    </>,
    mikrowelle: <>
      <rect x="2" y="6" width="24" height="16" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="4.5" y="8.5" width="14" height="11" rx="1" fill="none" stroke={s} strokeWidth="1" />
      <circle cx="22" cy="13" r="1.3" fill={s} />
    </>,
    drucker: <>
      <rect x="4" y="9" width="20" height="10" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="8" y="3" width="12" height="7" fill={f} stroke={s} strokeWidth="1.1" />
      <rect x="8" y="19" width="12" height="6" fill="white" stroke={s} strokeWidth="1" />
    </>,
    lautsprecher: <>
      <rect x="7" y="2" width="14" height="24" rx="2" fill={f} stroke={s} strokeWidth="1.3" />
      <circle cx="14" cy="9" r="3" fill="none" stroke={s} strokeWidth="1.2" />
      <circle cx="14" cy="19" r="4" fill="none" stroke={s} strokeWidth="1.2" />
    </>,
    konsole: <>
      <rect x="2" y="10" width="24" height="8" rx="3" fill={f} stroke={s} strokeWidth="1.3" />
      <circle cx="8" cy="14" r="1.4" fill={s} />
      <circle cx="20" cy="14" r="1.4" fill={s} />
    </>,
    laptop: <>
      <rect x="4" y="5" width="20" height="13" rx="1.3" fill={f} stroke={s} strokeWidth="1.3" />
      <path d="M2,20 L26,20 L23,23 L5,23 Z" fill={f} stroke={s} strokeWidth="1.1" />
    </>,
    router: <>
      <rect x="4" y="14" width="20" height="8" rx="2" fill={f} stroke={s} strokeWidth="1.3" />
      <line x1="10" y1="14" x2="7" y2="4" stroke={s} strokeWidth="1.3" />
      <line x1="18" y1="14" x2="21" y2="4" stroke={s} strokeWidth="1.3" />
      <circle cx="14" cy="18" r="1.1" fill={s} />
    </>,
    toaster: <>
      <rect x="3" y="9" width="22" height="14" rx="3" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="8" y="4" width="4.5" height="6" rx="1" fill={s} />
      <rect x="15.5" y="4" width="4.5" height="6" rx="1" fill={s} />
    </>,
    wasserkocher: <>
      <path d="M9,6 A5,5 0 0 1 19,6 L20,20 A6,4 0 0 1 8,20 Z" fill={f} stroke={s} strokeWidth="1.3" />
      <path d="M20,10 Q26,10 22,16" fill="none" stroke={s} strokeWidth="1.3" />
    </>,
    kaffeemaschine: <>
      <rect x="6" y="3" width="12" height="8" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
      <path d="M8,16 L18,16 L16,24 L10,24 Z" fill="none" stroke={s} strokeWidth="1.3" />
    </>,
    ventilator: <>
      <circle cx="14" cy="12" r="9" fill="none" stroke={s} strokeWidth="1.3" />
      <path d="M14,12 L14,5 A4,4 0 0 1 18,10 Z" fill={f} stroke={s} strokeWidth="1" />
      <path d="M14,12 L20,15 A4,4 0 0 1 15,19 Z" fill={f} stroke={s} strokeWidth="1" />
      <path d="M14,12 L8,15 A4,4 0 0 0 13,19 Z" fill={f} stroke={s} strokeWidth="1" />
      <circle cx="14" cy="12" r="1.6" fill={s} />
      <line x1="14" y1="21" x2="14" y2="26" stroke={s} strokeWidth="1.3" />
    </>,
    balken: <>
      <rect x="3" y="12" width="22" height="3" rx="1.5" fill={s} />
      <rect x="3" y="6" width="2.5" height="16" rx="1" fill={s} />
      <rect x="22.5" y="6" width="2.5" height="16" rx="1" fill={s} />
    </>,
    bank: <>
      <rect x="2" y="10" width="24" height="8" rx="2" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="3" y="18" width="2.2" height="6" fill={s} />
      <rect x="22.8" y="18" width="2.2" height="6" fill={s} />
    </>,
    dunstabzug: <>
      <path d="M4,4 L24,4 L20,20 L8,20 Z" fill={f} stroke={s} strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="11" y="20" width="6" height="4" fill={s} />
    </>,
    vase: <>
      <path d="M10,4 L18,4 L17,10 L20,15 A6,7 0 0 1 8,15 L11,10 Z" fill={f} stroke={s} strokeWidth="1.3" strokeLinejoin="round" />
    </>,
    kerze: <>
      <rect x="12" y="6" width="4" height="14" fill={f} stroke={s} strokeWidth="1" />
      <path d="M14,1.5 A2,3 0 0 1 14,7.5 A2,3 0 0 1 14,1.5 Z" fill="#FAC775" stroke={s} strokeWidth="0.8" />
      <ellipse cx="14" cy="22" rx="7" ry="2.5" fill={f} stroke={s} strokeWidth="1.2" />
    </>,
    wanduhr: <>
      <circle cx="14" cy="14" r="10" fill={f} stroke={s} strokeWidth="1.5" />
      <line x1="14" y1="14" x2="14" y2="8" stroke={s} strokeWidth="1.3" />
      <line x1="14" y1="14" x2="18" y2="15" stroke={s} strokeWidth="1.3" />
    </>,
    kissen: <>
      <rect x="4" y="4" width="20" height="20" rx="6" fill={f} stroke={s} strokeWidth="1.3" />
      <path d="M9,9 L19,19 M19,9 L9,19" stroke={s} strokeWidth="0.8" opacity="0.4" />
    </>,
    globus: <>
      <circle cx="14" cy="13" r="9" fill={f} stroke={s} strokeWidth="1.3" />
      <ellipse cx="14" cy="13" rx="9" ry="3.5" fill="none" stroke={s} strokeWidth="0.8" opacity="0.6" />
      <line x1="14" y1="4" x2="14" y2="22" stroke={s} strokeWidth="0.8" opacity="0.6" />
      <line x1="7" y1="22" x2="21" y2="22" stroke={s} strokeWidth="1.3" />
    </>,
    skulptur: <>
      <circle cx="14" cy="4.5" r="2.5" fill={f} stroke={s} strokeWidth="1.2" />
      <path d="M9,9 Q14,7 19,9 L18,20 A4,3 0 0 1 10,20 Z" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="8" y="21" width="12" height="4" rx="1" fill={s} opacity="0.5" />
    </>,
    kaktus: <>
      <path d="M12,25 L12,10 A2,2 0 0 1 16,10 L16,25 Z" fill={f} stroke={s} strokeWidth="1.3" />
      <path d="M12,15 Q6,15 6,10" fill="none" stroke={s} strokeWidth="1.3" />
      <path d="M16,18 Q22,18 22,13" fill="none" stroke={s} strokeWidth="1.3" />
      <ellipse cx="14" cy="26" rx="8" ry="2" fill={s} opacity="0.4" />
    </>,
    girlande: <>
      <path d="M2,6 Q14,20 26,6" fill="none" stroke={s} strokeWidth="1.3" />
      <circle cx="7" cy="11" r="1.6" fill={f} stroke={s} strokeWidth="0.8" />
      <circle cx="14" cy="16" r="1.6" fill={f} stroke={s} strokeWidth="0.8" />
      <circle cx="21" cy="11" r="1.6" fill={f} stroke={s} strokeWidth="0.8" />
    </>,
    // Beide waren Draufsichten, während die fünf neuen Leuchten Vorderansichten mit Deckenlinie
    // sind — in einer Spalte nebeneinander sah das aus wie zwei verschiedene Sprachen.
    deckenlampe: <>
      <path d="M4,5 L24,5" stroke={s} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M7.5,5 A6.5,8.5 0 0 0 20.5,5 Z" fill={f} stroke={s} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9,17 L9,20.5 M14,18 L14,22 M19,17 L19,20.5"
        stroke={s} strokeWidth="1" opacity="0.4" strokeLinecap="round" fill="none" />
    </>,
    // Deckenleuchten bekommen alle eine Deckenlinie oben — das unterscheidet sie auf einen Blick
    // von Tisch- und Stehlampen, und es ist das, was sie gemeinsam haben.
    pendelleuchte: <>
      <path d="M4,4 L24,4" stroke={s} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M14,4 L14,13" stroke={s} strokeWidth="1.1" />
      <path d="M8.5,22 L11,13 L17,13 L19.5,22 Z" fill={f} stroke={s} strokeWidth="1.3" strokeLinejoin="round" />
    </>,

    // Spot: in die Decke eingelassen, deshalb sitzt der Kreis AUF der Linie und nicht darunter.
    // Der Lichtkegel macht aus einem Kreis eine Leuchte.
    spot: <>
      <path d="M3,8 L25,8" stroke={s} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="14" cy="8" r="3.4" fill={f} stroke={s} strokeWidth="1.3" />
      <path d="M10,12 L14,22 L18,12 Z" fill={f} stroke="none" opacity="0.35" />
    </>,

    spotReihe: <>
      <path d="M2,8 L26,8" stroke={s} strokeWidth="1.3" strokeLinecap="round" />
      {[6.5, 14, 21.5].map(x => (
        <circle key={`s${x}`} cx={x} cy="8" r="2.6" fill={f} stroke={s} strokeWidth="1.2" />
      ))}
      {[6.5, 14, 21.5].map(x => (
        <path key={`k${x}`} d={`M${x - 2.8},11.5 L${x},18.5 L${x + 2.8},11.5 Z`} fill={f} opacity="0.3" />
      ))}
    </>,

    ledStreifen: <>
      <rect x="2.5" y="8.5" width="23" height="3.6" rx="1.8" fill={f} stroke={s} strokeWidth="1.2" />
      <path d="M4.5,15 L4.5,19 M9,15 L9,20.5 M14,15 L14,19 M19,15 L19,20.5 M23.5,15 L23.5,19"
        stroke={s} strokeWidth="1" opacity="0.4" strokeLinecap="round" fill="none" />
    </>,

    ledPanel: <>
      <rect x="4" y="4.5" width="20" height="13" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
      <path d="M7,8 L21,8 M7,11 L21,11 M7,14 L21,14" stroke={s} strokeWidth="0.9" opacity="0.3" fill="none" />
      <path d="M7,20 L9,24 M14,20 L14,24.5 M21,20 L19,24"
        stroke={s} strokeWidth="1" opacity="0.4" strokeLinecap="round" fill="none" />
    </>,
    // Kronleuchter: Aufhängung, geschwungener Arm, drei Kerzen. Die Draufsicht mit fünf Punkten
    // auf Speichen war als Grundriss richtig, aber nicht als Bild einer Leuchte.
    kronleuchter: <>
      <path d="M4,3.5 L24,3.5" stroke={s} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M14,3.5 L14,10" stroke={s} strokeWidth="1.1" />
      <path d="M5.5,15 Q14,8.5 22.5,15" fill="none" stroke={s} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="14" cy="11.5" r="1.7" fill={f} stroke={s} strokeWidth="1.1" />
      {[[5.5, 15], [14, 11.6], [22.5, 15]].map(([x, y]) => (
        <path key={x} d={`M${x - 2},${y + 2} L${x + 2},${y + 2} L${x + 1.3},${y + 7} L${x - 1.3},${y + 7} Z`}
          fill={f} stroke={s} strokeWidth="1.1" strokeLinejoin="round" />
      ))}
    </>,
    standard: <rect x="4" y="4" width="20" height="20" rx="4" fill={f} stroke={s} strokeWidth="1.5" />,
  }
}

// Symbole für Wandelemente im Katalog, als Vorderansicht. Geschlüsselt über typ und stil —
// dieselben Felder, die in scene/wandelemente.js entscheiden, wie das Element im 3D-Bild
// aussieht. Über den Namen zu gehen wäre die zweite Quelle für dieselbe Information.
export function wandElementIconTyp(item) {
  if (item.typ === 'fenster') return item.stil && item.stil.endsWith('doppel') ? 'fensterDoppel' : 'fenster'
  if (item.typ === 'durchgang') return item.stil === 'bogen' ? 'durchgangBogen' : 'durchgang'
  switch (item.stil) {
    case 'glatt-weiss':
    case 'glatt-eiche':
    case 'glatt-dunkel':   return 'tuerGlatt'
    case 'glatt-licht':    return 'tuerLicht'
    case 'kassette':       return 'tuerKassette'
    case 'landhaus':       return 'tuerLandhaus'
    case 'glas-zimmer':    return 'tuerGlas'
    case 'balkon-einzel':  return 'tuerBalkon'
    case 'balkon-doppel':  return 'tuerBalkonDoppel'
    case 'haustuer':       return 'tuerHaus'
    case 'schiebe':        return 'tuerSchiebe'
    // "Tür (Holz, Füllungen)" trägt kein stil, und gespeicherte alte Türen auch nicht.
    default:               return 'tuerFuellung'
  }
}

// f = item.color, s = item.border. Glas bekommt bewusst einen festen Ton und nicht die
// Elementfarbe: Sonst wäre eine Glastür in Eiche eine Tür mit eichenfarbenem Glas.
const GLAS = '#DCE8F0'

export function wandElementShapes(f, s) {
  const blatt = <rect x="7" y="2.5" width="14" height="23" rx="1" fill={f} stroke={s} strokeWidth="1.3" />
  const klinke = <circle cx="18.7" cy="14.5" r="1.1" fill={s} />
  return {
    tuerGlatt: <>{blatt}{klinke}</>,

    tuerLicht: <>
      {blatt}
      <rect x="10" y="5.5" width="8" height="11" rx="0.5" fill={GLAS} stroke={s} strokeWidth="0.9" />
      {klinke}
    </>,

    tuerFuellung: <>
      {blatt}
      <rect x="9.5" y="5" width="9" height="7.5" rx="0.5" fill="none" stroke={s} strokeWidth="0.9" opacity="0.8" />
      <rect x="9.5" y="15" width="9" height="7.5" rx="0.5" fill="none" stroke={s} strokeWidth="0.9" opacity="0.8" />
      {klinke}
    </>,

    tuerKassette: <>
      {blatt}
      <rect x="9.5" y="4.5" width="9" height="5.5" rx="0.5" fill="none" stroke={s} strokeWidth="0.9" opacity="0.8" />
      <rect x="9.5" y="11.2" width="9" height="5.5" rx="0.5" fill="none" stroke={s} strokeWidth="0.9" opacity="0.8" />
      <rect x="9.5" y="17.9" width="9" height="5.5" rx="0.5" fill="none" stroke={s} strokeWidth="0.9" opacity="0.8" />
      {klinke}
    </>,

    tuerLandhaus: <>
      {blatt}
      <path d="M14,4 L14,24 M9.5,10.5 L18.5,10.5 M9.5,17.5 L18.5,17.5"
        stroke={s} strokeWidth="0.9" opacity="0.8" fill="none" />
      {klinke}
    </>,

    // Glastür und Balkontür sahen bei 28 Pixeln gleich aus: beide ein Blatt mit grosser Scheibe,
    // runder Klinke und ähnlichem Blau. Unterschieden werden sie deshalb doppelt — die Glastür hat
    // eine fast blattgrosse Scheibe und eine runde Klinke, die Balkontür einen hohen Sockel und
    // einen senkrechten Fenstergriff, wie im 3D-Bild.
    tuerGlas: <>
      {blatt}
      <rect x="9.3" y="4.5" width="9.4" height="18.5" rx="0.5" fill={GLAS} stroke={s} strokeWidth="0.9" />
      {klinke}
    </>,

    // Balkontür: grosse Scheibe, deutlich breiterer unterer Schenkel — daran erkennt man sie und
    // unterscheidet sie von einem Fenster, das bis zum Boden geht.
    tuerBalkon: <>
      {blatt}
      <rect x="9.3" y="4.5" width="9.4" height="12.5" rx="0.5" fill={GLAS} stroke={s} strokeWidth="0.9" />
      <path d="M19.9,11.5 L19.9,15.5" stroke={s} strokeWidth="1.2" strokeLinecap="round" />
    </>,

    tuerBalkonDoppel: <>
      <rect x="4" y="2.5" width="20" height="23" rx="1" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="5.8" y="4.5" width="7" height="14.5" rx="0.5" fill={GLAS} stroke={s} strokeWidth="0.9" />
      <rect x="15.2" y="4.5" width="7" height="14.5" rx="0.5" fill={GLAS} stroke={s} strokeWidth="0.9" />
      <path d="M14,3.5 L14,24.5" stroke={s} strokeWidth="1.1" />
      <circle cx="12.4" cy="14.5" r="0.9" fill={s} />
      <circle cx="15.6" cy="14.5" r="0.9" fill={s} />
    </>,

    // Haustür: schmaler Lichtstreifen nahe der Schlossseite, langer Stossgriff.
    tuerHaus: <>
      {blatt}
      <rect x="15.4" y="6" width="2.4" height="15" rx="0.4" fill={GLAS} stroke={s} strokeWidth="0.8" />
      <path d="M11.5,9 L11.5,20" stroke={s} strokeWidth="1.4" strokeLinecap="round" />
    </>,

    // Schiebetür: Laufschiene über der Öffnung, Blatt nach rechts versetzt, Muschelgriff.
    tuerSchiebe: <>
      <path d="M3,4 L25,4" stroke={s} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5.5,5.5 L5.5,25.5 M11.5,5.5 L11.5,25.5" stroke={s} strokeWidth="0.9"
        strokeDasharray="2 2" opacity="0.6" fill="none" />
      <rect x="11.5" y="5.5" width="12" height="20" rx="0.8" fill={f} stroke={s} strokeWidth="1.3" />
      <path d="M13.8,14 L13.8,17" stroke={s} strokeWidth="1.3" strokeLinecap="round" />
    </>,

    // Durchgang: kein Blatt. Zwei Laibungen und ein Sturz, dazwischen nichts — genau das ist er.
    durchgang: <>
      <path d="M7,25.5 L7,3.5 L21,3.5 L21,25.5" fill="none" stroke={s} strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.6,25.5 L8.6,5.1 L19.4,5.1 L19.4,25.5" fill="none" stroke={s} strokeWidth="0.8"
        opacity="0.5" />
    </>,

    durchgangBogen: <>
      <path d="M7,25.5 L7,12 A7,8.5 0 0 1 21,12 L21,25.5" fill="none" stroke={s} strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.6,25.5 L8.6,12 A5.4,6.9 0 0 1 19.4,12 L19.4,25.5" fill="none" stroke={s}
        strokeWidth="0.8" opacity="0.5" />
    </>,

    // Fenster: Blendrahmen aussen, Fluegel innen, Griff seitlich. Kein Mittelriegel — der war das
    // Merkmal des amerikanischen Schiebefensters, das wir aus dem 3D-Bild entfernt haben.
    fenster: <>
      <rect x="3" y="6" width="22" height="16" rx="1" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="5.5" y="8.5" width="17" height="11" rx="0.5" fill={GLAS} stroke={s} strokeWidth="1" />
      <path d="M21,13 L21,16" stroke={s} strokeWidth="1.3" strokeLinecap="round" />
    </>,

    fensterDoppel: <>
      <rect x="2" y="6" width="24" height="16" rx="1" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="4.2" y="8.5" width="8.3" height="11" rx="0.5" fill={GLAS} stroke={s} strokeWidth="1" />
      <rect x="15.5" y="8.5" width="8.3" height="11" rx="0.5" fill={GLAS} stroke={s} strokeWidth="1" />
      <path d="M14,7 L14,21" stroke={s} strokeWidth="1.1" />
      <path d="M12.9,13 L12.9,16 M15.1,13 L15.1,16" stroke={s} strokeWidth="1.1" strokeLinecap="round" />
    </>,
  }
}

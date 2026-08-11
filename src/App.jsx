import { useState, useEffect } from 'react'
import RoomView3D from './RoomView3D'

const furnitureLibrary = [
  { name: 'Sofa',           kategorie: 'Wohnen',     width: 100, height: 52,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Sessel',         kategorie: 'Wohnen',     width: 50,  height: 50,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Couchtisch',     kategorie: 'Wohnen',     width: 64,  height: 40,  color: '#C0DD97', border: '#639922' },
  { name: 'TV',             kategorie: 'Elektrogeräte', width: 80,  height: 24,  color: '#D3D1C7', border: '#444441' },
  { name: 'TV-Board',       kategorie: 'Wohnen',     width: 100, height: 30,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Esstisch',       kategorie: 'Wohnen',     width: 80,  height: 60,  color: '#C0DD97', border: '#639922' },
  { name: 'Essstuhl',       kategorie: 'Wohnen',     width: 32,  height: 32,  color: '#E1D4F4', border: '#7F77DD' },
  { name: 'Vitrine',        kategorie: 'Wohnen',     width: 50,  height: 30,  color: '#D3D1C7', border: '#888780' },
  { name: 'Sideboard',      kategorie: 'Wohnen',     width: 90,  height: 30,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Bücherregal',    kategorie: 'Wohnen',     width: 60,  height: 24,  color: '#FAC775', border: '#BA7517' },
  { name: 'Einzelbett',     kategorie: 'Schlafen',   width: 70,  height: 110, color: '#F5C4B3', border: '#D85A30' },
  { name: 'Doppelbett',     kategorie: 'Schlafen',   width: 110, height: 120, color: '#F5C4B3', border: '#D85A30' },
  { name: 'Kleiderschrank', kategorie: 'Schlafen',   width: 90,  height: 50,  color: '#F5C4B3', border: '#D85A30' },
  { name: 'Nachttisch',     kategorie: 'Schlafen',   width: 36,  height: 36,  color: '#FAC775', border: '#BA7517' },
  { name: 'Kommode',        kategorie: 'Schlafen',   width: 60,  height: 36,  color: '#D3D1C7', border: '#888780' },
  { name: 'Spiegel',        kategorie: 'Schlafen',   width: 30,  height: 60,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Hocker',         kategorie: 'Schlafen',   width: 36,  height: 36,  color: '#E1D4F4', border: '#7F77DD' },
  { name: 'Schreibtisch',   kategorie: 'Büro',       width: 80,  height: 44,  color: '#D3D1C7', border: '#888780' },
  { name: 'Bürostuhl',      kategorie: 'Büro',       width: 36,  height: 36,  color: '#E1D4F4', border: '#7F77DD' },
  { name: 'Regal',          kategorie: 'Büro',       width: 60,  height: 24,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Aktenschrank',   kategorie: 'Büro',       width: 50,  height: 36,  color: '#D3D1C7', border: '#444441' },
  { name: 'Drucker',        kategorie: 'Büro',       width: 40,  height: 30,  color: '#D3D1C7', border: '#888780' },
  { name: 'Monitor',        kategorie: 'Büro',       width: 40,  height: 16,  color: '#444441', border: '#2C2C2A' },
  { name: 'Herd',           kategorie: 'Küche',      width: 60,  height: 60,  color: '#D3D1C7', border: '#444441' },
  { name: 'Kühlschrank',    kategorie: 'Küche',      width: 40,  height: 55,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Spüle',          kategorie: 'Küche',      width: 60,  height: 44,  color: '#B5D4F4', border: '#185FA5' },
  { name: 'Geschirrspüler', kategorie: 'Küche',      width: 44,  height: 44,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Kücheninsel',    kategorie: 'Küche',      width: 100, height: 60,  color: '#C0DD97', border: '#639922' },
  { name: 'Unterschrank',   kategorie: 'Küche',      width: 60,  height: 36,  color: '#D3D1C7', border: '#888780' },
  { name: 'Oberschrank',    kategorie: 'Küche',      width: 60,  height: 24,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Mikrowelle',     kategorie: 'Küche',      width: 36,  height: 28,  color: '#D3D1C7', border: '#444441' },
  { name: 'Badewanne',      kategorie: 'Badezimmer', width: 80,  height: 40,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Dusche',         kategorie: 'Badezimmer', width: 60,  height: 60,  color: '#B5D4F4', border: '#185FA5' },
  { name: 'WC',             kategorie: 'Badezimmer', width: 36,  height: 48,  color: '#f0f0f0', border: '#B4B2A9' },
  { name: 'Waschbecken',    kategorie: 'Badezimmer', width: 44,  height: 36,  color: '#f0f0f0', border: '#B4B2A9' },
  { name: 'Badschrank',     kategorie: 'Badezimmer', width: 50,  height: 30,  color: '#D3D1C7', border: '#888780' },
  { name: 'Handtuchhalter', kategorie: 'Badezimmer', width: 30,  height: 10,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Waschmaschine',  kategorie: 'Badezimmer', width: 44,  height: 44,  color: '#D3D1C7', border: '#888780' },
  { name: 'Pflanze',        kategorie: 'Deko',       width: 30,  height: 30,  color: '#C0DD97', border: '#3B6D11' },
  { name: 'Großpflanze',    kategorie: 'Deko',       width: 44,  height: 44,  color: '#C0DD97', border: '#3B6D11' },
  { name: 'Lampe',          kategorie: 'Deko',       width: 32,  height: 32,  color: '#FAC775', border: '#BA7517' },
  { name: 'Stehlampe',      kategorie: 'Deko',       width: 20,  height: 20,  color: '#FAC775', border: '#BA7517' },
  { name: 'Teppich klein',  kategorie: 'Deko',       width: 80,  height: 60,  color: '#F4C0D1', border: '#993556' },
  { name: 'Teppich groß',   kategorie: 'Deko',       width: 140, height: 100, color: '#F4C0D1', border: '#993556' },
  { name: 'Bild',           kategorie: 'Deko',       width: 40,  height: 30,  color: '#E1D4F4', border: '#7F77DD' },
  { name: 'Kamin',          kategorie: 'Deko',       width: 80,  height: 36,  color: '#F5C4B3', border: '#993C1D' },
  { name: 'Lautsprecher',   kategorie: 'Elektrogeräte', width: 20, height: 20, color: '#E8E6E0', border: '#444441' },
  { name: 'Spielekonsole',  kategorie: 'Elektrogeräte', width: 34, height: 24, color: '#E8E6E0', border: '#444441' },
  { name: 'Laptop',         kategorie: 'Elektrogeräte', width: 34, height: 24, color: '#E8E6E0', border: '#444441' },
  { name: 'Router',         kategorie: 'Elektrogeräte', width: 18, height: 10, color: '#E8E6E0', border: '#444441' },
  { name: 'Toaster',        kategorie: 'Elektrogeräte', width: 28, height: 18, color: '#E8E6E0', border: '#444441' },
  { name: 'Wasserkocher',   kategorie: 'Elektrogeräte', width: 20, height: 20, color: '#E8E6E0', border: '#444441' },
  { name: 'Kaffeemaschine', kategorie: 'Elektrogeräte', width: 30, height: 24, color: '#E8E6E0', border: '#444441' },
  { name: 'Ventilator',     kategorie: 'Elektrogeräte', width: 24, height: 24, color: '#E8E6E0', border: '#444441' },
]

const kategorien = ['Alle', 'Wohnen', 'Schlafen', 'Büro', 'Küche', 'Badezimmer', 'Deko', 'Elektrogeräte', 'Fenster & Türen']
const kategorieFarben = {
  'Wohnen':          { bg: '#E6F1FB', color: '#185FA5' },
  'Schlafen':        { bg: '#FAECE7', color: '#993C1D' },
  'Büro':            { bg: '#F1EFE8', color: '#5F5E5A' },
  'Küche':           { bg: '#EAF3DE', color: '#3B6D11' },
  'Badezimmer':      { bg: '#E1F5EE', color: '#0F6E56' },
  'Deko':            { bg: '#FBEAF0', color: '#993556' },
  'Elektrogeräte':   { bg: '#EAEAEA', color: '#444441' },
  'Fenster & Türen': { bg: '#E6F1FB', color: '#185FA5' },
}
const wandElemente = [
  { name: 'Tür',           typ: 'tuer',    width: 40, height: 12, color: '#FFF8E6', border: '#BA7517' },
  { name: 'Drehtür',       typ: 'tuer',    width: 44, height: 12, color: '#FFF8E6', border: '#BA7517' },
  { name: 'Schiebetür',    typ: 'tuer',    width: 50, height: 10, color: '#FFF8E6', border: '#BA7517' },
  { name: 'Fenster klein', typ: 'fenster', width: 40, height: 10, color: '#E6F4FB', border: '#185FA5' },
  { name: 'Fenster groß',  typ: 'fenster', width: 70, height: 10, color: '#E6F4FB', border: '#185FA5' },
  { name: 'Balkontür',     typ: 'tuer',    width: 44, height: 12, color: '#FFF8E6', border: '#BA7517' },
]
const alleKatalogItems = [...furnitureLibrary, ...wandElemente.map(w => ({ ...w, kategorie: 'Fenster & Türen' }))]

function moebelIconTyp(name) {
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
  if (n.includes('tisch'))                               return 'tisch'
  if (n.includes('stuhl') || n.includes('hocker'))       return 'stuhl'
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

function MoebelIcon({ item }) {
  const f = item.color
  const s = item.border
  const typ = moebelIconTyp(item.name)
  const shapes = {
    sofa: <>
      <rect x="2" y="9" width="24" height="6" rx="2" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="2" y="13" width="24" height="9" rx="2" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="1" y="9" width="4" height="13" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
      <rect x="23" y="9" width="4" height="13" rx="1.5" fill={f} stroke={s} strokeWidth="1.3" />
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
    standard: <rect x="4" y="4" width="20" height="20" rx="4" fill={f} stroke={s} strokeWidth="1.5" />,
  }
  return (
    <svg viewBox="0 0 28 28" width="28" height="28">
      {shapes[typ] || shapes.standard}
    </svg>
  )
}

function KatalogKarte({ item, onClick }) {
  if (item.typ) {
    return (
      <div onClick={onClick}
        style={{ padding: '10px 6px', border: '1px solid #E8E6E0', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8', fontSize: '11px', color: '#444441', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = item.typ === 'fenster' ? '#185FA5' : '#BA7517'; e.currentTarget.style.background = item.typ === 'fenster' ? '#EEF4FC' : '#FFF8E6' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0'; e.currentTarget.style.background = '#FAFAF8' }}>
        <div style={{ width: '36px', height: '14px', background: item.color, border: `2px solid ${item.border}`, borderRadius: '3px', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {item.typ === 'fenster' ? <div style={{ width: '60%', height: '2px', background: item.border, opacity: 0.5 }}></div> : <div style={{ width: '40%', height: '40%', border: `1px solid ${item.border}`, borderRadius: '0 50% 0 0', opacity: 0.6 }}></div>}
        </div>
        <div style={{ fontWeight: '500' }}>{item.name}</div>
        <div style={{ marginTop: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: item.typ === 'fenster' ? '#E6F1FB' : '#FFF8E6', color: item.typ === 'fenster' ? '#185FA5' : '#BA7517', display: 'inline-block' }}>
          {item.typ === 'fenster' ? 'Fenster' : 'Tür'}
        </div>
      </div>
    )
  }
  return (
    <div onClick={onClick}
      style={{ padding: '10px 6px', border: '1px solid #E8E6E0', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8', fontSize: '11px', color: '#444441', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.background = '#EEF4FC' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0'; e.currentTarget.style.background = '#FAFAF8' }}>
      <div style={{ width: '28px', height: '28px', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MoebelIcon item={item} />
      </div>
      <div style={{ fontWeight: '500' }}>{item.name}</div>
      <div style={{ marginTop: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: kategorieFarben[item.kategorie]?.bg, color: kategorieFarben[item.kategorie]?.color, display: 'inline-block' }}>{item.kategorie}</div>
    </div>
  )
}

const bodenBelaege = [
  { name: 'Standard', klasse: 'boden-standard', icon: '⬜' },
  { name: 'Parkett',  klasse: 'boden-parkett',  icon: '🪵' },
  { name: 'Laminat',  klasse: 'boden-laminat',  icon: '📋' },
  { name: 'Fliesen',  klasse: 'boden-fliesen',  icon: '🔲' },
  { name: 'Teppich',  klasse: 'boden-teppich',  icon: '🟪' },
  { name: 'Beton',    klasse: 'boden-beton',     icon: '🩶' },
]
const wandFarben = [
  { name: 'Weiß',       farbe: '#FFFFFF' }, { name: 'Cremeweiß',  farbe: '#F5F0E8' },
  { name: 'Hellgrau',   farbe: '#E8E6E0' }, { name: 'Grau',       farbe: '#B4B2A9' },
  { name: 'Anthrazit',  farbe: '#444441' }, { name: 'Beige',      farbe: '#E8D5B0' },
  { name: 'Sandbraun',  farbe: '#C4A882' }, { name: 'Terrakotta', farbe: '#D4856A' },
  { name: 'Altrosa',    farbe: '#E8B4B8' }, { name: 'Mintgrün',   farbe: '#A8D5C2' },
  { name: 'Salbei',     farbe: '#8FB89A' }, { name: 'Dunkelgrün', farbe: '#2D5A3D' },
  { name: 'Hellblau',   farbe: '#B8D4E8' }, { name: 'Stahlblau',  farbe: '#4A7FA5' },
  { name: 'Dunkelblau', farbe: '#1A3A5C' }, { name: 'Lavendel',   farbe: '#C4B8D4' },
  { name: 'Aubergine',  farbe: '#5C3D5C' }, { name: 'Gelb',       farbe: '#F5E6A0' },
]

const initialRooms = [
  { id: 1, name: 'Wohnzimmer',   breite: 6, tiefe: 5, furniture: [] },
  { id: 2, name: 'Schlafzimmer', breite: 5, tiefe: 4, furniture: [] },
  { id: 3, name: 'Küche',        breite: 4, tiefe: 3, furniture: [] },
]

const loadRooms = () => {
  const saved = localStorage.getItem('planixy-rooms')
  return saved ? JSON.parse(saved) : initialRooms
}

const maxId = (werte) => werte.reduce((max, w) => typeof w === 'number' && w > max ? w : max, 0)

let nextRoomId = maxId(loadRooms().map(r => r.id)) + 1
let nextId = maxId(loadRooms().flatMap(r => (r.furniture || []).map(f => f.id))) + 1

function App() {
  const [rooms, setRooms] = useState(loadRooms)
  const [activeRoomId, setActiveRoomId] = useState(() => loadRooms()[0]?.id ?? 1)
  const [raumPanelOffen, setRaumPanelOffen] = useState(false)
  const [aktiveKategorie, setAktiveKategorie] = useState('Alle')
  const [suche, setSuche] = useState('')
  const [aktiverTab, setAktiverTab] = useState(null)
  const [ansicht, setAnsicht] = useState('2d')
  const [selectedId, setSelectedId] = useState(null)
  const [fussleiste, setFussleiste] = useState(true)
  const [raumHoehe, setRaumHoehe] = useState(2.5)
  const [fussleisteFarbe, setFussleisteFarbe] = useState('#E0DDD8')

  useEffect(() => {
    localStorage.setItem('planixy-rooms', JSON.stringify(rooms))
  }, [rooms])

  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0]
  const furniture = activeRoom?.furniture || []
  const canvasB = (activeRoom?.breite || 6) * 60
  const canvasT = (activeRoom?.tiefe  || 5) * 60
  const wandDicke = 8
  const innenB = canvasB - wandDicke * 2
  const innenT = canvasT - wandDicke * 2
  const fussleisteBreite = fussleiste ? 8 : 0
  const grenzB = innenB - fussleisteBreite * 2
  const grenzT = innenT - fussleisteBreite * 2
  const grenzStart = fussleisteBreite

  const updateRoom = (id, changes) => setRooms(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r))
  const setBoden = (boden) => updateRoom(activeRoomId, { boden })
  const setWandfarbe = (wandfarbe) => updateRoom(activeRoomId, { wandfarbe })
  const updateFurniture = (newFurniture) => updateRoom(activeRoomId, { furniture: newFurniture })

  const addRoom = () => {
    const newRoom = { id: nextRoomId++, name: `Raum ${nextRoomId - 1}`, breite: 5, tiefe: 4, furniture: [] }
    setRooms(prev => [...prev, newRoom])
    setActiveRoomId(newRoom.id)
    setRaumPanelOffen(true)
  }

  const deleteRoom = (id) => {
    if (rooms.length === 1) return
    const remaining = rooms.filter(r => r.id !== id)
    setRooms(remaining)
    if (activeRoomId === id) setActiveRoomId(remaining[0].id)
  }

  const waehleRaum = (id) => {
    if (activeRoomId === id) {
      setRaumPanelOffen(offen => !offen)
    } else {
      setActiveRoomId(id)
      setRaumPanelOffen(true)
    }
  }

  const addFurniture = (item) => {
    updateFurniture([...furniture, {
      ...item, id: nextId++,
      top: 20 + Math.random() * 100,
      left: 20 + Math.random() * 100,
      rotation: 0,
      origWidth: item.width,
      origHeight: item.height,
    }])
  }

  const addWandElement = (item) => {
    const left = Math.max(grenzStart, Math.min(grenzStart + grenzB - item.width, grenzStart + 20 + Math.random() * 100))
    updateFurniture([...furniture, {
      ...item, id: nextId++,
      top: grenzStart, left,
      rotation: 0, istWandElement: true, wand: 'nord',
    }])
  }

  const removeFurniture = (id) => updateFurniture(furniture.filter(f => f.id !== id))

  const rotateFurniture = (id, winkel) => {
    updateFurniture(furniture.map(f => {
      if (f.id !== id) return f
      const origW = f.origWidth  || f.width
      const origH = f.origHeight || f.height

      // Mittelpunkt aus aktueller visueller Position berechnen
      const aktuelleRad = (f.rotation || 0) * Math.PI / 180
      const aktuelleCos = Math.abs(Math.cos(aktuelleRad))
      const aktuelleSin = Math.abs(Math.sin(aktuelleRad))
      const aktuelleBoundW = origW * aktuelleCos + origH * aktuelleSin
      const aktuelleBoundH = origW * aktuelleSin + origH * aktuelleCos

      const mitteX = f.left + aktuelleBoundW / 2
      const mitteY = f.top  + aktuelleBoundH / 2

      // Neue Bounding Box für neuen Winkel
      const rad = winkel * Math.PI / 180
      const cos = Math.abs(Math.cos(rad))
      const sin = Math.abs(Math.sin(rad))
      const boundW = origW * cos + origH * sin
      const boundH = origW * sin + origH * cos

      let newLeft = Math.max(grenzStart, Math.min(grenzStart + grenzB - boundW, mitteX - boundW / 2))
      let newTop  = Math.max(grenzStart, Math.min(grenzStart + grenzT - boundH, mitteY - boundH / 2))

      return { ...f, rotation: winkel, left: newLeft, top: newTop, origWidth: origW, origHeight: origH }
    }))
  }

  const handleDrag = (e, id) => {
    e.preventDefault()
    const item = furniture.find(f => f.id === id)
    const startX = e.clientX || e.touches?.[0]?.clientX
    const startY = e.clientY || e.touches?.[0]?.clientY
    const startLeft = item.left
    const startTop  = item.top
    let currentLeft = startLeft
    let currentTop  = startTop

    const onMove = (mv) => {
      mv.preventDefault()
      const clientX = mv.clientX || mv.touches?.[0]?.clientX
      const clientY = mv.clientY || mv.touches?.[0]?.clientY
      const iW = item.origWidth  || item.width
      const iH = item.origHeight || item.height
      const rad = (item.rotation || 0) * Math.PI / 180
      const cos = Math.abs(Math.cos(rad))
      const sin = Math.abs(Math.sin(rad))
      const boundW = iW * cos + iH * sin
      const boundH = iW * sin + iH * cos
      currentLeft = Math.max(grenzStart, Math.min(grenzStart + grenzB - boundW, startLeft + (clientX - startX)))
      currentTop  = Math.max(grenzStart, Math.min(grenzStart + grenzT - boundH, startTop  + (clientY - startY)))
      // Frei bewegen ohne Kollision
      updateFurniture(furniture.map(f => f.id === id ? { ...f, left: currentLeft, top: currentTop } : f))
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)

      // Fenster/Türen: an nächstgelegene Wand snappen statt an Möbel-Kollisionen
      if (item.istWandElement) {
        const w = item.width
        const h = item.height
        const cx = currentLeft + w / 2
        const cy = currentTop  + h / 2

        const distNord = cy - grenzStart
        const distSued = (grenzStart + grenzT) - cy
        const distWest = cx - grenzStart
        const distOst  = (grenzStart + grenzB) - cx
        const minDist  = Math.min(distNord, distSued, distWest, distOst)

        let wand, newLeft, newTop, newRotation
        if (minDist === distNord) {
          wand = 'nord'; newRotation = 0
          newTop  = grenzStart
          newLeft = Math.max(grenzStart, Math.min(grenzStart + grenzB - w, cx - w / 2))
        } else if (minDist === distSued) {
          wand = 'sued'; newRotation = 0
          newTop  = grenzStart + grenzT - h
          newLeft = Math.max(grenzStart, Math.min(grenzStart + grenzB - w, cx - w / 2))
        } else if (minDist === distWest) {
          wand = 'west'; newRotation = 90
          newLeft = grenzStart
          newTop  = Math.max(grenzStart, Math.min(grenzStart + grenzT - w, cy - w / 2))
        } else {
          wand = 'ost'; newRotation = 90
          newLeft = grenzStart + grenzB - h
          newTop  = Math.max(grenzStart, Math.min(grenzStart + grenzT - w, cy - w / 2))
        }

        updateFurniture(furniture.map(f => f.id === id
          ? { ...f, left: newLeft, top: newTop, wand, rotation: newRotation, origWidth: w, origHeight: h }
          : f))
        return
      }

      // Elektrogeräte stehen auf anderen Möbelstücken — keine Kollisionsprüfung
      if (item.kategorie === 'Elektrogeräte') return

      // Beim Loslassen — Kollision prüfen und an nächste freie Kante snappen
      const anderesMoebel = furniture.filter(f => f.id !== id && f.kategorie !== 'Elektrogeräte')
      
      const iW = item.origWidth  || item.width
      const iH = item.origHeight || item.height
      const rad = (item.rotation || 0) * Math.PI / 180
      const cos = Math.abs(Math.cos(rad))
      const sin = Math.abs(Math.sin(rad))
      const boundW = iW * cos + iH * sin
      const boundH = iW * sin + iH * cos

      const kollidiert = (l, t) => anderesMoebel.some(f => {
        const fW = f.origWidth  || f.width
        const fH = f.origHeight || f.height
        const fRad = (f.rotation || 0) * Math.PI / 180
        const fCos = Math.abs(Math.cos(fRad))
        const fSin = Math.abs(Math.sin(fRad))
        const fBoundW = fW * fCos + fH * fSin
        const fBoundH = fW * fSin + fH * fCos
        return (
          l < f.left + fBoundW &&
          l + boundW > f.left &&
          t < f.top + fBoundH &&
          t + boundH > f.top
        )
      })

      if (!kollidiert(currentLeft, currentTop)) {
        // Keine Kollision — Position beibehalten
        return
      }

      // Snap zu nächster freier Kante
      let bestePosition = { left: startLeft, top: startTop }
      let besteDistanz = Infinity

      anderesMoebel.forEach(f => {
        // Mögliche Snap-Positionen an allen 4 Kanten
        const fW = f.origWidth  || f.width
        const fH = f.origHeight || f.height
        const fRad = (f.rotation || 0) * Math.PI / 180
        const fCos = Math.abs(Math.cos(fRad))
        const fSin = Math.abs(Math.sin(fRad))
        const fBoundW = fW * fCos + fH * fSin
        const fBoundH = fW * fSin + fH * fCos
        const kandidaten = [
          { left: f.left + fBoundW, top: currentTop },
          { left: f.left - boundW,  top: currentTop },
          { left: currentLeft, top: f.top + fBoundH },
          { left: currentLeft, top: f.top - boundH  },
        ]

        kandidaten.forEach(pos => {
          // Grenzen einhalten
          const l = Math.max(grenzStart, Math.min(grenzStart + grenzB - item.width,  pos.left))
          const t = Math.max(grenzStart, Math.min(grenzStart + grenzT - item.height, pos.top))

          // Prüfen ob diese Position frei ist
          if (!kollidiert(l, t)) {
            // Distanz zur aktuellen Position berechnen
            const distanz = Math.abs(l - currentLeft) + Math.abs(t - currentTop)
            if (distanz < besteDistanz) {
              besteDistanz = distanz
              bestePosition = { left: l, top: t }
            }
          }
        })
      })

      updateFurniture(furniture.map(f => f.id === id ? { ...f, left: bestePosition.left, top: bestePosition.top } : f))
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
  }
  const gefilterteMoebel = alleKatalogItems.filter(item => {
    const kategorieOk = aktiveKategorie === 'Alle' || item.kategorie === aktiveKategorie
    const sucheOk = item.name.toLowerCase().includes(suche.toLowerCase())
    return kategorieOk && sucheOk
  })
  const katalogItemHinzufuegen = (item) => item.typ ? addWandElement(item) : addFurniture(item)

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>

      {/* Sidebar */}
      <div className="sidebar" style={{ width: '260px', background: 'white', borderRight: '1px solid #E8E6E0', padding: '24px 16px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', boxShadow: '2px 0 8px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '0 8px', marginBottom: '28px' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: '500', color: '#2C2C2A' }}>Planixy</h2>
          <p style={{ fontSize: '11px', color: '#B4B2A9', marginTop: '2px' }}>Intelligente Raumplanung</p>
        </div>
        <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '8px', letterSpacing: '0.08em', padding: '0 8px' }}>MEINE RÄUME</p>
        <div>
          {rooms.map(room => (
            <div key={room.id} className="room-item" onClick={() => waehleRaum(room.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '10px', marginBottom: '3px', background: activeRoomId === room.id ? '#EEF4FC' : 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => { if (activeRoomId !== room.id) e.currentTarget.style.background = '#F7F6F2' }}
              onMouseLeave={e => { if (activeRoomId !== room.id) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: '13px', color: activeRoomId === room.id ? '#185FA5' : '#444441', fontWeight: activeRoomId === room.id ? '500' : '400', flex: 1 }}>
                {room.name}
              </span>
              <span style={{ fontSize: '11px', color: activeRoomId === room.id && raumPanelOffen ? '#185FA5' : '#D3D1C7', marginRight: rooms.length > 1 ? '4px' : 0 }}>⚙</span>
              {rooms.length > 1 && (
                <span onClick={(e) => { e.stopPropagation(); deleteRoom(room.id) }}
                  style={{ fontSize: '11px', color: '#D3D1C7', cursor: 'pointer', marginLeft: '4px' }}
                  onMouseEnter={e => e.target.style.color = '#E24B4A'}
                  onMouseLeave={e => e.target.style.color = '#D3D1C7'}>✕</span>
              )}
            </div>
          ))}
        </div>
        <div onClick={addRoom}
          style={{ marginTop: '12px', padding: '9px 12px', borderRadius: '10px', border: '1.5px dashed #D3D1C7', cursor: 'pointer', fontSize: '12px', color: '#888780', textAlign: 'center', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.color = '#185FA5' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#D3D1C7'; e.currentTarget.style.color = '#888780' }}>
          + Raum hinzufügen
        </div>

        <div style={{ height: '1px', background: '#E8E6E0', margin: '18px 0' }}></div>

        <input type="text" placeholder="Möbel suchen..." value={suche} onChange={e => setSuche(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', fontSize: '12px', border: '1px solid #E8E6E0', borderRadius: '10px', background: '#F7F6F2', outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A', marginBottom: '10px' }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
          {kategorien.map(kat => (
            <div key={kat} onClick={() => setAktiveKategorie(kat)} style={{
              padding: '4px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
              fontWeight: aktiveKategorie === kat ? '500' : '400',
              background: aktiveKategorie === kat ? '#185FA5' : '#F7F6F2',
              color: aktiveKategorie === kat ? 'white' : '#888780',
              border: `1px solid ${aktiveKategorie === kat ? '#185FA5' : '#E8E6E0'}`,
            }}>{kat}</div>
          ))}
        </div>

        <div>
          <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>{gefilterteMoebel.length} MÖBEL GEFUNDEN</p>
          {gefilterteMoebel.length === 0
            ? <p style={{ fontSize: '12px', color: '#B4B2A9', textAlign: 'center', marginTop: '20px' }}>Nichts gefunden 🔍</p>
            : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {gefilterteMoebel.map(item => (
                  <KatalogKarte key={item.name} item={item} onClick={() => katalogItemHinzufuegen(item)} />
                ))}
              </div>
          }
        </div>
      </div>

      {/* Hauptbereich */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ padding: '14px 28px', borderBottom: '1px solid #E8E6E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: '12px', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', color: '#2C2C2A', minWidth: '80px' }}>{activeRoom?.name}</h3>
          <div style={{ display: 'flex', border: '1px solid #E8E6E0', borderRadius: '8px', overflow: 'hidden' }}>
            {['2d', '3d'].map(a => (
              <button key={a} onClick={() => setAnsicht(a)} style={{ padding: '6px 14px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", background: ansicht === a ? '#185FA5' : 'white', color: ansicht === a ? 'white' : '#888780', border: 'none', cursor: 'pointer', fontWeight: ansicht === a ? '500' : '400' }}>{a.toUpperCase()}</button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#B4B2A9' }}>{furniture.length} Objekte</div>
            <button style={{ padding: '8px 18px', background: '#185FA5', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", fontWeight: '500' }}
              onMouseEnter={e => e.currentTarget.style.background = '#0C447C'}
              onMouseLeave={e => e.currentTarget.style.background = '#185FA5'}>KI-Vorschlag</button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F4F0', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', color: '#B4B2A9', background: 'white', padding: '4px 12px', borderRadius: '20px', border: '1px solid #E8E6E0', zIndex: 10, whiteSpace: 'nowrap' }}>
            {ansicht === '2d' ? 'Doppelklick auf Raumnamen · Blau = Drehen · Rot = Löschen' : 'Maus ziehen = Kamera drehen · Scrollrad = Zoom'}
          </div>
          {ansicht === '2d' ? (
            <div id="canvas" className={`canvas-wrap ${activeRoom?.boden || 'boden-standard'}`} style={{
              width: `${canvasB}px`, height: `${canvasT}px`,
              border: `${wandDicke}px solid ${activeRoom?.wandfarbe || '#FFFFFF'}`,
              borderRadius: '6px', position: 'relative',
              boxShadow: '0 4px 24px rgba(24,95,165,0.08)',
              outline: '2px solid #B5D4F4',
              boxSizing: 'border-box',
            }}>
              {/* Deselect Layer */}
              <div onClick={() => setSelectedId(null)} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
                
              {fussleiste && (
                <>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: fussleisteFarbe, zIndex: 2 }}></div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '8px', background: fussleisteFarbe, zIndex: 2 }}></div>
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '8px', background: fussleisteFarbe, zIndex: 2 }}></div>
                  <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '8px', background: fussleisteFarbe, zIndex: 2 }}></div>
                </>
              )}
              {furniture.map(item => (
                <div key={item.id} style={{
                  position: 'absolute',
                  zIndex: 1,
                  left: item.left + (() => {
                    const origW = item.origWidth || item.width
                    const origH = item.origHeight || item.height
                    const rad = (item.rotation || 0) * Math.PI / 180
                    return (origW * Math.abs(Math.cos(rad)) + origH * Math.abs(Math.sin(rad))) / 2
                  })(),
                  top: item.top + (() => {
                    const origW = item.origWidth || item.width
                    const origH = item.origHeight || item.height
                    const rad = (item.rotation || 0) * Math.PI / 180
                    return (origW * Math.abs(Math.sin(rad)) + origH * Math.abs(Math.cos(rad))) / 2
                  })(),
                  width: item.origWidth || item.width,
                  height: item.origHeight || item.height,
                  transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
                }}>
                  <div onMouseDown={(e) => { handleDrag(e, item.id); setSelectedId(item.id) }}
                    onTouchStart={(e) => { handleDrag(e, item.id); setSelectedId(item.id) }}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(item.id) }}
                    style={{
                      width: '100%', height: '100%', background: item.color,
                      border: `${item.istWandElement ? '3px' : '1.5px'} solid ${item.border}`,
                      borderRadius: item.istWandElement ? '3px' : '5px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: '500', cursor: 'grab', userSelect: 'none',
                      color: item.border, position: 'relative', transition: 'box-shadow 0.15s',
                      boxShadow: selectedId === item.id ? `0 0 0 2px #185FA5` : 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 0 2px ${item.border}`}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = selectedId === item.id ? '0 0 0 2px #185FA5' : 'none'}
                  >
                    {item.name}
                    <span onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
                      onClick={(e) => { e.stopPropagation(); removeFurniture(item.id); setSelectedId(null) }}
                      style={{ position: 'absolute', top: '-8px', right: '-8px', width: '16px', height: '16px', borderRadius: '50%', background: '#E24B4A', color: 'white', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>✕</span>
                  </div>

                 
                </div>
              ))}
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0 }}>
              <RoomView3D room={activeRoom} furniture={furniture} fussleiste={fussleiste} fussleisteFarbe={fussleisteFarbe} raumHoehe={raumHoehe} />
            </div>
          )}
        </div>
        {/* Rotations-Panel unter Canvas */}
        {selectedId !== null && ansicht === '2d' && (() => {
          const selectedItem = furniture.find(f => f.id === selectedId)
          if (!selectedItem) return null
          return (
            <div onClick={e => e.stopPropagation()} style={{
              background: 'white', borderTop: '1px solid #E8E6E0',
              padding: '10px 24px', display: 'flex', alignItems: 'center',
              gap: '12px', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: '12px', color: '#888780', fontWeight: '500' }}>{selectedItem.name}</span>
              <span style={{ fontSize: '12px', color: '#B4B2A9' }}>↻</span>
              <input type="range" min="0" max="359"
                value={selectedItem.rotation || 0}
                onChange={e => rotateFurniture(selectedItem.id, Number(e.target.value))}
                style={{ width: '160px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#185FA5', fontWeight: '500', minWidth: '40px' }}>{selectedItem.rotation || 0}°</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[0, 90, 180, 270].map(w => (
                  <div key={w} onClick={() => rotateFurniture(selectedItem.id, w)} style={{
                    padding: '4px 10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
                    background: (selectedItem.rotation || 0) === w ? '#185FA5' : '#F7F6F2',
                    color: (selectedItem.rotation || 0) === w ? 'white' : '#888780',
                    border: '1px solid #E8E6E0',
                  }}>{w}°</div>
                ))}
              </div>
              <span onClick={() => setSelectedId(null)} style={{ cursor: 'pointer', color: '#B4B2A9', fontSize: '16px', marginLeft: '8px' }}>✕</span>
            </div>
          )
        })()}
      </div>

      {/* Panel rechts */}
      <div className="panel-rechts" style={{ width: '220px', background: 'white', borderLeft: '1px solid #E8E6E0', padding: '16px', flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '-2px 0 8px rgba(0,0,0,0.04)' }}>
        {raumPanelOffen && activeRoom ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '10px', color: '#B4B2A9', letterSpacing: '0.08em', margin: 0 }}>RAUMEINSTELLUNGEN</p>
              <span onClick={() => setRaumPanelOffen(false)} style={{ cursor: 'pointer', color: '#B4B2A9', fontSize: '14px' }}>✕</span>
            </div>

            <input type="text" value={activeRoom.name} onChange={e => updateRoom(activeRoomId, { name: e.target.value })}
              placeholder="Raumname"
              style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #E8E6E0', borderRadius: '8px', outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A', boxSizing: 'border-box' }} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#888780' }}>Breite</span>
                <input type="number" min="1" max="20" value={activeRoom.breite || 6} onChange={e => updateRoom(activeRoomId, { breite: Number(e.target.value) })}
                  style={{ width: '48px', padding: '5px 6px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', textAlign: 'center', outline: 'none', background: '#F7F6F2' }} />
                <span style={{ fontSize: '12px', color: '#888780' }}>× Tiefe</span>
                <input type="number" min="1" max="20" value={activeRoom.tiefe || 5} onChange={e => updateRoom(activeRoomId, { tiefe: Number(e.target.value) })}
                  style={{ width: '48px', padding: '5px 6px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', textAlign: 'center', outline: 'none', background: '#F7F6F2' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#888780' }}>Höhe</span>
                <input type="number" min="1.9" max="5" step="0.1" value={raumHoehe} onChange={e => setRaumHoehe(Number(e.target.value))}
                  style={{ width: '48px', padding: '5px 6px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', textAlign: 'center', outline: 'none', background: '#F7F6F2' }} />
                <span style={{ fontSize: '12px', color: '#888780' }}>m</span>
                <span style={{ marginLeft: 'auto', background: '#EAF3DE', color: '#3B6D11', fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: '500' }}>{(activeRoom.breite || 6) * (activeRoom.tiefe || 5)} m²</span>
              </div>
            </div>

            <div style={{ height: '1px', background: '#E8E6E0' }}></div>

            {/* Fußleiste */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <p style={{ fontSize: '10px', color: '#B4B2A9', letterSpacing: '0.06em' }}>FUSSLEISTE</p>
                <div onClick={() => setFussleiste(!fussleiste)} style={{
                  width: '36px', height: '20px', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s',
                  background: fussleiste ? '#185FA5' : '#E8E6E0', position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: '2px', left: fussleiste ? '18px' : '2px',
                    width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}></div>
                </div>
              </div>
              {fussleiste && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { name: 'Weiß',    farbe: '#FFFFFF' },
                    { name: 'Creme',   farbe: '#E0DDD8' },
                    { name: 'Grau',    farbe: '#B4B2A9' },
                    { name: 'Schwarz', farbe: '#2C2C2A' },
                    { name: 'Holz',    farbe: '#C8A97A' },
                    { name: 'Wand',    farbe: activeRoom?.wandfarbe || '#FFFFFF' },
                  ].map(f => (
                    <div key={f.name} onClick={() => setFussleisteFarbe(f.farbe)} style={{
                      width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                      background: f.farbe, border: `${fussleisteFarbe === f.farbe ? '3px' : '1px'} solid ${fussleisteFarbe === f.farbe ? '#185FA5' : '#E8E6E0'}`,
                      title: f.name,
                    }} title={f.name}></div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ height: '1px', background: '#E8E6E0' }}></div>

            <div>
              <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>BODENBELAG</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {bodenBelaege.map(boden => (
                  <div key={boden.name} onClick={() => setBoden(boden.klasse)} style={{
                    padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                    border: `${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '2px' : '1px'} solid ${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#E8E6E0'}`,
                    background: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#EEF4FC' : '#FAFAF8',
                    fontSize: '10px', color: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#444441',
                  }}>
                    <div style={{ fontSize: '18px', marginBottom: '4px' }}>{boden.icon}</div>
                    {boden.name}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>WANDFARBE</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {wandFarben.map(wand => (
                  <div key={wand.name} onClick={() => setWandfarbe(wand.farbe)} style={{
                    padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                    border: `${(activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '2px' : '1px'} solid ${(activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '#185FA5' : '#E8E6E0'}`,
                    background: (activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '#EEF4FC' : '#FAFAF8',
                  }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: wand.farbe, margin: '0 auto 4px', border: '1px solid #E8E6E0' }}></div>
                    <div style={{ fontSize: '10px', color: (activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '#185FA5' : '#444441', fontWeight: (activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '500' : '400' }}>{wand.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height: '1px', background: '#E8E6E0' }}></div>
          </>
        ) : (
          <p style={{ fontSize: '12px', color: '#B4B2A9', lineHeight: 1.5 }}>Klicke links auf einen Raum, um Name, Größe, Fußleiste, Bodenbelag und Wandfarbe einzustellen.</p>
        )}

        <div>
          <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '8px', letterSpacing: '0.06em' }}>IM RAUM ({furniture.length})</p>
          {furniture.length === 0
            ? <p style={{ fontSize: '12px', color: '#B4B2A9', textAlign: 'center', marginTop: '8px' }}>Noch keine Möbel</p>
            : furniture.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#FAFAF8', borderRadius: '8px', marginBottom: '4px', border: '1px solid #E8E6E0', fontSize: '12px', color: '#444441', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0F0EC'}
                onMouseLeave={e => e.currentTarget.style.background = '#FAFAF8'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', background: item.color, border: `1px solid ${item.border}`, borderRadius: '3px', flexShrink: 0 }}></div>
                  {item.name}
                </div>
                <span onClick={() => removeFurniture(item.id)} style={{ cursor: 'pointer', color: '#D3D1C7', fontSize: '11px' }}
                  onMouseEnter={e => e.target.style.color = '#E24B4A'}
                  onMouseLeave={e => e.target.style.color = '#D3D1C7'}>✕</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Mobile Overlay */}
      <div className={`drawer-overlay ${aktiverTab ? 'open' : ''}`} onClick={() => setAktiverTab(null)} />

      {/* Mobile Drawer */}
      <div className={`drawer ${aktiverTab ? 'open' : ''}`}>
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ width: '40px', height: '4px', background: '#E8E6E0', borderRadius: '2px', margin: '0 auto 16px' }}></div>
        </div>
        {aktiverTab === 'raeume' && (
          <div style={{ padding: '0 16px 24px' }}>
            <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '12px', letterSpacing: '0.08em' }}>MEINE RÄUME</p>
            {rooms.map(room => (
              <div key={room.id} onClick={() => { setActiveRoomId(room.id); setAktiverTab(null) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', marginBottom: '6px', background: activeRoomId === room.id ? '#EEF4FC' : '#F7F6F2', cursor: 'pointer' }}>
                <span style={{ fontSize: '14px', color: activeRoomId === room.id ? '#185FA5' : '#444441', fontWeight: activeRoomId === room.id ? '500' : '400' }}>{room.name}</span>
                {rooms.length > 1 && <span onClick={(e) => { e.stopPropagation(); deleteRoom(room.id) }} style={{ color: '#D3D1C7', fontSize: '12px' }}>✕</span>}
              </div>
            ))}
            <div onClick={() => { addRoom(); setAktiverTab(null) }}
              style={{ padding: '12px 14px', borderRadius: '10px', border: '1.5px dashed #D3D1C7', textAlign: 'center', fontSize: '13px', color: '#888780', marginTop: '8px', cursor: 'pointer' }}>
              + Raum hinzufügen
            </div>
          </div>
        )}
        {aktiverTab === 'moebel' && (
          <div style={{ padding: '0 16px 24px' }}>
            <input type="text" placeholder="Möbel suchen..." value={suche} onChange={e => setSuche(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: '13px', border: '1px solid #E8E6E0', borderRadius: '10px', background: '#F7F6F2', outline: 'none', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {kategorien.map(kat => (
                <div key={kat} onClick={() => setAktiveKategorie(kat)} style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', background: aktiveKategorie === kat ? '#185FA5' : '#F7F6F2', color: aktiveKategorie === kat ? 'white' : '#888780', border: `1px solid ${aktiveKategorie === kat ? '#185FA5' : '#E8E6E0'}` }}>{kat}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {gefilterteMoebel.map(item => (
                <KatalogKarte key={item.name} item={item} onClick={() => { katalogItemHinzufuegen(item); setAktiverTab(null) }} />
              ))}
            </div>
          </div>
        )}
        {aktiverTab === 'einstellungen' && (
          <div style={{ padding: '0 16px 24px' }}>
            <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.08em' }}>RAUMGRÖSSE</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <span style={{ fontSize: '13px', color: '#888780' }}>Breite</span>
              <input type="number" min="1" max="20" value={activeRoom?.breite || 6} onChange={e => updateRoom(activeRoomId, { breite: Number(e.target.value) })}
                style={{ width: '60px', padding: '8px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '13px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }} />
              <span style={{ fontSize: '13px', color: '#888780' }}>m × Tiefe</span>
              <input type="number" min="1" max="20" value={activeRoom?.tiefe || 5} onChange={e => updateRoom(activeRoomId, { tiefe: Number(e.target.value) })}
                style={{ width: '60px', padding: '8px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '13px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }} />
              <span style={{ fontSize: '12px', background: '#EAF3DE', color: '#3B6D11', padding: '4px 8px', borderRadius: '8px' }}>{(activeRoom?.breite || 6) * (activeRoom?.tiefe || 5)} m²</span>
            </div>
            <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.08em' }}>BODENBELAG</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '20px' }}>
              {bodenBelaege.map(boden => (
                <div key={boden.name} onClick={() => setBoden(boden.klasse)}
                  style={{ padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', border: `${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '2px' : '1px'} solid ${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#E8E6E0'}`, background: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#EEF4FC' : '#FAFAF8' }}>
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>{boden.icon}</div>
                  <div style={{ fontSize: '10px', color: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#444441' }}>{boden.name}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.08em' }}>WANDFARBE</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {wandFarben.map(wand => (
                <div key={wand.name} onClick={() => setWandfarbe(wand.farbe)}
                  style={{ padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', border: `${(activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '2px' : '1px'} solid ${(activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '#185FA5' : '#E8E6E0'}`, background: (activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '#EEF4FC' : '#FAFAF8' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: wand.farbe, margin: '0 auto 4px', border: '1px solid #E8E6E0' }}></div>
                  <div style={{ fontSize: '9px', color: '#444441' }}>{wand.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Tab Bar */}
      <div className="mobile-tabs">
        {[
          { id: 'raeume', icon: '🏠', label: 'Räume' },
          { id: 'moebel', icon: '🛋️', label: 'Möbel' },
          { id: 'einstellungen', icon: '⚙️', label: 'Design' },
        ].map(tab => (
          <div key={tab.id} onClick={() => setAktiverTab(aktiverTab === tab.id ? null : tab.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: aktiverTab === tab.id ? '#185FA5' : '#B4B2A9', transition: 'color 0.15s' }}>
            <div style={{ fontSize: '22px', marginBottom: '2px' }}>{tab.icon}</div>
            <div style={{ fontSize: '10px', fontWeight: aktiverTab === tab.id ? '500' : '400' }}>{tab.label}</div>
          </div>
        ))}
      </div>

    </div>
  )
}

export default App
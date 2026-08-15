export interface Gel {
  brand: 'Lee' | 'Rosco'
  code: string
  name: string
  hex: string
  category?: 'Color' | 'Correction' | 'Diffusion'
}

export const GEL_LIBRARY: Gel[] = [
  // ── Lee Filters ───────────────────────────────────────────────────────────
  // Correction
  { brand: 'Lee', code: '201', name: 'Full C.T. Blue', hex: '#C6E2FF', category: 'Correction' },
  { brand: 'Lee', code: '202', name: 'Half C.T. Blue', hex: '#D9EEFF', category: 'Correction' },
  { brand: 'Lee', code: '203', name: 'Quarter C.T. Blue', hex: '#E8F4FF', category: 'Correction' },
  { brand: 'Lee', code: '204', name: 'Full C.T. Orange', hex: '#FFB366', category: 'Correction' },
  { brand: 'Lee', code: '205', name: 'Half C.T. Orange', hex: '#FFCC99', category: 'Correction' },
  { brand: 'Lee', code: '206', name: 'Quarter C.T. Orange', hex: '#FFE6CC', category: 'Correction' },
  { brand: 'Lee', code: '244', name: 'Full Plus Green', hex: '#99FF99', category: 'Correction' },
  { brand: 'Lee', code: '245', name: 'Half Plus Green', hex: '#B3FFB3', category: 'Correction' },
  { brand: 'Lee', code: '247', name: 'Full Minus Green', hex: '#FF99FF', category: 'Correction' },
  { brand: 'Lee', code: '248', name: 'Half Minus Green', hex: '#FFB3FF', category: 'Correction' },

  // Colors
  { brand: 'Lee', code: '101', name: 'Yellow', hex: '#FFFF00', category: 'Color' },
  { brand: 'Lee', code: '102', name: 'Light Amber', hex: '#FFDB58', category: 'Color' },
  { brand: 'Lee', code: '103', name: 'Straw', hex: '#FFEDB3', category: 'Color' },
  { brand: 'Lee', code: '104', name: 'Deep Amber', hex: '#FFB84D', category: 'Color' },
  { brand: 'Lee', code: '105', name: 'Orange', hex: '#FF7F00', category: 'Color' },
  { brand: 'Lee', code: '106', name: 'Primary Red', hex: '#FF0000', category: 'Color' },
  { brand: 'Lee', code: '111', name: 'Dark Pink', hex: '#FF66B3', category: 'Color' },
  { brand: 'Lee', code: '113', name: 'Magenta', hex: '#FF00FF', category: 'Color' },
  { brand: 'Lee', code: '115', name: 'Peacock Blue', hex: '#00B3FF', category: 'Color' },
  { brand: 'Lee', code: '116', name: 'Medium Blue Green', hex: '#008080', category: 'Color' },
  { brand: 'Lee', code: '119', name: 'Dark Blue', hex: '#00008B', category: 'Color' },
  { brand: 'Lee', code: '120', name: 'Deep Blue', hex: '#0000CD', category: 'Color' },
  { brand: 'Lee', code: '124', name: 'Dark Green', hex: '#006400', category: 'Color' },
  { brand: 'Lee', code: '126', name: 'Mauve', hex: '#E0B0FF', category: 'Color' },
  { brand: 'Lee', code: '128', name: 'Bright Pink', hex: '#FF1493', category: 'Color' },
  { brand: 'Lee', code: '132', name: 'Medium Blue', hex: '#0000FA', category: 'Color' },
  { brand: 'Lee', code: '135', name: 'Deep Golden Amber', hex: '#FF8C00', category: 'Color' },
  { brand: 'Lee', code: '139', name: 'Primary Green', hex: '#00FF00', category: 'Color' },
  { brand: 'Lee', code: '147', name: 'Apricot', hex: '#FFB366', category: 'Color' },
  { brand: 'Lee', code: '158', name: 'Deep Orange', hex: '#FF4500', category: 'Color' },
  { brand: 'Lee', code: '162', name: 'Bastard Amber', hex: '#FFC8A2', category: 'Color' },
  { brand: 'Lee', code: '181', name: 'Congo Blue', hex: '#330099', category: 'Color' },
  { brand: 'Lee', code: '195', name: 'Zenith Blue', hex: '#4169E1', category: 'Color' },
  { brand: 'Lee', code: '790', name: 'Moroccan Pink', hex: '#FFB6C1', category: 'Color' },

  // ── Rosco ─────────────────────────────────────────────────────────────────
  // Correction
  { brand: 'Rosco', code: 'R3202', name: 'Full Blue (CTB)', hex: '#C6E2FF', category: 'Correction' },
  { brand: 'Rosco', code: 'R3204', name: 'Half Blue (CTB)', hex: '#D9EEFF', category: 'Correction' },
  { brand: 'Rosco', code: 'R3407', name: 'Full CTO', hex: '#FFB366', category: 'Correction' },
  { brand: 'Rosco', code: 'R3408', name: 'Half CTO', hex: '#FFCC99', category: 'Correction' },
  { brand: 'Rosco', code: 'R3304', name: 'Tough Plusgreen', hex: '#99FF99', category: 'Correction' },
  { brand: 'Rosco', code: 'R3308', name: 'Tough Minusgreen', hex: '#FF99FF', category: 'Correction' },

  // Colors
  { brand: 'Rosco', code: 'R02', name: 'Bastard Amber', hex: '#FFDAB9', category: 'Color' },
  { brand: 'Rosco', code: 'R09', name: 'Pale Amber Gold', hex: '#FFD700', category: 'Color' },
  { brand: 'Rosco', code: 'R12', name: 'Straw', hex: '#FFFACD', category: 'Color' },
  { brand: 'Rosco', code: 'R21', name: 'Golden Amber', hex: '#FFC125', category: 'Color' },
  { brand: 'Rosco', code: 'R22', name: 'Deep Amber', hex: '#FF8C00', category: 'Color' },
  { brand: 'Rosco', code: 'R26', name: 'Light Red', hex: '#FF4500', category: 'Color' },
  { brand: 'Rosco', code: 'R27', name: 'Medium Red', hex: '#DC143C', category: 'Color' },
  { brand: 'Rosco', code: 'R33', name: 'No Color Pink', hex: '#FFB6C1', category: 'Color' },
  { brand: 'Rosco', code: 'R39', name: 'Skelton Exotic Sangria', hex: '#8B008B', category: 'Color' },
  { brand: 'Rosco', code: 'R44', name: 'Middle Rose', hex: '#FF69B4', category: 'Color' },
  { brand: 'Rosco', code: 'R54', name: 'Special Lavender', hex: '#E6E6FA', category: 'Color' },
  { brand: 'Rosco', code: 'R68', name: 'Parry Sky Blue', hex: '#87CEEB', category: 'Color' },
  { brand: 'Rosco', code: 'R74', name: 'Night Blue', hex: '#191970', category: 'Color' },
  { brand: 'Rosco', code: 'R80', name: 'Primary Blue', hex: '#0000FF', category: 'Color' },
  { brand: 'Rosco', code: 'R89', name: 'Moss Green', hex: '#2E8B57', category: 'Color' },
  { brand: 'Rosco', code: 'R90', name: 'Dark Yellow Green', hex: '#9ACD32', category: 'Color' },
  { brand: 'Rosco', code: 'R383', name: 'Sapphire Blue', hex: '#0F52BA', category: 'Color' }
]

/**
 * Converts a HEX string to RGB object.
 */
export function hexToRgb(hex: string): { r: number, g: number, b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 }
}

/**
 * Helper to convert HSV to RGB
 */
export function hsvToRgb(h: number, s: number, v: number): { r: number, g: number, b: number } {
  let r = 0, g = 0, b = 0
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

export interface Gel {
  brand: 'Lee' | 'Rosco';
  code: string;
  name: string;
  hex: string;
}

export const GEL_LIBRARY: Gel[] = [
  // Lee Filters (Standard)
  { brand: 'Lee', code: '101', name: 'Yellow', hex: '#FFFF00' },
  { brand: 'Lee', code: '102', name: 'Light Amber', hex: '#FFDB58' },
  { brand: 'Lee', code: '103', name: 'Straw', hex: '#FFEDB3' },
  { brand: 'Lee', code: '104', name: 'Deep Amber', hex: '#FFB84D' },
  { brand: 'Lee', code: '105', name: 'Orange', hex: '#FF7F00' },
  { brand: 'Lee', code: '106', name: 'Primary Red', hex: '#FF0000' },
  { brand: 'Lee', code: '111', name: 'Dark Pink', hex: '#FF66B3' },
  { brand: 'Lee', code: '113', name: 'Magenta', hex: '#FF00FF' },
  { brand: 'Lee', code: '115', name: 'Peacock Blue', hex: '#00B3FF' },
  { brand: 'Lee', code: '119', name: 'Dark Blue', hex: '#00008B' },
  { brand: 'Lee', code: '120', name: 'Deep Blue', hex: '#0000CD' },
  { brand: 'Lee', code: '124', name: 'Dark Green', hex: '#006400' },
  { brand: 'Lee', code: '126', name: 'Mauve', hex: '#E0B0FF' },
  { brand: 'Lee', code: '139', name: 'Primary Green', hex: '#00FF00' },
  { brand: 'Lee', code: '147', name: 'Apricot', hex: '#FFB366' },
  { brand: 'Lee', code: '158', name: 'Deep Orange', hex: '#FF4500' },
  { brand: 'Lee', code: '162', name: 'Bastard Amber', hex: '#FFC8A2' },
  { brand: 'Lee', code: '181', name: 'Congo Blue', hex: '#330099' },
  { brand: 'Lee', code: '195', name: 'Zenith Blue', hex: '#4169E1' },
  
  // Color Temperature (Lee)
  { brand: 'Lee', code: '201', name: 'Full C.T. Blue', hex: '#C6E2FF' },
  { brand: 'Lee', code: '202', name: 'Half C.T. Blue', hex: '#D9EEFF' },
  { brand: 'Lee', code: '203', name: 'Quarter C.T. Blue', hex: '#E8F4FF' },
  { brand: 'Lee', code: '204', name: 'Full C.T. Orange', hex: '#FFB366' },
  { brand: 'Lee', code: '205', name: 'Half C.T. Orange', hex: '#FFCC99' },
  { brand: 'Lee', code: '206', name: 'Quarter C.T. Orange', hex: '#FFE6CC' },
  
  // Rosco (Supergel)
  { brand: 'Rosco', code: 'R02', name: 'Bastard Amber', hex: '#FFDAB9' },
  { brand: 'Rosco', code: 'R09', name: 'Pale Amber Gold', hex: '#FFD700' },
  { brand: 'Rosco', code: 'R12', name: 'Straw', hex: '#FFFACD' },
  { brand: 'Rosco', code: 'R22', name: 'Deep Amber', hex: '#FF8C00' },
  { brand: 'Rosco', code: 'R26', name: 'Light Red', hex: '#FF4500' },
  { brand: 'Rosco', code: 'R27', name: 'Medium Red', hex: '#DC143C' },
  { brand: 'Rosco', code: 'R33', name: 'No Color Pink', hex: '#FFB6C1' },
  { brand: 'Rosco', code: 'R39', name: 'Skelton Exotic Sangria', hex: '#8B008B' },
  { brand: 'Rosco', code: 'R68', name: 'Parry Sky Blue', hex: '#87CEEB' },
  { brand: 'Rosco', code: 'R80', name: 'Primary Blue', hex: '#0000FF' },
  { brand: 'Rosco', code: 'R89', name: 'Moss Green', hex: '#2E8B57' },
  { brand: 'Rosco', code: 'R90', name: 'Dark Yellow Green', hex: '#9ACD32' },
  { brand: 'Rosco', code: 'R383', name: 'Sapphire Blue', hex: '#0F52BA' },
];

/**
 * Converts a HEX string to RGB object.
 */
export function hexToRgb(hex: string): { r: number, g: number, b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

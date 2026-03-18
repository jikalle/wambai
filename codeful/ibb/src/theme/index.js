export const Colors = {
  primary:    '#6B1F1F',
  primaryDark:'#4A1010',
  primaryLight:'#9B3030',
  gold:       '#C9922A',
  goldLight:  '#F5E6C8',
  goldBg:     '#FBF6ED',
  indigo:     '#1E2E6E',
  cream:      '#FAF3E8',
  dark:       '#1C0F08',
  text:       '#2A1A0E',
  textLight:  '#5A3A28',
  muted:      '#8A7060',
  border:     '#EDE3D4',
  borderLight:'#F5EFE6',
  white:      '#FFFDF8',
  background: '#F5EFE6',
  surface:    '#FFFDF8',
  sale:       '#C4622D',
  new_:       '#2D6B4A',
  error:      '#C0392B',
  success:    '#27AE60',
};

export const Typography = {
  display:  { fontFamily: 'serif', fontSize: 28, fontWeight: '900', color: Colors.text },
  title:    { fontFamily: 'serif', fontSize: 20, fontWeight: '800', color: Colors.text },
  subtitle: { fontFamily: 'serif', fontSize: 16, fontWeight: '700', color: Colors.text },
  body:     { fontSize: 14, color: Colors.text, lineHeight: 20 },
  caption:  { fontSize: 11, color: Colors.muted },
  label:    { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: Colors.muted },
};

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
};

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#2A1A0E', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  md: {
    shadowColor: '#2A1A0E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  lg: {
    shadowColor: '#2A1A0E', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
  },
};

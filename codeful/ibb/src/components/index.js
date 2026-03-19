import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '../theme';

// ── FabricSwatch ──────────────────────────────────────────────────────────────
export function FabricSwatch({ swatchKey, width, height, style = {}, borderRadius = 0 }) {
  const palettes = {
    ankara:     ['#E8412A','#F5C842','#1A6E3A','#2A4BBF'],
    asooke:     ['#4A1A6B','#C9922A','#FAF3E8','#4A1A6B'],
    damask:     ['#8B1A1A','#C9922A','#5C1010','#3A0A0A'],
    guinea:     ['#1E2E6E','#2A4BBF','#C9922A','#FAF3E8'],
    lace:       ['#FAF3E8','#E8D9B5','#C9922A','#F0E8D8'],
    adire:      ['#1E2E6E','#2A3D8A','#FAF3E8','#3A5088'],
    atamfa:     ['#C4622D','#FAF3E8','#C9922A','#6B1F1F'],
    brocade:    ['#2D6B4A','#1A4A32','#C9922A','#3D8A62'],
    shadda:     ['#FAF3E8','#EDE3D4','#D4C4A8','#F5EFE6'],
    embroidery: ['#C9922A','#6B1F1F','#4A1A6B','#FAF3E8'],
  };

  const colors = palettes[swatchKey] || palettes.ankara;
  const hw = (width || 100) / 2;
  const hh = (height || 80) / 2;

  return (
    <View style={[{ width, height, borderRadius, overflow: 'hidden' }, style]}>
      <View style={{ flexDirection: 'row', flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: colors[0] }} />
        <View style={{ flex: 1, backgroundColor: colors[1] }} />
      </View>
      <View style={{ flexDirection: 'row', flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: colors[2] }} />
        <View style={{ flex: 1, backgroundColor: colors[3] }} />
      </View>
      {/* Diagonal stripe overlay for texture feel */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        opacity: 0.07,
        backgroundColor: 'transparent',
      }} />
    </View>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, onMore }) {
  return (
    <View style={sh.row}>
      <View style={sh.titleWrap}>
        <View style={sh.accent} />
        <Text style={sh.title}>{title}</Text>
      </View>
      {onMore && (
        <TouchableOpacity onPress={onMore}>
          <Text style={sh.more}>See All →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const sh = StyleSheet.create({
  row:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingTop:20, paddingBottom:10 },
  titleWrap:{ flexDirection:'row', alignItems:'center', gap:8 },
  accent:   { width:4, height:20, backgroundColor:Colors.primary, borderRadius:2 },
  title:    { fontSize:16, fontWeight:'800', color:Colors.text, fontFamily:'serif' },
  more:     { fontSize:12, fontWeight:'700', color:Colors.gold },
});

// ── ProductCard ───────────────────────────────────────────────────────────────
export function ProductCard({ item, onPress, width = 162 }) {
  return (
    <TouchableOpacity onPress={onPress} style={[pc.card, { width }, Shadow.sm]}>
      <View style={{ position:'relative' }}>
        {item.badge && (
          <View style={[pc.badge, { backgroundColor: item.badge==='sale' ? Colors.sale : Colors.new_ }]}>
            <Text style={pc.badgeTxt}>{item.badge==='sale'?'SALE':'NEW'}</Text>
          </View>
        )}
        {item.image
          ? <Image source={{ uri: item.image }} style={{ width, height: 110 }} resizeMode="cover" />
          : <FabricSwatch swatchKey={item.swatch} width={width} height={110} />
        }
        <View style={pc.originPill}>
          <Text style={pc.originTxt}>{item.origin}</Text>
        </View>
      </View>
      <View style={pc.info}>
        <Text style={pc.name} numberOfLines={2}>{item.name}</Text>
        {!!item.shopName && <Text style={pc.shop}>{item.shopName}</Text>}
        <Text style={pc.yards}>{item.yards} per bundle</Text>
        <View style={pc.priceRow}>
          <Text style={pc.price}>₦{Number(item.price).toLocaleString()}</Text>
          <Text style={pc.orig}>₦{Number(item.original).toLocaleString()}</Text>
        </View>
        <View style={pc.ratingRow}>
          <Text style={pc.star}>★</Text>
          <Text style={pc.ratingVal}>{item.rating}</Text>
          <Text style={pc.ratingCount}>({item.reviews})</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const pc = StyleSheet.create({
  card:       { backgroundColor:Colors.white, borderRadius:Radius.md, overflow:'hidden', borderWidth:1, borderColor:Colors.border },
  badge:      { position:'absolute', top:8, left:8, zIndex:2, borderRadius:5, paddingHorizontal:8, paddingVertical:2 },
  badgeTxt:   { color:'#fff', fontSize:9, fontWeight:'700', letterSpacing:0.5 },
  originPill: { position:'absolute', bottom:7, right:8, backgroundColor:'rgba(255,253,248,0.92)', borderRadius:6, paddingHorizontal:7, paddingVertical:2 },
  originTxt:  { fontSize:9, color:Colors.muted, fontWeight:'600' },
  info:       { padding:10 },
  name:       { fontSize:12, fontWeight:'800', color:Colors.text, marginBottom:2, lineHeight:17, fontFamily:'serif' },
  shop:       { fontSize:10, color:Colors.muted, marginBottom:4 },
  yards:      { fontSize:10, color:Colors.muted, marginBottom:5 },
  priceRow:   { flexDirection:'row', alignItems:'baseline', gap:5, marginBottom:4 },
  price:      { fontSize:14, fontWeight:'800', color:Colors.primary },
  orig:       { fontSize:10, color:Colors.muted, textDecorationLine:'line-through' },
  ratingRow:  { flexDirection:'row', alignItems:'center', gap:2 },
  star:       { color:'#FDC040', fontSize:11 },
  ratingVal:  { fontSize:10, fontWeight:'700', color:Colors.text },
  ratingCount:{ fontSize:10, color:Colors.muted },
});

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ title, onPress, variant='primary', style={}, textStyle={}, disabled=false }) {
  const bgs = { primary:Colors.primary, gold:Colors.gold, outline:'transparent', ghost:'transparent' };
  const borders = { outline:Colors.primary, ghost:'transparent' };
  const txts = { primary:'#fff', gold:'#fff', outline:Colors.primary, ghost:Colors.primary };
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        btn.base,
        { backgroundColor: bgs[variant]||Colors.primary, borderColor: borders[variant]||'transparent', borderWidth: variant==='outline'?1.5:0, opacity: disabled?0.5:1 },
        style,
      ]}
    >
      <Text style={[btn.txt, { color: txts[variant]||'#fff' }, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}
const btn = StyleSheet.create({
  base: { borderRadius:Radius.md, paddingVertical:13, paddingHorizontal:20, alignItems:'center', justifyContent:'center' },
  txt:  { fontSize:14, fontWeight:'700' },
});

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ style={} }) {
  return <View style={[{ height:1, backgroundColor:Colors.border, marginVertical:Spacing.sm }, style]} />;
}

// ── Badge pill ────────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const cfg = {
    delivered:  { bg:'#EAF7EF', color:'#2D6B4A', label:'Delivered' },
    processing: { bg:'#FBF6ED', color:Colors.gold, label:'Processing' },
    shipped:    { bg:'#EEF5FF', color:Colors.indigo, label:'Shipped' },
    cancelled:  { bg:'#FEF0EE', color:Colors.error, label:'Cancelled' },
    pending:    { bg:'#FBF6ED', color:Colors.gold, label:'Pending' },
    paid:       { bg:'#EAF7EF', color:'#2D6B4A', label:'Paid' },
    unpaid:     { bg:'#FEF3E8', color:'#B45309', label:'Unpaid' },
    failed:     { bg:'#FEF0EE', color:Colors.error, label:'Failed' },
    refunded:   { bg:'#EEF5FF', color:Colors.indigo, label:'Refunded' },
  };
  const c = cfg[status] || cfg.processing;
  return (
    <View style={[sb.pill, { backgroundColor:c.bg }]}>
      <Text style={[sb.txt, { color:c.color }]}>{c.label}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  pill: { paddingHorizontal:10, paddingVertical:4, borderRadius:Radius.full },
  txt:  { fontSize:11, fontWeight:'700' },
});

// ── QuantitySelector ──────────────────────────────────────────────────────────
export function QtySelector({ value, onChange, min=1, max=20 }) {
  return (
    <View style={qs.row}>
      <TouchableOpacity style={qs.btn} onPress={()=>onChange(Math.max(min,value-1))}>
        <Text style={qs.btnTxt}>−</Text>
      </TouchableOpacity>
      <Text style={qs.val}>{value}</Text>
      <TouchableOpacity style={qs.btn} onPress={()=>onChange(Math.min(max,value+1))}>
        <Text style={qs.btnTxt}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
const qs = StyleSheet.create({
  row:   { flexDirection:'row', alignItems:'center', backgroundColor:Colors.goldBg, borderRadius:Radius.md, borderWidth:1, borderColor:Colors.border, overflow:'hidden' },
  btn:   { width:40, height:40, alignItems:'center', justifyContent:'center' },
  btnTxt:{ fontSize:18, fontWeight:'700', color:Colors.primary },
  val:   { flex:1, textAlign:'center', fontSize:15, fontWeight:'800', color:Colors.text },
});

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ emoji, title, subtitle, action, onAction }) {
  return (
    <View style={es.wrap}>
      <Text style={es.emoji}>{emoji}</Text>
      <Text style={es.title}>{title}</Text>
      {subtitle && <Text style={es.sub}>{subtitle}</Text>}
      {action && (
        <Button title={action} onPress={onAction} style={{ marginTop:16, paddingHorizontal:28 }} />
      )}
    </View>
  );
}
const es = StyleSheet.create({
  wrap:  { flex:1, alignItems:'center', justifyContent:'center', padding:40 },
  emoji: { fontSize:52, marginBottom:14 },
  title: { fontSize:18, fontWeight:'800', color:Colors.text, fontFamily:'serif', marginBottom:8, textAlign:'center' },
  sub:   { fontSize:13, color:Colors.muted, textAlign:'center', lineHeight:20 },
});

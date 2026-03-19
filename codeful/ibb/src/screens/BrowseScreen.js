import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Dimensions, Modal, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../theme';
import { FabricSwatch, ProductCard } from '../components';
import { BRANDS, CATEGORIES, PRODUCTS } from '../data';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const { width: W } = Dimensions.get('window');
const SORT_OPTIONS = ['Recommended','Price: Low to High','Price: High to Low','Rating','Newest'];

export default function BrowseScreen({ navigation, route }) {
  const initCategory = route?.params?.category || null;
  const initQuery    = route?.params?.query    || '';
  const initShopId   = route?.params?.shopId   || null;

  const [search, setSearch]       = useState(initQuery);
  const [category, setCategory]   = useState(initCategory);
  const [shopId, setShopId]       = useState(initShopId);
  const [sort, setSort]           = useState('Recommended');
  const [showFilter, setShowFilter] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 30000]);
  const [viewMode, setViewMode]   = useState('grid'); // 'grid' | 'list'
  const [showSort, setShowSort]   = useState(false);

  const [remoteProducts, setRemoteProducts] = useState([]);
  const [remoteShops, setRemoteShops] = useState([]);

  const loadProducts = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images ( url, sort_order ), shop:shops ( id, name, logo_url )')
      .or('status.eq.published,status.is.null')
      .order('created_at', { ascending: false })
      .order('sort_order', { foreignTable: 'product_images', ascending: true });
    if (error) return;
    const mapped = (data || []).map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      original: p.original_price ?? p.price,
      badge: p.badge || null,
      swatch: p.swatch || 'ankara',
      image: p.product_images?.[0]?.url || null,
      yards: p.yards || '6 yds',
      origin: p.origin || 'Kano',
      rating: p.rating || 4.7,
      reviews: p.reviews || 40,
      category: p.category || p.swatch || 'ankara',
      shopId: p.shop_id || p.shop?.id || null,
      shopName: p.shop?.name || null,
    }));
    setRemoteProducts(mapped);
  }, []);

  const loadShops = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase
      .from('shops')
      .select('id, name, logo_url, status, created_at')
      .or('status.eq.active,status.is.null')
      .order('created_at', { ascending: false });
    if (error) return;
    setRemoteShops(data || []);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));
  useEffect(() => { loadShops(); }, [loadShops]);
  useFocusEffect(useCallback(() => { loadShops(); }, [loadShops]));

  useEffect(() => {
    if (route?.params?.shopId !== undefined) {
      setShopId(route.params.shopId || null);
    }
  }, [route?.params?.shopId]);

  const productList = remoteProducts.length ? remoteProducts : PRODUCTS;

  const filtered = useMemo(() => {
    let list = [...productList];
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.origin.toLowerCase().includes(search.toLowerCase()));
    if (category) list = list.filter(p => p.category === category || p.swatch === category);
    if (shopId) list = list.filter(p => p.shopId === shopId);
    list = list.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    if (sort === 'Price: Low to High')  list.sort((a,b) => a.price - b.price);
    if (sort === 'Price: High to Low')  list.sort((a,b) => b.price - a.price);
    if (sort === 'Rating')              list.sort((a,b) => b.rating - a.rating);
    if (sort === 'Newest')              list = list.filter(p => p.badge === 'new_').concat(list.filter(p => p.badge !== 'new_'));
    return list;
  }, [search, category, shopId, sort, priceRange, productList]);

  const CARD_W = (W - 16*2 - 10) / 2;
  const shopList = remoteShops.length
    ? remoteShops
    : BRANDS.map(b => ({ id: b.id, name: b.name, logo_url: null }));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={s.searchBox}>
          <Ionicons name="search" size={15} color={Colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search fabrics..."
            placeholderTextColor={Colors.muted}
            style={s.searchInput}
            returnKeyType="search"
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.filterIconBtn} onPress={() => setShowFilter(true)}>
          <Ionicons name="options-outline" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        <TouchableOpacity style={[s.chip, !category && s.chipActive]} onPress={() => setCategory(null)}>
          <Text style={[s.chipTxt, !category && s.chipTxtActive]}>All</Text>
        </TouchableOpacity>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c.id} style={[s.chip, category === c.key && s.chipActive]} onPress={() => setCategory(category === c.key ? null : c.key)}>
            <View style={{ width:14, height:14, borderRadius:7, overflow:'hidden', marginRight:5 }}>
              <FabricSwatch swatchKey={c.key} width={14} height={14} borderRadius={7} />
            </View>
            <Text style={[s.chipTxt, category === c.key && s.chipTxtActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Merchant chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.shopChips}>
        <TouchableOpacity style={[s.shopChip, !shopId && s.shopChipActive]} onPress={() => setShopId(null)}>
          <Text style={[s.shopChipTxt, !shopId && s.shopChipTxtActive]}>All Merchants</Text>
        </TouchableOpacity>
        {shopList.map(sx => (
          <TouchableOpacity
            key={sx.id}
            style={[s.shopChip, shopId === sx.id && s.shopChipActive]}
            onPress={() => setShopId(shopId === sx.id ? null : sx.id)}
          >
            {!!sx.logo_url ? (
              <Image source={{ uri: sx.logo_url }} style={s.shopChipLogo} />
            ) : (
              <View style={s.shopChipLogoFallback}>
                <Ionicons name="storefront-outline" size={12} color={Colors.primary} />
              </View>
            )}
            <Text style={[s.shopChipTxt, shopId === sx.id && s.shopChipTxtActive]} numberOfLines={1}>
              {sx.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results bar */}
      <View style={s.resultsBar}>
        <Text style={s.resultsTxt}>{filtered.length} fabrics found</Text>
        <View style={s.resultsRight}>
          <TouchableOpacity style={s.sortBtn} onPress={() => setShowSort(true)}>
            <Ionicons name="swap-vertical" size={14} color={Colors.primary} />
            <Text style={s.sortTxt}>{sort}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            <Ionicons name={viewMode === 'grid' ? 'list' : 'grid'} size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Product grid */}
      <FlatList
        data={filtered}
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        contentContainerStyle={[s.grid, filtered.length === 0 && { flex:1 }]}
        columnWrapperStyle={viewMode === 'grid' ? s.row : undefined}
        keyExtractor={p => p.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🧵</Text>
            <Text style={s.emptyTitle}>No fabrics found</Text>
            <Text style={s.emptySub}>Try a different search or clear your filters</Text>
            <TouchableOpacity style={s.clearBtn} onPress={() => { setSearch(''); setCategory(null); }}>
              <Text style={s.clearBtnTxt}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) =>
          viewMode === 'grid'
            ? <ProductCard item={item} width={CARD_W} onPress={() => navigation.navigate('ProductDetail', { productId: item.id })} />
            : <ListCard item={item} onPress={() => navigation.navigate('ProductDetail', { productId: item.id })} />
        }
      />

      {/* Sort Modal */}
      <Modal visible={showSort} transparent animationType="slide" onRequestClose={() => setShowSort(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowSort(false)}>
          <View style={s.sortSheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Sort By</Text>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt} style={s.sortOption} onPress={() => { setSort(opt); setShowSort(false); }}>
                <Text style={[s.sortOptionTxt, sort === opt && s.sortOptionActive]}>{opt}</Text>
                {sort === opt && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <View style={s.modalOverlay}>
          <View style={s.filterSheet}>
            <View style={s.filterHeader}>
              <Text style={s.sheetTitle}>Filters</Text>
              <TouchableOpacity onPress={() => { setPriceRange([0,30000]); setCategory(null); setShopId(null); }}>
                <Text style={s.clearAllTxt}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.filterLabel}>FABRIC TYPE</Text>
              <View style={s.filterChips}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c.id} style={[s.filterChip, category === c.key && s.filterChipActive]}
                    onPress={() => setCategory(category === c.key ? null : c.key)}
                  >
                    <Text style={[s.filterChipTxt, category === c.key && s.filterChipTxtActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.filterLabel}>PRICE RANGE</Text>
              <View style={s.priceRow}>
                {[[0,5000,'Budget'],[5000,15000,'Mid-range'],[15000,30000,'Premium']].map(([lo,hi,lbl]) => (
                  <TouchableOpacity key={lbl}
                    style={[s.priceChip, priceRange[0]===lo && priceRange[1]===hi && s.priceChipActive]}
                    onPress={() => setPriceRange([lo,hi])}
                  >
                    <Text style={[s.priceChipTxt, priceRange[0]===lo && priceRange[1]===hi && s.priceChipTxtActive]}>{lbl}</Text>
                    <Text style={[s.priceChipSub, priceRange[0]===lo && priceRange[1]===hi && s.priceChipTxtActive]}>₦{lo.toLocaleString()}–₦{hi.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={s.applyBtn} onPress={() => setShowFilter(false)}>
              <Text style={s.applyBtnTxt}>Show {filtered.length} Results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ListCard({ item, onPress }) {
  return (
    <TouchableOpacity style={[lc.card, Shadow.sm]} onPress={onPress}>
      <FabricSwatch swatchKey={item.swatch} width={90} height={90} borderRadius={Radius.md} />
      <View style={lc.info}>
        <Text style={lc.name}>{item.name}</Text>
        {!!item.shopName && <Text style={lc.shop}>{item.shopName}</Text>}
        <Text style={lc.origin}>📍 {item.origin} · {item.yards}</Text>
        <View style={lc.ratingRow}>
          <Text style={lc.star}>★</Text>
          <Text style={lc.rating}>{item.rating}</Text>
          <Text style={lc.reviews}>({item.reviews} reviews)</Text>
        </View>
        <View style={lc.priceRow}>
          <Text style={lc.price}>₦{Number(item.price).toLocaleString()}</Text>
          <Text style={lc.orig}>₦{Number(item.original).toLocaleString()}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe:       { flex:1, backgroundColor:Colors.white },
  topBar:     { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:10, gap:10, backgroundColor:Colors.white },
  backBtn:    { padding:4 },
  searchBox:  { flex:1, flexDirection:'row', alignItems:'center', backgroundColor:Colors.cream, borderRadius:Radius.md, borderWidth:1.5, borderColor:Colors.border, paddingHorizontal:10, gap:7, height:42 },
  searchInput:{ flex:1, fontSize:13, color:Colors.text },
  filterIconBtn:{ width:42, height:42, backgroundColor:Colors.primary, borderRadius:Radius.md, alignItems:'center', justifyContent:'center' },
  chips:      { paddingHorizontal:16, paddingVertical:8, gap:8 },
  chip:       { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:7, borderRadius:Radius.full, backgroundColor:Colors.cream, borderWidth:1, borderColor:Colors.border },
  chipActive: { backgroundColor:Colors.primary, borderColor:Colors.primary },
  chipTxt:    { fontSize:12, fontWeight:'700', color:Colors.muted },
  chipTxtActive:{ color:'#fff' },
  shopChips:  { paddingHorizontal:16, paddingBottom:8, gap:8 },
  shopChip:   { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:10, paddingVertical:6, borderRadius:Radius.full, backgroundColor:Colors.goldBg, borderWidth:1, borderColor:Colors.border, maxWidth:160 },
  shopChipActive:{ backgroundColor:Colors.primary, borderColor:Colors.primary },
  shopChipTxt:{ fontSize:11, fontWeight:'700', color:Colors.primary },
  shopChipTxtActive:{ color:'#fff' },
  shopChipLogo:{ width:18, height:18, borderRadius:9 },
  shopChipLogoFallback:{ width:18, height:18, borderRadius:9, backgroundColor:Colors.cream, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:Colors.border },
  resultsBar: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:8, borderBottomWidth:1, borderBottomColor:Colors.border },
  resultsTxt: { fontSize:12, color:Colors.muted, fontWeight:'600' },
  resultsRight:{ flexDirection:'row', alignItems:'center', gap:12 },
  sortBtn:    { flexDirection:'row', alignItems:'center', gap:4 },
  sortTxt:    { fontSize:12, color:Colors.primary, fontWeight:'700' },
  grid:       { padding:16, gap:10 },
  row:        { gap:10, justifyContent:'space-between' },
  empty:      { flex:1, alignItems:'center', justifyContent:'center', paddingVertical:60 },
  emptyEmoji: { fontSize:52, marginBottom:14 },
  emptyTitle: { fontSize:18, fontWeight:'800', color:Colors.text, fontFamily:'serif', marginBottom:8 },
  emptySub:   { fontSize:13, color:Colors.muted, textAlign:'center', marginBottom:20 },
  clearBtn:   { backgroundColor:Colors.primary, borderRadius:Radius.md, paddingHorizontal:24, paddingVertical:12 },
  clearBtnTxt:{ color:'#fff', fontWeight:'700', fontSize:13 },
  modalOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' },
  sortSheet:  { backgroundColor:Colors.white, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:36 },
  filterSheet:{ backgroundColor:Colors.white, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:36, maxHeight:'80%' },
  sheetHandle:{ width:40, height:4, backgroundColor:Colors.border, borderRadius:2, alignSelf:'center', marginBottom:20 },
  sheetTitle: { fontSize:18, fontWeight:'800', color:Colors.text, fontFamily:'serif', marginBottom:16 },
  sortOption: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:14, borderBottomWidth:1, borderBottomColor:Colors.borderLight },
  sortOptionTxt:{ fontSize:14, color:Colors.text },
  sortOptionActive:{ color:Colors.primary, fontWeight:'700' },
  filterHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
  clearAllTxt:{ fontSize:13, color:Colors.primary, fontWeight:'700' },
  filterLabel:{ fontSize:10, fontWeight:'800', color:Colors.muted, letterSpacing:1, marginBottom:12, marginTop:8 },
  filterChips:{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16 },
  filterChip: { paddingHorizontal:12, paddingVertical:7, borderRadius:Radius.full, backgroundColor:Colors.cream, borderWidth:1, borderColor:Colors.border },
  filterChipActive:{ backgroundColor:Colors.primary, borderColor:Colors.primary },
  filterChipTxt:{ fontSize:12, fontWeight:'600', color:Colors.text },
  filterChipTxtActive:{ color:'#fff' },
  priceRow:   { flexDirection:'row', gap:8, marginBottom:16 },
  priceChip:  { flex:1, padding:12, borderRadius:Radius.md, backgroundColor:Colors.cream, borderWidth:1, borderColor:Colors.border, alignItems:'center' },
  priceChipActive:{ backgroundColor:Colors.primary, borderColor:Colors.primary },
  priceChipTxt:{ fontSize:12, fontWeight:'800', color:Colors.text, marginBottom:2 },
  priceChipSub:{ fontSize:9, color:Colors.muted },
  priceChipTxtActive:{ color:'#fff' },
  applyBtn:   { backgroundColor:Colors.primary, borderRadius:Radius.md, paddingVertical:14, alignItems:'center', marginTop:16 },
  applyBtnTxt:{ color:'#fff', fontSize:15, fontWeight:'800' },
});

const lc = StyleSheet.create({
  card:    { flexDirection:'row', alignItems:'center', backgroundColor:Colors.white, borderRadius:Radius.md, padding:12, marginBottom:10, borderWidth:1, borderColor:Colors.border, gap:12 },
  info:    { flex:1, gap:3 },
  name:    { fontSize:13, fontWeight:'800', color:Colors.text, fontFamily:'serif' },
  shop:    { fontSize:10, color:Colors.muted },
  origin:  { fontSize:10, color:Colors.muted },
  ratingRow:{ flexDirection:'row', alignItems:'center', gap:3 },
  star:    { color:'#FDC040', fontSize:11 },
  rating:  { fontSize:11, fontWeight:'700', color:Colors.text },
  reviews: { fontSize:10, color:Colors.muted },
  priceRow:{ flexDirection:'row', alignItems:'baseline', gap:6 },
  price:   { fontSize:15, fontWeight:'800', color:Colors.primary },
  orig:    { fontSize:10, color:Colors.muted, textDecorationLine:'line-through' },
});

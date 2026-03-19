import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { ProductCard, FabricSwatch } from '../components';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PRODUCTS, BRANDS } from '../data';

const { width: W } = Dimensions.get('window');

const mapProduct = (p) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  original: p.original ?? p.original_price ?? p.price,
  badge: p.badge || null,
  swatch: p.swatch || 'ankara',
  image: p.product_images?.[0]?.url || p.image || null,
  yards: p.yards || '6 yds',
  origin: p.origin || 'Kano',
  category: p.category || p.swatch || 'ankara',
  description: p.description || '',
  rating: p.rating || 4.7,
  reviews: p.reviews || 40,
  shopId: p.shop_id || p.shop?.id || null,
  shopName: p.shop?.name || null,
  shopLogo: p.shop?.logo_url || null,
});

export default function ShopScreen({ navigation, route }) {
  const { shopId } = route.params || {};
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!shopId || !isSupabaseConfigured || !supabase) {
      const fallbackShop = BRANDS.find(b => b.id === shopId) || BRANDS[0];
      setShop(fallbackShop ? {
        id: fallbackShop.id,
        name: fallbackShop.name,
        description: 'Premium fabrics curated by trusted merchants.',
        logo_url: null,
        address: fallbackShop.location,
      } : null);
      setProducts(PRODUCTS.slice(0, 6));
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: shopData } = await supabase
      .from('shops')
      .select('id, name, description, address, logo_url, status, created_at')
      .eq('id', shopId)
      .single();
    setShop(shopData || null);
    const { data: prodData } = await supabase
      .from('products')
      .select('*, product_images ( url, sort_order )')
      .eq('shop_id', shopId)
      .or('status.eq.published,status.is.null')
      .order('created_at', { ascending: false })
      .order('sort_order', { foreignTable: 'product_images', ascending: true });
    const mapped = (prodData || []).map(mapProduct).map(p => {
      const raw = (prodData || []).find(d => d.id === p.id);
      const images = raw?.product_images || [];
      const sorted = [...images].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return { ...p, image: p.image || sorted[0]?.url || null };
    });
    setProducts(mapped);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const cardW = useMemo(() => (W - 16 * 2 - 10) / 2, []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Shop</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <Text style={s.loading}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={s.list}
          columnWrapperStyle={s.row}
          ListHeaderComponent={
            <View style={[s.shopCard, Shadow.sm]}>
              <View style={s.shopTop}>
                {shop?.logo_url
                  ? <Image source={{ uri: shop.logo_url }} style={s.logo} />
                  : <FabricSwatch swatchKey="ankara" width={64} height={64} borderRadius={12} />
                }
                <View style={{ flex: 1 }}>
                  <Text style={s.shopName}>{shop?.name || 'Merchant'}</Text>
                  {!!shop?.description && <Text style={s.shopDesc}>{shop.description}</Text>}
                  {!!shop?.address && <Text style={s.shopAddress}>📍 {shop.address}</Text>}
                </View>
              </View>
              <View style={s.shopStats}>
                <View style={s.statPill}>
                  <Ionicons name="cube-outline" size={14} color={Colors.primary} />
                  <Text style={s.statTxt}>{products.length} items</Text>
                </View>
                <TouchableOpacity
                  style={s.shopBrowseBtn}
                  onPress={() => navigation.navigate('Browse', { shopId })}
                >
                  <Text style={s.shopBrowseTxt}>Browse in Search</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>No products yet</Text>
              <Text style={s.emptySub}>This merchant has not published any items.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              width={cardW}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: Colors.text, fontFamily: 'serif' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { fontSize: 12, color: Colors.muted },
  list: { padding: 16, paddingBottom: 24 },
  row: { justifyContent: 'space-between', gap: 10 },
  shopCard: { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 16 },
  shopTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 64, height: 64, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.cream },
  shopName: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  shopDesc: { fontSize: 11, color: Colors.muted, lineHeight: 16 },
  shopAddress: { fontSize: 10, color: Colors.muted, marginTop: 6 },
  shopStats: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: Colors.goldBg, borderWidth: 1, borderColor: Colors.border },
  statTxt: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  shopBrowseBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: 12 },
  shopBrowseTxt: { fontSize: 10, fontWeight: '700', color: Colors.white },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  emptySub: { fontSize: 11, color: Colors.muted, textAlign: 'center' },
});

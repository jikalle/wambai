import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../theme';
import { FabricSwatch, ProductCard, Button, QtySelector } from '../components';
import { PRODUCTS } from '../data';
import { useCart } from '../context/CartContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const { width: W } = Dimensions.get('window');

export default function ProductDetailScreen({ navigation, route }) {
  const { productId } = route.params;
  const localProduct = PRODUCTS.find(p => p.id === productId) || PRODUCTS[0];
  const [product, setProduct] = useState(localProduct);
  const [allProducts, setAllProducts] = useState(PRODUCTS);
  const { addItem } = useCart();

  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('desc');
  const [activeImage, setActiveImage] = useState(0);
  const heroRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images ( url, sort_order ), shop:shops ( id, name, logo_url )')
        .eq('id', productId)
        .single();
      if (!error && data) {
        const imageRows = [...(data.product_images || [])]
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map(i => ({ id: i.id, url: i.url }))
          .filter(i => i.url);
        const mapped = {
          id: data.id,
          name: data.name,
          price: data.price,
          original: data.original_price ?? data.price,
          badge: data.badge || null,
          swatch: data.swatch || 'ankara',
          image: data.product_images?.[0]?.url || null,
          images: imageRows,
          yards: data.yards || '6 yds',
          origin: data.origin || 'Kano',
          category: data.category || data.swatch || 'ankara',
          description: data.description || '',
          details: data.details || [],
          rating: data.rating || 4.7,
          reviews: data.reviews || 40,
          shopId: data.shop_id || data.shop?.id || null,
          shopName: data.shop?.name || null,
          shopLogo: data.shop?.logo_url || null,
        };
        setProduct(mapped);
        setActiveImage(0);
      }
      const { data: list } = await supabase
        .from('products')
        .select('*, product_images ( url, sort_order ), shop:shops ( id, name, logo_url )')
        .or('status.eq.published,status.is.null')
        .order('created_at', { ascending: false })
        .order('sort_order', { foreignTable: 'product_images', ascending: true })
        .limit(8);
      if (list) {
        const mappedList = list.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          original: p.original_price ?? p.price,
          badge: p.badge || null,
          swatch: p.swatch || 'ankara',
          image: p.product_images?.[0]?.url || null,
          yards: p.yards || '6 yds',
          origin: p.origin || 'Kano',
          category: p.category || p.swatch || 'ankara',
          description: p.description || '',
          rating: p.rating || 4.7,
          reviews: p.reviews || 40,
          shopId: p.shop_id || p.shop?.id || null,
          shopName: p.shop?.name || null,
        }));
        setAllProducts(mappedList);
      }
    };
    load();
  }, [productId]);

  const imageRows = product?.images?.length
    ? product.images
    : (product?.image ? [{ id: null, url: product.image }] : []);
  const imageUrls = imageRows.map(i => i.url);

  const relatedProducts = product.relatedIds
    ? allProducts.filter(p => product.relatedIds?.includes(p.id))
    : allProducts.filter(p => p.id !== product.id).slice(0, 6);

  const handleAddToCart = () => {
    const selectedImage = imageUrls[activeImage] || product.image || null;
    const selectedImageId = imageRows[activeImage]?.id || null;
    const cartItemId = selectedImageId ? `${product.id}:${selectedImageId}` : product.id;
    addItem({ ...product, image: selectedImage, selectedImage, selectedImageId, selectedImageIndex: activeImage, cartItemId }, qty);
    Alert.alert('Added to Cart', `${qty} × ${product.name} added to your cart.`, [
      { text: 'Continue Shopping', style: 'cancel' },
      { text: 'View Cart', onPress: () => navigation.navigate('CartTab') },
    ]);
  };

  const handleBuyNow = () => {
    const selectedImage = imageUrls[activeImage] || product.image || null;
    const selectedImageId = imageRows[activeImage]?.id || null;
    const cartItemId = selectedImageId ? `${product.id}:${selectedImageId}` : product.id;
    addItem({ ...product, image: selectedImage, selectedImage, selectedImageId, selectedImageIndex: activeImage, cartItemId }, qty);
    navigation.navigate('CartTab');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Nav */}
      <View style={s.nav}>
        <TouchableOpacity style={s.navBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.navTitle}>Fabric Detail</Text>
        <View style={s.navRight}>
          <TouchableOpacity style={s.navBtn} onPress={() => setSaved(!saved)}>
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? Colors.primary : Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.navBtn} onPress={() => navigation.navigate('CartTab')}>
            <Ionicons name="cart-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={s.scroll}>

        {/* Fabric swatch hero */}
        <View style={s.swatchHero}>
          {imageUrls.length > 0 ? (
            imageUrls.length === 1 ? (
              <Image source={{ uri: imageUrls[0] }} style={{ width: W, height: 280 }} resizeMode="cover" />
            ) : (
              <ScrollView
                ref={heroRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  const idx = Math.round(x / W);
                  setActiveImage(idx);
                }}
              >
                {imageUrls.map((url, idx) => (
                  <Image key={`${url}-${idx}`} source={{ uri: url }} style={{ width: W, height: 280 }} resizeMode="cover" />
                ))}
              </ScrollView>
            )
          ) : (
            <FabricSwatch swatchKey={product.swatch} width={W} height={280} />
          )}
          {/* Gradient overlay at bottom */}
          <LinearGradient colors={['transparent', 'rgba(42,26,14,0.6)']} style={s.heroOverlay}>
            <View style={s.heroBadges}>
              {product.badge && (
                <View style={[s.badge, { backgroundColor: product.badge==='sale' ? Colors.sale : Colors.new_ }]}>
                  <Text style={s.badgeTxt}>{product.badge==='sale'?'SALE':'NEW ARRIVAL'}</Text>
                </View>
              )}
              <View style={s.originBadge}>
                <Ionicons name="location" size={11} color={Colors.goldLight} />
                <Text style={s.originTxt}>{product.origin}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
        {imageUrls.length > 1 && (
          <View style={s.heroDotsOverlay}>
            {imageUrls.map((_, i) => (
              <View key={`dot-${i}`} style={[s.heroDot, i === activeImage && s.heroDotActive]} />
            ))}
          </View>
        )}
        {imageUrls.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbRow}>
            {imageUrls.map((url, idx) => (
              <TouchableOpacity
                key={`${url}-${idx}`}
                style={[s.thumb, idx === activeImage && s.thumbActive]}
                onPress={() => {
                  setActiveImage(idx);
                  heroRef.current?.scrollTo?.({ x: idx * W, animated: true });
                }}
              >
                <Image source={{ uri: url }} style={s.thumbImg} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Product info card */}
        <View style={s.infoCard}>
          {/* Rating row */}
          <View style={s.ratingRow}>
            {[1,2,3,4,5].map(i => (
              <Ionicons key={i} name={i <= Math.floor(product.rating) ? 'star' : 'star-outline'} size={15} color="#FDC040" />
            ))}
            <Text style={s.ratingVal}>{product.rating}</Text>
            <Text style={s.ratingCount}>({product.reviews} reviews)</Text>
          </View>

          {/* Name */}
          <Text style={s.productName}>{product.name}</Text>
          {!!product.shopName && (
            <TouchableOpacity style={s.shopRow} onPress={() => navigation.navigate('Shop', { shopId: product.shopId })}>
              {product.shopLogo
                ? <Image source={{ uri: product.shopLogo }} style={s.shopLogo} />
                : <Ionicons name="storefront-outline" size={16} color={Colors.muted} />
              }
              <Text style={s.shopName}>{product.shopName}</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
            </TouchableOpacity>
          )}

          {/* Origin & yards */}
          <View style={s.metaRow}>
            <View style={s.metaChip}>
              <Ionicons name="location-outline" size={12} color={Colors.muted} />
              <Text style={s.metaTxt}>{product.origin}</Text>
            </View>
            <View style={s.metaChip}>
              <Ionicons name="resize-outline" size={12} color={Colors.muted} />
              <Text style={s.metaTxt}>{product.yards} per bundle</Text>
            </View>
          </View>

          {/* Price */}
          <View style={s.priceBlock}>
            <Text style={s.price}>₦{Number(product.price).toLocaleString()}</Text>
            <Text style={s.originalPrice}>₦{Number(product.original).toLocaleString()}</Text>
            <View style={s.discountPill}>
              <Text style={s.discountTxt}>{Math.round((1 - product.price/product.original)*100)}% OFF</Text>
            </View>
          </View>

          {/* Quantity */}
          <View style={s.qtySection}>
            <Text style={s.qtyLabel}>QUANTITY (BUNDLES)</Text>
            <QtySelector value={qty} onChange={setQty} />
          </View>

          {/* Subtotal */}
          <View style={s.subtotalRow}>
            <Text style={s.subtotalLbl}>Subtotal</Text>
            <Text style={s.subtotalVal}>₦{Number(product.price * qty).toLocaleString()}</Text>
          </View>

          {/* CTA Buttons */}
          <View style={s.ctaRow}>
            <Button title="Add to Cart" variant="outline" style={{ flex:1 }} onPress={handleAddToCart} />
            <Button title="Buy Now" variant="primary" style={{ flex:1 }} onPress={handleBuyNow} />
          </View>

          {/* Delivery info */}
          <View style={s.deliveryCard}>
            <View style={s.deliveryRow}>
              <Ionicons name="car-outline" size={18} color={Colors.primary} />
              <View style={s.deliveryInfo}>
                <Text style={s.deliveryTitle}>Free Delivery within 48 hours</Text>
                <Text style={s.deliverySub}>Available in Kano, Kaduna, Abuja, Lagos & more</Text>
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.deliveryRow}>
              <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
              <View style={s.deliveryInfo}>
                <Text style={s.deliveryTitle}>7-Day Return Policy</Text>
                <Text style={s.deliverySub}>Unused fabric in original bundle only</Text>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={s.tabs}>
            {[['desc','Description'],['details','Details'],['reviews','Reviews']].map(([k,l]) => (
              <TouchableOpacity key={k} style={[s.tab, activeTab===k && s.tabActive]} onPress={() => setActiveTab(k)}>
                <Text style={[s.tabTxt, activeTab===k && s.tabTxtActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'desc' && (
            <Text style={s.description}>{product.description}</Text>
          )}

          {activeTab === 'details' && (
            <View style={s.detailsList}>
              {(product.details||[]).map((d, i) => (
                <View key={i} style={s.detailItem}>
                  <View style={s.detailDot} />
                  <Text style={s.detailTxt}>{d}</Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View>
              {[['Maryam Usman','Great quality fabric, came exactly as described. Very happy!',5],
                ['Ibrahim Danladi','Good material for the price. My tailor loved working with it.',4],
                ['Fatima Al-Hassan','Ordered 2 bundles for Sallah — both perfect. Will order again.',5],
              ].map(([name, review, stars], i) => (
                <View key={i} style={s.reviewItem}>
                  <View style={s.reviewAvatar}>
                    <Text style={s.reviewAvatarTxt}>{name[0]}</Text>
                  </View>
                  <View style={s.reviewContent}>
                    <Text style={s.reviewName}>{name}</Text>
                    <View style={s.reviewStars}>
                      {[1,2,3,4,5].map(s2 => <Ionicons key={s2} name={s2<=stars?'star':'star-outline'} size={11} color="#FDC040" />)}
                    </View>
                    <Text style={s.reviewTxt}>{review}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <View style={s.related}>
            <Text style={s.relatedTitle}>You May Also Like</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:16, gap:10 }}>
              {relatedProducts.map(p => (
                <ProductCard key={p.id} item={p} onPress={() => navigation.push('ProductDetail', { productId: p.id })} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex:1, backgroundColor:Colors.white },
  scroll:       { backgroundColor:'#F5EFE6' },
  nav:          { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:12, paddingVertical:10, backgroundColor:Colors.white },
  navBtn:       { padding:6 },
  navTitle:     { fontSize:16, fontWeight:'800', color:Colors.text, fontFamily:'serif' },
  navRight:     { flexDirection:'row', gap:2 },
  swatchHero:   { position:'relative', height:280 },
  heroOverlay:  { position:'absolute', bottom:0, left:0, right:0, height:100, justifyContent:'flex-end', padding:16 },
  heroBadges:   { flexDirection:'row', gap:8, alignItems:'center' },
  badge:        { paddingHorizontal:10, paddingVertical:4, borderRadius:Radius.full },
  badgeTxt:     { color:'#fff', fontSize:9, fontWeight:'800', letterSpacing:0.5 },
  originBadge:  { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'rgba(28,15,8,0.6)', paddingHorizontal:10, paddingVertical:4, borderRadius:Radius.full },
  originTxt:    { fontSize:11, color:Colors.goldLight, fontWeight:'700' },
  heroDotsOverlay:{ position:'absolute', bottom:10, left:0, right:0, flexDirection:'row', justifyContent:'center', gap:6 },
  heroDot:      { width:6, height:6, borderRadius:3, backgroundColor:Colors.border },
  heroDotActive:{ width:18, backgroundColor:Colors.gold },
  thumbRow:     { paddingHorizontal:16, paddingTop:10, gap:8 },
  thumb:        { width:64, height:64, borderRadius:10, borderWidth:1, borderColor:Colors.border, overflow:'hidden' },
  thumbActive:  { borderColor:Colors.primary, borderWidth:2 },
  thumbImg:     { width:'100%', height:'100%' },
  infoCard:     { backgroundColor:Colors.white, borderTopLeftRadius:24, borderTopRightRadius:24, marginTop:-16, padding:20 },
  ratingRow:    { flexDirection:'row', alignItems:'center', gap:3, marginBottom:8 },
  ratingVal:    { fontSize:13, fontWeight:'700', color:Colors.text, marginLeft:4 },
  ratingCount:  { fontSize:12, color:Colors.muted },
  productName:  { fontSize:22, fontWeight:'900', color:Colors.text, fontFamily:'serif', marginBottom:10, lineHeight:28 },
  shopRow:      { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:Colors.goldBg, borderWidth:1, borderColor:Colors.border, borderRadius:Radius.md, paddingVertical:6, paddingHorizontal:10, alignSelf:'flex-start', marginBottom:12 },
  shopLogo:     { width:22, height:22, borderRadius:6, borderWidth:1, borderColor:Colors.border, backgroundColor:Colors.cream },
  shopName:     { fontSize:11, fontWeight:'700', color:Colors.primary },
  metaRow:      { flexDirection:'row', gap:10, marginBottom:14 },
  metaChip:     { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:Colors.cream, paddingHorizontal:10, paddingVertical:5, borderRadius:Radius.full, borderWidth:1, borderColor:Colors.border },
  metaTxt:      { fontSize:11, color:Colors.muted, fontWeight:'600' },
  priceBlock:   { flexDirection:'row', alignItems:'center', gap:10, marginBottom:18 },
  price:        { fontSize:26, fontWeight:'900', color:Colors.primary },
  originalPrice:{ fontSize:14, color:Colors.muted, textDecorationLine:'line-through' },
  discountPill: { backgroundColor:Colors.goldBg, borderRadius:Radius.full, paddingHorizontal:9, paddingVertical:4, borderWidth:1, borderColor:Colors.gold },
  discountTxt:  { fontSize:11, fontWeight:'800', color:Colors.gold },
  qtySection:   { marginBottom:14 },
  qtyLabel:     { fontSize:10, fontWeight:'800', color:Colors.muted, letterSpacing:0.8, marginBottom:8 },
  subtotalRow:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16, paddingVertical:12, borderTopWidth:1, borderTopColor:Colors.border },
  subtotalLbl:  { fontSize:13, color:Colors.muted, fontWeight:'600' },
  subtotalVal:  { fontSize:18, fontWeight:'900', color:Colors.text },
  ctaRow:       { flexDirection:'row', gap:10, marginBottom:16 },
  deliveryCard: { backgroundColor:Colors.cream, borderRadius:Radius.md, padding:14, borderWidth:1, borderColor:Colors.border, marginBottom:20, gap:12 },
  deliveryRow:  { flexDirection:'row', alignItems:'flex-start', gap:12 },
  deliveryInfo: { flex:1 },
  deliveryTitle:{ fontSize:13, fontWeight:'700', color:Colors.text, marginBottom:2 },
  deliverySub:  { fontSize:11, color:Colors.muted },
  divider:      { height:1, backgroundColor:Colors.border },
  tabs:         { flexDirection:'row', borderBottomWidth:1, borderBottomColor:Colors.border, marginBottom:14 },
  tab:          { flex:1, paddingVertical:12, alignItems:'center' },
  tabActive:    { borderBottomWidth:2, borderBottomColor:Colors.primary },
  tabTxt:       { fontSize:13, fontWeight:'600', color:Colors.muted },
  tabTxtActive: { color:Colors.primary, fontWeight:'800' },
  description:  { fontSize:14, color:Colors.textLight, lineHeight:22, marginBottom:16 },
  detailsList:  { gap:10, marginBottom:16 },
  detailItem:   { flexDirection:'row', alignItems:'flex-start', gap:10 },
  detailDot:    { width:6, height:6, borderRadius:3, backgroundColor:Colors.gold, marginTop:7 },
  detailTxt:    { fontSize:13, color:Colors.textLight, flex:1, lineHeight:20 },
  reviewItem:   { flexDirection:'row', gap:12, marginBottom:16 },
  reviewAvatar: { width:36, height:36, borderRadius:18, backgroundColor:Colors.goldLight, alignItems:'center', justifyContent:'center' },
  reviewAvatarTxt:{ fontSize:15, fontWeight:'900', color:Colors.primary },
  reviewContent:{ flex:1 },
  reviewName:   { fontSize:13, fontWeight:'800', color:Colors.text, marginBottom:3 },
  reviewStars:  { flexDirection:'row', gap:2, marginBottom:4 },
  reviewTxt:    { fontSize:12, color:Colors.textLight, lineHeight:18 },
  related:      { backgroundColor:Colors.white, paddingVertical:20 },
  relatedTitle: { fontSize:16, fontWeight:'800', color:Colors.text, fontFamily:'serif', paddingHorizontal:16, marginBottom:12 },
});

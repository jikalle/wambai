import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Shadow } from '../theme';
import { FabricSwatch, SectionHeader } from '../components';
import { BRANDS, CATEGORIES, PRODUCTS } from '../data';
import { useCart } from '../context/CartContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const APP = { name: 'Arewa Drape', tagline: 'Premium Northern Fabrics' };
const { width: W } = Dimensions.get('window');

const FEATURED = [
  { id: 'f1', name: 'Grand Occasion Aso-Oke',    price: 32000, original: 38000, swatch: 'asooke',    desc: 'Triple-layered hand-woven aso-oke. Perfect for traditional weddings and naming ceremonies.' },
  { id: 'f2', name: 'Royal Shadda Damask',       price: 14500, original: 17000, swatch: 'shadda',    desc: 'Shimmering Shadda with silver thread weave. A Hausa classic for Sallah and festive wear.' },
  { id: 'f3', name: 'Premium Swiss Voile',       price: 19500, original: 23000, swatch: 'lace',      desc: 'Ultra-fine Swiss voile with floral lace overlay. Delicate, airy and breathtaking.' },
  { id: 'f4', name: 'Ankara Ceremonial Print',   price: 7800,  original: 9200,  swatch: 'ankara',    desc: 'Bold geometric wax print in earthy tones. Ideal for kaftan and babban riga tailoring.' },
  { id: 'f5', name: 'Brocade Ceremonial Fabric', price: 16000, original: 19500, swatch: 'brocade',   desc: 'Rich forest green brocade with golden thread. Worn at chieftaincy and special occasions.' },
  { id: 'f6', name: 'Indigo Adire Classic',      price: 5500,  original: 6800,  swatch: 'adire',     desc: 'Authentic hand-crafted adire from Katsina. Each piece is unique, no two are the same.' },
];

const BLOGS = [
  { id: 'b1', title: 'How to Choose the Right Fabric for Your Babban Riga', date: 'Jan 14, 2025', swatch: 'shadda' },
  { id: 'b2', title: 'The History of Aso-Oke Weaving in Northern Nigeria',  date: 'Feb 02, 2025', swatch: 'asooke' },
  { id: 'b3', title: '5 Trending Ankara Patterns for Wedding Season 2025',  date: 'Mar 05, 2025', swatch: 'ankara' },
];

const FEATURES = [
  { icon: '🏺', title: '100% Authentic',  desc: 'Sourced directly from master weavers' },
  { icon: '📏', title: 'Custom Lengths',  desc: 'Order exact yards you need' },
  { icon: '🚚', title: 'Fast Delivery',   desc: 'Kano · Kaduna · Abuja · Lagos' },
  { icon: '🔒', title: 'Secure Payment', desc: 'Pay with card, transfer or USSD' },
];

const BANNERS = [
  {
    colors: ['#2A1A0E', '#6B1F1F', '#C9922A'],
    title: 'Premium Fabrics\nFor Every Occasion',
    sub: 'Hand-woven Aso-Oke, Damask, Ankara & more. Delivered across Nigeria.',
    btn: 'Shop Now',
    btn2: 'View Deals',
    swatch: 'asooke',
  },
  {
    colors: ['#1E2E6E', '#2A4BBF', '#C9922A'],
    title: 'Sallah Collection\n2025 is Here',
    sub: 'Special prices on Guinea Brocade, Lace and Shadda for the season.',
    btn: 'Shop Sallah',
    btn2: 'Get Offer',
    swatch: 'guinea',
  },
];

const fmt = n => `₦${Number(n).toLocaleString()}`;

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
});

const HScroll = ({ children, contentStyle }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={[s.hScroll, contentStyle]}
  >
    {children}
  </ScrollView>
);

function PCard({ item, onPress }) {
  const { items, addItem, updateQty } = useCart();
  const current = items.find(i => i.id === item.id);
  const qty = current?.qty || 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[s.pCard, Shadow.sm]}>
      <View style={{ position: 'relative' }}>
        {item.badge && (
          <View style={[s.pBadge, { backgroundColor: item.badge === 'sale' ? Colors.sale : Colors.new_ }]}>
            <Text style={s.pBadgeTxt}>{item.badge === 'sale' ? 'SALE' : 'NEW'}</Text>
          </View>
        )}
        {item.image
          ? <Image source={{ uri: item.image }} style={{ width: 155, height: 105 }} resizeMode="cover" />
          : <FabricSwatch swatchKey={item.swatch} width={155} height={105} />
        }
        <View style={s.originPill}>
          <Text style={s.originTxt}>{item.origin}</Text>
        </View>
      </View>
      <View style={s.pInfo}>
        <Text style={s.pName} numberOfLines={2}>{item.name}</Text>
        <Text style={s.pYards}>{item.yards} per bundle</Text>
        <View style={s.priceRow}>
          <Text style={s.price}>{fmt(item.price)}</Text>
          <Text style={s.orig}>{fmt(item.original)}</Text>
        </View>
        {qty === 0 ? (
          <TouchableOpacity onPress={() => addItem(item, 1)} style={s.addBtn}>
            <Text style={s.addBtnTxt}>+ Add to Cart</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.qtyRow}>
            <TouchableOpacity onPress={() => updateQty(item.id, Math.max(0, qty - 1))} style={s.qtyBtn}>
              <Text style={s.qtyBtnTxt}>−</Text>
            </TouchableOpacity>
            <Text style={s.qtyVal}>{qty}</Text>
            <TouchableOpacity onPress={() => updateQty(item.id, qty + 1)} style={s.qtyBtn}>
              <Text style={s.qtyBtnTxt}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function Hero() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % BANNERS.length), 4000);
    return () => clearInterval(t);
  }, []);
  const b = BANNERS[active];

  return (
    <View style={s.heroWrap}>
      <LinearGradient colors={b.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroCard}>
        <View style={s.heroInner}>
          <View style={s.heroOverlayCircleLg} />
          <View style={s.heroOverlayCircleSm} />
          <View style={{ flex: 1, zIndex: 1 }}>
            <View style={s.heroPill}>
              <Text style={s.heroPillTxt}>🧵 {APP.tagline}</Text>
            </View>
            <Text style={s.heroTitle}>{b.title}</Text>
            <Text style={s.heroSub}>{b.sub}</Text>
            <View style={s.heroBtnRow}>
              <TouchableOpacity style={s.heroBtnPrimary}>
                <Text style={s.heroBtnPrimaryTxt}>{b.btn}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.heroBtnGhost}>
                <Text style={s.heroBtnGhostTxt}>{b.btn2}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={s.heroSwatch}>
            <FabricSwatch swatchKey={b.swatch} width={85} height={110} borderRadius={10} />
          </View>
        </View>
      </LinearGradient>
      <View style={s.heroDots}>
        {BANNERS.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => setActive(i)} style={[s.heroDot, i === active && s.heroDotActive]} />
        ))}
      </View>
    </View>
  );
}

function PromoBanner() {
  return (
    <View style={s.promoWrap}>
      <LinearGradient colors={[Colors.indigo, '#2A4BBF', Colors.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.promo}>
        <View style={s.promoInner}>
          <Text style={s.promoLabel}>🎊 Sallah Special</Text>
          <Text style={s.promoTitle}>Up to 40% Off Festival Fabrics</Text>
          <TouchableOpacity style={s.promoBtn}>
            <Text style={s.promoBtnTxt}>Shop Deals →</Text>
          </TouchableOpacity>
        </View>
        <View style={s.promoSwatch}>
          <FabricSwatch swatchKey="asooke" width={120} height={130} />
        </View>
      </LinearGradient>
    </View>
  );
}

function FeaturedSection() {
  return (
    <View>
      <SectionHeader title="Featured Collections" onMore={() => {}} />
      <HScroll>
        {FEATURED.map(item => (
          <View key={item.id} style={[s.featureCard, Shadow.sm]}>
            <View style={{ position: 'relative' }}>
              <FabricSwatch swatchKey={item.swatch} width={190} height={115} />
              <View style={s.featureBadge}>
                <Text style={s.featureBadgeTxt}>FEATURED</Text>
              </View>
            </View>
            <View style={s.featureInfo}>
              <Text style={s.featureName} numberOfLines={2}>{item.name}</Text>
              <View style={s.priceRow}>
                <Text style={s.price}>{fmt(item.price)}</Text>
                <Text style={s.orig}>{fmt(item.original)}</Text>
              </View>
              <Text style={s.featureDesc} numberOfLines={3}>{item.desc}</Text>
              <TouchableOpacity style={s.featureBtn}>
                <Text style={s.featureBtnTxt}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </HScroll>
    </View>
  );
}

function Countdown() {
  const [secs, setSecs] = useState(2 * 3600 + 18 * 60 + 44);
  useEffect(() => {
    const t = setInterval(() => setSecs(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const sVal = String(secs % 60).padStart(2, '0');

  const Block = ({ v, l }) => (
    <View style={s.countBlock}>
      <Text style={s.countVal}>{v}</Text>
      <Text style={s.countLabel}>{l}</Text>
    </View>
  );

  return (
    <LinearGradient colors={[Colors.primary, '#9B2E2E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.countWrap}>
      <View style={s.countOverlay} />
      <View style={{ flex: 1, zIndex: 1 }}>
        <View style={s.countBadge}>
          <Text style={s.countBadgeTxt}>30%</Text>
          <Text style={s.countBadgeSub}>OFF</Text>
        </View>
        <Text style={s.countTitle}>Flash Sale on Aso-Oke & Damask</Text>
        <Text style={s.countSub}>Limited bundles available</Text>
        <View style={s.countRow}>
          <Block v="00" l="DAYS" />
          <Block v={h} l="HRS" />
          <Block v={m} l="MIN" />
          <Block v={sVal} l="SEC" />
        </View>
        <TouchableOpacity style={s.countBtn}>
          <Text style={s.countBtnTxt}>Shop Flash Sale →</Text>
        </TouchableOpacity>
      </View>
      <View style={s.countSwatch}>
        <FabricSwatch swatchKey="damask" width={80} height={100} borderRadius={10} />
      </View>
    </LinearGradient>
  );
}

function FabricTabs({ onSelectProduct, products }) {
  const [active, setActive] = useState('trending');
  const tabs = [['trending', 'Trending'], ['wedding', 'Wedding'], ['sallah', 'Sallah']];
  const list = useMemo(() => {
    const base = products || [];
    if (active === 'wedding') return base.slice(3, 6);
    if (active === 'sallah') return base.slice(6, 9);
    return base.slice(0, 3);
  }, [active, products]);

  return (
    <View>
      <SectionHeader title="Browse by Occasion" />
      <View style={s.tabs}>
        {tabs.map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => setActive(k)} style={[s.tab, active === k && s.tabActive]}>
            <Text style={[s.tabTxt, active === k && s.tabTxtActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <HScroll>{list.map(p => <PCard key={p.id} item={p} onPress={() => onSelectProduct?.(p.id)} />)}</HScroll>
    </View>
  );
}

function Brands() {
  const cardW = (W - 16 * 2 - 9) / 2;
  return (
    <View>
      <SectionHeader title="Trusted Merchants" onMore={() => {}} />
      <View style={s.brandGrid}>
        {BRANDS.map(b => (
          <View key={b.id} style={[s.brandCard, { width: cardW }, Shadow.sm]}>
            <View style={s.brandSwatch}>
              <FabricSwatch swatchKey={b.swatch} width={44} height={44} borderRadius={8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.brandName} numberOfLines={1}>{b.name}</Text>
              <Text style={s.brandMeta}>📍 {b.location} · {b.items} items</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function BlogSection() {
  return (
    <View>
      <SectionHeader title="Fabric & Style Tips" onMore={() => {}} />
      <HScroll>
        {BLOGS.map(b => (
          <View key={b.id} style={[s.blogCard, Shadow.sm]}>
            <FabricSwatch swatchKey={b.swatch} width={200} height={90} />
            <View style={s.blogInfo}>
              <Text style={s.blogMeta}>✍️ Editor · 📅 {b.date}</Text>
              <Text style={s.blogTitle} numberOfLines={2}>{b.title}</Text>
              <TouchableOpacity>
                <Text style={s.blogLink}>Read More →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </HScroll>
    </View>
  );
}

function Newsletter() {
  const [email, setEmail] = useState('');
  return (
    <LinearGradient colors={[Colors.text, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.newsWrap}>
      <View style={s.newsGlow} />
      <Text style={s.newsTitle}>Join the Arewa Circle</Text>
      <Text style={s.newsSub}>Get early access to new collections & exclusive deals</Text>
      <View style={s.newsRow}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Your email address..."
          placeholderTextColor="rgba(255,253,248,0.6)"
          style={s.newsInput}
        />
        <TouchableOpacity style={s.newsBtn}>
          <Text style={s.newsBtnTxt}>Subscribe</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function FeaturesStrip() {
  const cardW = (W - 16 * 2 - 9) / 2;
  return (
    <View style={s.featuresGrid}>
      {FEATURES.map(f => (
        <View key={f.title} style={[s.featureStripCard, { width: cardW }, Shadow.sm]}>
          <Text style={s.featureStripIcon}>{f.icon}</Text>
          <Text style={s.featureStripTitle}>{f.title}</Text>
          <Text style={s.featureStripDesc}>{f.desc}</Text>
        </View>
      ))}
    </View>
  );
}

function Footer() {
  return (
    <View style={s.footer}>
      <Text style={s.footerBrand}>🧵 {APP.name}</Text>
      <Text style={s.footerSub}>Northern Nigeria's Fabric Marketplace</Text>
      <View style={s.footerLinks}>
        {['My Orders', 'Wishlist', 'Tailor Finder', 'About Us', 'Contact'].map(l => (
          <TouchableOpacity key={l} style={s.footerLinkBtn}>
            <Text style={s.footerLinkTxt}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.footerCities}>
        {['Kano', 'Kaduna', 'Abuja', 'Sokoto', 'Zaria', 'Katsina'].map(c => (
          <Text key={c} style={s.footerCity}>{c}</Text>
        ))}
      </View>
      <Text style={s.footerCopy}>© 2025 Arewa Drape. All rights reserved.</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [remoteProducts, setRemoteProducts] = useState([]);

  const loadProducts = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images ( url, sort_order )')
      .or('status.eq.published,status.is.null')
      .order('created_at', { ascending: false })
      .order('sort_order', { foreignTable: 'product_images', ascending: true });
    if (error) return;
    const mapped = (data || []).map(mapProduct).map(p => {
      const raw = data.find(d => d.id === p.id);
      const images = raw?.product_images || [];
      const sorted = [...images].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return { ...p, image: p.image || sorted[0]?.url || null };
    });
    setRemoteProducts(mapped);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  const productList = remoteProducts.length ? remoteProducts : PRODUCTS;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.brand}>🧵 {APP.name}</Text>
            <Text style={s.location}>📍 Kano, Nigeria  ▾</Text>
          </View>
          <View style={s.iconRow}>
            {[
              { icon: '♡', count: '5' },
              { icon: '🛒', count: '3' },
            ].map(({ icon, count }) => (
              <TouchableOpacity key={icon} style={s.iconBtn}>
                <Text style={s.iconEmoji}>{icon}</Text>
                <View style={s.iconBadge}>
                  <Text style={s.iconBadgeTxt}>{count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.searchBox}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search fabrics, materials..."
            placeholderTextColor={Colors.muted}
            style={s.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => navigation.navigate('Browse', { query: search })}
          />
          <TouchableOpacity style={s.searchBtn} onPress={() => navigation.navigate('Browse', { query: search })}>
            <Text style={s.searchBtnTxt}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      <LinearGradient colors={[Colors.primary, Colors.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.announce}>
        <Text style={s.announceTxt}>🎊 Sallah Sale: Up to 40% off — Order before Friday for guaranteed delivery</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Hero />

        <SectionHeader title="Browse by Fabric" onMore={() => navigation.navigate('Browse')} />
        <HScroll>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.id}
              onPress={() => navigation.navigate('Browse', { category: c.key })}
              style={s.categoryItem}
            >
              <View style={[s.categoryCircle, { borderColor: Colors.border }]}>
                <FabricSwatch swatchKey={c.key} width={58} height={58} borderRadius={29} />
              </View>
              <Text style={s.categoryLabel}>{c.label}</Text>
              <Text style={s.categoryCount}>{c.count} items</Text>
            </TouchableOpacity>
          ))}
        </HScroll>

        <SectionHeader title="New In — Hot Fabrics" onMore={() => navigation.navigate('Browse')} />
        <HScroll>
          {productList.map(p => (
            <PCard key={p.id} item={p} onPress={() => navigation.navigate('ProductDetail', { productId: p.id })} />
          ))}
        </HScroll>

        <PromoBanner />
        <FeaturedSection />
        <Countdown />

        <SectionHeader title="Best Sellers This Week" onMore={() => navigation.navigate('Browse')} />
        <HScroll>
          {productList.map(p => (
            <PCard key={p.id} item={p} onPress={() => navigation.navigate('ProductDetail', { productId: p.id })} />
          ))}
        </HScroll>

        <View style={s.doublePromo}>
          {[
            { sw: 'asooke', label: 'Wedding Collection', sub: 'From ₦18,500' },
            { sw: 'ankara', label: 'Everyday Ankara', sub: 'From ₦3,800' },
          ].map(p => (
            <View key={p.label} style={s.doubleCard}>
              <FabricSwatch swatchKey={p.sw} width={(W - 16 * 2 - 9) / 2} height={105} />
              <View style={s.doubleOverlay}>
                <Text style={s.doubleTitle}>{p.label}</Text>
                <Text style={s.doubleSub}>{p.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <FabricTabs
          products={productList}
          onSelectProduct={(id) => navigation.navigate('ProductDetail', { productId: id })}
        />
        <Brands />
        <BlogSection />
        <Newsletter />
        <FeaturesStrip />
        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  brand: { fontSize: 16, fontWeight: '900', color: Colors.primary, fontFamily: 'serif', letterSpacing: 0.4 },
  location: { fontSize: 9, color: Colors.muted, marginTop: 2 },
  iconRow: { flexDirection: 'row', gap: 6 },
  iconBtn: { position: 'relative', paddingHorizontal: 6, paddingVertical: 4 },
  iconEmoji: { fontSize: 20 },
  iconBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 3, paddingVertical: 1 },
  iconBadgeTxt: { color: Colors.white, fontSize: 7, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cream, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 10, gap: 7 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 12, color: Colors.text, paddingVertical: 8 },
  searchBtn: { backgroundColor: Colors.primary, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  searchBtnTxt: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  announce: { paddingVertical: 6, paddingHorizontal: 16 },
  announceTxt: { color: Colors.white, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  scroll: { paddingBottom: 24 },

  heroWrap: { paddingHorizontal: 16, paddingTop: 14 },
  heroCard: { borderRadius: Radius.lg, overflow: 'hidden' },
  heroInner: { padding: 18, flexDirection: 'row', alignItems: 'center', minHeight: 170 },
  heroOverlayCircleLg: { position: 'absolute', right: -20, top: -20, width: 160, height: 160, backgroundColor: 'rgba(201,146,42,0.08)', borderRadius: 80 },
  heroOverlayCircleSm: { position: 'absolute', right: 20, bottom: -30, width: 100, height: 100, backgroundColor: 'rgba(255,253,248,0.05)', borderRadius: 50 },
  heroPill: { backgroundColor: 'rgba(201,146,42,0.25)', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(201,146,42,0.4)', alignSelf: 'flex-start' },
  heroPillTxt: { fontSize: 11, fontWeight: '700', color: Colors.goldLight },
  heroTitle: { fontSize: 18, fontWeight: '900', color: Colors.white, marginTop: 8, marginBottom: 6, lineHeight: 24, fontFamily: 'serif' },
  heroSub: { fontSize: 11, color: 'rgba(255,253,248,0.75)', marginBottom: 14, lineHeight: 16 },
  heroBtnRow: { flexDirection: 'row', gap: 9 },
  heroBtnPrimary: { backgroundColor: Colors.gold, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 14 },
  heroBtnPrimaryTxt: { color: Colors.white, fontSize: 12, fontWeight: '800' },
  heroBtnGhost: { borderRadius: 9, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1.5, borderColor: 'rgba(255,253,248,0.5)' },
  heroBtnGhostTxt: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  heroSwatch: { width: 85, height: 110, borderRadius: 12, overflow: 'hidden', marginLeft: 12, borderWidth: 2, borderColor: 'rgba(201,146,42,0.5)' },
  heroDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  heroDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.border },
  heroDotActive: { width: 20, backgroundColor: Colors.gold },

  hScroll: { paddingHorizontal: 16, paddingBottom: 4 },
  categoryItem: { alignItems: 'center', marginRight: 10, minWidth: 68 },
  categoryCircle: { width: 58, height: 58, borderRadius: 29, overflow: 'hidden', borderWidth: 2 },
  categoryLabel: { fontSize: 10, fontWeight: '800', color: Colors.text, marginTop: 5 },
  categoryCount: { fontSize: 9, color: Colors.muted },

  pCard: { backgroundColor: Colors.white, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, marginRight: 10 },
  pBadge: { position: 'absolute', top: 8, left: 8, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 2, zIndex: 2 },
  pBadgeTxt: { color: Colors.white, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  originPill: { position: 'absolute', bottom: 7, right: 8, backgroundColor: 'rgba(255,253,248,0.92)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  originTxt: { fontSize: 9, color: Colors.muted, fontWeight: '600' },
  pInfo: { padding: 10 },
  pName: { fontSize: 12, fontWeight: '800', color: Colors.text, marginBottom: 2, lineHeight: 16, fontFamily: 'serif' },
  pYards: { fontSize: 10, color: Colors.muted, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginBottom: 8 },
  price: { fontSize: 14, fontWeight: '800', color: Colors.primary },
  orig: { fontSize: 10, color: Colors.muted, textDecorationLine: 'line-through' },
  addBtn: { backgroundColor: Colors.goldLight, borderWidth: 1, borderColor: Colors.gold, borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  addBtnTxt: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.goldLight, borderRadius: 8, borderWidth: 1, borderColor: Colors.gold, overflow: 'hidden' },
  qtyBtn: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  qtyBtnTxt: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  qtyVal: { minWidth: 26, textAlign: 'center', fontSize: 13, fontWeight: '800', color: Colors.text },

  promoWrap: { marginTop: 18, marginHorizontal: 16 },
  promo: { borderRadius: Radius.lg, overflow: 'hidden', height: 130 },
  promoInner: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 18, justifyContent: 'center' },
  promoLabel: { color: 'rgba(201,146,42,0.9)', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  promoTitle: { color: Colors.white, fontSize: 18, fontWeight: '900', marginBottom: 10, fontFamily: 'serif' },
  promoBtn: { backgroundColor: Colors.gold, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14, alignSelf: 'flex-start' },
  promoBtnTxt: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  promoSwatch: { position: 'absolute', right: -10, top: 0, bottom: 0, width: 120, opacity: 0.18 },

  featureCard: { width: 190, backgroundColor: Colors.white, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, marginRight: 10 },
  featureBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 2 },
  featureBadgeTxt: { color: Colors.white, fontSize: 9, fontWeight: '700' },
  featureInfo: { padding: 12 },
  featureName: { fontWeight: '800', fontSize: 12, color: Colors.text, marginBottom: 4, lineHeight: 16, fontFamily: 'serif' },
  featureDesc: { fontSize: 10, color: Colors.muted, marginBottom: 10, lineHeight: 14 },
  featureBtn: { width: '100%', backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  featureBtnTxt: { color: Colors.white, fontSize: 11, fontWeight: '700' },

  countWrap: { marginTop: 18, marginHorizontal: 16, borderRadius: Radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' },
  countOverlay: { position: 'absolute', right: -20, top: -20, width: 130, height: 130, backgroundColor: 'rgba(201,146,42,0.12)', borderRadius: 65 },
  countBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  countBadgeTxt: { fontSize: 13, fontWeight: '900', color: Colors.white, lineHeight: 16 },
  countBadgeSub: { fontSize: 8, fontWeight: '700', color: Colors.white },
  countTitle: { fontSize: 13, fontWeight: '800', color: Colors.white, marginBottom: 3, fontFamily: 'serif' },
  countSub: { fontSize: 10, color: 'rgba(255,253,248,0.7)', marginBottom: 12 },
  countRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  countBlock: { backgroundColor: 'rgba(255,253,248,0.15)', borderRadius: 9, paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center', minWidth: 38 },
  countVal: { fontSize: 18, fontWeight: '900', color: Colors.white, lineHeight: 20, fontFamily: 'serif' },
  countLabel: { fontSize: 7, color: 'rgba(255,253,248,0.65)', fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
  countBtn: { backgroundColor: Colors.gold, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 15, alignSelf: 'flex-start' },
  countBtnTxt: { color: Colors.white, fontSize: 12, fontWeight: '800' },
  countSwatch: { width: 80, height: 100, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(201,146,42,0.5)' },

  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.cream, borderRadius: 10, padding: 4, gap: 3 },
  tab: { flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabTxt: { fontSize: 10, fontWeight: '700', color: Colors.muted },
  tabTxtActive: { color: Colors.white },

  brandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: 16 },
  brandCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10 },
  brandSwatch: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  brandName: { fontSize: 11, fontWeight: '800', color: Colors.text, fontFamily: 'serif' },
  brandMeta: { fontSize: 9, color: Colors.muted, marginTop: 2 },

  blogCard: { width: 200, backgroundColor: Colors.white, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, marginRight: 10 },
  blogInfo: { padding: 12 },
  blogMeta: { fontSize: 9, color: Colors.muted, marginBottom: 5 },
  blogTitle: { fontSize: 11, fontWeight: '700', color: Colors.text, marginBottom: 8, lineHeight: 14, fontFamily: 'serif' },
  blogLink: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  newsWrap: { marginTop: 18, marginHorizontal: 16, borderRadius: Radius.lg, padding: 18, overflow: 'hidden' },
  newsGlow: { position: 'absolute', right: -30, top: -30, width: 140, height: 140, backgroundColor: 'rgba(201,146,42,0.1)', borderRadius: 70 },
  newsTitle: { fontSize: 16, fontWeight: '800', color: Colors.white, marginBottom: 3, fontFamily: 'serif' },
  newsSub: { fontSize: 11, color: 'rgba(255,253,248,0.75)', marginBottom: 14 },
  newsRow: { flexDirection: 'row', gap: 8 },
  newsInput: { flex: 1, backgroundColor: 'rgba(255,253,248,0.15)', borderWidth: 1, borderColor: 'rgba(255,253,248,0.3)', borderRadius: 9, paddingVertical: 9, paddingHorizontal: 12, fontSize: 12, color: Colors.white },
  newsBtn: { backgroundColor: Colors.gold, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 13 },
  newsBtnTxt: { color: Colors.white, fontSize: 11, fontWeight: '800' },

  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: 16, paddingTop: 18 },
  featureStripCard: { backgroundColor: Colors.white, borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  featureStripIcon: { fontSize: 24, marginBottom: 6 },
  featureStripTitle: { fontSize: 11, fontWeight: '800', color: Colors.text, marginBottom: 2, fontFamily: 'serif', textAlign: 'center' },
  featureStripDesc: { fontSize: 9, color: Colors.muted, textAlign: 'center' },

  footer: { backgroundColor: Colors.dark, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 16, marginTop: 18, alignItems: 'center' },
  footerBrand: { fontSize: 20, fontWeight: '900', color: Colors.gold, marginBottom: 2, fontFamily: 'serif', letterSpacing: 1 },
  footerSub: { fontSize: 10, color: 'rgba(250,243,232,0.4)', marginBottom: 14 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 12 },
  footerLinkBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  footerLinkTxt: { fontSize: 10, color: 'rgba(250,243,232,0.45)' },
  footerCities: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 12 },
  footerCity: { fontSize: 9, color: 'rgba(201,146,42,0.6)' },
  footerCopy: { fontSize: 9, color: 'rgba(250,243,232,0.2)' },

  doublePromo: { flexDirection: 'row', gap: 9, marginTop: 18, marginHorizontal: 16 },
  doubleCard: { flex: 1, height: 105, borderRadius: Radius.md, overflow: 'hidden' },
  doubleOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'flex-end', padding: 9 },
  doubleTitle: { color: Colors.white, fontWeight: '800', fontSize: 11, fontFamily: 'serif' },
  doubleSub: { color: Colors.goldLight, fontSize: 9, fontWeight: '700' },
});

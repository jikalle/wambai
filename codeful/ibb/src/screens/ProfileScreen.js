import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { FabricSwatch, StatusBadge } from '../components';
import { ORDERS, USER } from '../data';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function ProfileScreen({ navigation }) {
  const { user, profile, setIsGuest, isGuest } = useAuth();
  const [activeSection, setActiveSection] = useState('orders'); // 'orders' | 'saved' | 'settings'
  const [orders, setOrders] = useState(ORDERS);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const role = profile?.role || user?.user_metadata?.role || 'customer';
  const canInvite = role === 'admin' || role === 'merchant';

  useEffect(() => {
    const loadOrders = async () => {
      if (!supabase || !user) return;
      setOrdersLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, payment_status, total, created_at, order_items(qty, price, total, product:products(name, swatch))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        const mapped = data.map(o => ({
          id: o.id,
          date: new Date(o.created_at).toLocaleDateString(),
          status: o.status,
          payment_status: o.payment_status,
          total: o.total || 0,
          items: (o.order_items || []).reduce((s, i) => s + (i.qty || 0), 0),
          products: (o.order_items || []).map(oi => ({
            name: oi.product?.name || 'Item',
            qty: oi.qty || 1,
            price: oi.price || 0,
            swatch: oi.product?.swatch || 'ankara',
          })),
        }));
        setOrders(mapped);
      }
      setOrdersLoading(false);
    };
    loadOrders();
  }, [user]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        if (isGuest) {
          setIsGuest(false);
          return;
        }
        await supabase?.auth?.signOut?.();
      }},
    ]);
  };

  const displayName = profile?.name || user?.user_metadata?.name || USER.name;
  const displayEmail = user?.email || USER.email;
  const displayPhone = profile?.phone || user?.user_metadata?.phone || USER.phone;
  const displayLocation = profile?.location || USER.location;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <LinearGradient colors={[Colors.primary, '#9B2E2E']} style={s.profileHeader}>
          {/* Decorative circles */}
          <View style={s.circle1} />
          <View style={s.circle2} />

          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{displayName?.charAt(0) || 'A'}</Text>
            </View>
            <TouchableOpacity style={s.avatarEdit}>
              <Ionicons name="camera" size={14} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <Text style={s.userName}>{displayName}</Text>
          <Text style={s.userEmail}>{displayEmail}</Text>
          <Text style={s.userSince}>📍 {displayLocation} · Member since {USER.since}</Text>

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statVal}>{USER.totalOrders}</Text>
              <Text style={s.statLbl}>Orders</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statVal}>₦{(USER.totalSpent/1000).toFixed(0)}K</Text>
              <Text style={s.statLbl}>Spent</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statVal}>12</Text>
              <Text style={s.statLbl}>Saved</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={s.quickActions}>
          {[
            { icon:'bag-outline',      label:'My Orders',    onPress: () => setActiveSection('orders')   },
            { icon:'heart-outline',    label:'Saved Items',  onPress: () => setActiveSection('saved')    },
            { icon:'location-outline', label:'Addresses',    onPress: () => {}                           },
            { icon:'card-outline',     label:'Payments',     onPress: () => navigation.navigate('Payments') },
          ].map(a => (
            <TouchableOpacity key={a.label} style={s.quickAction} onPress={a.onPress}>
              <View style={s.quickIcon}>
                <Ionicons name={a.icon} size={22} color={Colors.primary} />
              </View>
              <Text style={s.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section Tabs */}
        <View style={s.sectionTabs}>
          {[['orders','My Orders'],['saved','Saved'],['settings','Settings']].map(([k,l]) => (
            <TouchableOpacity key={k} onPress={() => setActiveSection(k)} style={[s.sectionTab, activeSection===k&&s.sectionTabActive]}>
              <Text style={[s.sectionTabTxt, activeSection===k&&s.sectionTabTxtActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ORDERS */}
        {activeSection === 'orders' && (
          <View style={s.sectionBody}>
            <Text style={s.sectionTitle}>Order History</Text>
            {ordersLoading && <Text style={s.sectionSub}>Loading…</Text>}
            {!ordersLoading && orders.length === 0 && <Text style={s.sectionSub}>No orders yet.</Text>}
            {!ordersLoading && orders.map(order => (
              <OrderCard key={order.id} order={order} onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })} />
            ))}
          </View>
        )}

        {/* SAVED */}
        {activeSection === 'saved' && (
          <View style={s.sectionBody}>
            <Text style={s.sectionTitle}>Saved Fabrics</Text>
            <View style={s.savedGrid}>
              {['ankara','asooke','damask','guinea','lace','adire'].map((sw, i) => (
                <TouchableOpacity key={sw} style={[s.savedCard, Shadow.sm]} onPress={() => navigation.navigate('HomeTab')}>
                  <FabricSwatch swatchKey={sw} width={(320-12)/3} height={80} borderRadius={Radius.md} />
                  <View style={s.savedInfo}>
                    <Text style={s.savedName} numberOfLines={1}>{['Royal Ankara','Premium Aso-Oke','Deep Red Damask','Guinea Brocade','Swiss Voile Lace','Indigo Adire'][i]}</Text>
                    <Text style={s.savedPrice}>₦{[4500,18500,8200,12000,15000,3800][i].toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity style={s.savedHeart}>
                    <Ionicons name="heart" size={16} color={Colors.sale} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* SETTINGS */}
        {activeSection === 'settings' && (
          <View style={s.sectionBody}>
            <Text style={s.sectionTitle}>Account Settings</Text>

            <SettingsGroup title="Profile">
              <SettingsItem icon="person-outline"     label="Edit Profile"        onPress={() => {}} />
              <SettingsItem icon="call-outline"       label="Phone Number"        value={displayPhone} onPress={() => {}} />
              <SettingsItem icon="location-outline"   label="Delivery Addresses"  onPress={() => {}} />
              <SettingsItem icon="card-outline"       label="Payments"            onPress={() => navigation.navigate('Payments')} />
            </SettingsGroup>

            <SettingsGroup title="Preferences">
              <SettingsItem icon="notifications-outline" label="Push Notifications" toggle value={true} onPress={() => {}} />
              <SettingsItem icon="mail-outline"          label="Email Updates"       toggle value={false} onPress={() => {}} />
              <SettingsItem icon="language-outline"      label="Language"            value="English" onPress={() => {}} />
            </SettingsGroup>

            {canInvite && (
              <SettingsGroup title="Merchant">
                <SettingsItem icon="storefront-outline" label="Merchant Dashboard" onPress={() => navigation.navigate('MerchantDashboard')} />
                <SettingsItem icon="person-add-outline" label="Invite Merchant" onPress={() => navigation.navigate('MerchantInvite')} />
              </SettingsGroup>
            )}

            <SettingsGroup title="Support">
              <SettingsItem icon="help-circle-outline"   label="Help Center"          onPress={() => {}} />
              <SettingsItem icon="chatbubble-outline"    label="Contact Support"      onPress={() => {}} />
              <SettingsItem icon="star-outline"          label="Rate the App"         onPress={() => {}} />
              <SettingsItem icon="share-outline"         label="Share Arewa Drape"    onPress={() => {}} />
            </SettingsGroup>

            <SettingsGroup title="Legal">
              <SettingsItem icon="document-text-outline" label="Privacy Policy"       onPress={() => {}} />
              <SettingsItem icon="shield-outline"        label="Terms of Service"     onPress={() => {}} />
            </SettingsGroup>

            {/* Version */}
            <View style={s.versionRow}>
              <Text style={s.versionTxt}>Arewa Drape v1.0.0</Text>
            </View>

            {/* Logout */}
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color={Colors.sale} />
              <Text style={s.logoutTxt}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order, onPress }) {
  return (
    <TouchableOpacity style={[oc.card, Shadow.sm]} onPress={onPress}>
      <View style={oc.header}>
        <View>
          <Text style={oc.orderId}>{order.id}</Text>
          <Text style={oc.date}>{order.date}</Text>
        </View>
        <View style={oc.right}>
          <StatusBadge status={order.status} />
          <Ionicons name="chevron-forward" size={16} color={Colors.muted} style={{ marginTop:6 }} />
        </View>
      </View>

      <View style={oc.swatchRow}>
        {order.products.map((p, i) => (
          <FabricSwatch key={i} swatchKey={p.swatch} width={36} height={36} borderRadius={Radius.sm} style={{ borderWidth:1.5, borderColor:Colors.white }} />
        ))}
        <Text style={oc.itemCount}>{order.items} item{order.items>1?'s':''}</Text>
        <Text style={oc.total}>₦{Number(order.total).toLocaleString()}</Text>
      </View>

    </TouchableOpacity>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <View style={sg.group}>
      <Text style={sg.title}>{title}</Text>
      <View style={sg.items}>{children}</View>
    </View>
  );
}

function SettingsItem({ icon, label, value, toggle, onPress }) {
  return (
    <TouchableOpacity style={si.row} onPress={onPress}>
      <View style={si.iconWrap}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={si.label}>{label}</Text>
      <View style={si.right}>
        {value && !toggle && <Text style={si.value}>{value}</Text>}
        {toggle && (
          <View style={[si.toggle, value && si.toggleOn]}>
            <View style={[si.toggleDot, value && si.toggleDotOn]} />
          </View>
        )}
        {!toggle && <Ionicons name="chevron-forward" size={14} color={Colors.muted} />}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe:          { flex:1, backgroundColor:Colors.background },
  profileHeader: { padding:24, paddingBottom:28, position:'relative', overflow:'hidden' },
  circle1:       { position:'absolute', right:-40, top:-40, width:180, height:180, backgroundColor:'rgba(201,146,42,0.12)', borderRadius:90 },
  circle2:       { position:'absolute', left:-30, bottom:-50, width:140, height:140, backgroundColor:'rgba(0,0,0,0.1)', borderRadius:70 },
  avatarWrap:    { position:'relative', alignSelf:'center', marginBottom:12 },
  avatar:        { width:88, height:88, borderRadius:44, backgroundColor:'rgba(201,146,42,0.3)', alignItems:'center', justifyContent:'center', borderWidth:3, borderColor:'rgba(255,253,248,0.4)' },
  avatarTxt:     { fontSize:36, fontWeight:'900', color:'#fff', fontFamily:'serif' },
  avatarEdit:    { position:'absolute', bottom:0, right:0, width:28, height:28, borderRadius:14, backgroundColor:Colors.gold, alignItems:'center', justifyContent:'center' },
  userName:      { fontSize:22, fontWeight:'900', color:'#fff', fontFamily:'serif', textAlign:'center', marginBottom:4 },
  userEmail:     { fontSize:13, color:'rgba(255,253,248,0.75)', textAlign:'center', marginBottom:4 },
  userSince:     { fontSize:11, color:'rgba(255,253,248,0.55)', textAlign:'center', marginBottom:18 },
  statsRow:      { flexDirection:'row', backgroundColor:'rgba(255,253,248,0.12)', borderRadius:Radius.md, padding:14 },
  statItem:      { flex:1, alignItems:'center' },
  statVal:       { fontSize:20, fontWeight:'900', color:'#fff', fontFamily:'serif' },
  statLbl:       { fontSize:10, color:'rgba(255,253,248,0.65)', fontWeight:'600', marginTop:2 },
  statDivider:   { width:1, backgroundColor:'rgba(255,253,248,0.2)' },
  quickActions:  { flexDirection:'row', backgroundColor:Colors.white, padding:16, gap:8, borderBottomWidth:1, borderBottomColor:Colors.border },
  quickAction:   { flex:1, alignItems:'center', gap:6 },
  quickIcon:     { width:46, height:46, borderRadius:Radius.md, backgroundColor:Colors.cream, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:Colors.border },
  quickLabel:    { fontSize:10, fontWeight:'700', color:Colors.text, textAlign:'center' },
  sectionTabs:   { flexDirection:'row', backgroundColor:Colors.white, borderBottomWidth:1, borderBottomColor:Colors.border },
  sectionTab:    { flex:1, paddingVertical:13, alignItems:'center' },
  sectionTabActive:{ borderBottomWidth:2, borderBottomColor:Colors.primary },
  sectionTabTxt: { fontSize:13, fontWeight:'600', color:Colors.muted },
  sectionTabTxtActive:{ color:Colors.primary, fontWeight:'800' },
  sectionBody:   { padding:16 },
  sectionTitle:  { fontSize:16, fontWeight:'800', color:Colors.text, fontFamily:'serif', marginBottom:14 },
  sectionSub:    { fontSize:11, color:Colors.muted, marginBottom:10 },
  savedGrid:     { gap:10 },
  savedCard:     { flexDirection:'row', alignItems:'center', backgroundColor:Colors.white, borderRadius:Radius.md, overflow:'hidden', borderWidth:1, borderColor:Colors.border },
  savedInfo:     { flex:1, paddingHorizontal:12 },
  savedName:     { fontSize:13, fontWeight:'800', color:Colors.text, fontFamily:'serif', marginBottom:2 },
  savedPrice:    { fontSize:14, fontWeight:'800', color:Colors.primary },
  savedHeart:    { padding:12 },
  versionRow:    { alignItems:'center', marginTop:16, marginBottom:8 },
  versionTxt:    { fontSize:11, color:Colors.muted },
  logoutBtn:     { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:'#FEF0EE', borderRadius:Radius.md, paddingVertical:14, marginTop:8 },
  logoutTxt:     { fontSize:14, fontWeight:'700', color:Colors.sale },
});

const oc = StyleSheet.create({
  card:        { backgroundColor:Colors.white, borderRadius:Radius.md, padding:14, marginBottom:12, borderWidth:1, borderColor:Colors.border },
  header:      { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 },
  orderId:     { fontSize:14, fontWeight:'800', color:Colors.text, fontFamily:'serif' },
  date:        { fontSize:11, color:Colors.muted, marginTop:2 },
  right:       { alignItems:'flex-end', gap:4 },
  swatchRow:   { flexDirection:'row', alignItems:'center', gap:6 },
  itemCount:   { fontSize:11, color:Colors.muted, flex:1 },
  total:       { fontSize:15, fontWeight:'900', color:Colors.primary },
});

const sg = StyleSheet.create({
  group: { marginBottom:16 },
  title: { fontSize:10, fontWeight:'800', color:Colors.muted, letterSpacing:1, marginBottom:8 },
  items: { backgroundColor:Colors.white, borderRadius:Radius.md, borderWidth:1, borderColor:Colors.border, overflow:'hidden' },
});

const si = StyleSheet.create({
  row:      { flexDirection:'row', alignItems:'center', padding:14, borderBottomWidth:1, borderBottomColor:Colors.borderLight, gap:12 },
  iconWrap: { width:32, height:32, borderRadius:8, backgroundColor:Colors.cream, alignItems:'center', justifyContent:'center' },
  label:    { flex:1, fontSize:14, color:Colors.text, fontWeight:'600' },
  right:    { flexDirection:'row', alignItems:'center', gap:8 },
  value:    { fontSize:12, color:Colors.muted },
  toggle:   { width:40, height:22, borderRadius:11, backgroundColor:Colors.border, justifyContent:'center', paddingHorizontal:2 },
  toggleOn: { backgroundColor:Colors.primary },
  toggleDot:{ width:18, height:18, borderRadius:9, backgroundColor:'#fff' },
  toggleDotOn:{ transform:[{ translateX:18 }] },
});

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { FabricSwatch, Button, QtySelector, EmptyState, Divider } from '../components';
import { useCart } from '../context/CartContext';

const { width: W } = Dimensions.get('window');

const DELIVERY_OPTIONS = [
  { key:'standard', label:'Standard Delivery',  sub:'3–5 business days', price:1500 },
  { key:'express',  label:'Express Delivery',   sub:'1–2 business days', price:3500 },
  { key:'pickup',   label:'Pickup from Store',  sub:'Kano & Kaduna only', price:0   },
];

export default function CartScreen({ navigation }) {
  const { items, removeItem, updateQty, total, clearCart } = useCart();
  const [step, setStep] = useState('cart'); // 'cart' | 'checkout' | 'success'
  const [delivery, setDelivery] = useState('standard');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [form, setForm] = useState({ name:'', phone:'', address:'', city:'' });

  const deliveryPrice = DELIVERY_OPTIONS.find(d => d.key === delivery)?.price || 0;
  const discount = couponApplied ? Math.round(total * 0.1) : 0;
  const grandTotal = total + deliveryPrice - discount;

  const applyCoupon = () => {
    if (coupon.toUpperCase() === 'AREWA10') {
      setCouponApplied(true);
      Alert.alert('Coupon Applied!', '10% discount has been applied to your order.');
    } else {
      Alert.alert('Invalid Coupon', 'Please check the coupon code and try again.');
    }
  };

  const handlePlaceOrder = () => {
    if (!form.name || !form.phone || !form.address || !form.city) {
      Alert.alert('Missing Info', 'Please fill in all delivery details.');
      return;
    }
    clearCart();
    setStep('success');
  };

  if (step === 'success') {
    return <OrderSuccess onContinue={() => { setStep('cart'); navigation.navigate('HomeTab'); }} />;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Nav */}
      <View style={s.nav}>
        {step === 'checkout' ? (
          <TouchableOpacity style={s.navBtn} onPress={() => setStep('cart')}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
        ) : <View style={{ width:34 }} />}
        <Text style={s.navTitle}>{step === 'cart' ? `My Cart (${items.length})` : 'Checkout'}</Text>
        {step === 'cart' && items.length > 0 ? (
          <TouchableOpacity onPress={() => Alert.alert('Clear Cart', 'Remove all items?', [{text:'Cancel'},{text:'Clear',style:'destructive',onPress:clearCart}])}>
            <Text style={s.clearTxt}>Clear</Text>
          </TouchableOpacity>
        ) : <View style={{ width:34 }} />}
      </View>

      {/* Progress */}
      <View style={s.progress}>
        {['cart','checkout','complete'].map((st, i) => (
          <React.Fragment key={st}>
            <View style={[s.progressDot, (step===st||(step==='success'&&i===2)||(step==='checkout'&&i<=1)||(step==='cart'&&i===0)) && s.progressDotActive]}>
              <Text style={[s.progressDotTxt, (step===st) && s.progressDotTxtActive]}>
                {i+1}
              </Text>
            </View>
            {i < 2 && <View style={[s.progressLine, step!=='cart'&&i===0 && s.progressLineActive]} />}
          </React.Fragment>
        ))}
      </View>
      <View style={s.progressLabels}>
        {['Cart','Delivery','Complete'].map(l => (
          <Text key={l} style={s.progressLabel}>{l}</Text>
        ))}
      </View>

      {items.length === 0 && step === 'cart' ? (
        <EmptyState
          emoji="🛒"
          title="Your cart is empty"
          subtitle="Add some beautiful fabrics to get started"
          action="Browse Fabrics"
          onAction={() => navigation.navigate('BrowseTab')}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={s.scroll}>
          {step === 'cart' && (
            <>
              {/* Cart items */}
              <View style={s.section}>
                {items.map(item => (
                  <View key={item.id} style={[s.cartItem, Shadow.sm]}>
                    <FabricSwatch swatchKey={item.swatch} width={80} height={80} borderRadius={Radius.md} />
                    <View style={s.cartInfo}>
                      <Text style={s.cartName} numberOfLines={2}>{item.name}</Text>
                      <Text style={s.cartMeta}>{item.yards} · {item.origin}</Text>
                      <Text style={s.cartPrice}>₦{Number(item.price).toLocaleString()}</Text>
                      <QtySelector value={item.qty} onChange={q => updateQty(item.id, q)} />
                    </View>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => removeItem(item.id)}>
                      <Ionicons name="trash-outline" size={18} color={Colors.sale} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Coupon */}
              <View style={s.couponSection}>
                <Text style={s.sectionTitle}>Coupon Code</Text>
                <View style={s.couponRow}>
                  <TextInput
                    value={coupon}
                    onChangeText={setCoupon}
                    placeholder="Enter coupon code (try AREWA10)"
                    placeholderTextColor={Colors.muted}
                    style={s.couponInput}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity style={s.couponBtn} onPress={applyCoupon} disabled={couponApplied}>
                    <Text style={s.couponBtnTxt}>{couponApplied ? '✓ Applied' : 'Apply'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Order Summary */}
              <View style={s.summarySection}>
                <Text style={s.sectionTitle}>Order Summary</Text>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLbl}>Subtotal ({items.length} items)</Text>
                  <Text style={s.summaryVal}>₦{Number(total).toLocaleString()}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLbl}>Standard Delivery</Text>
                  <Text style={s.summaryVal}>₦{Number(deliveryPrice).toLocaleString()}</Text>
                </View>
                {couponApplied && (
                  <View style={s.summaryRow}>
                    <Text style={[s.summaryLbl, { color:Colors.new_ }]}>Discount (AREWA10)</Text>
                    <Text style={[s.summaryVal, { color:Colors.new_ }]}>−₦{Number(discount).toLocaleString()}</Text>
                  </View>
                )}
                <Divider style={{ marginVertical:10 }} />
                <View style={s.summaryRow}>
                  <Text style={s.totalLbl}>Total</Text>
                  <Text style={s.totalVal}>₦{Number(grandTotal).toLocaleString()}</Text>
                </View>
              </View>
            </>
          )}

          {step === 'checkout' && (
            <>
              {/* Delivery address */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Delivery Details</Text>
                {[
                  { key:'name',    label:'Full Name',        placeholder:'Abubakar Musa',        keyboard:'default'      },
                  { key:'phone',   label:'Phone Number',     placeholder:'08012345678',           keyboard:'phone-pad'    },
                  { key:'address', label:'Delivery Address', placeholder:'12 Bompai Road, Kano',  keyboard:'default'      },
                  { key:'city',    label:'City',             placeholder:'Kano',                  keyboard:'default'      },
                ].map(f => (
                  <View key={f.key} style={s.formGroup}>
                    <Text style={s.formLabel}>{f.label}</Text>
                    <TextInput
                      value={form[f.key]}
                      onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                      placeholder={f.placeholder}
                      placeholderTextColor={Colors.muted}
                      keyboardType={f.keyboard}
                      style={s.formInput}
                    />
                  </View>
                ))}
              </View>

              {/* Delivery options */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Delivery Option</Text>
                {DELIVERY_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt.key} style={[s.deliveryOpt, delivery===opt.key && s.deliveryOptActive]} onPress={() => setDelivery(opt.key)}>
                    <View style={[s.radio, delivery===opt.key && s.radioActive]}>
                      {delivery===opt.key && <View style={s.radioDot} />}
                    </View>
                    <View style={s.deliveryOptInfo}>
                      <Text style={s.deliveryOptLabel}>{opt.label}</Text>
                      <Text style={s.deliveryOptSub}>{opt.sub}</Text>
                    </View>
                    <Text style={s.deliveryOptPrice}>{opt.price===0?'FREE':`₦${opt.price.toLocaleString()}`}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Payment method */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Payment Method</Text>
                {[['paystack','Debit/Credit Card via Paystack','💳'],['transfer','Bank Transfer','🏦'],['ussd','USSD (*737#)','📱']].map(([k,l,ic]) => (
                  <View key={k} style={s.payMethod}>
                    <Text style={s.payIcon}>{ic}</Text>
                    <Text style={s.payLabel}>{l}</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
                  </View>
                ))}
              </View>

              {/* Final summary */}
              <View style={s.summarySection}>
                <Text style={s.sectionTitle}>Order Total</Text>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLbl}>Items ({items.length})</Text>
                  <Text style={s.summaryVal}>₦{Number(total).toLocaleString()}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLbl}>Delivery</Text>
                  <Text style={s.summaryVal}>{deliveryPrice===0?'FREE':`₦${deliveryPrice.toLocaleString()}`}</Text>
                </View>
                {couponApplied && (
                  <View style={s.summaryRow}>
                    <Text style={[s.summaryLbl,{color:Colors.new_}]}>Coupon Discount</Text>
                    <Text style={[s.summaryVal,{color:Colors.new_}]}>−₦{discount.toLocaleString()}</Text>
                  </View>
                )}
                <Divider style={{ marginVertical:10 }} />
                <View style={s.summaryRow}>
                  <Text style={s.totalLbl}>Grand Total</Text>
                  <Text style={s.totalVal}>₦{Number(grandTotal).toLocaleString()}</Text>
                </View>
              </View>
            </>
          )}

          <View style={{ height:100 }} />
        </ScrollView>
      )}

      {/* Bottom CTA */}
      {items.length > 0 && (
        <View style={s.bottomCTA}>
          <View style={s.ctaTotalRow}>
            <Text style={s.ctaTotalLbl}>Total</Text>
            <Text style={s.ctaTotalVal}>₦{Number(grandTotal).toLocaleString()}</Text>
          </View>
          <Button
            title={step === 'cart' ? 'Proceed to Checkout →' : 'Place Order & Pay →'}
            onPress={step === 'cart' ? () => setStep('checkout') : handlePlaceOrder}
            style={s.ctaBtn}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Order Success ─────────────────────────────────────────────────────────────
function OrderSuccess({ onContinue }) {
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:Colors.white }}>
      <View style={os.wrap}>
        <LinearGradient colors={[Colors.primary, '#9B2E2E']} style={os.circle}>
          <Ionicons name="checkmark" size={52} color="#fff" />
        </LinearGradient>
        <Text style={os.title}>Order Placed!</Text>
        <Text style={os.sub}>Your order has been confirmed. You'll receive an SMS on your registered number when it's dispatched.</Text>
        <View style={os.orderRef}>
          <Text style={os.refLbl}>ORDER REFERENCE</Text>
          <Text style={os.refVal}>ORD-{Math.floor(Math.random()*9000)+1000}</Text>
        </View>
        <View style={os.track}>
          {[['Confirmed','✓'],['Processing','●'],['Shipped','○'],['Delivered','○']].map(([l,ic],i) => (
            <View key={l} style={os.trackStep}>
              <View style={[os.trackDot, i<=1&&os.trackDotActive]}><Text style={os.trackDotTxt}>{ic}</Text></View>
              <Text style={[os.trackLbl, i<=1&&os.trackLblActive]}>{l}</Text>
              {i<3 && <View style={[os.trackLine, i===0&&os.trackLineActive]} />}
            </View>
          ))}
        </View>
        <Button title="Continue Shopping" onPress={onContinue} style={os.btn} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex:1, backgroundColor:Colors.white },
  scroll:       { flex:1, backgroundColor:'#F5EFE6' },
  nav:          { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, backgroundColor:Colors.white, borderBottomWidth:1, borderBottomColor:Colors.border },
  navBtn:       { padding:4 },
  navTitle:     { fontSize:17, fontWeight:'800', color:Colors.text, fontFamily:'serif' },
  clearTxt:     { fontSize:13, color:Colors.sale, fontWeight:'700' },
  progress:     { flexDirection:'row', alignItems:'center', justifyContent:'center', paddingHorizontal:60, paddingTop:14, backgroundColor:Colors.white },
  progressDot:  { width:28, height:28, borderRadius:14, backgroundColor:Colors.border, alignItems:'center', justifyContent:'center' },
  progressDotActive:{ backgroundColor:Colors.primary },
  progressDotTxt:{ fontSize:12, fontWeight:'800', color:Colors.white },
  progressDotTxtActive:{ color:Colors.white },
  progressLine: { flex:1, height:2, backgroundColor:Colors.border },
  progressLineActive:{ backgroundColor:Colors.primary },
  progressLabels:{ flexDirection:'row', justifyContent:'space-between', paddingHorizontal:44, paddingBottom:10, backgroundColor:Colors.white },
  progressLabel: { fontSize:10, color:Colors.muted, fontWeight:'600', flex:1, textAlign:'center' },
  section:      { backgroundColor:Colors.white, margin:16, marginBottom:0, borderRadius:Radius.lg, padding:16, borderWidth:1, borderColor:Colors.border },
  sectionTitle: { fontSize:15, fontWeight:'800', color:Colors.text, fontFamily:'serif', marginBottom:14 },
  cartItem:     { flexDirection:'row', gap:12, marginBottom:14, paddingBottom:14, borderBottomWidth:1, borderBottomColor:Colors.border },
  cartInfo:     { flex:1, gap:4 },
  cartName:     { fontSize:13, fontWeight:'800', color:Colors.text, fontFamily:'serif', lineHeight:18 },
  cartMeta:     { fontSize:10, color:Colors.muted },
  cartPrice:    { fontSize:16, fontWeight:'800', color:Colors.primary, marginBottom:6 },
  deleteBtn:    { padding:6 },
  couponSection:{ backgroundColor:Colors.white, margin:16, marginBottom:0, borderRadius:Radius.lg, padding:16, borderWidth:1, borderColor:Colors.border },
  couponRow:    { flexDirection:'row', gap:10 },
  couponInput:  { flex:1, backgroundColor:Colors.cream, borderRadius:Radius.md, borderWidth:1.5, borderColor:Colors.border, paddingHorizontal:12, fontSize:13, color:Colors.text, height:44 },
  couponBtn:    { backgroundColor:Colors.primary, borderRadius:Radius.md, paddingHorizontal:16, justifyContent:'center' },
  couponBtnTxt: { color:'#fff', fontSize:13, fontWeight:'700' },
  summarySection:{ backgroundColor:Colors.white, margin:16, borderRadius:Radius.lg, padding:16, borderWidth:1, borderColor:Colors.border },
  summaryRow:   { flexDirection:'row', justifyContent:'space-between', marginBottom:8 },
  summaryLbl:   { fontSize:13, color:Colors.muted },
  summaryVal:   { fontSize:13, fontWeight:'700', color:Colors.text },
  totalLbl:     { fontSize:15, fontWeight:'800', color:Colors.text, fontFamily:'serif' },
  totalVal:     { fontSize:18, fontWeight:'900', color:Colors.primary },
  formGroup:    { marginBottom:14 },
  formLabel:    { fontSize:11, fontWeight:'700', color:Colors.muted, letterSpacing:0.5, marginBottom:6 },
  formInput:    { backgroundColor:Colors.cream, borderRadius:Radius.md, borderWidth:1.5, borderColor:Colors.border, paddingHorizontal:12, fontSize:14, color:Colors.text, height:46 },
  deliveryOpt:  { flexDirection:'row', alignItems:'center', padding:12, borderRadius:Radius.md, borderWidth:1.5, borderColor:Colors.border, marginBottom:10, gap:12 },
  deliveryOptActive:{ borderColor:Colors.primary, backgroundColor:Colors.cream },
  radio:        { width:20, height:20, borderRadius:10, borderWidth:2, borderColor:Colors.border, alignItems:'center', justifyContent:'center' },
  radioActive:  { borderColor:Colors.primary },
  radioDot:     { width:10, height:10, borderRadius:5, backgroundColor:Colors.primary },
  deliveryOptInfo:{ flex:1 },
  deliveryOptLabel:{ fontSize:13, fontWeight:'700', color:Colors.text },
  deliveryOptSub:{ fontSize:11, color:Colors.muted },
  deliveryOptPrice:{ fontSize:13, fontWeight:'800', color:Colors.primary },
  payMethod:    { flexDirection:'row', alignItems:'center', gap:12, paddingVertical:14, borderBottomWidth:1, borderBottomColor:Colors.border },
  payIcon:      { fontSize:22 },
  payLabel:     { flex:1, fontSize:13, fontWeight:'600', color:Colors.text },
  bottomCTA:    { backgroundColor:Colors.white, padding:16, borderTopWidth:1, borderTopColor:Colors.border, gap:10, ...Shadow.lg },
  ctaTotalRow:  { flexDirection:'row', justifyContent:'space-between' },
  ctaTotalLbl:  { fontSize:13, color:Colors.muted },
  ctaTotalVal:  { fontSize:18, fontWeight:'900', color:Colors.primary },
  ctaBtn:       { borderRadius:Radius.md, paddingVertical:15 },
});

const os = StyleSheet.create({
  wrap:    { flex:1, alignItems:'center', justifyContent:'center', padding:32 },
  circle:  { width:110, height:110, borderRadius:55, alignItems:'center', justifyContent:'center', marginBottom:20 },
  title:   { fontSize:28, fontWeight:'900', color:Colors.text, fontFamily:'serif', marginBottom:10 },
  sub:     { fontSize:14, color:Colors.muted, textAlign:'center', lineHeight:22, marginBottom:24 },
  orderRef:{ backgroundColor:Colors.cream, borderRadius:Radius.md, padding:16, alignItems:'center', marginBottom:24, borderWidth:1, borderColor:Colors.border, width:'100%' },
  refLbl:  { fontSize:10, color:Colors.muted, fontWeight:'700', letterSpacing:1, marginBottom:4 },
  refVal:  { fontSize:22, fontWeight:'900', color:Colors.primary, fontFamily:'serif' },
  track:   { flexDirection:'row', alignItems:'flex-start', marginBottom:32, width:'100%', justifyContent:'center' },
  trackStep:{ alignItems:'center', position:'relative', flex:1 },
  trackDot:{ width:28, height:28, borderRadius:14, backgroundColor:Colors.border, alignItems:'center', justifyContent:'center', marginBottom:4 },
  trackDotActive:{ backgroundColor:Colors.primary },
  trackDotTxt:{ fontSize:10, color:'#fff', fontWeight:'800' },
  trackLbl:{ fontSize:9, color:Colors.muted, textAlign:'center', fontWeight:'600' },
  trackLblActive:{ color:Colors.primary, fontWeight:'800' },
  trackLine:{ position:'absolute', top:14, left:'50%', width:'100%', height:2, backgroundColor:Colors.border, zIndex:-1 },
  trackLineActive:{ backgroundColor:Colors.primary },
  btn:     { width:'100%', paddingVertical:15 },
});

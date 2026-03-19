import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { FabricSwatch, StatusBadge, Divider, Button } from '../components';
import { supabase, isSupabaseConfigured, invokeFunction } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

export default function OrderDetailScreen({ navigation, route }) {
  const { orderId } = route.params || {};
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!orderId || !isSupabaseConfigured || !supabase || !user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, status, payment_status, subtotal, delivery_fee, discount, total, customer_name, customer_phone, delivery_address, delivery_city, created_at, order_items(qty, price, total, selected_image_url, product:products(name, swatch))',
        )
        .eq('id', orderId)
        .single();
      if (!error && data) setOrder(data);
      const { data: hist } = await supabase
        .from('order_status_history')
        .select('id, old_status, new_status, old_payment_status, new_payment_status, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (hist) setHistory(hist);
      setLoading(false);
    };
    load();
  }, [orderId, user]);

  const handlePayNow = async () => {
    if (!order || !user?.email || !supabase) {
      Alert.alert('Payment Error', 'Missing order or email details.');
      return;
    }
    setPaying(true);
    const { data, error } = await invokeFunction('fincra-initiate', {
        orderId: order.id,
        customer: {
          name: order.customer_name || 'Customer',
          email: user.email,
          phoneNumber: order.customer_phone || undefined,
        },
    });
    setPaying(false);
    if (error || !data?.link) {
      const errMsg = error?.message || data?.error || data?.message || null;
      Alert.alert('Payment Link Failed', errMsg || 'Unable to open payment. Please try again.');
      return;
    }
    Linking.openURL(data.link);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Order Detail</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <Text style={s.loading}>Loading…</Text>
        </View>
      ) : !order ? (
        <View style={s.loadingWrap}>
          <Text style={s.loading}>Order not found.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
          <View style={[s.card, Shadow.sm]}>
            <Text style={s.orderId}>Order #{order.id}</Text>
            <Text style={s.meta}>{new Date(order.created_at).toLocaleDateString()}</Text>
            <View style={s.badgeRow}>
              <StatusBadge status={order.status} />
              {order.payment_status && <StatusBadge status={order.payment_status} />}
            </View>
            {order.payment_status !== 'paid' && (
              <View style={s.payNotice}>
                <Text style={s.payNoticeTxt}>Complete payment to confirm this order.</Text>
                <Button title={paying ? 'Opening…' : 'Pay Now'} onPress={handlePayNow} style={s.payBtn} />
              </View>
            )}
          </View>

          <View style={[s.card, Shadow.sm]}>
            <Text style={s.sectionTitle}>Delivery</Text>
            <Text style={s.meta}>{order.customer_name || 'Customer'}</Text>
            <Text style={s.meta}>{order.customer_phone || '—'}</Text>
            <Text style={s.meta}>{order.delivery_address || '—'}</Text>
            <Text style={s.meta}>{order.delivery_city || ''}</Text>
          </View>

          <View style={[s.card, Shadow.sm]}>
            <Text style={s.sectionTitle}>Items</Text>
            {(order.order_items || []).map((it, idx) => (
              <View key={idx} style={s.itemRow}>
                {it.selected_image_url
                  ? <Image source={{ uri: it.selected_image_url }} style={s.itemImage} />
                  : <FabricSwatch swatchKey={it.product?.swatch || 'ankara'} width={52} height={52} borderRadius={Radius.md} />
                }
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{it.product?.name || 'Item'}</Text>
                  <Text style={s.meta}>Qty {it.qty} · {fmt(it.price)}</Text>
                </View>
                <Text style={s.itemTotal}>{fmt(it.total || (it.price * it.qty))}</Text>
              </View>
            ))}
          </View>

          <View style={[s.card, Shadow.sm]}>
            <Text style={s.sectionTitle}>Summary</Text>
            <View style={s.summaryRow}>
              <Text style={s.meta}>Subtotal</Text>
              <Text style={s.meta}>{fmt(order.subtotal)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.meta}>Delivery</Text>
              <Text style={s.meta}>{fmt(order.delivery_fee)}</Text>
            </View>
            {Number(order.discount) > 0 && (
              <View style={s.summaryRow}>
                <Text style={[s.meta, { color: Colors.new_ }]}>Discount</Text>
                <Text style={[s.meta, { color: Colors.new_ }]}>−{fmt(order.discount)}</Text>
              </View>
            )}
            <Divider style={{ marginVertical: 10 }} />
            <View style={s.summaryRow}>
              <Text style={s.totalLbl}>Total</Text>
              <Text style={s.totalVal}>{fmt(order.total)}</Text>
            </View>
          </View>

          <View style={[s.card, Shadow.sm]}>
            <Text style={s.sectionTitle}>Status History</Text>
            {history.length === 0 && <Text style={s.meta}>No updates yet.</Text>}
            {history.map(h => {
              const statusChange = h.old_status !== h.new_status && h.new_status;
              const payChange = h.old_payment_status !== h.new_payment_status && h.new_payment_status;
              return (
                <View key={h.id} style={s.historyRow}>
                  <View style={s.historyDot} />
                  <View style={{ flex: 1 }}>
                    {statusChange && (
                      <Text style={s.historyTitle}>
                        Order: {h.old_status || '—'} → {h.new_status || '—'}
                      </Text>
                    )}
                    {payChange && (
                      <Text style={s.historyTitle}>
                        Payment: {h.old_payment_status || '—'} → {h.new_payment_status || '—'}
                      </Text>
                    )}
                    {!statusChange && !payChange && (
                      <Text style={s.historyTitle}>Updated</Text>
                    )}
                    <Text style={s.meta}>{new Date(h.created_at).toLocaleString()}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <Button title="Back to Orders" onPress={() => navigation.goBack()} style={{ marginTop: 6 }} />
        </ScrollView>
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
  body: { padding: 16, paddingBottom: 24 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 12 },
  orderId: { fontSize: 13, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  meta: { fontSize: 11, color: Colors.muted, marginBottom: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  payNotice: { marginTop: 12, backgroundColor: Colors.goldBg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 12 },
  payNoticeTxt: { fontSize: 11, color: Colors.text, marginBottom: 8, fontWeight: '600' },
  payBtn: { paddingVertical: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  itemImage: { width: 52, height: 52, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.cream },
  itemName: { fontSize: 12, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  itemTotal: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLbl: { fontSize: 13, fontWeight: '800', color: Colors.text },
  totalVal: { fontSize: 15, fontWeight: '900', color: Colors.primary },
  historyRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 4 },
  historyTitle: { fontSize: 11, fontWeight: '700', color: Colors.text, marginBottom: 4 },
});

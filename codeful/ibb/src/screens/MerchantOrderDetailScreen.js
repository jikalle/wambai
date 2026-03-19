import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { FabricSwatch, StatusBadge, Divider, Button } from '../components';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

export default function MerchantOrderDetailScreen({ navigation, route }) {
  const { orderId, shopId } = route.params || {};
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const itemsTotal = useMemo(
    () => items.reduce((s, i) => s + (i.total || (i.price * i.qty)), 0),
    [items],
  );

  const load = async () => {
    if (!orderId || !isSupabaseConfigured || !supabase || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: ord } = await supabase
      .from('orders')
      .select('id, status, payment_status, subtotal, delivery_fee, discount, total, customer_name, customer_phone, delivery_address, delivery_city, created_at')
      .eq('id', orderId)
      .single();
    let itemsQuery = supabase
      .from('order_items')
      .select('id, qty, price, total, selected_image_url, product:products(name, swatch)')
      .eq('order_id', orderId);
    if (shopId) itemsQuery = itemsQuery.eq('shop_id', shopId);
    const { data: rows } = await itemsQuery;
    const { data: hist } = await supabase
      .from('order_status_history')
      .select('id, old_status, new_status, old_payment_status, new_payment_status, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (ord) setOrder(ord);
    if (rows) setItems(rows);
    if (hist) setHistory(hist);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [orderId, shopId, user]);

  const updateOrderStatus = async (status) => {
    if (!order?.id || updating) return;
    setUpdating(true);
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', order.id);
    setUpdating(false);
    if (error) {
      Alert.alert('Update Failed', error.message || 'Could not update order.');
      return;
    }
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Merchant Order</Text>
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
          </View>

          <View style={[s.card, Shadow.sm]}>
            <Text style={s.sectionTitle}>Customer</Text>
            <Text style={s.meta}>{order.customer_name || 'Customer'}</Text>
            <Text style={s.meta}>{order.customer_phone || '—'}</Text>
            <Text style={s.meta}>{order.delivery_address || '—'}</Text>
            <Text style={s.meta}>{order.delivery_city || ''}</Text>
          </View>

          <View style={[s.card, Shadow.sm]}>
            <Text style={s.sectionTitle}>Items (Your Shop)</Text>
            {items.length === 0 && <Text style={s.meta}>No items for this shop.</Text>}
            {items.map((it) => (
              <View key={it.id} style={s.itemRow}>
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
            <Text style={s.sectionTitle}>Shop Total</Text>
            <View style={s.summaryRow}>
              <Text style={s.meta}>Items Total</Text>
              <Text style={s.meta}>{fmt(itemsTotal)}</Text>
            </View>
            <Divider style={{ marginVertical: 8 }} />
            <View style={s.summaryRow}>
              <Text style={s.totalLbl}>Order Total</Text>
              <Text style={s.totalVal}>{fmt(order.total)}</Text>
            </View>
          </View>

          <View style={[s.card, Shadow.sm]}>
            <Text style={s.sectionTitle}>Update Status</Text>
            <View style={s.statusRow}>
              {['processing', 'shipped', 'delivered'].map(st => (
                <TouchableOpacity
                  key={st}
                  style={[s.statusBtn, order.status === st && s.statusBtnActive]}
                  onPress={() => updateOrderStatus(st)}
                >
                  <Text style={[s.statusTxt, order.status === st && s.statusTxtActive]}>
                    {updating && order.status === st ? '...' : st}
                  </Text>
                </TouchableOpacity>
              ))}
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
  sectionTitle: { fontSize: 12, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  itemImage: { width: 52, height: 52, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.cream },
  itemName: { fontSize: 12, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  itemTotal: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLbl: { fontSize: 13, fontWeight: '800', color: Colors.text },
  totalVal: { fontSize: 15, fontWeight: '900', color: Colors.primary },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.sm, alignItems: 'center', backgroundColor: Colors.goldBg, borderWidth: 1, borderColor: Colors.border },
  statusBtnActive: { backgroundColor: Colors.primary },
  statusTxt: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  statusTxtActive: { color: Colors.white },
  historyRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 4 },
  historyTitle: { fontSize: 11, fontWeight: '700', color: Colors.text, marginBottom: 4 },
});

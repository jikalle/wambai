import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { Button, StatusBadge } from '../components';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const getReferenceFromUrl = (url) => {
  try {
    if (!url) return null;
    const q = url.split('?')[1] || '';
    const params = new URLSearchParams(q);
    return params.get('reference');
  } catch {
    return null;
  }
};

export default function PaymentReturnScreen({ navigation, route }) {
  const { user } = useAuth();
  const [reference, setReference] = useState(route?.params?.reference || null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (ref) => {
    if (!ref || !isSupabaseConfigured || !supabase || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('id, status, payment_status, total, created_at')
      .eq('payment_ref', ref)
      .maybeSingle();
    if (data) setOrder(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let sub;
    const init = async () => {
      if (reference) {
        await load(reference);
        return;
      }
      const initial = await Linking.getInitialURL();
      const ref = getReferenceFromUrl(initial);
      if (ref) {
        setReference(ref);
        await load(ref);
      }
    };
    init();
    sub = Linking.addEventListener('url', ({ url }) => {
      const ref = getReferenceFromUrl(url);
      if (ref) {
        setReference(ref);
        load(ref);
      }
    });
    return () => sub?.remove?.();
  }, [reference, load]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Payment Status</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={s.body}>
        <View style={[s.card, Shadow.sm]}>
          <Text style={s.label}>Reference</Text>
          <Text style={s.ref}>{reference || '—'}</Text>
          {loading && <Text style={s.meta}>Checking payment status…</Text>}
          {!loading && !order && (
            <Text style={s.meta}>We could not find an order for this reference yet.</Text>
          )}
          {!loading && order && (
            <>
              <View style={s.badgeRow}>
                <StatusBadge status={order.status} />
                <StatusBadge status={order.payment_status || 'unpaid'} />
              </View>
              <Text style={s.meta}>Order #{order.id}</Text>
              <Text style={s.meta}>Total ₦{Number(order.total || 0).toLocaleString()}</Text>
              <Text style={s.meta}>{new Date(order.created_at).toLocaleString()}</Text>
            </>
          )}
        </View>

        <Button
          title="Check Again"
          onPress={() => load(reference)}
          style={{ marginTop: 8 }}
        />
        {order?.id && (
          <Button
            title="View Order"
            onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
            style={{ marginTop: 8 }}
          />
        )}
        <Button
          title="Back Home"
          onPress={() => navigation.navigate('HomeTab')}
          style={{ marginTop: 8 }}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: Colors.text, fontFamily: 'serif' },
  body: { padding: 16 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 14 },
  label: { fontSize: 10, color: Colors.muted, fontWeight: '700', marginBottom: 6 },
  ref: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  meta: { fontSize: 11, color: Colors.muted, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
});

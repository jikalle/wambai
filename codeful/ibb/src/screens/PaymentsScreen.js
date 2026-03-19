import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { StatusBadge } from '../components';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

export default function PaymentsScreen({ navigation }) {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured || !supabase || !user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select('id, order_id, reference, status, amount, currency, created_at, order:orders(id, total, payment_status, created_at)')
        .order('created_at', { ascending: false });
      if (!error && data) setPayments(data);
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Payments</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <Text style={s.loading}>Loading…</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
          {payments.length === 0 && (
            <View style={s.emptyWrap}>
              <Text style={s.empty}>No payments yet.</Text>
            </View>
          )}
          {payments.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[s.card, Shadow.sm]}
              onPress={() => p.order_id && navigation.navigate('OrderDetail', { orderId: p.order_id })}
            >
              <View style={s.row}>
                <Text style={s.ref}>Ref: {p.reference || '—'}</Text>
                <StatusBadge status={p.status || p.order?.payment_status || 'pending'} />
              </View>
              <Text style={s.meta}>Order {p.order_id?.slice(0, 8) || '—'}</Text>
              <Text style={s.meta}>Amount {fmt(p.amount || p.order?.total || 0)} {p.currency || 'NGN'}</Text>
              <Text style={s.meta}>{new Date(p.created_at).toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
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
  emptyWrap: { padding: 16, alignItems: 'center' },
  empty: { fontSize: 12, color: Colors.muted },
  card: { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  ref: { fontSize: 12, fontWeight: '700', color: Colors.text },
  meta: { fontSize: 11, color: Colors.muted, marginBottom: 4 },
});

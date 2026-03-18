import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function MerchantInviteScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState([]);

  const role = profile?.role || user?.user_metadata?.role || 'customer';
  const canInvite = role === 'admin' || role === 'merchant';

  const loadInvites = async () => {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from('merchant_invites')
      .select('id, email, status, created_at')
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false });
    setInvites(data || []);
  };

  useEffect(() => {
    loadInvites();
  }, [user]);

  const sendInvite = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert('Supabase Not Configured', 'Please configure Supabase env variables.');
      return;
    }
    const cleaned = email.trim().toLowerCase();
    if (!cleaned || !cleaned.includes('@')) {
      Alert.alert('Invalid Email', 'Enter a valid email address.');
      return;
    }
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from('merchant_invites')
      .insert({ inviter_id: user.id, email: cleaned, role: 'merchant' });
    setLoading(false);
    if (error) {
      Alert.alert('Invite Failed', error.message);
      return;
    }
    setEmail('');
    loadInvites();
    Alert.alert('Invite Sent', 'The invite is active. Ask them to sign up with that email.');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Invite Merchant</Text>
        <View style={{ width: 32 }} />
      </View>

      {!canInvite ? (
        <View style={s.blocked}>
          <Text style={s.blockedTitle}>Merchant Access Required</Text>
          <Text style={s.blockedSub}>Only merchants and admins can send invites.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
          <View style={[s.card, Shadow.sm]}>
            <Text style={s.label}>Merchant Email</Text>
            <View style={s.inputRow}>
              <Ionicons name="mail-outline" size={16} color={Colors.muted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="merchant@example.com"
                placeholderTextColor={Colors.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={s.input}
              />
            </View>
            <TouchableOpacity style={s.btn} onPress={sendInvite} disabled={loading}>
              <Text style={s.btnTxt}>{loading ? 'Sending…' : 'Send Invite'}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.list}>
            <Text style={s.listTitle}>Your Invites</Text>
            {invites.length === 0 && (
              <Text style={s.empty}>No invites yet.</Text>
            )}
            {invites.map(inv => (
              <View key={inv.id} style={[s.inviteRow, Shadow.sm]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.inviteEmail}>{inv.email}</Text>
                  <Text style={s.inviteMeta}>Status: {inv.status}</Text>
                </View>
                <View style={[s.statusPill, inv.status === 'accepted' && s.statusPillAccepted]}>
                  <Text style={[s.statusTxt, inv.status === 'accepted' && s.statusTxtAccepted]}>
                    {inv.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
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
  body: { padding: 16, paddingBottom: 24 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 14 },
  label: { fontSize: 11, fontWeight: '700', color: Colors.muted, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.cream, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 13, color: Colors.text, paddingVertical: 10 },
  btn: { marginTop: 12, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  btnTxt: { color: Colors.white, fontWeight: '700', fontSize: 12 },
  list: { marginTop: 18 },
  listTitle: { fontSize: 13, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  empty: { fontSize: 11, color: Colors.muted },
  inviteRow: { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  inviteEmail: { fontSize: 12, fontWeight: '700', color: Colors.text },
  inviteMeta: { fontSize: 10, color: Colors.muted, marginTop: 3 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: Colors.goldBg, borderWidth: 1, borderColor: Colors.border },
  statusTxt: { fontSize: 9, fontWeight: '800', color: Colors.gold },
  statusPillAccepted: { backgroundColor: '#EAF7EF', borderColor: '#CFE9D8' },
  statusTxtAccepted: { color: Colors.new_ },
  blocked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  blockedTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  blockedSub: { fontSize: 12, color: Colors.muted, textAlign: 'center' },
});

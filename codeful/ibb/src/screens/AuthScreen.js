import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { FabricSwatch, Button } from '../components';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen({ navigation }) {
  const { setIsGuest } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', confirm:'' });
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const ensureConfigured = () => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Supabase Not Configured',
        'Please add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your environment.',
      );
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!form.email || !form.password) { Alert.alert('Missing Info', 'Enter your email and password.'); return; }
    if (!ensureConfigured()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    setLoading(false);
    if (error) Alert.alert('Sign In Failed', error.message);
  };

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) { Alert.alert('Missing Info', 'Please fill all fields.'); return; }
    if (form.password !== form.confirm) { Alert.alert('Password Mismatch', 'Your passwords do not match.'); return; }
    if (form.password.length < 6) { Alert.alert('Weak Password', 'Password must be at least 6 characters.'); return; }
    if (!ensureConfigured()) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          role: 'customer',
        },
      },
    });
    if (!error && data?.session?.user) {
      await supabase
        .from('profiles')
        .upsert({
          id: data.session.user.id,
          name: form.name.trim(),
          phone: form.phone.trim(),
          role: 'customer',
          location: 'Kano, Nigeria',
        });
    }
    setLoading(false);
    if (error) {
      Alert.alert('Sign Up Failed', error.message);
      return;
    }
    if (!data?.session) {
      Alert.alert('Verify Email', 'Please check your inbox to confirm your email before signing in.');
      setMode('login');
    }
  };

  const handleForgot = async () => {
    if (!form.email) { Alert.alert('Enter Email', 'Please enter your email address.'); return; }
    if (!ensureConfigured()) return;
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim());
    if (error) {
      Alert.alert('Reset Failed', error.message);
      return;
    }
    Alert.alert('Reset Link Sent', `A password reset link has been sent to ${form.email}`, [{ text: 'OK', onPress: () => setMode('login') }]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Header with fabric swatch strip */}
          <LinearGradient colors={[Colors.primary, '#9B2E2E']} style={s.headerGrad}>
            {/* Fabric swatch strip */}
            <View style={s.swatchStrip}>
              {['ankara','asooke','damask','guinea','lace','adire','atamfa','brocade'].map(sw => (
                <FabricSwatch key={sw} swatchKey={sw} width={44} height={70} />
              ))}
            </View>
            <View style={s.headerContent}>
              <Text style={s.brandName}>🧵 Arewa Drape</Text>
              <Text style={s.brandSub}>Northern Nigeria's Fabric Marketplace</Text>
            </View>
          </LinearGradient>

          {/* Card */}
          <View style={s.card}>
            {/* Tab switcher */}
            {mode !== 'forgot' && (
              <View style={s.tabs}>
                <TouchableOpacity style={[s.tab, mode==='login'&&s.tabActive]} onPress={() => setMode('login')}>
                  <Text style={[s.tabTxt, mode==='login'&&s.tabTxtActive]}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.tab, mode==='register'&&s.tabActive]} onPress={() => setMode('register')}>
                  <Text style={[s.tabTxt, mode==='register'&&s.tabTxtActive]}>Create Account</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'forgot' && (
              <View style={s.forgotHeader}>
                <TouchableOpacity onPress={() => setMode('login')} style={s.backRow}>
                  <Ionicons name="arrow-back" size={18} color={Colors.primary} />
                  <Text style={s.backTxt}>Back to Sign In</Text>
                </TouchableOpacity>
                <Text style={s.formTitle}>Reset Password</Text>
                <Text style={s.formSub}>Enter your email and we'll send a reset link.</Text>
              </View>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' && (
              <>
                <View style={s.welcomeRow}>
                  <Text style={s.welcomeTitle}>Welcome back</Text>
                  <Text style={s.welcomeSub}>Sign in to your Arewa Drape account</Text>
                </View>
                <Field label="Email Address" value={form.email} onChange={v => update('email',v)} placeholder="you@example.com" keyboard="email-address" icon="mail-outline" />
                <Field label="Password" value={form.password} onChange={v => update('password',v)} placeholder="••••••••" secure={!showPass}
                  icon="lock-closed-outline" rightIcon={showPass?'eye-off-outline':'eye-outline'} onRightIcon={() => setShowPass(!showPass)} />
                <TouchableOpacity style={s.forgotLink} onPress={() => setMode('forgot')}>
                  <Text style={s.forgotLinkTxt}>Forgot password?</Text>
                </TouchableOpacity>
                <Button title={loading ? 'Signing in...' : 'Sign In'} onPress={handleLogin} disabled={loading} style={s.submitBtn} />
                <SocialLogin />
              </>
            )}

            {/* REGISTER FORM */}
            {mode === 'register' && (
              <>
                <View style={s.welcomeRow}>
                  <Text style={s.welcomeTitle}>Join Arewa Drape</Text>
                  <Text style={s.welcomeSub}>Create your account to shop premium fabrics</Text>
                </View>
                <Field label="Full Name" value={form.name} onChange={v => update('name',v)} placeholder="Abubakar Musa" icon="person-outline" />
                <Field label="Email Address" value={form.email} onChange={v => update('email',v)} placeholder="you@example.com" keyboard="email-address" icon="mail-outline" />
                <Field label="Phone Number" value={form.phone} onChange={v => update('phone',v)} placeholder="+234 800 000 0000" keyboard="phone-pad" icon="call-outline" />
                <Field label="Password" value={form.password} onChange={v => update('password',v)} placeholder="Min. 6 characters" secure={!showPass}
                  icon="lock-closed-outline" rightIcon={showPass?'eye-off-outline':'eye-outline'} onRightIcon={() => setShowPass(!showPass)} />
                <Field label="Confirm Password" value={form.confirm} onChange={v => update('confirm',v)} placeholder="Repeat password" secure={!showPass}
                  icon="lock-closed-outline" />
                <View style={s.termsRow}>
                  <Ionicons name="checkbox" size={18} color={Colors.primary} />
                  <Text style={s.termsTxt}>I agree to the <Text style={s.termsLink}>Terms of Service</Text> and <Text style={s.termsLink}>Privacy Policy</Text></Text>
                </View>
                <Button title={loading ? 'Creating account...' : 'Create Account'} onPress={handleRegister} disabled={loading} style={s.submitBtn} />
                <SocialLogin />
              </>
            )}

            {/* FORGOT FORM */}
            {mode === 'forgot' && (
              <>
                <Field label="Email Address" value={form.email} onChange={v => update('email',v)} placeholder="you@example.com" keyboard="email-address" icon="mail-outline" />
                <Button title="Send Reset Link" onPress={handleForgot} style={s.submitBtn} />
              </>
            )}
          </View>

          {/* Guest link */}
          <TouchableOpacity style={s.guestBtn} onPress={() => setIsGuest(true)}>
            <Text style={s.guestTxt}>Continue as Guest →</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, keyboard='default', secure=false, icon, rightIcon, onRightIcon }) {
  return (
    <View style={f.group}>
      <Text style={f.label}>{label}</Text>
      <View style={f.row}>
        {icon && <Ionicons name={icon} size={17} color={Colors.muted} style={f.icon} />}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.muted}
          keyboardType={keyboard}
          secureTextEntry={secure}
          autoCapitalize={keyboard==='email-address' ? 'none' : 'words'}
          style={f.input}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIcon} style={f.rightIcon}>
            <Ionicons name={rightIcon} size={17} color={Colors.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function SocialLogin() {
  return (
    <View>
      <View style={sl.divRow}>
        <View style={sl.line} />
        <Text style={sl.orTxt}>or continue with</Text>
        <View style={sl.line} />
      </View>
      <View style={sl.btns}>
        {[['Google','logo-google','#EA4335'],['Apple','logo-apple','#000000']].map(([label,icon,color])=>(
          <TouchableOpacity key={label} style={sl.btn}>
            <Ionicons name={icon} size={18} color={color} />
            <Text style={sl.btnTxt}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe:         { flex:1, backgroundColor:Colors.background },
  scroll:       { flexGrow:1 },
  headerGrad:   { paddingBottom:30, overflow:'hidden' },
  swatchStrip:  { flexDirection:'row', opacity:0.25, marginBottom:0 },
  headerContent:{ paddingHorizontal:24, paddingBottom:16, paddingTop:4 },
  brandName:    { fontSize:24, fontWeight:'900', color:'#fff', fontFamily:'serif', letterSpacing:0.5, marginBottom:4 },
  brandSub:     { fontSize:13, color:'rgba(255,253,248,0.75)' },
  card:         { backgroundColor:Colors.white, borderTopLeftRadius:24, borderTopRightRadius:24, marginTop:-20, padding:24 },
  tabs:         { flexDirection:'row', backgroundColor:Colors.cream, borderRadius:Radius.md, padding:4, marginBottom:22, borderWidth:1, borderColor:Colors.border },
  tab:          { flex:1, paddingVertical:10, borderRadius:Radius.sm, alignItems:'center' },
  tabActive:    { backgroundColor:Colors.primary },
  tabTxt:       { fontSize:13, fontWeight:'700', color:Colors.muted },
  tabTxtActive: { color:'#fff' },
  forgotHeader: { marginBottom:20 },
  backRow:      { flexDirection:'row', alignItems:'center', gap:6, marginBottom:14 },
  backTxt:      { fontSize:13, color:Colors.primary, fontWeight:'700' },
  formTitle:    { fontSize:20, fontWeight:'900', color:Colors.text, fontFamily:'serif', marginBottom:6 },
  formSub:      { fontSize:13, color:Colors.muted },
  welcomeRow:   { marginBottom:20 },
  welcomeTitle: { fontSize:20, fontWeight:'900', color:Colors.text, fontFamily:'serif', marginBottom:4 },
  welcomeSub:   { fontSize:13, color:Colors.muted },
  forgotLink:   { alignSelf:'flex-end', marginBottom:20, marginTop:-8 },
  forgotLinkTxt:{ fontSize:12, color:Colors.primary, fontWeight:'700' },
  termsRow:     { flexDirection:'row', alignItems:'flex-start', gap:10, marginBottom:20, marginTop:4 },
  termsTxt:     { flex:1, fontSize:12, color:Colors.muted, lineHeight:18 },
  termsLink:    { color:Colors.primary, fontWeight:'700' },
  submitBtn:    { marginBottom:16, paddingVertical:14 },
  guestBtn:     { alignItems:'center', padding:20 },
  guestTxt:     { fontSize:13, color:Colors.primary, fontWeight:'700' },
});

const f = StyleSheet.create({
  group:    { marginBottom:16 },
  label:    { fontSize:11, fontWeight:'700', color:Colors.muted, letterSpacing:0.5, marginBottom:7 },
  row:      { flexDirection:'row', alignItems:'center', backgroundColor:Colors.cream, borderRadius:Radius.md, borderWidth:1.5, borderColor:Colors.border, paddingHorizontal:12, gap:8 },
  icon:     { },
  input:    { flex:1, fontSize:14, color:Colors.text, paddingVertical:13 },
  rightIcon:{ padding:4 },
});

const sl = StyleSheet.create({
  divRow: { flexDirection:'row', alignItems:'center', gap:12, marginBottom:16 },
  line:   { flex:1, height:1, backgroundColor:Colors.border },
  orTxt:  { fontSize:12, color:Colors.muted, fontWeight:'600' },
  btns:   { flexDirection:'row', gap:12 },
  btn:    { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:12, borderRadius:Radius.md, borderWidth:1.5, borderColor:Colors.border, backgroundColor:Colors.white },
  btnTxt: { fontSize:13, fontWeight:'700', color:Colors.text },
});

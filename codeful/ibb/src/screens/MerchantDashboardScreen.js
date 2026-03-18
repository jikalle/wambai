import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { Colors, Radius, Shadow } from '../theme';
import { CATEGORIES, SWATCHES } from '../data';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const SWATCH_KEYS = Object.keys(SWATCHES);

export default function MerchantDashboardScreen({ navigation }) {
  const { user, profile } = useAuth();
  const role = profile?.role || user?.user_metadata?.role || 'customer';
  const canManage = role === 'admin' || role === 'merchant';

  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [creatingShop, setCreatingShop] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [shopForm, setShopForm] = useState({
    name: '',
    description: '',
  });

  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    original_price: '',
    category: CATEGORIES[0]?.key || 'ankara',
    swatch: SWATCH_KEYS[0] || 'ankara',
    yards: '6 yds',
    origin: 'Kano',
    stock: '10',
    badge: '',
    status: 'published',
    description: '',
  });
  const [pickedImage, setPickedImage] = useState(null);

  const slug = useMemo(() => {
    const base = shopForm.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return base || null;
  }, [shopForm.name]);

  const loadData = async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const { data: shopData, error: shopErr } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (shopErr && shopErr.code !== 'PGRST116') {
      console.log('shop error', shopErr.message);
    }
    setShop(shopData || null);
    if (shopData?.id) {
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shopData.id)
        .order('created_at', { ascending: false });
      setProducts(prodData || []);
    } else {
      setProducts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const createShop = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert('Supabase Not Configured', 'Please configure Supabase env variables.');
      return;
    }
    if (!shopForm.name.trim()) {
      Alert.alert('Missing Info', 'Shop name is required.');
      return;
    }
    setCreatingShop(true);
    const { error } = await supabase
      .from('shops')
      .insert({
        owner_id: user.id,
        name: shopForm.name.trim(),
        description: shopForm.description.trim(),
        slug,
        status: 'active',
      });
    setCreatingShop(false);
    if (error) {
      Alert.alert('Create Shop Failed', error.message);
      return;
    }
    await loadData();
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo access to upload product images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled) {
        setPickedImage(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Image Picker Error', e?.message || 'Failed to open image picker.');
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      price: '',
      original_price: '',
      category: CATEGORIES[0]?.key || 'ankara',
      swatch: SWATCH_KEYS[0] || 'ankara',
      yards: '6 yds',
      origin: 'Kano',
      stock: '10',
      badge: '',
      status: 'published',
      description: '',
    });
    setPickedImage(null);
    setEditingId(null);
  };

  const saveProduct = async () => {
    if (!shop?.id) return;
    if (!productForm.name.trim() || !productForm.price) {
      Alert.alert('Missing Info', 'Product name and price are required.');
      return;
    }
    setSavingProduct(true);
    const payload = {
      shop_id: shop.id,
      name: productForm.name.trim(),
      price: Number(productForm.price) || 0,
      original_price: productForm.original_price ? Number(productForm.original_price) : null,
      badge: productForm.badge || null,
      swatch: productForm.swatch,
      yards: productForm.yards,
      origin: productForm.origin,
      category: productForm.category,
      description: productForm.description,
      stock: Number(productForm.stock) || 0,
      status: productForm.status,
    };
    let productId = editingId;
    if (editingId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingId);
      if (error) {
        setSavingProduct(false);
        Alert.alert('Update Product Failed', error.message);
        return;
      }
    } else {
      const { data: created, error } = await supabase.from('products').insert(payload).select('id').single();
      if (error) {
        setSavingProduct(false);
        Alert.alert('Create Product Failed', error.message);
        return;
      }
      productId = created?.id;
    }
    if (pickedImage && productId) {
      try {
        if (editingId) {
          await supabase.from('product_images').delete().eq('product_id', productId);
        }
        const uri = pickedImage.uri;
        const extFromMime = pickedImage.mimeType?.split('/')?.[1];
        const ext = extFromMime || uri.split('.').pop() || 'jpg';
        const filePath = `${user.id}/${productId}/${Date.now()}.${ext}`;
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const arrayBuffer = decodeBase64(base64);
        const contentType = pickedImage.mimeType || `image/${ext}`;
        const { error: upErr } = await supabase
          .storage
          .from('product-images')
          .upload(filePath, arrayBuffer, { contentType, upsert: true });
        if (upErr) {
          Alert.alert('Image Upload Failed', upErr.message);
        } else {
          const { data: pub } = supabase.storage.from('product-images').getPublicUrl(filePath);
          await supabase.from('product_images').insert({
            product_id: productId,
            url: pub.publicUrl,
            sort_order: 0,
          });
        }
      } catch (e) {
        Alert.alert('Image Upload Error', e?.message || 'Failed to upload image.');
      }
    }
    setSavingProduct(false);
    resetProductForm();
    await loadData();
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setProductForm({
      name: p.name || '',
      price: String(p.price ?? ''),
      original_price: p.original_price ? String(p.original_price) : '',
      category: p.category || CATEGORIES[0]?.key || 'ankara',
      swatch: p.swatch || SWATCH_KEYS[0] || 'ankara',
      yards: p.yards || '6 yds',
      origin: p.origin || 'Kano',
      stock: String(p.stock ?? 0),
      badge: p.badge || '',
      status: p.status || 'published',
      description: p.description || '',
    });
    setPickedImage(null);
  };

  const deleteProduct = (p) => {
    Alert.alert('Delete Product', `Delete "${p.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('products').delete().eq('id', p.id);
        if (error) {
          Alert.alert('Delete Failed', error.message);
          return;
        }
        await loadData();
      }},
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Merchant Dashboard</Text>
        <View style={{ width: 32 }} />
      </View>

      {!canManage ? (
        <View style={s.blocked}>
          <Text style={s.blockedTitle}>Merchant Access Required</Text>
          <Text style={s.blockedSub}>You need a merchant role to manage a shop.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
          {loading ? (
            <Text style={s.loading}>Loading…</Text>
          ) : (
            <>
              {!shop ? (
                <View style={[s.card, Shadow.sm]}>
                  <Text style={s.sectionTitle}>Create Your Shop</Text>
                  <Text style={s.label}>Shop Name</Text>
                  <TextInput
                    value={shopForm.name}
                    onChangeText={(v) => setShopForm(p => ({ ...p, name: v }))}
                    placeholder="Arewa Textiles"
                    placeholderTextColor={Colors.muted}
                    style={s.input}
                  />
                  <Text style={s.label}>Description</Text>
                  <TextInput
                    value={shopForm.description}
                    onChangeText={(v) => setShopForm(p => ({ ...p, description: v }))}
                    placeholder="Short description of your shop"
                    placeholderTextColor={Colors.muted}
                    style={[s.input, { height: 80 }]}
                    multiline
                  />
                  <TouchableOpacity style={s.primaryBtn} onPress={createShop} disabled={creatingShop}>
                    <Text style={s.primaryBtnTxt}>{creatingShop ? 'Creating…' : 'Create Shop'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={[s.card, Shadow.sm]}>
                    <Text style={s.sectionTitle}>{shop.name}</Text>
                    <Text style={s.meta}>Status: {shop.status}</Text>
                    {!!shop.description && <Text style={s.meta}>{shop.description}</Text>}
                  </View>

                  <View style={[s.card, Shadow.sm]}>
                    <Text style={s.sectionTitle}>{editingId ? 'Edit Product' : 'Add Product'}</Text>
                    <Text style={s.label}>Name</Text>
                    <TextInput
                      value={productForm.name}
                      onChangeText={(v) => setProductForm(p => ({ ...p, name: v }))}
                      placeholder="Premium Aso-Oke"
                      placeholderTextColor={Colors.muted}
                      style={s.input}
                    />
                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.label}>Price (₦)</Text>
                        <TextInput
                          value={productForm.price}
                          onChangeText={(v) => setProductForm(p => ({ ...p, price: v }))}
                          placeholder="18000"
                          placeholderTextColor={Colors.muted}
                          keyboardType="numeric"
                          style={s.input}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.label}>Original (₦)</Text>
                        <TextInput
                          value={productForm.original_price}
                          onChangeText={(v) => setProductForm(p => ({ ...p, original_price: v }))}
                          placeholder="22000"
                          placeholderTextColor={Colors.muted}
                          keyboardType="numeric"
                          style={s.input}
                        />
                      </View>
                    </View>
                    <Text style={s.label}>Description</Text>
                    <TextInput
                      value={productForm.description}
                      onChangeText={(v) => setProductForm(p => ({ ...p, description: v }))}
                      placeholder="Short description"
                      placeholderTextColor={Colors.muted}
                      style={[s.input, { height: 80 }]}
                      multiline
                    />
                    <Text style={s.label}>Product Image</Text>
                    <View style={s.imageRow}>
                      <TouchableOpacity style={s.imageBtn} onPress={pickImage}>
                        <Ionicons name="image-outline" size={18} color={Colors.primary} />
                        <Text style={s.imageBtnTxt}>{pickedImage ? 'Change Image' : 'Pick Image'}</Text>
                      </TouchableOpacity>
                      {pickedImage && (
                        <Image source={{ uri: pickedImage.uri }} style={s.imagePreview} />
                      )}
                    </View>
                    <Text style={s.label}>Category</Text>
                    <View style={s.chipRow}>
                      {CATEGORIES.map(c => (
                        <TouchableOpacity
                          key={c.key}
                          style={[s.chip, productForm.category === c.key && s.chipActive]}
                          onPress={() => setProductForm(p => ({ ...p, category: c.key }))}
                        >
                          <Text style={[s.chipTxt, productForm.category === c.key && s.chipTxtActive]}>{c.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={s.label}>Swatch</Text>
                    <View style={s.chipRow}>
                      {SWATCH_KEYS.map(k => (
                        <TouchableOpacity
                          key={k}
                          style={[s.chip, productForm.swatch === k && s.chipActive]}
                          onPress={() => setProductForm(p => ({ ...p, swatch: k }))}
                        >
                          <Text style={[s.chipTxt, productForm.swatch === k && s.chipTxtActive]}>{k}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.label}>Yards</Text>
                        <TextInput
                          value={productForm.yards}
                          onChangeText={(v) => setProductForm(p => ({ ...p, yards: v }))}
                          placeholder="6 yds"
                          placeholderTextColor={Colors.muted}
                          style={s.input}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.label}>Origin</Text>
                        <TextInput
                          value={productForm.origin}
                          onChangeText={(v) => setProductForm(p => ({ ...p, origin: v }))}
                          placeholder="Kano"
                          placeholderTextColor={Colors.muted}
                          style={s.input}
                        />
                      </View>
                    </View>
                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.label}>Stock</Text>
                        <TextInput
                          value={productForm.stock}
                          onChangeText={(v) => setProductForm(p => ({ ...p, stock: v }))}
                          placeholder="10"
                          placeholderTextColor={Colors.muted}
                          keyboardType="numeric"
                          style={s.input}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.label}>Status</Text>
                        <View style={s.row}>
                          {['published', 'draft'].map(st => (
                            <TouchableOpacity
                              key={st}
                              style={[s.statusBtn, productForm.status === st && s.statusBtnActive]}
                              onPress={() => setProductForm(p => ({ ...p, status: st }))}
                            >
                              <Text style={[s.statusTxt, productForm.status === st && s.statusTxtActive]}>{st}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity style={s.primaryBtn} onPress={saveProduct} disabled={savingProduct}>
                      <Text style={s.primaryBtnTxt}>{savingProduct ? 'Saving…' : (editingId ? 'Save Changes' : 'Create Product')}</Text>
                    </TouchableOpacity>
                    {editingId && (
                      <TouchableOpacity style={s.secondaryBtn} onPress={resetProductForm}>
                        <Text style={s.secondaryBtnTxt}>Cancel Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={s.list}>
                    <Text style={s.sectionTitle}>Your Products</Text>
                    {products.length === 0 && <Text style={s.empty}>No products yet.</Text>}
                    {products.map(p => (
                      <View key={p.id} style={[s.productRow, Shadow.sm]}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.productName}>{p.name}</Text>
                          <Text style={s.productMeta}>₦{Number(p.price).toLocaleString()} · {p.status}</Text>
                        </View>
                        <View style={s.productActions}>
                          <TouchableOpacity onPress={() => startEdit(p)} style={s.actionBtn}>
                            <Ionicons name="create-outline" size={16} color={Colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => deleteProduct(p)} style={s.actionBtn}>
                            <Ionicons name="trash-outline" size={16} color={Colors.sale} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
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
  blocked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  blockedTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  blockedSub: { fontSize: 12, color: Colors.muted, textAlign: 'center' },
  loading: { fontSize: 12, color: Colors.muted },
  card: { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '700', color: Colors.muted, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: Colors.cream, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, color: Colors.text },
  primaryBtn: { marginTop: 12, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  primaryBtnTxt: { color: Colors.white, fontWeight: '700', fontSize: 12 },
  secondaryBtn: { marginTop: 8, backgroundColor: Colors.goldBg, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  secondaryBtnTxt: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  meta: { fontSize: 11, color: Colors.muted, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.goldBg, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary },
  chipTxt: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  chipTxtActive: { color: Colors.white },
  statusBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm, alignItems: 'center', backgroundColor: Colors.goldBg, borderWidth: 1, borderColor: Colors.border },
  statusBtnActive: { backgroundColor: Colors.primary },
  statusTxt: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  statusTxtActive: { color: Colors.white },
  list: { marginTop: 4 },
  empty: { fontSize: 11, color: Colors.muted },
  productRow: { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  productName: { fontSize: 12, fontWeight: '700', color: Colors.text },
  productMeta: { fontSize: 10, color: Colors.muted, marginTop: 2 },
  productActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.goldBg, borderWidth: 1, borderColor: Colors.border },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  imageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.goldBg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: 8, paddingHorizontal: 10 },
  imageBtnTxt: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  imagePreview: { width: 54, height: 54, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
});

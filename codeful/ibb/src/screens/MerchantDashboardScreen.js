import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState('all');
  const [creatingShop, setCreatingShop] = useState(false);
  const [updatingShop, setUpdatingShop] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  const [shopForm, setShopForm] = useState({
    name: '',
    description: '',
    address: '',
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
  const [productImages, setProductImages] = useState([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [originalImageUrls, setOriginalImageUrls] = useState([]);
  const [savingLogo, setSavingLogo] = useState(false);

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
      setOrdersLoading(true);
      const { data: orderData } = await supabase
        .from('order_items')
        .select('id, shop_id, qty, price, total, created_at, selected_image_url, order:orders(id, status, payment_status, created_at, customer_name), product:products(id, name, swatch)')
        .eq('shop_id', shopData.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setOrders(orderData || []);
      setOrdersLoading(false);

      setPaymentsLoading(true);
      const { data: payData } = await supabase
        .from('payments')
        .select('id, order_id, reference, status, amount, currency, created_at, order:orders(id, total, payment_status)')
        .order('created_at', { ascending: false })
        .limit(30);

      let itemsTotals = {};
      const orderIds = (payData || []).map(p => p.order_id).filter(Boolean);
      if (orderIds.length > 0) {
        const { data: itemRows } = await supabase
          .from('order_items')
          .select('order_id, total')
          .eq('shop_id', shopData.id)
          .in('order_id', orderIds);
        itemsTotals = (itemRows || []).reduce((acc, r) => {
          acc[r.order_id] = (acc[r.order_id] || 0) + (r.total || 0);
          return acc;
        }, {});
      }

      const merged = (payData || []).map(p => ({
        ...p,
        shop_total: itemsTotals[p.order_id] || 0,
      }));
      setPayments(merged);
      setPaymentsLoading(false);
    } else {
      setProducts([]);
      setOrders([]);
      setPayments([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (shop) {
      setShopForm({
        name: shop.name || '',
        description: shop.description || '',
        address: shop.address || '',
      });
    }
  }, [shop]);

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
        address: shopForm.address.trim(),
        slug,
        status: 'active',
      });
    setCreatingShop(false);
    if (error) {
      Alert.alert('Create Shop Failed', error.message);
      return;
    }
    setShowShopModal(false);
    await loadData();
  };

  const updateShop = async () => {
    if (!shop?.id) return;
    if (!shopForm.name.trim()) {
      Alert.alert('Missing Info', 'Shop name is required.');
      return;
    }
    if (!shopForm.address.trim()) {
      Alert.alert('Missing Info', 'Shop address is required.');
      return;
    }
    setUpdatingShop(true);
    const { error } = await supabase
      .from('shops')
      .update({
        name: shopForm.name.trim(),
        description: shopForm.description.trim(),
        address: shopForm.address.trim(),
      })
      .eq('id', shop.id);
    setUpdatingShop(false);
    if (error) {
      Alert.alert('Update Shop Failed', error.message);
      return;
    }
    await loadData();
    setShowShopModal(false);
    Alert.alert('Shop Updated', 'Your shop profile has been saved.');
  };

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo access to upload product images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 6,
      });
      if (!result.canceled) {
        const assets = result.assets || [];
        setProductImages(prev => {
          const next = [
            ...prev,
            ...assets.map((a, idx) => ({
              uri: a.uri,
              mimeType: a.mimeType,
              isNew: true,
              tempId: `${Date.now()}-${idx}`,
            })),
          ];
          return next.slice(0, 6);
        });
      }
    } catch (e) {
      Alert.alert('Image Picker Error', e?.message || 'Failed to open image picker.');
    }
  };

  const resetProductForm = (opts = {}) => {
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
    setProductImages([]);
    setImagesLoaded(false);
    setOriginalImageUrls([]);
    setEditingId(null);
    if (opts.closeModal) {
      setShowProductModal(false);
    }
  };

  const getStoragePathFromUrl = (url) => {
    if (!url) return null;
    const marker = '/storage/v1/object/public/product-images/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length));
  };

  const readFileAsBase64 = async (uri) => {
    const encoding = FileSystem?.EncodingType?.Base64 || 'base64';
    return FileSystem.readAsStringAsync(uri, { encoding });
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
    const shouldHandleImages = !!productId && (productImages.length > 0 || imagesLoaded);
    if (shouldHandleImages) {
      try {
        if (editingId) {
          await supabase.from('product_images').delete().eq('product_id', productId);
        }

        const rows = [];
        for (let i = 0; i < productImages.length; i += 1) {
          const img = productImages[i];
          if (img.isNew && img.uri) {
            const uri = img.uri;
            const extFromMime = img.mimeType?.split('/')?.[1];
            const ext = extFromMime || uri.split('.').pop() || 'jpg';
            const filePath = `${user.id}/${productId}/${Date.now()}-${i}.${ext}`;
            const base64 = await readFileAsBase64(uri);
            const arrayBuffer = decodeBase64(base64);
            const contentType = img.mimeType || `image/${ext}`;
            const { error: upErr } = await supabase
              .storage
              .from('product-images')
              .upload(filePath, arrayBuffer, { contentType, upsert: true });
            if (upErr) {
              throw new Error(upErr.message);
            }
            const { data: pub } = supabase.storage.from('product-images').getPublicUrl(filePath);
            rows.push({ product_id: productId, url: pub.publicUrl, sort_order: i });
          } else if (img.url) {
            rows.push({ product_id: productId, url: img.url, sort_order: i });
          }
        }

        if (rows.length) {
          const { error: insErr } = await supabase.from('product_images').insert(rows);
          if (insErr) throw new Error(insErr.message);
        }

        if (editingId && imagesLoaded && originalImageUrls.length) {
          const keptUrls = productImages.filter(i => i.url && !i.isNew).map(i => i.url);
          const removedUrls = originalImageUrls.filter(url => !keptUrls.includes(url));
          const removePaths = removedUrls.map(getStoragePathFromUrl).filter(Boolean);
          if (removePaths.length) {
            const { error: rmErr } = await supabase.storage.from('product-images').remove(removePaths);
            if (rmErr) {
              Alert.alert('Cleanup Warning', 'Product saved, but some old images could not be removed.');
            }
          }
        }
      } catch (e) {
        Alert.alert('Image Upload Error', e?.message || 'Failed to upload image.');
      }
    }
    setSavingProduct(false);
    resetProductForm({ closeModal: true });
    await loadData();
  };

  const startEdit = async (p) => {
    setShowProductModal(true);
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
    setProductImages([]);
    setImagesLoaded(false);
    setOriginalImageUrls([]);
    if (supabase) {
      const { data, error } = await supabase
        .from('product_images')
        .select('id, url, sort_order')
        .eq('product_id', p.id)
        .order('sort_order', { ascending: true });
      if (!error) {
        setImagesLoaded(true);
        if (data?.length) {
          setOriginalImageUrls(data.map(img => img.url).filter(Boolean));
          setProductImages(data.map(img => ({
            id: img.id,
            url: img.url,
            sort_order: img.sort_order,
            isNew: false,
          })));
        }
      }
    }
  };

  const openCreateProduct = () => {
    resetProductForm();
    setShowProductModal(true);
  };

  const moveImage = (index, dir) => {
    setProductImages(prev => {
      const next = [...prev];
      const to = index + dir;
      if (to < 0 || to >= next.length) return prev;
      const temp = next[index];
      next[index] = next[to];
      next[to] = temp;
      return next;
    });
  };

  const removeImage = (index) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
  };

  const pickShopLogo = async () => {
    if (!shop?.id || !user?.id) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo access to upload a logo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      setSavingLogo(true);
      const uri = asset.uri;
      const extFromMime = asset.mimeType?.split('/')?.[1];
      const ext = extFromMime || uri.split('.').pop() || 'jpg';
      const filePath = `${user.id}/${shop.id}/${Date.now()}.${ext}`;
      const base64 = await readFileAsBase64(uri);
      const arrayBuffer = decodeBase64(base64);
      const contentType = asset.mimeType || `image/${ext}`;
      const { error: upErr } = await supabase
        .storage
        .from('shop-logos')
        .upload(filePath, arrayBuffer, { contentType, upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from('shop-logos').getPublicUrl(filePath);
      const { error: updErr } = await supabase
        .from('shops')
        .update({ logo_url: pub.publicUrl })
        .eq('id', shop.id);
      if (updErr) throw new Error(updErr.message);
      await loadData();
    } catch (e) {
      Alert.alert('Logo Upload Error', e?.message || 'Failed to upload logo.');
    } finally {
      setSavingLogo(false);
    }
  };

  const deleteProduct = (p) => {
    Alert.alert('Delete Product', `Delete "${p.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        let imageUrls = [];
        const { data: imgs } = await supabase
          .from('product_images')
          .select('url')
          .eq('product_id', p.id);
        if (imgs?.length) {
          imageUrls = imgs.map(i => i.url).filter(Boolean);
        }
        const { error } = await supabase.from('products').delete().eq('id', p.id);
        if (error) {
          Alert.alert('Delete Failed', error.message);
          return;
        }
        if (imageUrls.length) {
          const removePaths = imageUrls.map(getStoragePathFromUrl).filter(Boolean);
          if (removePaths.length) {
            const { error: rmErr } = await supabase.storage.from('product-images').remove(removePaths);
            if (rmErr) {
              Alert.alert('Cleanup Warning', 'Product deleted, but some images could not be removed.');
            }
          }
        }
        await loadData();
      }},
    ]);
  };

  const updateOrderStatus = async (orderId, status) => {
    if (!orderId) return;
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);
    if (error) {
      Alert.alert('Update Failed', error.message);
      return;
    }
    await loadData();
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
                <>
                  <View style={[s.card, Shadow.sm]}>
                    <Text style={s.sectionTitle}>Create Your Shop</Text>
                    <Text style={s.meta}>Set up your shop to start listing products.</Text>
                    <TouchableOpacity style={s.primaryBtn} onPress={() => setShowShopModal(true)}>
                      <Text style={s.primaryBtnTxt}>Create Shop</Text>
                    </TouchableOpacity>
                  </View>

                  <Modal visible={showShopModal} transparent animationType="slide" onRequestClose={() => setShowShopModal(false)}>
                    <View style={s.modalOverlay}>
                      <View style={s.modalSheet}>
                        <View style={s.modalHandle} />
                        <View style={s.modalHeader}>
                          <Text style={s.modalTitle}>Create Shop</Text>
                          <TouchableOpacity style={s.modalClose} onPress={() => setShowShopModal(false)}>
                            <Ionicons name="close" size={18} color={Colors.muted} />
                          </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={s.modalBody}>
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
                          <Text style={s.label}>Shop Address</Text>
                          <TextInput
                            value={shopForm.address}
                            onChangeText={(v) => setShopForm(p => ({ ...p, address: v }))}
                            placeholder="12 Bompai Road, Kano"
                            placeholderTextColor={Colors.muted}
                            style={s.input}
                          />
                          {!!shopForm.address && (
                            <View style={s.addressPreview}>
                              <View style={s.addressBadge}>
                                <Ionicons name="location" size={12} color={Colors.primary} />
                                <Text style={s.addressBadgeTxt}>Map preview</Text>
                              </View>
                              <Text style={s.addressText}>{shopForm.address}</Text>
                              <View style={s.addressBar}>
                                <View style={s.addressPin} />
                              </View>
                            </View>
                          )}
                          <TouchableOpacity style={s.primaryBtn} onPress={createShop} disabled={creatingShop}>
                            <Text style={s.primaryBtnTxt}>{creatingShop ? 'Creating…' : 'Create Shop'}</Text>
                          </TouchableOpacity>
                        </ScrollView>
                      </View>
                    </View>
                  </Modal>
                </>
              ) : (
                <>
                <View style={[s.card, Shadow.sm]}>
                  <View style={s.shopHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sectionTitle}>{shop.name}</Text>
                      <Text style={s.meta}>Status: {shop.status}</Text>
                      {!!shop.description && <Text style={s.meta}>{shop.description}</Text>}
                      {!!shop.address && <Text style={s.meta}>📍 {shop.address}</Text>}
                    </View>
                    {shop.logo_url
                      ? <Image source={{ uri: shop.logo_url }} style={s.shopLogo} />
                      : (
                        <View style={s.shopLogoPlaceholder}>
                          <Ionicons name="storefront-outline" size={18} color={Colors.muted} />
                        </View>
                      )}
                  </View>
                  <TouchableOpacity style={s.secondaryBtn} onPress={() => setShowShopModal(true)}>
                    <Text style={s.secondaryBtnTxt}>Edit Shop</Text>
                  </TouchableOpacity>
                </View>

                <Modal visible={showShopModal} transparent animationType="slide" onRequestClose={() => setShowShopModal(false)}>
                  <View style={s.modalOverlay}>
                    <View style={s.modalSheet}>
                      <View style={s.modalHandle} />
                      <View style={s.modalHeader}>
                        <Text style={s.modalTitle}>Edit Shop</Text>
                        <TouchableOpacity style={s.modalClose} onPress={() => setShowShopModal(false)}>
                          <Ionicons name="close" size={18} color={Colors.muted} />
                        </TouchableOpacity>
                      </View>
                      <ScrollView showsVerticalScrollIndicator={false} style={s.modalBody}>
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
                        <Text style={s.label}>Shop Address</Text>
                        <TextInput
                          value={shopForm.address}
                          onChangeText={(v) => setShopForm(p => ({ ...p, address: v }))}
                          placeholder="12 Bompai Road, Kano"
                          placeholderTextColor={Colors.muted}
                          style={s.input}
                        />
                        {!!shopForm.address && (
                          <View style={s.addressPreview}>
                            <View style={s.addressBadge}>
                              <Ionicons name="location" size={12} color={Colors.primary} />
                              <Text style={s.addressBadgeTxt}>Map preview</Text>
                            </View>
                            <Text style={s.addressText}>{shopForm.address}</Text>
                            <View style={s.addressBar}>
                              <View style={s.addressPin} />
                            </View>
                          </View>
                        )}
                        <View style={s.logoRow}>
                          {shop.logo_url
                            ? <Image source={{ uri: shop.logo_url }} style={s.shopLogo} />
                            : (
                              <View style={s.shopLogoPlaceholder}>
                                <Ionicons name="storefront-outline" size={18} color={Colors.muted} />
                              </View>
                            )}
                          <TouchableOpacity style={s.logoBtn} onPress={pickShopLogo} disabled={savingLogo}>
                            <Text style={s.logoBtnTxt}>{savingLogo ? 'Uploading…' : (shop.logo_url ? 'Change Logo' : 'Add Logo')}</Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={s.primaryBtn} onPress={updateShop} disabled={updatingShop}>
                          <Text style={s.primaryBtnTxt}>{updatingShop ? 'Saving…' : 'Save Shop'}</Text>
                        </TouchableOpacity>
                      </ScrollView>
                    </View>
                  </View>
                </Modal>

                  <View style={[s.card, Shadow.sm]}>
                    <View style={s.sectionHeaderRow}>
                      <Text style={s.sectionTitle}>Products</Text>
                      <TouchableOpacity style={s.smallBtn} onPress={openCreateProduct}>
                        <Text style={s.smallBtnTxt}>Add Product</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={s.meta}>Create and manage your products.</Text>
                  </View>

                  <Modal visible={showProductModal} transparent animationType="slide" onRequestClose={() => setShowProductModal(false)}>
                    <View style={s.modalOverlay}>
                      <View style={s.modalSheet}>
                        <View style={s.modalHandle} />
                        <View style={s.modalHeader}>
                          <Text style={s.modalTitle}>{editingId ? 'Edit Product' : 'Add Product'}</Text>
                          <TouchableOpacity style={s.modalClose} onPress={() => setShowProductModal(false)}>
                            <Ionicons name="close" size={18} color={Colors.muted} />
                          </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={s.modalBody}>
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
                          <Text style={s.label}>Product Images</Text>
                          <View style={s.imageRow}>
                            <TouchableOpacity style={s.imageBtn} onPress={pickImages}>
                              <Ionicons name="images-outline" size={18} color={Colors.primary} />
                              <Text style={s.imageBtnTxt}>Add Images</Text>
                            </TouchableOpacity>
                            <Text style={s.imageHint}>Up to 6 images</Text>
                          </View>
                          {productImages.length > 0 && (
                            <View style={s.imageGrid}>
                              {productImages.map((img, idx) => (
                                <View key={img.id || img.tempId || `${idx}`} style={s.imageItem}>
                                  <Image source={{ uri: img.url || img.uri }} style={s.imagePreview} />
                                  {idx === 0 && (
                                    <View style={s.coverBadge}>
                                      <Text style={s.coverBadgeTxt}>COVER</Text>
                                    </View>
                                  )}
                                  <View style={s.imageActions}>
                                    <TouchableOpacity
                                      onPress={() => moveImage(idx, -1)}
                                      disabled={idx === 0}
                                      style={[s.imageActionBtn, idx === 0 && s.imageActionDisabled]}
                                    >
                                      <Ionicons name="chevron-back" size={14} color={Colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => moveImage(idx, 1)}
                                      disabled={idx === productImages.length - 1}
                                      style={[s.imageActionBtn, idx === productImages.length - 1 && s.imageActionDisabled]}
                                    >
                                      <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => removeImage(idx)}
                                      style={s.imageActionBtn}
                                    >
                                      <Ionicons name="trash-outline" size={14} color={Colors.sale} />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              ))}
                            </View>
                          )}
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
                            <TouchableOpacity style={s.secondaryBtn} onPress={() => resetProductForm({ closeModal: true })}>
                              <Text style={s.secondaryBtnTxt}>Cancel Edit</Text>
                            </TouchableOpacity>
                          )}
                        </ScrollView>
                      </View>
                    </View>
                  </Modal>

                  <View style={s.list}>
                    <Text style={s.sectionTitle}>Your Products</Text>
                    {products.length === 0 && <Text style={s.empty}>No products yet.</Text>}
                    {products.map(p => (
                      <View key={p.id} style={[s.productRow, Shadow.sm]}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.productName}>{p.name}</Text>
                          <Text style={s.productMeta}>₦{Number(p.price).toLocaleString()} · {p.status}</Text>
                          <Text style={[s.productMeta, Number(p.stock) <= 5 && s.stockLow]}>
                            Stock: {Number(p.stock) || 0}
                          </Text>
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

                  <View style={s.list}>
                    <View style={s.sectionHeaderRow}>
                      <Text style={s.sectionTitle}>Recent Orders</Text>
                      <View style={s.filterRow}>
                        {['all', 'pending', 'processing', 'shipped', 'delivered'].map(f => (
                          <TouchableOpacity
                            key={f}
                            style={[s.filterChip, orderFilter === f && s.filterChipActive]}
                            onPress={() => setOrderFilter(f)}
                          >
                            <Text style={[s.filterChipTxt, orderFilter === f && s.filterChipTxtActive]}>{f}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    {ordersLoading && <Text style={s.loading}>Loading…</Text>}
                    {!ordersLoading && orders.length === 0 && <Text style={s.empty}>No orders yet.</Text>}
                    {!ordersLoading && orders
                      .filter(o => orderFilter === 'all' || o.order?.status === orderFilter)
                      .map((o) => (
                      <TouchableOpacity
                        key={o.id}
                        style={[s.orderRow, Shadow.sm]}
                        onPress={() => navigation.navigate('MerchantOrderDetail', { orderId: o.order?.id, shopId: o.shop_id })}
                        disabled={!o.order?.id}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={s.orderTitle}>{o.product?.name || 'Product'}</Text>
                          <Text style={s.orderMeta}>
                            Qty {o.qty} · ₦{Number(o.total || o.price || 0).toLocaleString()}
                          </Text>
                          <Text style={s.orderMeta}>
                            {o.order?.customer_name ? `Customer: ${o.order.customer_name} · ` : ''}
                            {o.order?.status || 'pending'}{o.order?.payment_status ? ` · ${o.order.payment_status}` : ''}
                          </Text>
                          <View style={s.orderActions}>
                            {['processing', 'shipped', 'delivered'].map(st => (
                              <TouchableOpacity
                                key={st}
                                style={[s.orderActionBtn, o.order?.status === st && s.orderActionBtnActive]}
                                onPress={() => updateOrderStatus(o.order?.id, st)}
                              >
                                <Text style={[s.orderActionTxt, o.order?.status === st && s.orderActionTxtActive]}>{st}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                        <View style={s.orderPill}>
                          <Text style={s.orderPillTxt}>{new Date(o.order?.created_at || o.created_at).toLocaleDateString()}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={s.list}>
                    <View style={s.sectionHeaderRow}>
                      <Text style={s.sectionTitle}>Payments & Reconciliation</Text>
                    </View>
                    {paymentsLoading && <Text style={s.loading}>Loading…</Text>}
                    {!paymentsLoading && payments.length === 0 && <Text style={s.empty}>No payments yet.</Text>}
                    {!paymentsLoading && payments.map((p) => (
                      <View key={p.id} style={[s.orderRow, Shadow.sm]}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.orderTitle}>Order {p.order_id?.slice(0, 8) || '—'}</Text>
                          <Text style={s.orderMeta}>
                            Ref: {p.reference || '—'}
                          </Text>
                          <Text style={s.orderMeta}>
                            Your items: ₦{Number(p.shop_total || 0).toLocaleString()} · Order total: ₦{Number(p.order?.total || p.amount || 0).toLocaleString()}
                          </Text>
                          <Text style={s.orderMeta}>
                            Status: {p.status || p.order?.payment_status || 'pending'}
                          </Text>
                        </View>
                        <View style={s.orderPill}>
                          <Text style={s.orderPillTxt}>{new Date(p.created_at).toLocaleDateString()}</Text>
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
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 11, fontWeight: '700', color: Colors.muted, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: Colors.cream, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, color: Colors.text },
  primaryBtn: { marginTop: 12, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  primaryBtnTxt: { color: Colors.white, fontWeight: '700', fontSize: 12 },
  secondaryBtn: { marginTop: 8, backgroundColor: Colors.goldBg, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  secondaryBtnTxt: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  smallBtn: { backgroundColor: Colors.goldBg, borderRadius: Radius.sm, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: Colors.border },
  smallBtnTxt: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  meta: { fontSize: 11, color: Colors.muted, marginBottom: 6 },
  shopHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  shopLogo: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.cream },
  shopLogoPlaceholder: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
  logoBtn: { backgroundColor: Colors.goldBg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: 8, paddingHorizontal: 10 },
  logoBtnTxt: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '85%' },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, fontFamily: 'serif' },
  modalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modalBody: { paddingBottom: 16 },
  addressPreview: { marginTop: 10, backgroundColor: Colors.goldBg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 10 },
  addressBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  addressBadgeTxt: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  addressText: { fontSize: 11, color: Colors.text, marginBottom: 8 },
  addressBar: { height: 60, borderRadius: 10, backgroundColor: '#E7D9BE', borderWidth: 1, borderColor: Colors.border, position: 'relative', overflow: 'hidden' },
  addressPin: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, position: 'absolute', top: 24, left: 24 },
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
  stockLow: { color: Colors.sale, fontWeight: '700' },
  orderRow: { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  orderTitle: { fontSize: 12, fontWeight: '800', color: Colors.text },
  orderMeta: { fontSize: 10, color: Colors.muted, marginTop: 2 },
  orderActions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  orderActionBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: Colors.goldBg, borderWidth: 1, borderColor: Colors.border },
  orderActionBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  orderActionTxt: { fontSize: 9, fontWeight: '700', color: Colors.primary, textTransform: 'capitalize' },
  orderActionTxtActive: { color: Colors.white },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: Colors.goldBg, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipTxt: { fontSize: 9, fontWeight: '700', color: Colors.primary, textTransform: 'capitalize' },
  filterChipTxtActive: { color: Colors.white },
  orderPill: { backgroundColor: Colors.goldBg, borderRadius: 999, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 8, paddingVertical: 4 },
  orderPillTxt: { fontSize: 9, fontWeight: '700', color: Colors.primary },
  productActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.goldBg, borderWidth: 1, borderColor: Colors.border },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  imageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.goldBg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: 8, paddingHorizontal: 10 },
  imageBtnTxt: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  imageHint: { fontSize: 10, color: Colors.muted },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  imageItem: { width: 88 },
  imagePreview: { width: 88, height: 88, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.cream },
  coverBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  coverBadgeTxt: { fontSize: 8, fontWeight: '800', color: Colors.white },
  imageActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  imageActionBtn: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.goldBg, borderWidth: 1, borderColor: Colors.border },
  imageActionDisabled: { opacity: 0.4 },
});

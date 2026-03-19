import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { CartProvider, useCart } from './src/context/CartContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Colors, Radius } from './src/theme';

import HomeScreen         from './src/screens/HomeScreen';
import BrowseScreen       from './src/screens/BrowseScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import CartScreen         from './src/screens/CartScreen';
import AuthScreen         from './src/screens/AuthScreen';
import ProfileScreen      from './src/screens/ProfileScreen';
import MerchantInviteScreen from './src/screens/MerchantInviteScreen';
import MerchantDashboardScreen from './src/screens/MerchantDashboardScreen';
import ShopScreen from './src/screens/ShopScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import MerchantOrderDetailScreen from './src/screens/MerchantOrderDetailScreen';
import PaymentReturnScreen from './src/screens/PaymentReturnScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Bottom Tab Navigator ──────────────────────────────────────────────────────
function MainTabs() {
  const { count } = useCart();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            HomeTab:    focused ? 'home'       : 'home-outline',
            BrowseTab:  focused ? 'search'     : 'search-outline',
            CartTab:    focused ? 'cart'       : 'cart-outline',
            ProfileTab: focused ? 'person'     : 'person-outline',
          };
          return (
            <View style={{ position:'relative' }}>
              <Ionicons name={icons[route.name]} size={22} color={color} />
              {route.name === 'CartTab' && count > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeTxt}>{count > 9 ? '9+' : count}</Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="HomeTab"    component={HomeScreen}    options={{ tabBarLabel:'Home'    }} />
      <Tab.Screen name="BrowseTab"  component={BrowseScreen}  options={{ tabBarLabel:'Browse'  }} />
      <Tab.Screen name="CartTab"    component={CartScreen}    options={{ tabBarLabel:'Cart'    }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel:'Profile' }} />
    </Tab.Navigator>
  );
}

// ── Root Stack Navigator ──────────────────────────────────────────────────────
function RootNavigator() {
  const { session, loading, isGuest } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <Text style={{ color: Colors.muted, fontSize: 12 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {session || isGuest ? (
        <>
          <Stack.Screen name="Main"          component={MainTabs}   />
          <Stack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="Browse"
            component={BrowseScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="MerchantInvite"
            component={MerchantInviteScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="MerchantDashboard"
            component={MerchantDashboardScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="OrderDetail"
            component={OrderDetailScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="MerchantOrderDetail"
            component={MerchantOrderDetailScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="Shop"
            component={ShopScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="PaymentReturn"
            component={PaymentReturnScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="Payments"
            component={PaymentsScreen}
            options={{ presentation: 'card' }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth"          component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const linking = {
    prefixes: [Linking.createURL('/'), 'arewadrape://'],
    config: {
      screens: {
        PaymentReturn: 'payment/return',
      },
    },
  };

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <NavigationContainer linking={linking}>
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 60,
    paddingBottom: 8,
    paddingTop: 6,
    shadowColor: '#2A1A0E',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeTxt: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
  },
});

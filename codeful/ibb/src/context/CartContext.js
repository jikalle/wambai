import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const getKey = (itemOrId) => {
    if (typeof itemOrId === 'string') return itemOrId;
    if (!itemOrId) return null;
    if (itemOrId.cartItemId) return itemOrId.cartItemId;
    if (itemOrId.selectedImageId) return `${itemOrId.id}:${itemOrId.selectedImageId}`;
    if (itemOrId.selectedImage) return `${itemOrId.id}:${itemOrId.selectedImage}`;
    return itemOrId.id;
  };

  const addItem = (product, qty = 1) => {
    setItems(prev => {
      const cartItemId = getKey(product);
      const existing = prev.find(i => getKey(i) === cartItemId);
      if (existing) {
        return prev.map(i => getKey(i) === cartItemId
          ? {
            ...i,
            qty: i.qty + qty,
            image: product.image || i.image,
            selectedImage: product.selectedImage || i.selectedImage,
            selectedImageIndex: typeof product.selectedImageIndex === 'number' ? product.selectedImageIndex : i.selectedImageIndex,
          }
          : i
        );
      }
      return [...prev, { ...product, cartItemId, qty }];
    });
  };

  const removeItem = (id) => setItems(prev => prev.filter(i => getKey(i) !== id));

  const updateQty = (id, qty) => {
    if (qty < 1) return removeItem(id);
    setItems(prev => prev.map(i => getKey(i) === id ? { ...i, qty } : i));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

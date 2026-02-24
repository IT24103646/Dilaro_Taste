import React, { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  function addToCart(item) {
    setCart(prev => {
      const idx = prev.findIndex(x => x._id === item._id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  function updateQty(id, q) {
    setCart(prev => prev.map(x => x._id === id ? { ...x, quantity: Math.max(1, q) } : x));
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(x => x._id !== id));
  }

  function clearCart() { setCart([]); }

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const count = cart.reduce((s, c) => s + c.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQty, removeFromCart, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

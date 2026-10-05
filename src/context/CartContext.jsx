import React, { createContext, useContext, useState, useEffect } from 'react'
import { getProductCoverImage } from '../utils/productImages'

const CartContext = createContext(null)

const CART_STORAGE_KEY = 'animemax_cart_v1'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      console.error('Failed to parse cart from storage', e)
      return []
    }
  })

  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch (e) {
      console.error('Failed to save cart to storage', e)
    }
  }, [items])

  const addToCart = (product, quantity = 1) => {
    if (!product || !product.in_stock) return false

    setItems((prevItems) => {
      const existing = prevItems.find((item) => item.id === product.id)
      if (existing) {
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, qty: Math.min(item.qty + quantity, product.stock || 99) }
            : item
        )
      }
      return [
        ...prevItems,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: getProductCoverImage(product),
          category: product.category,
          stock: product.stock,
          qty: quantity,
        },
      ]
    })
    setIsCartOpen(true)
    return true
  }

  const updateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId)
      return
    }
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, qty: newQty } : item
      )
    )
  }

  const removeFromCart = (productId) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== productId))
  }

  const clearCart = () => {
    setItems([])
  }

  const cartCount = items.reduce((acc, item) => acc + item.qty, 0)
  const cartTotal = items.reduce((acc, item) => acc + item.price * item.qty, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        cartTotal,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

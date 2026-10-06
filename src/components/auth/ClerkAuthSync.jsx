import React, { useEffect } from 'react'
import { useUser, useClerk, useAuth } from '@clerk/clerk-react'
import { useApp } from '../../context/AppContext'
import { isOwnerUser } from '../../lib/clerkClient'
import { setClerkTokenGetter } from '../../lib/supabaseClient'

/**
 * ClerkAuthSync bridges Clerk's reactive authentication state
 * with AnimeMax's AppContext (mockUser, role, and profile details)
 * and registers Clerk's JWT provider with Supabase client so all
 * operations (especially Admin order queries and updates) have owner credentials.
 */
export default function ClerkAuthSync() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const clerk = useClerk()
  const { setMockUser, registerLogoutHandler, refreshOrders, refreshProducts, refreshCategories } = useApp()

  useEffect(() => {
    if (clerk && registerLogoutHandler) {
      registerLogoutHandler(() => clerk.signOut())
    }
  }, [clerk, registerLogoutHandler])

  // Dynamically wire Clerk JWT token getter to Supabase client
  useEffect(() => {
    if (isLoaded && isSignedIn && typeof getToken === 'function') {
      setClerkTokenGetter(getToken)
      // Sync fresh orders, products, and categories with the newly established authenticated token
      if (refreshOrders) {
        refreshOrders()
      }
      if (refreshProducts) {
        refreshProducts()
      }
      if (refreshCategories) {
        refreshCategories()
      }
    } else if (isLoaded && !isSignedIn) {
      setClerkTokenGetter(null)
    }
  }, [isLoaded, isSignedIn, getToken, refreshOrders, refreshProducts, refreshCategories])

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && user) {
      const isOwner = isOwnerUser(user)
      const role = isOwner ? 'owner' : 'buyer'
      const clerkEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || ''
      const clerkName = user.fullName || user.firstName || (clerkEmail ? clerkEmail.split('@')[0] : 'Valued Buyer')
      const clerkAvatar = user.imageUrl || ''

      setMockUser(prev => {
        if (
          prev?.id === user.id &&
          prev?.role === role &&
          prev?.fullName === clerkName &&
          prev?.primaryEmailAddress?.emailAddress === clerkEmail &&
          prev?.imageUrl === clerkAvatar
        ) {
          return prev
        }
        return {
          id: user.id,
          fullName: clerkName,
          primaryEmailAddress: { emailAddress: clerkEmail },
          imageUrl: clerkAvatar,
          role: role,
          authSource: 'clerk'
        }
      })
    } else if (!isSignedIn) {
      setMockUser(prev => {
        if (prev?.authSource === 'clerk' || (prev?.id && prev?.id.startsWith('user_2'))) {
          return {
            id: null,
            fullName: 'Guest Visitor',
            role: 'guest',
            authSource: null
          }
        }
        return prev
      })
    }
  }, [isLoaded, isSignedIn, user, setMockUser])

  return null
}

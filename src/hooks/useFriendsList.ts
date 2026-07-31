import { useMemo } from 'react'
import { useFriendships } from './useFriendships'
import { useFriendProfiles, type FriendProfile } from './useFriendProfiles'
import type { FriendshipRow } from '../types/supabase'

// Stable reference so `rows` doesn't change identity every render when
// there's no data yet — `friendships ?? []` would otherwise create a new
// array each render and defeat the useMemo calls below.
const EMPTY_FRIENDSHIPS: FriendshipRow[] = []

export interface FriendEntry {
  friendshipId: string
  other: FriendProfile | undefined
}

export interface FriendsList {
  friends: FriendEntry[]
  incomingRequests: FriendEntry[]
  outgoingRequests: FriendEntry[]
  isLoading: boolean
}

// Composes the raw friendship rows with the resolved "other side" profile
// data, split into the three buckets the UI actually renders.
export function useFriendsList(userId: string | undefined): FriendsList {
  const { data: friendships, isLoading: isLoadingFriendships } = useFriendships(userId)

  const rows = friendships ?? EMPTY_FRIENDSHIPS
  const otherUserIds = useMemo(
    () => rows.map((row) => (row.requester_id === userId ? row.addressee_id : row.requester_id)),
    [rows, userId],
  )
  const { data: profilesById, isLoading: isLoadingProfiles } = useFriendProfiles(otherUserIds)

  return useMemo(() => {
    const friends: FriendEntry[] = []
    const incomingRequests: FriendEntry[] = []
    const outgoingRequests: FriendEntry[] = []

    for (const row of rows) {
      const otherId = row.requester_id === userId ? row.addressee_id : row.requester_id
      const entry: FriendEntry = { friendshipId: row.id, other: profilesById?.[otherId] }

      if (row.status === 'accepted') {
        friends.push(entry)
      } else if (row.addressee_id === userId) {
        incomingRequests.push(entry)
      } else {
        outgoingRequests.push(entry)
      }
    }

    return {
      friends,
      incomingRequests,
      outgoingRequests,
      isLoading: isLoadingFriendships || isLoadingProfiles,
    }
  }, [rows, userId, profilesById, isLoadingFriendships, isLoadingProfiles])
}

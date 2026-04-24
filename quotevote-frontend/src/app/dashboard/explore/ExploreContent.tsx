'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useQuery, useSubscription } from '@apollo/client/react'
import { Bell } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import PaginatedPostsList from '@/components/Post/PaginatedPostsList'
import { useAppStore } from '@/store'
import SearchGuestSections from '@/components/SearchContainer/SearchGuestSections'
import DateRangeFilter from '@/components/SearchContainer/DateRangeFilter'
import { SubmitPost } from '@/components/SubmitPost/SubmitPost'
import { cn } from '@/lib/utils'
import { Notification } from '@/components/Notifications/Notification'
import ChatContent from '@/components/Chat/ChatContent'
import { GET_NOTIFICATIONS } from '@/graphql/queries'
import { NEW_NOTIFICATION_SUBSCRIPTION } from '@/graphql/subscriptions'
import type { Notification as NotificationType } from '@/types/notification'

type SortOrder = 'desc' | 'asc' | ''

function NotificationPanel() {
  const userId = useAppStore(
    (state) => (state.user.data._id || state.user.data.id) as string | undefined
  )

  const { loading, data, refetch } = useQuery(GET_NOTIFICATIONS, {
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  })

  useSubscription(NEW_NOTIFICATION_SUBSCRIPTION, {
    variables: { userId: userId || '' },
    skip: !userId,
    onData: async () => { await refetch() },
  })

  const notifications: NotificationType[] =
    loading || !data
      ? []
      : (data as { notifications?: NotificationType[] }).notifications || []

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 shrink-0">
        <Bell className="size-4 text-muted-foreground/60" />
        <span className="text-sm font-semibold text-foreground/80">Notifications</span>
        {notifications.length > 0 && (
          <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none shadow">
            {notifications.length > 99 ? '99+' : notifications.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <Notification
          loading={loading}
          notifications={notifications}
          refetch={refetch}
          pageView
        />
      </div>
    </div>
  )
}

export default function ExploreContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useAppStore((state) => state.user.data)
  const isLoggedIn = !!(user?._id || user?.id)

  const q = searchParams.get('q') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const sortOrder = (searchParams.get('sort') || '') as SortOrder
  const interactions = searchParams.get('interactions') === 'true'
  const friends = searchParams.get('friends') === 'true'

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, val]) => {
        if (val) params.set(key, val)
        else params.delete(key)
      })
      router.replace(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleDateChange = useCallback(
    (newFrom: string, newTo: string) => {
      updateParams({ from: newFrom || null, to: newTo || null })
    },
    [updateParams]
  )

  const handleSortCycle = useCallback(() => {
    const next: SortOrder = sortOrder === '' ? 'desc' : sortOrder === 'desc' ? 'asc' : ''
    updateParams({ sort: next || null })
  }, [sortOrder, updateParams])

  const handleToggleInteractions = useCallback(() => {
    updateParams({ interactions: interactions ? null : 'true' })
  }, [interactions, updateParams])

  const handleToggleFriends = useCallback(() => {
    updateParams({ friends: friends ? null : 'true' })
  }, [friends, updateParams])

  const hasDateFilter = !!(from || to)
  const hasAnyFilter = interactions || friends || sortOrder !== '' || hasDateFilter || !!q

  const filterIconBtn = (active: boolean) =>
    cn(
      'flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all shadow-sm min-w-[56px] hover:scale-[1.02] cursor-pointer',
      active
        ? 'border-primary bg-primary/10'
        : 'border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/40'
    )

  return (
    <div className="-mx-4 -mt-6 md:-mx-4 flex min-h-screen">

      {/* ── Left: Notifications panel (lg+ only) ─────────────────────── */}
      {isLoggedIn && (
        <aside className="hidden lg:flex flex-col w-[300px] xl:w-[340px] shrink-0 border-r border-border bg-background">
          <div className="sticky top-[60px] h-[calc(100vh-60px)] overflow-hidden flex flex-col">
            <NotificationPanel />
          </div>
        </aside>
      )}

      {/* ── Center: Posts feed ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">

        {/* Logo + tagline */}
        <div className="flex flex-col items-center py-8 px-4 border-b border-border">
          <Image
            src="/assets/QuoteVoteLogo.png"
            alt="QuoteVote"
            width={200}
            height={60}
            className="mb-3 dark:hidden"
            priority
          />
          <span className="hidden dark:block mb-3 text-[2.5rem] font-black tracking-tight text-white leading-none select-none">
            QUOTE.VOTE
          </span>
          <p className="text-sm text-muted-foreground text-center">
            No algorithms. No ads. Just conversations.
          </p>
        </div>

        {/* Sticky filters */}
        <div className="sticky top-[56px] md:top-[60px] z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="px-4 py-3">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSubmitDialogOpen(true)}
                title="Create a quote"
                className={filterIconBtn(false)}
              >
                <span className="text-base leading-none">✍️</span>
                <span className="text-[10px] text-muted-foreground font-medium">Write</span>
              </button>

              {isLoggedIn && (
                <button
                  type="button"
                  onClick={handleToggleFriends}
                  title={friends ? 'Showing friends posts' : 'Show posts from people you follow'}
                  className={filterIconBtn(friends)}
                >
                  <span className="text-base leading-none">👥</span>
                  <span className="text-[10px] font-medium">Friends</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleInteractions}
                title="Sort by most interactions"
                className={filterIconBtn(interactions)}
              >
                <span className="text-base leading-none">🧲</span>
                <span className="text-[10px] font-medium">Popular</span>
              </button>

              <button
                type="button"
                onClick={handleSortCycle}
                title={
                  sortOrder === ''
                    ? 'Default order'
                    : sortOrder === 'desc'
                      ? 'Newest first'
                      : 'Oldest first'
                }
                className={filterIconBtn(sortOrder !== '')}
              >
                <span className="text-base leading-none">{sortOrder === 'asc' ? '⏳' : '⌛'}</span>
                <span className="text-[10px] font-medium">
                  {sortOrder === 'asc' ? 'Oldest' : sortOrder === 'desc' ? 'Newest' : 'Sort'}
                </span>
              </button>

              <DateRangeFilter startDate={from} endDate={to} onDateChange={handleDateChange} />
            </div>

            {hasAnyFilter && (
              <div className="mt-3 flex flex-wrap gap-1.5 justify-center text-xs">
                {q && (
                  <span className="bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                    🔍 &quot;{q}&quot;
                  </span>
                )}
                {friends && (
                  <span className="bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                    👥 Friends Only
                  </span>
                )}
                {interactions && (
                  <span className="bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                    🧲 By Interactions
                  </span>
                )}
                {sortOrder === 'desc' && (
                  <span className="bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                    ⌛ Newest First
                  </span>
                )}
                {sortOrder === 'asc' && (
                  <span className="bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                    ⏳ Oldest First
                  </span>
                )}
                {hasDateFilter && (
                  <span className="bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                    📅 {from || '…'} — {to || '…'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Result count */}
        {totalCount > 0 && hasAnyFilter && (
          <div className="px-4 pt-3">
            <p className="text-sm font-medium text-muted-foreground text-center">
              {totalCount.toLocaleString()} {totalCount === 1 ? 'result' : 'results'} found
            </p>
          </div>
        )}

        {/* Posts feed */}
        <PaginatedPostsList
          defaultPageSize={20}
          maxVisiblePages={5}
          searchKey={q}
          startDateRange={from || undefined}
          endDateRange={to || undefined}
          sortOrder={sortOrder || undefined}
          interactions={interactions}
          friendsOnly={isLoggedIn ? friends : false}
          onTotalCountChange={setTotalCount}
        />

        {/* Guest sections */}
        <div className="px-4">
          <SearchGuestSections />
        </div>
      </div>

      {/* ── Right: Messaging panel (xl+ only) ────────────────────────── */}
      {isLoggedIn && (
        <aside className="hidden xl:flex flex-col w-[360px] 2xl:w-[420px] shrink-0 border-l border-border bg-background">
          <div className="sticky top-[60px] h-[calc(100vh-60px)] overflow-hidden flex flex-col">
            <ChatContent />
          </div>
        </aside>
      )}

      {/* Create Quote Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-md p-0" showCloseButton={false}>
          <DialogTitle className="sr-only">Create Quote</DialogTitle>
          <SubmitPost setOpen={setSubmitDialogOpen} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

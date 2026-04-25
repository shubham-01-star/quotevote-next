'use client'

import { useQuery, useMutation } from '@apollo/client/react'
import moment from 'moment'
import { AlertCircle, Loader2, Flag, User, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { GET_USER_REPORTS } from '@/graphql/queries'
import { DISABLE_USER } from '@/graphql/mutations'
import { replaceGqlError } from '@/lib/utils/replaceGqlError'
import type { UserReport } from '@/types/admin'

function ReasonBadge({ reason }: { reason?: string }) {
  const label = (reason || 'N/A').replace(/_/g, ' ')
  return (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-muted/50 text-muted-foreground border-border capitalize">
      {label}
    </span>
  )
}

export default function UserReportsTab() {
  const { data, loading, error, refetch } = useQuery<{
    getUserReports: UserReport[]
  }>(GET_USER_REPORTS, {
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network',
  })

  const [disableUser, { loading: disableLoading }] = useMutation(DISABLE_USER)

  const handleDisable = async (userId: string, username: string) => {
    try {
      await disableUser({ variables: { userId } })
      toast.success(`User @${username} has been disabled`)
      refetch()
    } catch (err) {
      toast.error(replaceGqlError(err instanceof Error ? err.message : 'Failed to disable user'))
    }
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-5">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="size-4" />
          <p className="text-sm font-semibold">Error loading reports</p>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {error.message?.includes('Authentication') ? 'Please log in to view reports.' : error.message}
        </p>
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  const reports = data.getUserReports || []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
          <Flag className="size-4 text-red-500" />
        </div>
        <div>
          <p className="text-xl font-bold tabular-nums">{reports.length}</p>
          <p className="text-xs text-muted-foreground">
            {reports.length === 1 ? 'report' : 'reports'} pending review
          </p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card flex flex-col items-center justify-center py-16 gap-3">
          <div className="size-14 rounded-2xl bg-[#52b274]/10 flex items-center justify-center">
            <Flag className="size-7 text-[#52b274]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">No reports</p>
            <p className="text-xs text-muted-foreground mt-1">User reports will appear here</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reported User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reported By</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reason</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {reports.map((report) => (
                  <tr key={report._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full bg-red-500/10 flex items-center justify-center text-xs font-bold text-red-500 shrink-0">
                          {(report.reportedUser?.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold">@{report.reportedUser?.username || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <User className="size-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">@{report.reportedBy?.username || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <ReasonBadge reason={report.reason} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {moment(report.created).format('MMM DD, YYYY')}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refetch()}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Dismiss
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              disabled={disableLoading}
                              className="border border-red-200 bg-transparent text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:hover:bg-red-950 gap-1"
                            >
                              <ShieldOff className="size-3" />
                              Disable
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disable @{report.reportedUser?.username}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will prevent them from logging in. This action can be reversed later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDisable(report.reportedUser?._id, report.reportedUser?.username)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {disableLoading && <Loader2 className="mr-1 size-3 animate-spin" />}
                                Disable User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border/40">
            {reports.map((report) => (
              <div key={report._id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-red-500/10 flex items-center justify-center text-xs font-bold text-red-500 shrink-0">
                      {(report.reportedUser?.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">@{report.reportedUser?.username || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">by @{report.reportedBy?.username || 'Unknown'}</p>
                    </div>
                  </div>
                  <ReasonBadge reason={report.reason} />
                </div>
                <p className="text-xs text-muted-foreground">{moment(report.created).format('MMM DD, YYYY')}</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => refetch()}>
                    Dismiss
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        className="flex-1 border border-red-200 bg-transparent text-red-600 hover:bg-red-50 dark:border-red-900"
                        disabled={disableLoading}
                      >
                        Disable
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disable @{report.reportedUser?.username}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will prevent them from logging in. This action can be reversed later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDisable(report.reportedUser?._id, report.reportedUser?.username)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Disable User
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { useMutation } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ADD_COMMENT } from '@/graphql/mutations'
import { useAppStore } from '@/store/useAppStore'
import { toast } from 'sonner'
import useGuestGuard from '@/hooks/useGuestGuard'
import { cn } from '@/lib/utils'

interface CommentInputProps {
  actionId: string // The ID of the post/action being commented on
  onSuccess?: () => void
}

interface AddCommentData {
  addComment: {
    _id: string
    userId: string
    content: string
    created: string
    user: {
      _id: string
      username: string
      avatar: string
    }
  }
}

export default function CommentInput({
  actionId,
  onSuccess
}: CommentInputProps) {
  const [content, setContent] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const userId = useAppStore((state) => state.user.data.id || state.user.data._id)
  const ensureAuth = useGuestGuard()

  const [addComment, { loading }] = useMutation<AddCommentData>(ADD_COMMENT, {
    update(cache, { data }) {
      if (!data?.addComment) return

      cache.modify({
        fields: {
          comments(existing = []) {
            const newCommentRef = cache.writeFragment({
              data: data.addComment,
              fragment: gql`
                fragment NewComment on Comment {
                  _id
                  userId
                  content
                  created
                  user {
                    _id
                    username
                    avatar
                  }
                }
              `
            })
            return [newCommentRef, ...existing]
          }
        }
      })
    }
  })

  const handleSubmit = async () => {
    if (!content.trim()) return
    if (!ensureAuth()) return

    try {
      await addComment({
        variables: {
          comment: {
            actionId,
            userId,
            content
          }
        }
      })
      toast.success('Comment posted!')
      setContent('')
      if (onSuccess) onSuccess()
    } catch (err: unknown) {
      toast.error(`Error: ${(err as Error).message}`)
    }
  }

  return (
    <div className={cn(
      "flex flex-col gap-2 w-full",
      isFocused && "ring-1 ring-ring rounded-md p-1"
    )}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => !content && setIsFocused(false)}
        placeholder="Write a comment..."
        className="min-h-[80px] resize-none border-none focus-visible:ring-0 bg-transparent"
      />

      {(isFocused || content) && (
        <div className="flex justify-end gap-2 px-2 pb-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Post
          </Button>
        </div>
      )}
    </div>
  )
}

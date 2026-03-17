'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@apollo/client/react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { LOGIN_MUTATION } from '@/graphql/mutations'
import { setToken } from '@/lib/auth'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { replaceGqlError } from '@/lib/utils/replaceGqlError'
import type { AuthUser } from '@/types/auth'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})
type LoginFormData = z.infer<typeof loginSchema>

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
      Sign In
    </Button>
  )
}

export default function LoginPageContent() {
  const router = useRouter()
  const setUserData = useAppStore((s) => s.setUserData)
  const [loginMutation] = useMutation(LOGIN_MUTATION)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values: LoginFormData) => {
    try {
      const { data } = await loginMutation({
        variables: { username: values.email, password: values.password },
      })
      const result = (data as { login?: { token: string; user: AuthUser } } | undefined)?.login
      if (result?.token) {
        setToken(result.token)
        setUserData(result.user as unknown as Record<string, unknown>)
        router.push('/dashboard/search')
      }
    } catch (error) {
      toast.error(replaceGqlError(error instanceof Error ? error.message : 'Login failed'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-muted-foreground text-sm">Welcome back to Quote.Vote</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
        <SubmitButton />
      </form>
      <div className="space-y-2 text-center text-sm">
        <Link href="/auths/forgot-password" className="text-primary hover:underline block">
          Forgot password?
        </Link>
        <p className="text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/auths/request-access" className="text-primary hover:underline">
            Request access
          </Link>
        </p>
      </div>
    </div>
  )
}

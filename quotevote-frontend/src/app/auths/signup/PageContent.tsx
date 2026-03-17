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
import { SIGNUP_MUTATION } from '@/graphql/mutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { replaceGqlError } from '@/lib/utils/replaceGqlError'

const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Min 3 chars')
      .max(20)
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores'),
    email: z.string().email('Invalid email'),
    password: z
      .string()
      .min(8, 'Min 8 chars')
      .regex(
        /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Must contain uppercase, lowercase, and number'
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignupFormData = z.infer<typeof signupSchema>

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
      Create Account
    </Button>
  )
}

export default function SignupPageContent() {
  const router = useRouter()
  const [signupMutation] = useMutation(SIGNUP_MUTATION)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (values: SignupFormData) => {
    try {
      await signupMutation({
        variables: {
          username: values.username,
          email: values.email,
          password: values.password,
        },
      })
      toast.success('Account created! Please sign in.')
      router.push('/auths/login')
    } catch (error) {
      toast.error(replaceGqlError(error instanceof Error ? error.message : 'Signup failed'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="text-muted-foreground text-sm">Join Quote.Vote</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" placeholder="johndoe" {...register('username')} />
          {errors.username && (
            <p className="text-sm text-destructive">{errors.username.message}</p>
          )}
        </div>
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
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
        <SubmitButton />
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auths/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

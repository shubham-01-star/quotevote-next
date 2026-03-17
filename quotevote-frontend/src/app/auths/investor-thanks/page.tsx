import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Thank You — Quote.Vote',
}

export default function InvestorThanksPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-6">
        <Image
          src="/icons/android-chrome-192x192.png"
          alt="Quote.Vote"
          width={64}
          height={64}
          className="mx-auto"
        />
        <h1 className="text-3xl font-bold">Thank You!</h1>
        <p className="text-muted-foreground leading-relaxed">
          Thank you for your interest in Quote.Vote. We&apos;ve added you to our mailing list
          and will be in touch soon.
        </p>
        <Link href="/" className="inline-block text-primary hover:underline font-medium">
          Back to Home
        </Link>
      </div>
    </div>
  )
}

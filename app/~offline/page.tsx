export const metadata = {
  title: 'Offline — Barterkin',
}

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-sage-bg text-forest-deep p-6">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-3xl mb-4">You&apos;re offline</h1>
        <p className="text-forest-mid">
          Barterkin will be back when your connection returns. Your session and any in-progress
          messages are preserved on your device.
        </p>
      </div>
    </main>
  )
}

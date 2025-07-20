'use client'

export default function DebugPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Debug</h1>
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-semibold mb-2">Client-side Environment Variables:</h2>
        <ul className="space-y-2">
          <li><strong>NEXT_PUBLIC_SOCKET_URL:</strong> {process.env.NEXT_PUBLIC_SOCKET_URL || 'undefined'}</li>
          <li><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</li>
          <li><strong>VERCEL_ENV:</strong> {process.env.VERCEL_ENV || 'undefined'}</li>
        </ul>
        
        <h2 className="font-semibold mb-2 mt-4">All NEXT_PUBLIC Variables:</h2>
        <pre className="text-sm bg-white p-2 rounded overflow-auto">
          {JSON.stringify(
            Object.keys(process.env)
              .filter(key => key.startsWith('NEXT_PUBLIC'))
              .reduce((obj, key) => {
                obj[key] = process.env[key]
                return obj
              }, {} as Record<string, string>),
            null, 
            2
          )}
        </pre>
      </div>
    </div>
  )
}

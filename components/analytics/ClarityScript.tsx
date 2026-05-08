'use client'

import Script from 'next/script'

/**
 * Microsoft Clarity — heatmaps, session recordings, and usage analytics.
 *
 * Set NEXT_PUBLIC_CLARITY_PROJECT_ID in your Vercel env vars.
 * Get your project ID from https://clarity.microsoft.com after creating a project.
 *
 * No-op when the env var is missing (safe for local dev and preview deploys).
 */
export function ClarityScript() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID

  if (!projectId) {
    return null
  }

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${projectId}");
        `,
      }}
    />
  )
}

import type { Metadata } from 'next';
import Script from 'next/script';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import { manrope } from '@/lib/fonts';
import { getSiteSettings } from '@/lib/data/siteSettings';
import { getFooterData } from '@/lib/data/footer';
import { OrganizationJsonLd } from '@/lib/seo';
import { resolveSiteAssetUrl, SITE_URL } from '@/lib/siteUrl';
import '@/app/globals.css';

// Safety net so the DB-backed Footer picks up admin edits (or a newly
// connected database) within a few minutes even without an explicit
// revalidatePath call.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, ogImageUrl] = await Promise.all([
    getSiteSettings(),
    resolveSiteAssetUrl('/social-preview.jpg'),
  ]);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: 'Savannah Age Management Medicine | Medical Aesthetics in Pooler, GA',
      template: '%s | Savannah Age Management Medicine',
    },
    description: settings.description,
    // Site-wide default — a route's SEO setting of "Inherit site default"
    // resolves to this (index, follow) unless a page overrides it.
    robots: { index: true, follow: true },
    icons: {
      icon: settings.faviconUrl || '/favicon.ico',
      shortcut: settings.faviconUrl || '/favicon.ico',
      apple: settings.faviconUrl || '/favicon.ico',
    },
    openGraph: {
      title: 'Savannah Age Management Medicine',
      description:
        'Redefining beauty with precision and care — medical-grade aesthetics tailored to you.',
      type: 'website',
      siteName: 'Savannah Age Management Medicine',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 640,
          alt: 'Savannah Age Management Medicine — Redefining Beauty With Precision And Care',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImageUrl],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, footer] = await Promise.all([getSiteSettings(), getFooterData()]);

  // Env fallback so GA never silently disappears if the DB settings row is
  // empty or the DB is unreachable.
  const gaId = settings.googleAnalyticsId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

  return (
    <html
      lang="en"
      className={manrope.variable}
      style={{ '--font-playfair': "'Bodoni-72', sans-serif" } as React.CSSProperties}
    >
      <head>
        {/* Without JS the scroll-reveal elements must not stay hidden. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>

        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');`}
            </Script>
          </>
        )}

        {settings.metaPixelId && (
          <Script id="meta-pixel-init" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${settings.metaPixelId}');
              fbq('track', 'PageView');`}
          </Script>
        )}

        {/* Admin-authored only (never public user input) — same trust
            boundary as the JSON-LD injection in lib/seo.tsx. Browsers still
            parse and execute embedded <script> tags here even though a
            container element isn't strictly valid inside <head>. */}
        {settings.headerTrackingCode && (
          // eslint-disable-next-line react/no-danger
          <div dangerouslySetInnerHTML={{ __html: settings.headerTrackingCode }} />
        )}

        <OrganizationJsonLd
          name={settings.name}
          description={settings.description}
          phone={settings.phone}
          email={settings.email}
          address={settings.address}
          locations={footer.locations}
          socials={footer.socials}
        />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Header logoUrl={settings.logoUrl || undefined} />
        <main id="main">{children}</main>
        <Footer />

        {settings.footerTrackingCode && (
          // eslint-disable-next-line react/no-danger
          <div dangerouslySetInnerHTML={{ __html: settings.footerTrackingCode }} />
        )}
      </body>
    </html>
  );
}

import { type ClassValue, clsx } from "clsx"
import { Metadata } from "next"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function absoluteUrl(path: string) {
  // means client side
  if (typeof window !== 'undefined') return path

  // in server side
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL}${path}`
  return `http://localhost:${
    process.env.PORT ?? 3000
  }${path}`
}

// VERY IMP: for seo, fav icon, make our website look good while sharing with thumbnails
export function constructMetadata({
  title = "PDF Ai reader - The SaaS for students",
  description = "PDF Ai reader is an open-source software to make chatting to your PDF files easy using power of Ai",
  image = "/thumbnail.ng",
  icons = "/favicon.ico",
  // allow the search engine to crawl and index our website to show up in search
  noIndex = false 
}: {
  title?: string,
  description?: string,
  image?: string,
  icons?: string,
  noIndex?:boolean
} = {}): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images:[
        {
          url:image,
        }
      ]
    },
    // for sharing my website in twitter
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: "@Rajeeb321"
    },
    icons,
    metadataBase: new URL('https://pdfaireader.vercel.app'),
    themeColor: '#FFF',
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      }
    })
  }
}

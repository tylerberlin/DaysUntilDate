import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Days Until Date',
    description: 'Calculate how many days remain until your favorite holidays or events',
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body className="m-0 p-0">{children}</body>
        </html>
    )
}
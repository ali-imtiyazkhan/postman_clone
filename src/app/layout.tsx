// import type { Metadata } from "next";
// import { Poppins } from "next/font/google";
// import "./globals.css";
// import { ThemeProvider } from "@/components/theme-provider";
// import { Toaster } from "sonner";
// import { QueryProvider } from "@/components/query-provider";
// import { HotkeysProviders } from "@/components/hot-key-provider";


// const poppins = Poppins({
//   subsets:["latin"],
//   weight: ["100", "200", "300", "400", "500", "600", "700" , "800", "900"],
// })

// export const metadata: Metadata = {
//   title: "PostBoy",
//   description: "A modern API client for developers.",
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en" suppressHydrationWarning>
//       <body
//         className={`${poppins.className} antialiased`}
//       >
//         <QueryProvider>
//           <ThemeProvider attribute={"class"} defaultTheme="system" enableSystem>
//             <HotkeysProviders>
//               <Toaster />
//               {children}
//             </HotkeysProviders>

//           </ThemeProvider>
//         </QueryProvider>

//       </body>
//     </html>
//   );
// }

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My App',
  description: 'A simple Next.js app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}

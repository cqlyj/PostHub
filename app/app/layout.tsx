"use client";

import "./globals.css";
import { PrivyProvider } from "@privy-io/react-auth";
import { SeniorModeProvider } from "@/components/SeniorModeProvider";
import { NotificationProvider } from "@/utils/notifications";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PrivyProvider
          appId="cmcpj6kie01lwjv0mklw5easa"
          config={{
            // Create embedded wallets for users who don't have a wallet
            embeddedWallets: {
              ethereum: {
                createOnLogin: "users-without-wallets",
              },
            },
          }}
        >
          <NotificationProvider>
            <SeniorModeProvider>{children}</SeniorModeProvider>
          </NotificationProvider>
        </PrivyProvider>
      </body>
    </html>
  );
}

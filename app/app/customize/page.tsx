"use client";

import React, { useMemo } from "react";
import { SelfQRcodeWrapper, SelfAppBuilder } from "@selfxyz/qrcode";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

const CustomizePage = () => {
  const { user } = usePrivy();
  const router = useRouter();
  const [completed, setCompleted] = React.useState(false);

  React.useEffect(() => {
    if (completed) {
      router.push("/explore");
    }
  }, [completed, router]);

  const selfApp = useMemo(() => {
    if (!user) return null;
    const address = user.wallet?.address;

    return new SelfAppBuilder({
      appName: "PostHub",
      scope: "posthub", // Must match backend/on-chain verifier
      endpoint: "0x1bA052BD126d7C5EE3A4baEAF51e3cc2eeBd32D7",
      endpointType: "staging_celo",
      userId: address, // Use wallet address for on-chain verification
      userIdType: "hex", // use 'hex' for ethereum address or 'uuid' for uuidv4
      version: 2, // V2 configuration
      disclosures: {
        date_of_birth: true,
        nationality: true,
        gender: true,
      },
      devMode: true, // Set to true for development/testing, false for production
      userDefinedData: "0x",
    }).build();
  }, [user]);

  if (!selfApp) {
    return (
      <main className="min-h-screen flex items-center justify-center animated-gradient p-4 text-center">
        <h1 className="text-2xl font-semibold text-[var(--primary)] animate-pulse">
          Loading verification...
        </h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center animated-gradient p-4 text-center">
      <div className="bg-white/80 backdrop-blur-md px-8 py-12 rounded-xl shadow-2xl flex flex-col items-center gap-6 fade-in-up w-full max-w-md">
        <h2 className="text-3xl font-bold text-[var(--primary)]">
          Customize Your Experience
        </h2>
        <p className="text-sm text-[var(--muted-text)]">
          Scan the QR code with the Self app to customize your experience.
        </p>
        {!completed && (
          <>
            <SelfQRcodeWrapper
              selfApp={selfApp}
              size={300}
              onSuccess={() => setCompleted(true)}
              onError={() => setCompleted(true)}
            />
            <button
              onClick={() => setCompleted(true)}
              className="mt-4 text-[var(--primary)] underline hover:opacity-80"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </main>
  );
};

export default CustomizePage;

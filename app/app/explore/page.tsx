"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";

// Customization contract on Flow Mainnet EVM
const CONTRACT_ADDRESS = "0x1bA052BD126d7C5EE3A4baEAF51e3cc2eeBd32D7";
// Celo Alfajores testnet RPC
const CELO_TESTNET_RPC = "https://alfajores-forno.celo-testnet.org";

// Minimal ABI to read user type mapping in Customization contract
const ABI = ["function s_userType(address) view returns (uint8)"]; // mapping(address => uint8)

const USER_TYPE_LABELS = [
  "RESTRICTED_MINOR_MALE",
  "RESTRICTED_MINOR_FEMALE",
  "RESTRICTED_ADULT_MALE",
  "RESTRICTED_ADULT_FEMALE",
  "RESTRICTED_SENIOR_MALE",
  "RESTRICTED_SENIOR_FEMALE",
  "MINOR_MALE",
  "MINOR_FEMALE",
  "ADULT_MALE",
  "ADULT_FEMALE",
  "SENIOR_MALE",
  "SENIOR_FEMALE",
];

const ExplorePage = () => {
  const { user, logout, authenticated } = usePrivy();
  const [userType, setUserType] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Detect wallet disconnection and force logout
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    const ethereum = (window as any).ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0 && authenticated) {
        logout();
      }
    };
    const handleDisconnect = () => {
      if (authenticated) logout();
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("disconnect", handleDisconnect);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("disconnect", handleDisconnect);
    };
  }, [authenticated, logout]);

  // Redirect unauthenticated users back to home
  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  useEffect(() => {
    const fetchUserType = async () => {
      if (!user?.wallet?.address || !window.ethereum) return;
      try {
        // Always read from the Celo testnet
        const provider = new ethers.JsonRpcProvider(CELO_TESTNET_RPC);
        // Fetch user type directly via contract call
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        const indexNum = Number(await contract.s_userType(user.wallet.address));
        const label = USER_TYPE_LABELS[indexNum] ?? `Unknown (${indexNum})`;
        setUserType(label);
      } catch (err) {
        console.error("Failed to fetch user type", err);
      }
    };

    fetchUserType();
  }, [user]);

  return (
    <main className="min-h-screen flex items-center justify-center animated-gradient p-4 text-center">
      <div className="bg-white/80 backdrop-blur-md px-10 py-14 rounded-xl shadow-2xl flex flex-col items-center gap-6 fade-in-up w-full max-w-lg">
        <h1 className="text-4xl font-bold text-blue-800">
          Welcome to PostHub Exploration
        </h1>
        {userType ? (
          <p className="text-2xl text-blue-700">
            Your user type: <span className="font-semibold">{userType}</span>
          </p>
        ) : (
          <p className="text-blue-700 animate-pulse">
            Fetching your user type...
          </p>
        )}
      </div>
    </main>
  );
};

export default ExplorePage;

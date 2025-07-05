"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { fetchVerification } from "@/utils/verification";

interface SeniorCtx {
  isSenior: boolean;
}

const SeniorContext = createContext<SeniorCtx>({ isSenior: false });

export const SeniorModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = usePrivy();
  const [isSenior, setIsSenior] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!user?.wallet?.address) {
        setIsSenior(false);
        // remove any existing class
        document.documentElement.classList.remove("senior-mode");
        return;
      }
      const info = await fetchVerification(user.wallet.address);
      const senior = [4, 5, 10, 11].includes(info.userType);
      setIsSenior(senior);
      if (senior) {
        document.documentElement.classList.add("senior-mode");
      } else {
        document.documentElement.classList.remove("senior-mode");
      }
    };
    check();
  }, [user]);

  return (
    <SeniorContext.Provider value={{ isSenior }}>
      {children}
    </SeniorContext.Provider>
  );
};

export const useSenior = () => useContext(SeniorContext);

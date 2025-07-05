import { JsonRpcProvider, Contract } from "ethers";

const CELO_RPC =
  process.env.NEXT_PUBLIC_CELO_RPC ??
  "https://alfajores-forno.celo-testnet.org";
const CUSTOMIZATION_ADDRESS =
  (process.env.NEXT_PUBLIC_CUSTOMIZATION_CONTRACT as
    | `0x${string}`
    | undefined) ?? "0xbd0Efe0890B8107fDa1495754ccb25FdbCCcE2aF";

// Minimal ABI for the mapping getters
const ABI = [
  "function s_userNationality(address) view returns (string)",
  "function s_userType(address) view returns (uint8)",
];

const provider = new JsonRpcProvider(CELO_RPC);
const contract = CUSTOMIZATION_ADDRESS
  ? new Contract(CUSTOMIZATION_ADDRESS, ABI, provider)
  : null;

type VerificationInfo = {
  verified: boolean;
  nationality: string;
  userType: number;
};

export async function fetchVerification(
  address: string
): Promise<VerificationInfo> {
  if (!contract) {
    return { verified: false, nationality: "", userType: 0 };
  }
  try {
    const [nation, utype] = await Promise.all([
      contract!.s_userNationality(address),
      contract!.s_userType(address),
    ]);
    return {
      verified: nation !== "",
      nationality: nation,
      userType: Number(utype),
    };
  } catch {
    return { verified: false, nationality: "", userType: 0 };
  }
}

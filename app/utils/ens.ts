import { JsonRpcProvider } from "ethers";

// Public mainnet provider (Cloudflare gateway)
const provider = new JsonRpcProvider("https://cloudflare-eth.com");

export async function resolveENS(address: string): Promise<string | null> {
  try {
    const name = await provider.lookupAddress(address);
    return name;
  } catch {
    return null;
  }
}
 
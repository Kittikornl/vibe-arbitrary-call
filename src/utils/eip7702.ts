import { WalletProvider } from '../types/wallet';

// Check if an address has contract code deployed (EIP-7702 detection)
export const checkAddressHasCode = async (
  provider: WalletProvider,
  address: string
): Promise<boolean> => {
  try {
    const code = await provider.request({
      method: 'eth_getCode',
      params: [address, 'latest']
    });
    
    // If code is not '0x' or '0x0', then the address has contract code
    return code !== '0x' && code !== '0x0';
  } catch (error) {
    return false;
  }
};

// Detect if user is EIP-7702 user (EOA with contract code)
export const detectEIP7702User = async (
  provider: WalletProvider,
  userAddress: string
): Promise<boolean> => {
  try {
    // Check if the user's address has contract code deployed
    const hasCode = await checkAddressHasCode(provider, userAddress);
    return hasCode;
  } catch (error) {
    return false;
  }
};

 
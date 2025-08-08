import { WalletProvider, TransactionRequest, TransactionResult, NetworkInfo, WalletState } from '../types/wallet';

// Cache for wallet detection
let cachedProvider: WalletProvider | null = null;

// Common networks
export const NETWORKS: Record<string, NetworkInfo> = {
  '1': {
    chainId: '1',
    name: 'Ethereum Mainnet',
    blockExplorer: 'https://etherscan.io',
    currencySymbol: 'ETH'
  },
  '56': {
    chainId: '56',
    name: 'BNB Smart Chain',
    blockExplorer: 'https://bscscan.com',
    currencySymbol: 'BNB'
  },
  '8453': {
    chainId: '8453',
    name: 'Base',
    blockExplorer: 'https://basescan.org',
    currencySymbol: 'ETH'
  }
};

// Detect if Rabby wallet is available - Rabby specific only
export const detectRabbyWallet = (): WalletProvider | null => {
  // Return cached provider if already detected
  if (cachedProvider) {
    return cachedProvider;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Only check for Rabby wallet specifically
    if (window.rabby) {
      cachedProvider = window.rabby;
      return cachedProvider;
    }

    // Check if window.ethereum is specifically Rabby
    if (window.ethereum) {
      const provider = window.ethereum;
      
      // Only return if it's specifically Rabby wallet
      if (provider.isRabby === true) {
        cachedProvider = provider;
        return cachedProvider;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

// Clear wallet cache (useful for testing or when wallet state changes)
export const clearWalletCache = () => {
  cachedProvider = null;
};

// Connect to Rabby wallet using official DApp connection
export const connectWallet = async (): Promise<{
  provider: WalletProvider;
  account: string;
  chainId: string;
}> => {
  const provider = detectRabbyWallet();
  
  if (!provider) {
    throw new Error('Rabby wallet not detected. Please install Rabby wallet extension.');
  }

  try {
    // Check if already connected first
    const currentAccounts = await provider.request({
      method: 'eth_accounts'
    });

    let accounts;
    if (currentAccounts && currentAccounts.length > 0) {
      // Already connected, use existing accounts
      accounts = currentAccounts;
    } else {
      // Request new connection
      accounts = await provider.request({
        method: 'eth_requestAccounts'
      });
    }

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock your Rabby wallet.');
    }

    // Get current chain ID
    const hexChainId = await provider.request({
      method: 'eth_chainId'
    });
    
    // Convert hex chainId to decimal
    const chainId = parseInt(hexChainId, 16).toString();

    return {
      provider,
      account: accounts[0],
      chainId
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to connect to Rabby wallet: ${error.message}`);
    } else {
      throw new Error('Failed to connect to Rabby wallet: Unknown error');
    }
  }
};

// Get available wallets (Rabby only)
export const getAvailableWallets = (): { name: string; provider: WalletProvider }[] => {
  const wallets = [];
  
  try {
    // Only check for Rabby wallet
    if (window.rabby) {
      wallets.push({ name: 'Rabby', provider: window.rabby });
    }
    
    if (window.ethereum) {
      const provider = window.ethereum;
      if (provider.isRabby === true) {
        wallets.push({ name: 'Rabby', provider });
      }
    }
  } catch (error) {
    // Silent fail for wallet detection
  }
  
  return wallets;
};

// Send transaction
export const sendTransaction = async (
  provider: WalletProvider,
  transaction: TransactionRequest
): Promise<TransactionResult> => {
  try {
    // Get current account
    const accounts = await provider.request({
      method: 'eth_accounts'
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts connected');
    }

    // Prepare transaction
    const txParams = {
      from: accounts[0],
      to: transaction.to,
      data: transaction.data,
      ...(transaction.value && { value: transaction.value })
    };

    // Send transaction
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [txParams]
    });

    return {
      hash: txHash,
      success: true
    };
  } catch (error) {
    let errorMessage = 'Unknown error';
    
    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String((error as any).message);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      hash: '',
      success: false,
      error: errorMessage
    };
  }
};

// Switch network
export const switchNetwork = async (
  provider: WalletProvider,
  chainId: string
): Promise<void> => {
  try {
    // Try Rabby's specific network switching method first
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(chainId).toString(16)}` }]
      });
    } catch (error: any) {
      // If the network is not added, add it
      if (error.code === 4902) {
        const network = NETWORKS[chainId];
        if (network) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${parseInt(chainId).toString(16)}`,
              chainName: network.name,
              nativeCurrency: {
                name: network.currencySymbol,
                symbol: network.currencySymbol,
                decimals: 18
              },
              rpcUrls: [network.rpcUrl],
              blockExplorerUrls: network.blockExplorer ? [network.blockExplorer] : []
            }]
          });
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

// Switch network and return updated wallet state
export const switchNetworkAndUpdateState = async (
  provider: WalletProvider,
  chainId: string,
  currentState: WalletState
): Promise<WalletState> => {
  try {
    await switchNetwork(provider, chainId);
    
    // Return updated state with new chain ID
    return {
      ...currentState,
      chainId
    };
  } catch (error) {
    throw error;
  }
};

// Format address for display
export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Validate Ethereum address
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Validate calldata
export const isValidCalldata = (calldata: string): boolean => {
  return /^0x[a-fA-F0-9]*$/.test(calldata);
};



// Get currency symbol for a given chain ID
export const getCurrencySymbol = (chainId: string | null): string => {
  if (!chainId) return 'ETH'; // Default fallback
  
  // Convert hex chainId to decimal if it starts with 0x
  let decimalChainId = chainId;
  if (chainId.startsWith('0x')) {
    decimalChainId = parseInt(chainId, 16).toString();
  }
  
  return NETWORKS[decimalChainId]?.currencySymbol || 'ETH';
};

// Check if a chain ID is supported
export const isChainSupported = (chainId: string | null): boolean => {
  if (!chainId) return false;
  
  // Convert hex chainId to decimal if it starts with 0x
  let decimalChainId = chainId;
  if (chainId.startsWith('0x')) {
    decimalChainId = parseInt(chainId, 16).toString();
  }
  
  return NETWORKS[decimalChainId] !== undefined;
};

 
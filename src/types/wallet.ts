export interface WalletProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (eventName: string, handler: (params: any) => void) => void;
  removeListener: (eventName: string, handler: (params: any) => void) => void;
  isRabby?: boolean;
}

export interface TransactionRequest {
  to: string;
  data: string;
  value?: string;
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  error?: string;
}

export interface NetworkInfo {
  chainId: string;
  name: string;
  rpcUrl?: string;
  blockExplorer?: string;
  currencySymbol: string;
}

export interface WalletState {
  isConnected: boolean;
  account: string | null;
  chainId: string | null;
  provider: WalletProvider | null;
} 
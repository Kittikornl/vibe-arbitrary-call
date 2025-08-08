import { useState, useCallback, useEffect, useMemo } from 'react';
import Header from './components/Header';
import TransactionForm from './components/TransactionForm';
import Notification from './components/Notification';
import { WalletState, TransactionRequest } from './types/wallet';
import { sendTransaction, switchNetworkAndUpdateState, connectWallet, isChainSupported } from './utils/wallet';

const App: React.FC = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    account: null,
    chainId: null,
    provider: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [isUnsupportedChain, setIsUnsupportedChain] = useState(false);

  const handleWalletConnect = useCallback((state: WalletState) => {
    setWalletState(state);
    setError(null);
    setShowNotification(false);
    
    // Check if the connected chain is supported
    if (state.isConnected && state.chainId) {
      const supported = isChainSupported(state.chainId);
      setIsUnsupportedChain(!supported);
    } else {
      setIsUnsupportedChain(false);
    }
  }, []);

  const handleTransactionSubmit = useCallback(async (transaction: TransactionRequest) => {
    if (!walletState.provider) {
      setError('No wallet connected');
      setShowNotification(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setShowNotification(false);

    try {
      const result = await sendTransaction(walletState.provider, transaction);
      
      if (!result.success) {
        setError(result.error || 'Transaction failed');
        setShowNotification(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      setShowNotification(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [walletState.provider]);

  const handleChainSelect = useCallback(async (chainId: string) => {
    if (walletState.provider && walletState.isConnected) {
      try {
        const updatedState = await switchNetworkAndUpdateState(
          walletState.provider,
          chainId,
          walletState
        );
        setWalletState(updatedState);
        
        // Check if the new chain is supported
        const supported = isChainSupported(chainId);
        setIsUnsupportedChain(!supported);
      } catch (error) {
        // Silent fail for network switching
      }
    } else {
      // Update the UI state even if wallet is not connected
      setWalletState(prev => ({
        ...prev,
        chainId
      }));
      
      // Check if the new chain is supported
      const supported = isChainSupported(chainId);
      setIsUnsupportedChain(!supported);
    }
  }, [walletState]);

  const handleNotificationClose = useCallback(() => {
    setShowNotification(false);
    setError(null);
  }, []);

  // Auto-connect to Rabby wallet on mount
  useEffect(() => {
    const autoConnect = async () => {
      try {
        const { provider, account, chainId } = await connectWallet();
        
        const newState: WalletState = {
          isConnected: true,
          account,
          chainId,
          provider
        };
        
        setWalletState(newState);
        
        // Check if the connected chain is supported
        const supported = isChainSupported(chainId);
        setIsUnsupportedChain(!supported);
      } catch (error) {
        // Don't show error to user, just let them connect manually via header
      }
    };

    autoConnect();
  }, []);

  // Memoized main content to prevent unnecessary re-renders
  const mainContent = useMemo(() => {
    if (!walletState.isConnected) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md mx-auto">
            <div className="text-gray-400 mb-6">
              <svg className="mx-auto h-16 w-16 sm:h-20 sm:w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mb-4">
              Connect your Rabby wallet to start sending transactions
            </p>
            <p className="text-sm text-gray-500">
              Use the "Connect Rabby Wallet" button in the header to connect
            </p>
          </div>
        </div>
      );
    }

    // Show unsupported chain message similar to disconnected state
    if (isUnsupportedChain) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md mx-auto">
            <div className="text-yellow-400 mb-6">
              <svg className="mx-auto h-16 w-16 sm:h-20 sm:w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Unsupported Network
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mb-4">
              You're connected to an unsupported network
            </p>
            <p className="text-base sm:text-lg text-gray-600 mb-4">
              Chain ID: {walletState.chainId}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Please switch to a supported network using the network selector in the header
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <TransactionForm 
          onSubmit={handleTransactionSubmit}
          isSubmitting={isSubmitting}
          userAddress={walletState.account || undefined}
          provider={walletState.provider}
        />
      </div>
    );
  }, [walletState.isConnected, walletState.account, walletState.provider, walletState.chainId, handleTransactionSubmit, isSubmitting, isUnsupportedChain, handleChainSelect]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        walletState={walletState}
        onWalletConnect={handleWalletConnect}
        onChainSelect={handleChainSelect}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 w-full">
        {mainContent}
      </main>

      <Notification
        message={error || ''}
        isVisible={showNotification}
        onClose={handleNotificationClose}
      />

      <footer className="bg-gray-800 text-white py-4 sm:py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-400">
              Custom Call FE - Send any calldata to any contract via Rabby wallet
            </p>
            <p className="text-xs text-gray-500 mt-1 sm:mt-2">
              Use with caution. Always verify contract addresses and transaction data.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App; 
import { useState, useEffect, useCallback, useMemo } from 'react';
import { WalletState } from '../types/wallet';
import { NETWORKS, formatAddress, isChainSupported } from '../utils/wallet';
import ethereumIcon from '../assets/eth.png';
import bnbIcon from '../assets/bnb.png';
import baseIcon from '../assets/base.png';

interface HeaderProps {
  walletState: WalletState;
  onWalletConnect: (state: WalletState) => void;
  onChainSelect: (chainId: string) => void;
}

const Header: React.FC<HeaderProps> = ({ walletState, onWalletConnect, onChainSelect }) => {
  const [showChainSelector, setShowChainSelector] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (walletState.provider) {
      const handleChainChanged = (chainId: string) => {
        const decimalChainId = parseInt(chainId, 16).toString();
        onChainSelect(decimalChainId);
      };

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          onWalletConnect({
            ...walletState,
            isConnected: false,
            account: null
          });
        } else {
          // User switched accounts
          onWalletConnect({
            ...walletState,
            account: accounts[0]
          });
        }
      };

      walletState.provider.on('chainChanged', handleChainChanged);
      walletState.provider.on('accountsChanged', handleAccountsChanged);

      return () => {
        if (walletState.provider) {
          walletState.provider.removeListener('chainChanged', handleChainChanged);
          walletState.provider.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [walletState, onWalletConnect, onChainSelect]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const { connectWallet } = await import('../utils/wallet');
      const { provider, account, chainId } = await connectWallet();
      
      const newState: WalletState = {
        isConnected: true,
        account,
        chainId,
        provider
      };
      
      onWalletConnect(newState);
    } catch (error) {
      // Silent fail for wallet connection
    } finally {
      setIsConnecting(false);
    }
  }, [onWalletConnect]);

  const handleDisconnect = useCallback(() => {
    const newState: WalletState = {
      isConnected: false,
      account: null,
      chainId: null,
      provider: null
    };
    onWalletConnect(newState);
  }, [onWalletConnect]);

  // Memoized network name getter
  const getNetworkName = useCallback((chainId: string | null) => {
    if (!chainId) return 'Unknown';
    
    // Convert hex chainId to decimal if it starts with 0x
    let decimalChainId = chainId;
    if (chainId.startsWith('0x')) {
      decimalChainId = parseInt(chainId, 16).toString();
    }
    
    return NETWORKS[decimalChainId]?.name || `Chain ID: ${decimalChainId}`;
  }, []);

  // Memoized network icon getter
  const getNetworkIcon = useCallback((chainId: string | null) => {
    if (!chainId) return '🔗';
    
    // Convert hex chainId to decimal if it starts with 0x
    let decimalChainId = chainId;
    if (chainId.startsWith('0x')) {
      decimalChainId = parseInt(chainId, 16).toString();
    }
    
    const network = NETWORKS[decimalChainId];
    if (!network) return '🔗';
    
    // Return appropriate network icons
    switch (decimalChainId) {
      case '1': // Ethereum
        return <img src={ethereumIcon} alt="Ethereum" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full" />;
      case '56': // BSC
        return <img src={bnbIcon} alt="BNB Smart Chain" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full" />;
      case '8453': // Base
        return <img src={baseIcon} alt="Base" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full" />;
      default:
        return <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">?</div>;
    }
  }, []);

  // Memoized network options
  const networkOptions = useMemo(() => {
    return Object.entries(NETWORKS).map(([chainId, network]) => ({
      chainId,
      network,
      icon: getNetworkIcon(chainId)
    }));
  }, [getNetworkIcon]);

  return (
    <header className="gradient-bg text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-lg sm:text-xl font-bold">Custom Call FE</h1>
              <p className="text-xs text-blue-100 hidden sm:block">Send any calldata to any contract</p>
            </div>
          </div>

          {/* Right side - Wallet Connection */}
          <div className="relative">
            {walletState.isConnected ? (
              <button
                onClick={() => setShowChainSelector(!showChainSelector)}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                <span className="text-base sm:text-lg">{getNetworkIcon(walletState.chainId)}</span>
                <span className="text-xs sm:text-sm font-medium hidden sm:block">
                  {formatAddress(walletState.account!)}
                  {!isChainSupported(walletState.chainId) && (
                    <span className="ml-1 text-yellow-300">⚠️</span>
                  )}
                </span>
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                    <span className="text-xs sm:text-sm font-medium">
                      Connecting...
                    </span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs sm:text-sm font-medium">
                      Connect Rabby Wallet
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Dropdown only when connected */}
            {showChainSelector && walletState.isConnected && (
              <div className="absolute right-0 mt-2 w-48 sm:w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-2">
                  {/* Connection Status */}
                  <div className="px-3 sm:px-4 py-2 border-b border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Connected
                    </div>
                    <div className="text-xs sm:text-sm text-gray-900 font-medium">
                      {formatAddress(walletState.account!)}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center">
                      {getNetworkName(walletState.chainId)}
                      {!isChainSupported(walletState.chainId) && (
                        <span className="ml-1 text-yellow-600">(Unsupported)</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        handleDisconnect();
                        setShowChainSelector(false);
                      }}
                      className="mt-2 w-full px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>

                  {/* Network Selection */}
                  <div className="px-3 sm:px-4 py-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Select Network
                    </div>
                    {networkOptions.map((option) => (
                      <button
                        key={option.chainId}
                        onClick={() => {
                          onChainSelect(option.chainId);
                          setShowChainSelector(false);
                        }}
                        className="w-full px-2 sm:px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 sm:space-x-3 rounded transition-colors"
                      >
                        <span className="text-base sm:text-lg">
                          {option.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            {option.network.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {option.network.currencySymbol}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close chain selector */}
      {showChainSelector && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowChainSelector(false)}
        />
      )}
    </header>
  );
};

export default Header; 
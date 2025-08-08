import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TransactionRequest } from '../types/wallet';
import { isValidAddress, isValidCalldata, getCurrencySymbol } from '../utils/wallet';
import { detectEIP7702User } from '../utils/eip7702';
import { parseEther, formatEther } from 'ethers';

interface TransactionFormProps {
  onSubmit: (transaction: TransactionRequest) => void;
  isSubmitting: boolean;
  userAddress?: string;
  provider?: any;
}

const TransactionForm: React.FC<TransactionFormProps> = React.memo(({ onSubmit, isSubmitting, userAddress, provider }) => {
  const [isEIP7702User, setIsEIP7702User] = useState<boolean>(false);
  const [isCheckingEIP7702, setIsCheckingEIP7702] = useState<boolean>(false);
  const [valueUnit, setValueUnit] = useState<'wei' | 'eth'>('eth');
  
  const [formData, setFormData] = useState<TransactionRequest>({
    to: '',
    data: '',
    value: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ethValue, setEthValue] = useState<string>(''); // Store ETH value separately
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [currentCurrencySymbol, setCurrentCurrencySymbol] = useState<string>('ETH');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUnitDropdown(false);
      }
    };

    if (showUnitDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUnitDropdown]);

  // Update currency symbol when provider changes
  useEffect(() => {
    const updateCurrencySymbol = async () => {
      if (provider) {
        try {
          const chainId = await provider.request({ method: 'eth_chainId' });
          const decimalChainId = parseInt(chainId, 16).toString();
          const symbol = getCurrencySymbol(decimalChainId);
          setCurrentCurrencySymbol(symbol);
        } catch (error) {
          setCurrentCurrencySymbol('ETH'); // Fallback
        }
      }
    };

    updateCurrencySymbol();

    // Listen for chain changes
    if (provider) {
      const handleChainChanged = async (chainId: string) => {
        const decimalChainId = parseInt(chainId, 16).toString();
        const symbol = getCurrencySymbol(decimalChainId);
        setCurrentCurrencySymbol(symbol);
      };

      provider.on('chainChanged', handleChainChanged);

      return () => {
        provider.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [provider]);

  // Memoized helper functions for value conversion using ethers
  const weiToEth = useCallback((wei: string): string => {
    if (!wei) return '';
    try {
      return formatEther(wei);
    } catch {
      return '';
    }
  }, []);



  // Memoized validation function
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate contract address
    if (!formData.to) {
      newErrors.to = 'Contract address is required';
    } else if (!isValidAddress(formData.to)) {
      newErrors.to = 'Invalid Ethereum address format';
    }

    // Validate calldata
    if (!formData.data) {
      newErrors.data = 'Calldata is required';
    } else if (!isValidCalldata(formData.data)) {
      newErrors.data = 'Invalid calldata format (must start with 0x and contain hex characters)';
    }

    // Validate value (if provided)
    if (formData.value) {
      if (valueUnit === 'eth') {
        try {
          const ethValueNum = parseFloat(ethValue);
          if (isNaN(ethValueNum) || ethValueNum < 0) {
            newErrors.value = 'Value must be a valid positive number';
          }
        } catch {
          newErrors.value = `Invalid ${currentCurrencySymbol} value`;
        }
      } else {
        try {
          formatEther(formData.value);
        } catch {
          newErrors.value = 'Invalid wei value';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.to, formData.data, formData.value, valueUnit, ethValue, currentCurrencySymbol, isValidAddress, isValidCalldata, formatEther]);

  // Memoized submit handler
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Convert ETH to wei if needed
      let finalValue = formData.value;
      if (valueUnit === 'eth' && ethValue) {
        try {
          finalValue = parseEther(ethValue).toString();
        } catch {
          setErrors(prev => ({ ...prev, value: `Invalid ${currentCurrencySymbol} value` }));
          return;
        }
      }

      // Clean up the transaction data by removing empty fields
      const cleanTransaction: TransactionRequest = {
        to: formData.to,
        data: formData.data,
        ...(finalValue && { value: `0x${parseInt(finalValue).toString(16)}` })
      };
      
      onSubmit(cleanTransaction);
    }
  }, [validateForm, formData, valueUnit, ethValue, currentCurrencySymbol, onSubmit]);

  // Memoized input change handler
  const handleInputChange = useCallback((field: keyof TransactionRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Memoized value change handler
  const handleValueChange = useCallback((inputValue: string) => {
    if (valueUnit === 'eth') {
      // Store ETH value directly for typing
      setEthValue(inputValue);
      // Convert to wei for internal storage
      try {
        if (inputValue && inputValue !== '.') {
          const weiValue = parseEther(inputValue).toString();
          handleInputChange('value', weiValue);
        } else {
          handleInputChange('value', '');
        }
      } catch {
        // Allow typing even if conversion fails
        handleInputChange('value', '');
      }
    } else {
      setEthValue('');
      handleInputChange('value', inputValue);
    }
  }, [valueUnit, handleInputChange]);

  // Memoized unit change handler
  const handleUnitChange = useCallback((newUnit: 'wei' | 'eth') => {
    setValueUnit(newUnit);
    if (newUnit === 'eth') {
      // Convert wei to ETH for display
      setEthValue(formData.value ? weiToEth(formData.value) : '');
    } else {
      // Clear ETH value when switching to wei
      setEthValue('');
    }
  }, [formData.value, weiToEth]);



  // Check EIP-7702 support when provider and user address are available
  useEffect(() => {
    let isMounted = true;
    
    const checkEIP7702Support = async () => {
      if (provider && userAddress) {
        setIsCheckingEIP7702(true);
        try {
          // Check if the user's address has contract code (EIP-7702 detection)
          const isEIP7702Compatible = await detectEIP7702User(provider, userAddress);
          
          if (isMounted) {
            setIsEIP7702User(isEIP7702Compatible);
          }
        } catch (error) {
          if (isMounted) {
            setIsEIP7702User(false);
          }
        } finally {
          if (isMounted) {
            setIsCheckingEIP7702(false);
          }
        }
      } else {
        // Reset EIP-7702 state when no provider or user address
        setIsEIP7702User(false);
        setIsCheckingEIP7702(false);
      }
    };

    checkEIP7702Support();

    return () => {
      isMounted = false;
    };
  }, [provider, userAddress]);

  // Auto-fill user address for EIP-7702 users
  useEffect(() => {
    if (isEIP7702User && userAddress) {
      // Always auto-fill for EIP-7702 users, regardless of current form state
      setFormData(prev => ({
        ...prev,
        to: userAddress
      }));
    }
  }, [isEIP7702User, userAddress]);

  // Reset contract address when EIP-7702 status changes
  useEffect(() => {
    if (!isEIP7702User && userAddress && formData.to === userAddress) {
      // If user is no longer EIP-7702 and the address field contains their address, clear it
      setFormData(prev => ({
        ...prev,
        to: ''
      }));
    }
  }, [isEIP7702User, userAddress, formData.to]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
        <h3 className="text-base sm:text-lg font-medium text-gray-900">
          Transaction Details
          {isCheckingEIP7702 && (
            <span className="text-xs text-gray-500 ml-2">(Checking EIP-7702...)</span>
          )}
          {!isCheckingEIP7702 && isEIP7702User && (
            <span className="text-xs text-blue-600 ml-2">(EIP-7702 User)</span>
          )}
        </h3>

      </div>

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        {/* Contract Address */}
        <div>
          <label htmlFor="to" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Contract Address *
          </label>
          <input
            type="text"
            id="to"
            value={formData.to}
            onChange={(e) => handleInputChange('to', e.target.value)}
            placeholder="0x..."
            className={`w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.to ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.to && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.to}</p>}
        </div>

        {/* Calldata */}
        <div>
          <label htmlFor="data" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Calldata *
          </label>
          <textarea
            id="data"
            value={formData.data}
            onChange={(e) => handleInputChange('data', e.target.value)}
            placeholder="0x..."
            rows={3}
            className={`w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.data ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.data && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.data}</p>}
        </div>

        {/* Value */}
        <div>
          <label htmlFor="value" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Value (optional)
          </label>
          
          {/* Value Input with Unit Selector */}
          <div className="relative">
            <input
              type="text"
              id="value"
              value={
                valueUnit === 'eth' 
                  ? ethValue
                  : formData.value
              }
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={valueUnit === 'eth' ? '1.0' : '1000000000000000000'}
              className={`w-full pr-20 px-2 sm:px-3 py-2 text-xs sm:text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.value ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <div ref={dropdownRef} className="absolute inset-y-0 right-0 flex items-center">
              <button
                type="button"
                onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                className="h-full px-3 py-1 text-xs sm:text-sm border-l border-gray-300 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-700 font-medium rounded-r-md hover:from-blue-100 hover:to-blue-200 transition-all duration-200 shadow-sm flex items-center space-x-1"
              >
                <span>{valueUnit === 'eth' ? currentCurrencySymbol : 'Wei'}</span>
                <svg className={`w-3 h-3 text-blue-600 transition-transform duration-200 ${showUnitDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Custom Dropdown Menu */}
              {showUnitDropdown && (
                <div className="absolute top-full right-0 mt-1 w-20 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleUnitChange('eth');
                        setShowUnitDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-xs sm:text-sm text-left hover:bg-blue-50 transition-colors ${
                        valueUnit === 'eth' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {currentCurrencySymbol}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleUnitChange('wei');
                        setShowUnitDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-xs sm:text-sm text-left hover:bg-blue-50 transition-colors ${
                        valueUnit === 'wei' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      Wei
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <p className="mt-1 text-xs text-gray-500">
            1 {currentCurrencySymbol} = 1,000,000,000,000,000,000 wei (1e18)
          </p>
          {errors.value && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.value}</p>}
        </div>

        {/* Submit Button */}
        <div className="pt-3 sm:pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm text-white bg-gradient-to-r from-green-600 to-blue-600 rounded-lg font-medium hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                <span className="text-xs sm:text-sm">Sending Transaction...</span>
              </div>
            ) : (
              'Send Transaction'
            )}
          </button>
        </div>
      </form>
    </div>
  );
});

export default TransactionForm; 
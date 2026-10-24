import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as freighter from '@stellar/freighter-api';

export type NetworkType = string;

interface WalletState {
  publicKey: string | null;
  network: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string;
  isLoading: boolean;
  availableNetworks: string[];
}

interface WalletContextType extends WalletState {
  connect: (network?: string) => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string, opts?: any) => Promise<string>;
  signAuthEntry: (xdr: string, address: string, networkPassphrase: string) => Promise<string>;
  switchNetwork: (network: string) => Promise<void>;
  refreshBalance: () => Promise<void>;
  isFreighterInstalled: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalletState>({
    publicKey: null,
    network: 'TESTNET',
    isConnected: false,
    isConnecting: false,
    balance: '0',
    isLoading: false,
    availableNetworks: ['TESTNET', 'PUBLIC'],
  });

  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const isConnected = await freighter.isConnected();
      setIsFreighterInstalled(Boolean(isConnected));
      if (isConnected) {
        const publicKey = await freighter.getPublicKey();
        if (publicKey) {
          setState((prev) => ({
            ...prev,
            publicKey,
            isConnected: true,
          }));
        }
      }
    } catch (err) {
      console.warn('Freighter connection check error:', err);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connect = async () => {
    setState((prev) => ({ ...prev, isConnecting: true }));
    try {
      const publicKey = await freighter.getPublicKey();
      setState((prev) => ({
        ...prev,
        publicKey,
        isConnected: true,
        isConnecting: false,
      }));
    } catch (err) {
      console.error('Failed to connect Freighter wallet:', err);
      setState((prev) => ({ ...prev, isConnecting: false }));
    }
  };

  const disconnect = () => {
    setState({
      publicKey: null,
      network: 'TESTNET',
      isConnected: false,
      isConnecting: false,
      balance: '0',
      isLoading: false,
      availableNetworks: ['TESTNET', 'PUBLIC'],
    });
  };

  const signTransaction = async (xdr: string, opts?: any): Promise<string> => {
    const signed = await freighter.signTransaction(xdr, opts);
    return signed;
  };

  const signAuthEntry = async (xdr: string, address: string, networkPassphrase: string): Promise<string> => {
    const result = await freighter.signAuthEntry(xdr, {
      accountToSign: address,
      networkPassphrase,
    });
    return result.signedAuthEntry;
  };

  const switchNetwork = async (net: string) => {
    setState((prev) => ({ ...prev, network: net }));
  };

  const refreshBalance = async () => {};

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        signTransaction,
        signAuthEntry,
        switchNetwork,
        refreshBalance,
        isFreighterInstalled,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
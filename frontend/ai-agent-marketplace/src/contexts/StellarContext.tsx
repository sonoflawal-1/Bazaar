import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Contract, 
  SorobanRpc, 
  Networks, 
  TransactionBuilder,
  BASE_FEE,
  Address,
  xdr,
  nativeToScVal,
  scValToNative,
  Keypair,
  StrKey
} from '@stellar/stellar-sdk';

export interface ContractConfig {
  contractId: string;
  rpcUrl: string;
  networkPassphrase: string;
}

export interface StellarContextType {
  contract: Contract | null;
  rpc: SorobanRpc.Server | null;
  config: ContractConfig | null;
  isConnected: boolean;
  connect: (config: ContractConfig) => Promise<void>;
  disconnect: () => void;
  simulateTransaction: (tx: any) => Promise<any>;
  sendTransaction: (tx: any, signFn: any) => Promise<any>;
  getContractData: (key: xdr.ScVal, durability?: 'persistent' | 'temporary') => Promise<xdr.ScVal | null>;
  invokeContract: (method: string, ...args: xdr.ScVal[]) => Promise<xdr.ScVal | null>;
  getContractClient: () => any;
}

const StellarContext = createContext<StellarContextType | null>(null);

export const useStellar = () => {
  const context = useContext(StellarContext);
  if (!context) throw new Error('useStellar must be used within StellarProvider');
  return context;
};

export const StellarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [rpc, setRpc] = useState<SorobanRpc.Server | null>(null);
  const [config, setConfig] = useState<ContractConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async (newConfig: ContractConfig) => {
    try {
      const rpcServer = new SorobanRpc.Server(newConfig.rpcUrl, { allowHttp: true });
      const contractInstance = new Contract(newConfig.contractId);
      
      await rpcServer.getLatestLedger();
      
      setRpc(rpcServer);
      setContract(contractInstance);
      setConfig(newConfig);
      setIsConnected(true);
      
      localStorage.setItem('stellar-contract-config', JSON.stringify(newConfig));
    } catch (error) {
      console.error('Failed to connect to Stellar:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    setContract(null);
    setRpc(null);
    setConfig(null);
    setIsConnected(false);
    localStorage.removeItem('stellar-contract-config');
  }, []);

  const simulateTransaction = useCallback(async (tx: TransactionBuilder) => {
    if (!rpc) throw new Error('RPC not connected');
    return rpc.simulateTransaction(tx.build());
  }, [rpc]);

  const sendTransaction = useCallback(async (
    tx: TransactionBuilder, 
    signFn: (tx: string) => Promise<string>
  ) => {
    if (!rpc || !config) throw new Error('Not connected');
    
    const builtTx = tx.build();
    const signedTxXdr = await signFn(builtTx.toXDR());
    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, config.networkPassphrase);
    
    return rpc.sendTransaction(signedTx);
  }, [rpc, config]);

  const getContractData = useCallback(async (
    key: xdr.ScVal, 
    durability: 'persistent' | 'temporary' = 'persistent'
  ) => {
    if (!rpc || !config) throw new Error('Not connected');
    
    try {
      const result: any = await (rpc as any).getContractData(config.contractId, key, durability as any);
      return result?.val ?? null;
    } catch (error) {
      if ((error as Error).message.includes('not found')) return null;
      throw error;
    }
  }, [rpc, config]);

  const invokeContract = useCallback(async (method: string, ...args: xdr.ScVal[]) => {
    if (!contract || !rpc || !config) throw new Error('Not connected');
    
    const account = new (TransactionBuilder as any).Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    const tx = new (TransactionBuilder as any)(account, {
      fee: BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(300)
      .build();
    
    const simResult = await rpc.simulateTransaction(tx);
    
    if (SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }
    
    return (simResult as any).result?.retval ?? null;
  }, [contract, rpc, config]);

  const getContractClient = useCallback(() => {
    if (!isConnected || !contract || !rpc || !config) return null;
    return {
      getAgent: (agentId: number) => invokeContract('get_agent', u64ToScVal(agentId)),
      getJob: (jobId: number) => invokeContract('get_job', u64ToScVal(jobId)),
      getConfig: () => invokeContract('get_config'),
      getPlatformStats: () => invokeContract('get_platform_stats'),
      getAgentsBySkill: (skill: string) => invokeContract('get_agents_by_skill', stringToScVal(skill)),
      getJobsByClient: (client: string) => invokeContract('get_jobs_by_client', addressToScVal(client)),
      getJobsByAgent: (agent: string) => invokeContract('get_jobs_by_agent', addressToScVal(agent)),
    };
  }, [isConnected, contract, rpc, config, invokeContract]);

  useEffect(() => {
    const saved = localStorage.getItem('stellar-contract-config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        connect(parsed).catch(() => localStorage.removeItem('stellar-contract-config'));
      } catch {
        localStorage.removeItem('stellar-contract-config');
      }
    }
  }, [connect]);

  return (
    <StellarContext.Provider value={{
      contract,
      rpc,
      config,
      isConnected,
      connect,
      disconnect,
      simulateTransaction,
      sendTransaction,
      getContractData,
      invokeContract,
      getContractClient,
    }}>
      {children}
    </StellarContext.Provider>
  );
};

// Type conversion helpers
export const parseScVal = <T extends unknown>(val: xdr.ScVal): T => {
  return scValToNative(val) as T;
};

export const addressToScVal = (address: string): xdr.ScVal => {
  return nativeToScVal(address, { type: 'address' });
};

export const u64ToScVal = (val: number | bigint): xdr.ScVal => {
  return nativeToScVal(val, { type: 'u64' });
};

export const i128ToScVal = (val: number | bigint | string): xdr.ScVal => {
  return nativeToScVal(val, { type: 'i128' });
};

export const stringToScVal = (val: string): xdr.ScVal => {
  return nativeToScVal(val, { type: 'string' });
};

export const vecToScVal = (arr: unknown[], typeStr: string): xdr.ScVal => {
  return nativeToScVal(arr, { type: `vec<${typeStr}>` as any });
};

export const mapToScVal = (entries: [unknown, unknown][], keyType: string, valType: string): xdr.ScVal => {
  return nativeToScVal(entries, { type: `map<${keyType},${valType}>` as any });
};

export const optionToScVal = (val: unknown | null, typeStr: string): xdr.ScVal => {
  return nativeToScVal(val ?? null, { type: `option<${typeStr}>` as any });
};

export const bytesN32ToScVal = (val: Buffer | Uint8Array): xdr.ScVal => {
  return nativeToScVal(val, { type: 'bytes<32>' as any });
};
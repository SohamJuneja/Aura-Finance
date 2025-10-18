'use client';

import { useState, useEffect } from 'react';
import { fetchCallReadOnlyFunction, cvToValue, principalCV, type ClarityValue } from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';
import type { UserSession } from '@stacks/connect';

interface DashboardProps {
  userSession: UserSession;
}

interface DashboardData {
  abtcBalance: number;
  stxDeposited: number;
  abtcDebt: number;
}

export default function Dashboard({ userSession }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        // Get user's testnet address
        const userData = userSession.loadUserData();
        const userAddress = userData?.profile?.stxAddress?.testnet;

        if (!userAddress) {
          throw new Error('No testnet address found. Please connect your wallet.');
        }

        console.log('[Dashboard] Fetching data for address:', userAddress);

        const network = STACKS_TESTNET;
        const senderAddress = userAddress;

        // Contract addresses (V2 - Updated)
        const vaultContract = {
          contractAddress: 'ST2QAEK3CTB4XNAV6R9GXXM162Z0ZWWD63PT8B20J',
          contractName: 'auravault-v2',
        };

        const abtcTokenContract = {
          contractAddress: 'ST2QAEK3CTB4XNAV6R9GXXM162Z0ZWWD63PT8B20J',
          contractName: 'aBTC-token-v2',
        };

        // Fetch all three values in parallel
        const [stxDepositedResult, abtcDebtResult, abtcBalanceResult] = await Promise.all([
          // 1. Get STX deposited balance from AuraVault
          fetchCallReadOnlyFunction({
            network,
            contractAddress: vaultContract.contractAddress,
            contractName: vaultContract.contractName,
            functionName: 'get-balance',
            functionArgs: [principalCV(userAddress)],
            senderAddress,
          }).catch(err => {
            console.error('[Dashboard] Error fetching STX deposits:', err);
            return null;
          }),
          // 2. Get aBTC debt from AuraVault
          fetchCallReadOnlyFunction({
            network,
            contractAddress: vaultContract.contractAddress,
            contractName: vaultContract.contractName,
            functionName: 'get-debt',
            functionArgs: [principalCV(userAddress)],
            senderAddress,
          }).catch(err => {
            console.error('[Dashboard] Error fetching aBTC debt:', err);
            return null;
          }),
          // 3. Get aBTC balance from aBTC-token contract
          fetchCallReadOnlyFunction({
            network,
            contractAddress: abtcTokenContract.contractAddress,
            contractName: abtcTokenContract.contractName,
            functionName: 'get-balance',
            functionArgs: [principalCV(userAddress)],
            senderAddress,
          }).catch(err => {
            console.error('[Dashboard] Error fetching aBTC balance:', err);
            return null;
          }),
        ]);

        console.log('[Dashboard] Raw results:', {
          stxDepositedResult,
          abtcDebtResult,
          abtcBalanceResult,
        });

        // Convert Clarity values to JS - handle both raw uints and Response wrappers
        const extractValue = (result: ClarityValue | null, name: string): bigint => {
          if (!result) {
            console.log(`[Dashboard] ${name}: result is null, returning 0`);
            return BigInt(0);
          }
          
          const val = cvToValue(result);
          console.log(`[Dashboard] ${name} extracted value:`, val, 'type:', typeof val);
          
          // Case 1: Response wrapper like { type: 'ok', value: <bigint> }
          if (val && typeof val === 'object' && 'value' in val) {
            const innerValue = (val as { value: bigint | number }).value;
            console.log(`[Dashboard] ${name} unwrapped from response:`, innerValue);
            return BigInt(innerValue);
          }
          
          // Case 2: Direct bigint or number value
          if (typeof val === 'bigint') {
            console.log(`[Dashboard] ${name} direct bigint:`, val);
            return val;
          }
          
          if (typeof val === 'number') {
            console.log(`[Dashboard] ${name} direct number:`, val);
            return BigInt(val);
          }
          
          // Case 3: String representation of number
          if (typeof val === 'string' && /^\d+$/.test(val)) {
            console.log(`[Dashboard] ${name} string number:`, val);
            return BigInt(val);
          }
          
          console.warn(`[Dashboard] ${name} unexpected value type, defaulting to 0:`, val);
          return BigInt(0);
        };

        const stxDepositedRaw = extractValue(stxDepositedResult, 'STX Deposited');
        const abtcDebtRaw = extractValue(abtcDebtResult, 'aBTC Debt');
        const abtcBalanceRaw = extractValue(abtcBalanceResult, 'aBTC Balance');

        console.log('[Dashboard] Converted values:', {
          stxDepositedRaw: stxDepositedRaw.toString(),
          abtcDebtRaw: abtcDebtRaw.toString(),
          abtcBalanceRaw: abtcBalanceRaw.toString(),
        });

        // Convert from micro-units to human-readable (STX: 6 decimals, aBTC: 8 decimals)
        const stxDeposited = Number(stxDepositedRaw) / 1_000_000; // 6 decimals
        const abtcDebt = Number(abtcDebtRaw) / 100_000_000; // 8 decimals
        const abtcBalance = Number(abtcBalanceRaw) / 100_000_000; // 8 decimals

        setData({
          abtcBalance: isNaN(abtcBalance) ? 0 : abtcBalance,
          stxDeposited: isNaN(stxDeposited) ? 0 : stxDeposited,
          abtcDebt: isNaN(abtcDebt) ? 0 : abtcDebt,
        });
      } catch (err) {
        console.error('[Dashboard] Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    if (userSession.isUserSignedIn()) {
      fetchDashboardData();
    } else {
      setLoading(false);
      setError('Please connect your wallet to view dashboard');
    }
  }, [userSession, refreshKey]);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-16">
        <p className="text-xl text-gray-600 dark:text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center py-16">
        <p className="text-xl text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8 sm:mb-12">
        <h2 className="text-3xl sm:text-4xl xl:text-5xl font-bold text-center flex-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
          Your Aura Finance Dashboard
        </h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="ml-4 cursor-pointer rounded-lg bg-purple-600 px-4 py-2 text-white text-sm font-semibold shadow hover:bg-purple-700 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 transition-all"
        >
          {loading ? '⟳' : '↻'} Refresh
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 xl:gap-10 w-full">
        {/* aBTC in Wallet Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6 sm:p-8 xl:p-10 border-2 border-gray-100 dark:border-zinc-800 hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex flex-col space-y-3 sm:space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              aBTC in Wallet
            </h3>
            <div className="flex flex-col space-y-2">
              <p className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-blue-600 dark:text-blue-400 tabular-nums break-all">
                {data.abtcBalance.toFixed(3)}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">aBTC</p>
            </div>
          </div>
        </div>

        {/* STX Deposited Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6 sm:p-8 xl:p-10 border-2 border-gray-100 dark:border-zinc-800 hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex flex-col space-y-3 sm:space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              STX Deposited
            </h3>
            <div className="flex flex-col space-y-2">
              <p className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-green-600 dark:text-green-400 tabular-nums break-all">
                {data.stxDeposited.toFixed(3)}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">STX</p>
            </div>
          </div>
        </div>

        {/* aBTC Debt Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6 sm:p-8 xl:p-10 border-2 border-gray-100 dark:border-zinc-800 hover:shadow-2xl hover:scale-105 transition-all duration-300 sm:col-span-2 lg:col-span-1">
          <div className="flex flex-col space-y-3 sm:space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              aBTC Debt
            </h3>
            <div className="flex flex-col space-y-2">
              <p className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-red-600 dark:text-red-400 tabular-nums break-all">
                {data.abtcDebt.toFixed(3)}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">aBTC</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

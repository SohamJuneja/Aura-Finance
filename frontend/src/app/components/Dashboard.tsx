'use client';

import { useState, useEffect } from 'react';
import { fetchCallReadOnlyFunction, cvToValue, principalCV } from '@stacks/transactions';
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

        const network = STACKS_TESTNET;
        const senderAddress = userAddress;

        // Contract addresses
        const vaultContract = {
          contractAddress: 'ST2QAEK3CTB4XNAV6R9GXXM162Z0ZWWD63PT8B20J',
          contractName: 'petite-orange-grasshopper',
        };

        const abtcTokenContract = {
          contractAddress: 'ST2QAEK3CTB4XNAV6R9GXXM162Z0ZWWD63PT8B20J',
          contractName: 'rotten-lavender-ermine',
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
          }),
          // 2. Get aBTC debt from AuraVault
          fetchCallReadOnlyFunction({
            network,
            contractAddress: vaultContract.contractAddress,
            contractName: vaultContract.contractName,
            functionName: 'get-debt',
            functionArgs: [principalCV(userAddress)],
            senderAddress,
          }),
          // 3. Get aBTC balance from aBTC-token contract
          fetchCallReadOnlyFunction({
            network,
            contractAddress: abtcTokenContract.contractAddress,
            contractName: abtcTokenContract.contractName,
            functionName: 'get-balance',
            functionArgs: [principalCV(userAddress)],
            senderAddress,
          }),
        ]);

        // Convert Clarity values to JS numbers
        const stxDepositedRaw = cvToValue(stxDepositedResult);
        const abtcDebtRaw = cvToValue(abtcDebtResult);
        const abtcBalanceRaw = cvToValue(abtcBalanceResult);

        // Convert from micro-units to human-readable (STX: 6 decimals, aBTC: 8 decimals)
        const stxDeposited = Number(stxDepositedRaw) / 1_000_000; // 6 decimals
        const abtcDebt = Number(abtcDebtRaw) / 100_000_000; // 8 decimals
        const abtcBalance = Number(abtcBalanceRaw) / 100_000_000; // 8 decimals

        setData({
          abtcBalance,
          stxDeposited,
          abtcDebt,
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
  }, [userSession]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-lg text-gray-600 dark:text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-lg text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-8 text-center">Your Aura Finance Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* aBTC in Wallet Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-zinc-700">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            aBTC in Wallet
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.abtcBalance.toFixed(4)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">aBTC</p>
        </div>

        {/* STX Deposited Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-zinc-700">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            STX Deposited
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.stxDeposited.toFixed(4)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">STX</p>
        </div>

        {/* aBTC Debt Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-zinc-700">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            aBTC Debt
          </h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {data.abtcDebt.toFixed(4)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">aBTC</p>
        </div>
      </div>
    </div>
  );
}

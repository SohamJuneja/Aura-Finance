'use client';

import { useState, useEffect } from 'react';
import { openContractCall } from '@stacks/connect';
import { uintCV, PostConditionMode, type ClarityValue } from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';
import type { UserSession } from '@stacks/connect';

interface MintABTCProps {
  userSession: UserSession;
  onSuccess?: (txId: string) => void;
}

export default function MintABTC({ userSession, onSuccess }: MintABTCProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [stxDeposit, setStxDeposit] = useState<number>(0);
  const [currentDebt, setCurrentDebt] = useState<number>(0);
  const [fetchingLimits, setFetchingLimits] = useState(true);

  // Fetch actual STX deposit and current debt from blockchain
  useEffect(() => {
    async function fetchLimits() {
      try {
        if (!userSession.isUserSignedIn()) return;
        
        const userData = userSession.loadUserData();
        const userAddress = userData?.profile?.stxAddress?.testnet;
        if (!userAddress) return;

        const network = STACKS_TESTNET;
        const vaultContract = {
          contractAddress: 'ST2QAEK3CTB4XNAV6R9GXXM162Z0ZWWD63PT8B20J',
          contractName: 'driving-copper-trout',
        };

        // Fetch STX deposit and current debt
        const { fetchCallReadOnlyFunction, principalCV, cvToValue } = await import('@stacks/transactions');
        
        const [depositResult, debtResult] = await Promise.all([
          fetchCallReadOnlyFunction({
            network,
            contractAddress: vaultContract.contractAddress,
            contractName: vaultContract.contractName,
            functionName: 'get-balance',
            functionArgs: [principalCV(userAddress)],
            senderAddress: userAddress,
          }),
          fetchCallReadOnlyFunction({
            network,
            contractAddress: vaultContract.contractAddress,
            contractName: vaultContract.contractName,
            functionName: 'get-debt',
            functionArgs: [principalCV(userAddress)],
            senderAddress: userAddress,
          }),
        ]);

        const depositMicroSTX = Number(cvToValue(depositResult as ClarityValue));
        const debtSatoshis = Number(cvToValue(debtResult as ClarityValue));

        setStxDeposit(depositMicroSTX / 1_000_000);
        setCurrentDebt(debtSatoshis / 100_000_000);
        setFetchingLimits(false);
      } catch (err) {
        console.error('[MintABTC] Error fetching limits:', err);
        setFetchingLimits(false);
      }
    }

    fetchLimits();
  }, [userSession]);

  // Calculate max borrowable based on actual deposit
  const calculateMaxBorrow = () => {
    // STX deposit value in USD (assuming $2 per STX from contract)
    const stxValueUSD = stxDeposit * 2;
    
    // 50% LTV = can borrow 50% of collateral value
    const maxBorrowValueUSD = stxValueUSD * 0.5;
    
    // Convert to BTC (assuming $100,000 per BTC as a rough estimate)
    // In production, you'd fetch real BTC price
    const btcPrice = 100000;
    const maxBorrowBTC = maxBorrowValueUSD / btcPrice;
    
    // Subtract current debt
    const availableToBorrow = maxBorrowBTC - currentDebt;
    
    return Math.max(0, availableToBorrow);
  };

  const maxBorrowable = calculateMaxBorrow();

  const handleMint = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      
      // Convert aBTC to satoshis (8 decimals)
      const satoshis = Math.floor(parseFloat(amount) * 100_000_000);

      console.log('[MintABTC] Attempting to mint:', {
        amountInput: amount,
        satoshis: satoshis.toString(),
      });

      await openContractCall({
        network: STACKS_TESTNET,
        contractAddress: 'ST2QAEK3CTB4XNAV6R9GXXM162Z0ZWWD63PT8B20J',
        contractName: 'driving-copper-trout',
        functionName: 'mint',
        functionArgs: [uintCV(satoshis)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('[MintABTC] Transaction submitted:', data.txId);
          alert(`✅ Mint transaction submitted!\n\nTxID: ${data.txId}\n\nImportant: Wait ~10 minutes for blockchain confirmation, then click the "Refresh" button on the dashboard to see your new balances.`);
          setAmount('');
          setLoading(false);
          if (onSuccess) onSuccess(data.txId);
        },
        onCancel: () => {
          console.log('[MintABTC] User canceled transaction');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[MintABTC] Error:', err);
      alert(`❌ Failed to mint.\n\nError: ${err instanceof Error ? err.message : 'Unknown error'}\n\nCheck the console for details.`);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6 sm:p-8 border-2 border-gray-100 dark:border-zinc-800">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Mint aBTC</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Mint aBTC against your deposited STX. Maximum: 50% LTV (Loan-to-Value).
      </p>
      
      {fetchingLimits ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Loading limits...</p>
      ) : (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">
            <strong>Your Collateral:</strong> {stxDeposit.toFixed(2)} STX (≈ ${(stxDeposit * 2).toFixed(2)})
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">
            <strong>Current Debt:</strong> {currentDebt.toFixed(8)} aBTC
          </p>
          <p className="text-xs font-bold text-green-600 dark:text-green-400">
            <strong>Max Available to Mint:</strong> {maxBorrowable.toFixed(8)} aBTC
          </p>
          {maxBorrowable <= 0 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              ⚠️ You&apos;ve reached your borrowing limit. Deposit more STX to mint more aBTC.
            </p>
          )}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Amount (aBTC)
          </label>
          <input
            type="number"
            step="0.00000001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
            disabled={loading}
          />
        </div>
        <button
          onClick={handleMint}
          disabled={loading || !amount}
          className="w-full cursor-pointer rounded-lg bg-green-600 px-6 py-3 text-white font-semibold shadow-lg hover:bg-green-700 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 transition-all"
        >
          {loading ? 'Minting...' : 'Mint aBTC'}
        </button>
      </div>
    </div>
  );
}

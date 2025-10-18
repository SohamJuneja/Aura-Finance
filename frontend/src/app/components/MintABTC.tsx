'use client';

import { useState, useEffect } from 'react';
import { openContractCall } from '@stacks/connect';
import { uintCV, PostConditionMode } from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';
import type { UserSession } from '@stacks/connect';

interface MintABTCProps {
  userSession: UserSession;
  onSuccess?: () => void;
}

export default function MintABTC({ userSession, onSuccess }: MintABTCProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [maxBorrowable, setMaxBorrowable] = useState<number | null>(null);

  // Calculate max borrowable amount based on 50 STX deposit
  // This is a simple calculation - in production, fetch actual deposit from contract
  const calculateMaxBorrow = () => {
    // Example: 50 STX × $2 = $100 value
    // 50% LTV = $50 max borrow
    // At $100,000/BTC = 0.0005 BTC
    // This is a rough estimate - actual value depends on real deposits
    const stxDeposit = 50; // You can fetch actual value from contract
    const stxPrice = 2;
    const ltv = 0.5;
    const btcPrice = 100000;
    
    const maxBorrow = (stxDeposit * stxPrice * ltv) / btcPrice;
    setMaxBorrowable(maxBorrow);
  };

  useEffect(() => {
    calculateMaxBorrow();
  }, []);

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
        contractName: 'petite-orange-grasshopper',
        functionName: 'mint',
        functionArgs: [uintCV(satoshis)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('[MintABTC] Transaction submitted:', data.txId);
          alert(`✅ Mint transaction submitted!\n\nTxID: ${data.txId}\n\nImportant: Wait ~10 minutes for blockchain confirmation, then click the "Refresh" button on the dashboard to see your new balances.`);
          setAmount('');
          setLoading(false);
          if (onSuccess) onSuccess();
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
        {maxBorrowable && (
          <span className="block mt-2 text-green-600 dark:text-green-400 font-semibold">
            Estimated max: ~{maxBorrowable.toFixed(4)} aBTC
          </span>
        )}
      </p>
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

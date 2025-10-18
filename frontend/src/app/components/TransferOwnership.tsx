'use client';

import { useState } from 'react';
import { openContractCall } from '@stacks/connect';
import { principalCV, PostConditionMode } from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';

export default function TransferOwnership() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleTransfer = async () => {
    if (!confirm('This will transfer aBTC token ownership to the AuraVault contract. This is required for minting to work. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      
      // The vault contract address (V3 - Final version with as-contract fix)
      const vaultAddress = 'ST2QAEK3CTB4XNAV6R9GXXM162Z0ZWWD63PT8B20J.auravault-v3';

      await openContractCall({
        network: STACKS_TESTNET,
        contractAddress: 'ST2QAEK3CTB4XNAV6R9GXXM162Z0ZWWD63PT8B20J',
        contractName: 'aBTC-token-v2',
        functionName: 'set-contract-owner',
        functionArgs: [principalCV(vaultAddress)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('[TransferOwnership] Transaction submitted:', data.txId);
          alert(`✅ Ownership transfer submitted!\n\nTxID: ${data.txId}\n\nWait ~10 minutes for confirmation. After that, you'll be able to mint aBTC!`);
          setLoading(false);
          setDone(true);
        },
        onCancel: () => {
          console.log('[TransferOwnership] User canceled');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[TransferOwnership] Error:', err);
      alert(`❌ Failed to transfer ownership.\n\nError: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-4">
        <p className="text-sm text-green-800 dark:text-green-200 font-semibold">
          ✅ Ownership transfer transaction submitted! Wait ~10 minutes for confirmation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500 rounded-lg p-4">
      <h4 className="text-sm font-bold text-yellow-900 dark:text-yellow-200 mb-2">
        ⚠️ One-Time Setup Required
      </h4>
      <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-3">
        To enable minting, you need to transfer ownership of the aBTC token contract to the AuraVault contract. 
        This is a one-time operation and cannot be undone.
      </p>
      <button
        onClick={handleTransfer}
        disabled={loading}
        className="w-full cursor-pointer rounded-lg bg-yellow-600 px-4 py-2 text-white text-sm font-semibold shadow hover:bg-yellow-700 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 transition-all"
      >
        {loading ? 'Transferring...' : 'Transfer Ownership to Vault'}
      </button>
    </div>
  );
}

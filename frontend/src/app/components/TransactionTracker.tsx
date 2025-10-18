'use client';

import { useState, useEffect } from 'react';

interface TransactionTrackerProps {
  txId: string;
  onConfirmed: () => void;
}

export default function TransactionTracker({ txId, onConfirmed }: TransactionTrackerProps) {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'failed'>('pending');
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkTransaction = async () => {
      try {
        const response = await fetch(`https://api.testnet.hiro.so/extended/v1/tx/${txId}`);
        const data = await response.json();
        
        console.log('[TransactionTracker] Checking tx status:', data.tx_status);
        
        if (data.tx_status === 'success') {
          setStatus('confirmed');
          onConfirmed();
        } else if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
          console.error('[TransactionTracker] Transaction failed:', data);
          setStatus('failed');
          
          // Try to extract the error message
          if (data.tx_result?.repr) {
            console.error('[TransactionTracker] Error details:', data.tx_result.repr);
          }
        }
      } catch (err) {
        console.error('[TransactionTracker] Error checking tx:', err);
      }
    };

    // Check immediately
    checkTransaction();
    
    // Then check every 10 seconds
    const interval = setInterval(checkTransaction, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [txId, onConfirmed]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'confirmed') {
    return (
      <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl animate-bounce">
        <p className="font-bold">✅ Transaction Confirmed!</p>
        <p className="text-sm">Dashboard updated with new values</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl max-w-md">
        <p className="font-bold">❌ Transaction Failed</p>
        <p className="text-sm mt-2">The transaction was rejected by the blockchain.</p>
        <p className="text-xs mt-2 opacity-90">
          <strong>Common reasons:</strong>
        </p>
        <ul className="text-xs mt-1 ml-4 list-disc opacity-90">
          <li>Trying to mint more than 50% LTV allows</li>
          <li>Insufficient STX deposited</li>
          <li>Contract error</li>
        </ul>
        <p className="text-xs mt-3 opacity-75">
          View transaction:{' '}
          <a 
            href={`https://explorer.hiro.so/txid/${txId}?chain=testnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-red-200"
          >
            Explorer
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-2xl">
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        <div>
          <p className="font-bold">⏳ Waiting for confirmation...</p>
          <p className="text-sm">Time elapsed: {formatTime(timeElapsed)}</p>
          <p className="text-xs opacity-75 mt-1">Usually takes ~10 minutes</p>
        </div>
      </div>
    </div>
  );
}

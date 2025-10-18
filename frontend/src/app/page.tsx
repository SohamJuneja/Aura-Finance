'use client'; // Required because we are using state and effects

import { AppConfig, UserSession } from '@stacks/connect';
import { useState, useEffect } from 'react';
import ConnectWallet from './components/ConnectWallet';
import Dashboard from './components/Dashboard';
import DepositSTX from './components/DepositSTX';
import MintABTC from './components/MintABTC';
import TransactionTracker from './components/TransactionTracker';
import TransferOwnership from './components/TransferOwnership';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export default function Home() {
  // This state helps us know when the page has loaded in the browser
  const [isClient, setIsClient] = useState(false);
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [dashboardKey, setDashboardKey] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleTransactionSubmitted = (txId: string) => {
    console.log('[Home] Transaction submitted:', txId);
    setPendingTxId(txId);
  };

  const handleTransactionConfirmed = () => {
    console.log('[Home] Transaction confirmed, refreshing dashboard');
    setDashboardKey(prev => prev + 1);
    setPendingTxId(null);
  };

  // We only know if the user is signed in when the client has loaded
  const isConnected = isClient && userSession.isUserSignedIn();

  return (
    <main className="flex min-h-screen flex-col items-center p-8 lg:p-24">
      {/* Header Section */}
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm flex">
        <p className="text-lg font-bold">Aura Finance</p>
        {/* We only render the wallet button on the client */}
        {isClient && <ConnectWallet />}
      </div>

      {/* Main Content Section */}
      <div className="flex-grow flex flex-col items-center justify-center text-center w-full max-w-7xl mt-16 space-y-12">
        {isConnected ? (
          <>
            {/* Dashboard showing current balances */}
            <Dashboard key={dashboardKey} userSession={userSession} />
            
            {/* Transaction Actions */}
            <div className="w-full">
              <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400">
                Interact with Aura Finance
              </h2>
              
              {/* One-time ownership transfer */}
              <div className="max-w-2xl mx-auto mb-6">
                <TransferOwnership />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
                <DepositSTX 
                  userSession={userSession} 
                  onSuccess={(txId) => handleTransactionSubmitted(txId)}
                />
                <MintABTC 
                  userSession={userSession} 
                  onSuccess={(txId) => handleTransactionSubmitted(txId)}
                />
              </div>
            </div>
          </>
        ) : (
          // If not connected, show the welcome message
          <div>
            <h1 className="text-5xl font-bold mb-4">The Self-Repaying Future of Finance</h1>
            <p className="text-xl text-gray-400">Connect your wallet to get started.</p>
          </div>
        )}
      </div>

      {/* Transaction Status Tracker */}
      {pendingTxId && (
        <TransactionTracker 
          txId={pendingTxId} 
          onConfirmed={handleTransactionConfirmed}
        />
      )}
    </main>
  );
}
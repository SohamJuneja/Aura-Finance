'use client'; // Required because we are using state and effects

import { AppConfig, UserSession } from '@stacks/connect';
import { useState, useEffect } from 'react';
import ConnectWallet from '../components/ConnectWallet';
import Dashboard from '../components/Dashboard'; // Import the new component

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export default function Home() {
  // This state helps us know when the page has loaded in the browser
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
      <div className="flex-grow flex flex-col items-center justify-center text-center w-full max-w-5xl mt-16">
        {isConnected ? (
          // If connected, show the dashboard
          <Dashboard userSession={userSession} />
        ) : (
          // If not connected, show the welcome message
          <div>
            <h1 className="text-5xl font-bold mb-4">The Self-Repaying Future of Finance</h1>
            <p className="text-xl text-gray-400">Connect your wallet to get started.</p>
          </div>
        )}
      </div>
    </main>
  );
}
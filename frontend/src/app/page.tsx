'use client';

import ConnectWallet from './components/ConnectWallet';
import Dashboard from './components/Dashboard';
import { AppConfig, UserSession } from '@stacks/connect';
import { useState, useEffect } from 'react';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export default function Home() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    setIsSignedIn(userSession.isUserSignedIn());
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Aura Finance
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:size-auto lg:bg-none">
          <ConnectWallet />
        </div>
      </div>

      <div className="relative z-[-1] flex place-items-center">
        <h1 className="text-5xl font-bold">The Self-Repaying Future of Finance</h1>
      </div>

      <div className="mb-32 grid text-center lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-4 lg:text-left">
        {/* Dashboard shown when user is connected */}
        {isSignedIn && <Dashboard userSession={userSession} />}
      </div>
    </main>
  );
}
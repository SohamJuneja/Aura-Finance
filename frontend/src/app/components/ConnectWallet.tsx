'use client'; // This is required by Next.js to make the component interactive

import { AppConfig, UserSession } from '@stacks/connect';

// Minimal shape used from Stacks user data to avoid external type dependency
type UserData = {
  profile?: {
    stxAddress?: {
      testnet?: string;
      mainnet?: string;
    };
  };
};
import { useState, useEffect } from 'react';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export default function ConnectWallet() {
  // Track Stacks user session data when signed in
  const [userData, setUserData] = useState<UserData | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((data) => {
        setUserData(data);
      });
    } else if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      console.log('[ConnectWallet] Opening Stacks connect modal');
      const mod = await import('@stacks/connect');
      type ShowConnect = (opts: {
        userSession: unknown;
        appDetails?: { name: string; icon?: string };
        onFinish?: () => void;
        onCancel?: (err?: unknown) => void;
      }, provider?: unknown) => Promise<unknown> | void;
      const getFn = (m: Record<string, unknown>): ShowConnect | undefined => {
        const candidates = [
          'showConnect',
          'authenticate',
          'connect',
          'showBlockstackConnect',
        ] as const;
        for (const key of candidates) {
          const v = m[key];
          if (typeof v === 'function') return v as ShowConnect;
        }
        // Some bundlers put named exports under default
        const def: unknown = (m as { default?: unknown }).default;
        if (def && typeof def === 'object') {
          return getFn(def as Record<string, unknown>);
        }
        return undefined;
      };
      const fn = getFn(mod as unknown as Record<string, unknown>);
      if (!fn) {
        console.error('[ConnectWallet] Available keys on @stacks/connect:', Object.keys(mod as Record<string, unknown>));
      }
      if (typeof fn !== 'function') {
        throw new Error('showConnect export not found or not a function');
      }
      await fn({
        userSession,
        appDetails: {
          name: 'Aura Finance',
          icon: `${window.location.origin}/favicon.ico`,
        },
        onFinish: () => {
          console.log('[ConnectWallet] Connect finished, reloading page...');
          window.location.reload(); // Force full page refresh to sync state
        },
        onCancel: () => {
          console.log('[ConnectWallet] User canceled connect');
          setConnecting(false);
        },
      });
    } catch (err) {
      setConnecting(false);
      console.error('[ConnectWallet] Failed to open connect modal', err);
      if (typeof window !== 'undefined') {
        alert('Failed to open connect modal. See console for details.');
      }
    }
  };

  const handleDisconnect = () => {
    userSession.signUserOut(window.location.origin);
    setUserData(null);
  };

  if (userData) {
    // User is signed in
    // UserData.profile is not strongly typed for stxAddress; safely narrow using unknown cast
    const profile = (userData as unknown as {
      profile?: { stxAddress?: { testnet?: string; mainnet?: string } };
    }).profile;
    const userAddress: string | undefined = profile?.stxAddress?.testnet || profile?.stxAddress?.mainnet;

    return (
      <div>
        <p>
          Connected:{' '}
          {userAddress
            ? `${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`
            : 'Unknown address'}
        </p>
        <button onClick={handleDisconnect}>Disconnect Wallet</button>
      </div>
    );
  }

  // User is not signed in
  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={connecting}
      className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {connecting ? 'Connecting…' : 'Connect Wallet'}
    </button>
  );
}

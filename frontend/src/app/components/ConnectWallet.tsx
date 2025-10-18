'use client'; // This is required by Next.js to make the component interactive

import { AppConfig, UserSession, showConnect } from '@stacks/connect';

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

  useEffect(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((data) => {
        setUserData(data);
      });
    } else if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const handleConnect = () => {
    showConnect({
      userSession,
      appDetails: {
        name: 'Aura Finance',
        icon: `${window.location.origin}/favicon.ico`,
      },
      onFinish: () => window.location.reload(),
      onCancel: () => console.log('User canceled connect'),
    });
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
  return <button onClick={handleConnect}>Connect Wallet</button>;
}

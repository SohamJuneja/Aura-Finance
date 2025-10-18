'use client'; // This is required by Next.js to make the component interactive

import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { useState, useEffect } from 'react';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export default function ConnectWallet() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((userData) => {
        setUserData(userData);
      });
    } else if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const handleConnect = () => {
    showConnect({
      userSession,
      appName: 'Aura Finance',
      appIcon: window.location.origin + '/favicon.ico',
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
    const userAddress = userData.profile.stxAddress.testnet;
    return (
      <div>
        <p>Connected: {`${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`}</p>
        <button onClick={handleDisconnect}>Disconnect Wallet</button>
      </div>
    );
  }

  // User is not signed in
  return <button onClick={handleConnect}>Connect Wallet</button>;
}
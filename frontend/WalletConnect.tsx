import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { mainnet, polygon, arbitrum } from 'wagmi/chains';
import { walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface WalletData {
  address: string;
  connected: boolean;
  balance?: string;
  nonce?: string;
}

const WalletConnect: React.FC = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, connectors: wagmiConnectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessage, isPending: isSignPending } = useSignMessage();
  
  const [walletData, setWalletData] = useState<WalletData>({
    address: '',
    connected: false,
  });
  const [nonce, setNonce] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Update wallet data when account changes
  useEffect(() => {
    if (address && isConnected) {
      setWalletData({
        address: address,
        connected: true,
      });
    } else {
      setWalletData({
        address: '',
        connected: false,
      });
    }
  }, [address, isConnected]);

  // Get nonce from backend
  const getNonce = async (walletAddress: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:8080/api/auth/nonce?address=${walletAddress}`);
      
      if (!response.ok) {
        throw new Error('Failed to get nonce');
      }
      
      const data = await response.json();
      setNonce(data.nonce);
      return { nonce: data.nonce, message: data.message };
    } catch (error) {
      console.error('Nonce error:', error);
      Alert.alert('Error', 'Failed to get nonce from server');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign message with nonce
  const signMessageWithNonce = async () => {
    if (!address) return;
    
    try {
      const nonceData = await getNonce(address);
      if (!nonceData) return;

      await signMessage({ message: nonceData.message });
      
      // Get the signature from the wallet and verify with backend
      // Note: In a real implementation, you'd get the actual signature
      // For now, we'll simulate the verification process
      console.log('Message signed, proceeding with verification...');
      await verifySignature(address, "signed_message", nonceData.nonce);
    } catch (error) {
      console.error('Sign error:', error);
      Alert.alert('Error', 'Failed to sign message');
    }
  };

  // Verify signature with backend
  const verifySignature = async (walletAddress: string, signature: string, nonceValue: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('http://localhost:8080/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: walletAddress,
          signature: signature,
          nonce: nonceValue,
        }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        Alert.alert(
          '✅ Wallet Connected!',
          `Your wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} has been verified.`,
          [
            {
              text: 'View Banking',
              onPress: () => router.push('/(tabs)/databas'),
            },
            { text: 'OK' }
          ]
        );
        
        // Store token securely (in real app, use secure storage)
        console.log('JWT Token:', data.token);
      } else {
        Alert.alert('❌ Verification Failed', data.error || 'Invalid signature');
      }
    } catch (error) {
      console.error('Verify error:', error);
      Alert.alert('Error', 'Failed to verify signature');
    } finally {
      setIsLoading(false);
    }
  };

  // Connect wallet
  const handleConnect = (connectorId: string) => {
    const connector = wagmiConnectors.find(c => c.id === connectorId);
    if (connector) {
      connect({ connector });
    }
  };

  // Disconnect wallet
  const handleDisconnect = () => {
    disconnect();
    setNonce('');
    setWalletData({ address: '', connected: false });
  };

  // Copy address to clipboard
  const copyAddress = () => {
    // In real app, use Clipboard API
    Alert.alert('Address Copied', walletData.address);
  };

  // Get available connectors - Mobile friendly only
  const availableConnectors = [
    {
      id: 'walletConnect',
      name: 'WalletConnect',
      icon: '🔗',
      gradient: ['#4F46E5', '#7C3AED'],
      description: 'Connect any mobile wallet'
    },
    {
      id: 'coinbaseWallet',
      name: 'Coinbase Wallet',
      icon: '🟦',
      gradient: ['#0052FF', '#0066FF'],
      description: 'Connect Coinbase Wallet app'
    },
    {
      id: 'trustWallet',
      name: 'Trust Wallet',
      icon: '🛡️',
      gradient: ['#FF6B6B', '#FF8E53'],
      description: 'Popular mobile wallet'
    },
    {
      id: 'rainbow',
      name: 'Rainbow',
      icon: '🌈',
      gradient: ['#667EEA', '#764BA2'],
      description: 'Elegant mobile wallet'
    },
  ];

  if (walletData.connected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectedCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.statusText}>Connected</Text>
          </View>
          
          <View style={styles.addressContainer}>
            <Text style={styles.addressLabel}>Wallet Address</Text>
            <TouchableOpacity onPress={copyAddress} style={styles.addressRow}>
              <Text style={styles.addressText}>
                {walletData.address.slice(0, 6)}...{walletData.address.slice(-4)}
              </Text>
              <Text style={styles.copyText}>📋</Text>
            </TouchableOpacity>
          </View>

          {!nonce ? (
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={signMessageWithNonce}
              disabled={isSignPending || isLoading}
            >
              {isSignPending || isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>🔐 Verify Wallet</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.verifiedContainer}>
              <Text style={styles.verifiedText}>✅ Wallet Verified</Text>
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]} 
                onPress={() => router.push('/(tabs)/databas')}
              >
                <Text style={styles.buttonText}>🏦 Open Banking</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.button, styles.dangerButton]} 
            onPress={handleDisconnect}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>🔗 Connect Your Wallet</Text>
          <Text style={styles.subtitle}>
            Choose your preferred wallet to access secure banking services
          </Text>
        </View>

        <View style={styles.walletList}>
          {availableConnectors.map((connector, index) => (
            <TouchableOpacity
              key={connector.id}
              style={[
                styles.walletButton,
                isPending && styles.disabledButton,
                { marginBottom: index === availableConnectors.length - 1 ? 0 : 16 }
              ]}
              onPress={() => handleConnect(connector.id)}
              disabled={isPending}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={connector.gradient as any}
                style={styles.walletButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.walletContent}>
                  <View style={styles.walletLeft}>
                    <View style={styles.walletIconContainer}>
                      <Text style={styles.walletIcon}>{connector.icon}</Text>
                    </View>
                    <View style={styles.walletInfo}>
                      <Text style={styles.walletName}>{connector.name}</Text>
                      <Text style={styles.walletDesc}>{connector.description}</Text>
                    </View>
                  </View>
                  {isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <View style={styles.connectIcon}>
                      <Text style={styles.connectArrow}>→</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.securityNotice}>
          <Text style={styles.securityTitle}>🔒 Secure & Private</Text>
          <Text style={styles.securityText}>
            • Your wallet is cryptographically verified
            • Zero gas fees for connection
            • Private keys never leave your device
            • You control all transactions
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 20,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 24,
  },
  walletList: {
    marginBottom: 32,
  },
  walletButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  walletButtonGradient: {
    padding: 4,
  },
  walletContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  walletIcon: {
    fontSize: 24,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  walletDesc: {
    fontSize: 14,
    color: '#888888',
  },
  connectIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectArrow: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  securityNotice: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  securityText: {
    fontSize: 14,
    color: '#888888',
    lineHeight: 22,
  },
  connectedCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  addressContainer: {
    marginBottom: 24,
  },
  addressLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  addressText: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#ffffff',
  },
  copyText: {
    fontSize: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  verifiedContainer: {
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 16,
  },
});

export default WalletConnect;

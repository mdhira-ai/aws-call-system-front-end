// Utility functions for testing network changes and connection recovery

export const networkUtils = {
  // Simulate network change for testing
  simulateNetworkChange() {
    console.log('Simulating network change...');
    window.dispatchEvent(new Event('offline'));
    setTimeout(() => {
      window.dispatchEvent(new Event('online'));
    }, 1000);
  },

  // Check if device supports Network Information API
  supportsNetworkInfo() {
    return 'connection' in navigator;
  },

  // Get current network information
  getNetworkInfo() {
    if (!this.supportsNetworkInfo()) {
      return { type: 'unknown', effectiveType: 'unknown' };
    }
    
    const connection = navigator.connection;
    return {
      type: connection.type || 'unknown',
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 'unknown',
      rtt: connection.rtt || 'unknown',
      saveData: connection.saveData || false
    };
  },

  // Monitor network changes
  monitorNetworkChanges(callback) {
    const handleOnline = () => {
      console.log('Network: Device online');
      callback({ status: 'online', info: this.getNetworkInfo() });
    };

    const handleOffline = () => {
      console.log('Network: Device offline');
      callback({ status: 'offline', info: null });
    };

    const handleConnectionChange = () => {
      console.log('Network: Connection changed');
      callback({ status: 'changed', info: this.getNetworkInfo() });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (this.supportsNetworkInfo()) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (this.supportsNetworkInfo()) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  },

  // Test ICE restart capability
  async testIceRestart(peerConnection) {
    if (!peerConnection) {
      throw new Error('No peer connection provided');
    }

    try {
      console.log('Testing ICE restart...');
      peerConnection.restartIce();
      return { success: true, message: 'ICE restart initiated' };
    } catch (error) {
      console.error('ICE restart failed:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export for console testing
if (typeof window !== 'undefined') {
  window.networkUtils = networkUtils;
}
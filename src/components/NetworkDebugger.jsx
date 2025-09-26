import { useState, useEffect } from 'react';

export default function NetworkDebugger({ peer, callObject }) {
  const [networkInfo, setNetworkInfo] = useState({});
  const [iceStats, setIceStats] = useState([]);
  const [networkEvents, setNetworkEvents] = useState([]);

  // Monitor network changes
  useEffect(() => {
    const handleNetworkEvent = (event) => {
      const timestamp = new Date().toLocaleTimeString();
      const eventInfo = {
        type: event.type,
        timestamp,
        networkInfo: navigator.connection ? {
          type: navigator.connection.type,
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        } : null
      };
      
      setNetworkEvents(prev => [eventInfo, ...prev.slice(0, 9)]);
      console.log('Network event:', eventInfo);
    };

    const handleConnectionChange = () => {
      handleNetworkEvent({ type: 'connection-change' });
    };

    window.addEventListener('online', handleNetworkEvent);
    window.addEventListener('offline', handleNetworkEvent);
    
    if (navigator.connection) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleNetworkEvent);
      window.removeEventListener('offline', handleNetworkEvent);
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!callObject?.peerConnection) return;

    const pc = callObject.peerConnection;
    
    // Monitor ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE Candidate:', event.candidate);
        setIceStats(prev => [...prev, {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    };

    // Get network info
    const updateNetworkInfo = async () => {
      try {
        const stats = await pc.getStats();
        const info = {};
        
        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            info.selectedCandidatePair = report;
          }
          if (report.type === 'local-candidate' && report.candidateType) {
            info.localCandidate = report;
          }
          if (report.type === 'remote-candidate' && report.candidateType) {
            info.remoteCandidate = report;
          }
        });
        
        setNetworkInfo(info);
      } catch (error) {
        console.error('Error getting network stats:', error);
      }
    };

    const interval = setInterval(updateNetworkInfo, 5000);
    updateNetworkInfo(); // Initial call

    return () => clearInterval(interval);
  }, [callObject]);

  return (
    <div className="p-4 bg-gray-100 rounded-lg mt-4">
      <h3 className="font-bold mb-2">Network Debug Info</h3>
      
      {/* Current Network Info */}
      {navigator.connection && (
        <div className="mb-2 p-2 bg-blue-50 rounded">
          <strong>Current Network:</strong>
          <div className="ml-4 text-sm">
            <div>Type: {navigator.connection.type || 'Unknown'}</div>
            <div>Effective Type: {navigator.connection.effectiveType || 'Unknown'}</div>
            <div>Downlink: {navigator.connection.downlink || 'Unknown'} Mbps</div>
            <div>RTT: {navigator.connection.rtt || 'Unknown'} ms</div>
          </div>
        </div>
      )}
      
      {/* Connection State */}
      <div className="mb-2">
        <strong>Connection State:</strong> {callObject?.peerConnection?.connectionState || 'N/A'}
      </div>
      <div className="mb-2">
        <strong>ICE Connection State:</strong> {callObject?.peerConnection?.iceConnectionState || 'N/A'}
      </div>

      {/* Network Events */}
      {networkEvents.length > 0 && (
        <div className="mb-2">
          <strong>Recent Network Events:</strong>
          <div className="max-h-32 overflow-y-auto mt-1">
            {networkEvents.map((event, idx) => (
              <div key={idx} className="text-xs border-b py-1">
                <div className="font-medium">{event.timestamp}: {event.type}</div>
                {event.networkInfo && (
                  <div className="text-gray-600 ml-2">
                    {event.networkInfo.effectiveType} ({event.networkInfo.type})
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Selected Candidate Pair */}
      {networkInfo.selectedCandidatePair && (
        <div className="mb-2">
          <strong>Active Connection:</strong>
          <div className="ml-4 text-sm">
            <div>State: {networkInfo.selectedCandidatePair.state}</div>
            <div>Bytes Sent: {networkInfo.selectedCandidatePair.bytesSent}</div>
            <div>Bytes Received: {networkInfo.selectedCandidatePair.bytesReceived}</div>
          </div>
        </div>
      )}

      {/* Local Candidate */}
      {networkInfo.localCandidate && (
        <div className="mb-2">
          <strong>Your Connection Type:</strong>
          <div className="ml-4 text-sm">
            <div>Type: {networkInfo.localCandidate.candidateType}</div>
            <div>Protocol: {networkInfo.localCandidate.protocol}</div>
            <div>Address: {networkInfo.localCandidate.address}</div>
          </div>
        </div>
      )}

      {/* Remote Candidate */}
      {networkInfo.remoteCandidate && (
        <div className="mb-2">
          <strong>Remote Connection Type:</strong>
          <div className="ml-4 text-sm">
            <div>Type: {networkInfo.remoteCandidate.candidateType}</div>
            <div>Protocol: {networkInfo.remoteCandidate.protocol}</div>
            <div>Address: {networkInfo.remoteCandidate.address}</div>
          </div>
        </div>
      )}

      {/* Test Controls */}
      <div className="mb-2 p-2 bg-yellow-50 rounded">
        <strong>Network Tests:</strong>
        <div className="mt-2 space-x-2">
          <button 
            className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
            onClick={() => {
              if (callObject?.peerConnection) {
                console.log('Manual ICE restart triggered');
                callObject.peerConnection.restartIce();
              } else {
                console.log('No active call to restart ICE');
              }
            }}
          >
            Test ICE Restart
          </button>
          <button 
            className="px-2 py-1 bg-orange-500 text-white text-xs rounded"
            onClick={() => {
              window.dispatchEvent(new Event('offline'));
              setTimeout(() => window.dispatchEvent(new Event('online')), 2000);
            }}
          >
            Simulate Network Change
          </button>
        </div>
      </div>

      {/* ICE Candidates History */}
      {iceStats.length > 0 && (
        <details className="mt-2">
          <summary className="font-medium cursor-pointer">ICE Candidates ({iceStats.length})</summary>
          <div className="max-h-40 overflow-y-auto mt-2">
            {iceStats.map((candidate, idx) => (
              <div key={idx} className="text-xs border-b py-1">
                <div>{candidate.timestamp}: {candidate.type} via {candidate.protocol}</div>
                <div className="text-gray-600">{candidate.address}:{candidate.port}</div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Troubleshooting Tips */}
      <details className="mt-2">
        <summary className="font-medium cursor-pointer">Troubleshooting Tips</summary>
        <div className="text-sm mt-2 space-y-1">
          <div>• If you see only "host" candidates, you're behind a restrictive NAT/firewall</div>
          <div>• "srflx" candidates indicate STUN servers are working</div>
          <div>• "relay" candidates mean TURN servers are being used (best for restrictive networks)</div>
          <div>• Connection failures often occur when both users are behind symmetric NATs</div>
          <div>• Try using a VPN or mobile hotspot if connection fails</div>
          <div>• Network changes should trigger automatic ICE restart</div>
        </div>
      </details>
    </div>
  );
}
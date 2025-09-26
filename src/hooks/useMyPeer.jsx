// make a custom hook for using the PeerJS library
import { use, useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import useMySocket from "./useMySocket";

export default function useMyPeer() {
  const [peer, setPeer] = useState(null);
  const [isloggedin, setisloggedin] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);
  const [username, setusername] = useState("");
  const [callStatus, setCallStatus] = useState(""); // "calling", "incoming", "connected", "ended"
  const [incomingCallData, setIncomingCallData] = useState(null);
  const peerRef = useRef(null);
  const {
    connectSocket,
    mysocket,
    disconnectSocket,
    onlineusers,
    callNotification,
    setCallNotification,
    callstatus,
  } = useMySocket();

  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Network change detection and ICE restart
  useEffect(() => {
    const handleNetworkChange = () => {
      console.log('Network changed — restarting ICE');
      if (currentCall && currentCall.peerConnection) {
        console.log('Attempting ICE restart...');
        currentCall.peerConnection.restartIce();
      }
    };

    const handleOnline = () => {
      console.log('Device came online');
      handleNetworkChange();
    };

    const handleOffline = () => {
      console.log('Device went offline');
    };

    // Listen for network changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection type changes (experimental)
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', handleNetworkChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', handleNetworkChange);
      }
    };
  }, [currentCall]);

  useEffect(() => {
    if (callstatus === "rejected") {
      setCallStatus("");
      setCurrentCall(null);
      setIncomingCallData(null);
      // Clean up local stream
      if (localAudioRef.current && localAudioRef.current.srcObject) {
        const stream = localAudioRef.current.srcObject;
        stream.getTracks().forEach((track) => track.stop());
        localAudioRef.current.srcObject = null;
      }
      // Clean up remote stream
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
    }
  }, [callstatus]);

  useEffect(() => {
    if (peer === null) return;

    peer.on("open", () => {
      console.log("PeerJS connection opened with ID:", peer.id);
      setisloggedin(true);
      connectSocket(username);
    });

    peer.on("call", (call) => {
      console.log("Incoming PeerJS call from:", call.peer);
      setCurrentCall(call);
      setCallStatus("incoming");
      setIncomingCallData({ from: call.peer, call });

      // Listen for call events
      call.on("close", () => {
        console.log("Call closed by remote peer");
        setCurrentCall(null);
        setCallStatus("");
        setIncomingCallData(null);
        // Clean up local stream
        if (localAudioRef.current && localAudioRef.current.srcObject) {
          const stream = localAudioRef.current.srcObject;
          stream.getTracks().forEach((track) => track.stop());
          localAudioRef.current.srcObject = null;
        }
      });
    });

    peer.on("close", () => {
      console.log("PeerJS connection closed");
    });

    peer.on("disconnected", () => {
      console.log("PeerJS connection disconnected");
    });

    peer.on("error", (error) => {
      console.error("PeerJS error:", error);

      // Handle specific error types
      if (error.type === "peer-unavailable") {
        console.error("Target peer is not available");
        setCallStatus("error");
      } else if (error.type === "network") {
        console.error(
          "Network error - check internet connection and firewall settings"
        );
        setCallStatus("error");
      } else if (error.type === "socket-error") {
        console.error("Socket connection error - server might be unreachable");
        setCallStatus("error");
      } else if (error.type === "server-error") {
        console.error("PeerJS server error");
        setCallStatus("error");
      }
    });

    return () => {
      peer.destroy();
      setPeer(null);
      setisloggedin(false);
      setCurrentCall(null);
      setusername(null);
      setCallStatus("");
      setIncomingCallData(null);
      peerRef.current = null;
    };
  }, [peer]);

  function login(name) {
    const newPeer = new Peer(name, {
      host: "call.borealsoftwarecompany.com",
      port: 443,
      path: "/peerjs",
      secure: true,
      config: {
        iceServers: [
          { urls: "stun:call.borealsoftwarecompany.com:3478" },
          {
            urls: "turn:call.borealsoftwarecompany.com:3478",
            username: "webrtcuser",
            credential: "strongpassword123",
          },
          {
            urls: "turns:call.borealsoftwarecompany.com:5349",
            username: "webrtcuser",
            credential: "strongpassword123",
          },
          // Add Google's STUN servers for redundancy
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
        // iceServers: [
        //   {
        //     urls: "stun:stun.relay.metered.ca:80",
        //   },
        //   {
        //     urls: "turn:global.relay.metered.ca:80",
        //     username: "d51ecb19f97a5830625eefdc",
        //     credential: "DRGYTduNob80idwd",
        //   },
        //   {
        //     urls: "turn:global.relay.metered.ca:80?transport=tcp",
        //     username: "d51ecb19f97a5830625eefdc",
        //     credential: "DRGYTduNob80idwd",
        //   },
        //   {
        //     urls: "turn:global.relay.metered.ca:443",
        //     username: "d51ecb19f97a5830625eefdc",
        //     credential: "DRGYTduNob80idwd",
        //   },
        //   {
        //     urls: "turns:global.relay.metered.ca:443?transport=tcp",
        //     username: "d51ecb19f97a5830625eefdc",
        //     credential: "DRGYTduNob80idwd",
        //   },
        // ],
        iceCandidatePoolSize: 10,
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
        iceTransportPolicy: "all",
        // Add configuration for better network change handling
        iceRestart: true,
        continualGatheringPolicy: "gather_continually",
        debug: 3, // Enable debug logging to troubleshoot connection issues
      },
      debug: 2, // Enable debug logging to troubleshoot connection issues
    });
    setPeer(newPeer);
    peerRef.current = newPeer;
    console.log("Socket ID:", mysocket?.id);

    setusername(name);
  }

  function logout() {
    if (peer) {
      peer.destroy();
      setPeer(null);
      setisloggedin(false);
      setCurrentCall(null);
      setusername("");
      setCallStatus("");
      setIncomingCallData(null);
      peerRef.current = null;
    }
    disconnectSocket();
  }

  async function callUser(username) {
    if (!peer) {
      console.error("PeerJS is not initialized");
      return;
    }
    if (!mysocket) {
      console.error("Socket.IO is not connected");
      return;
    }

    try {
      const userId = username;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }

      const call = peer.call(userId, stream);
      setCurrentCall(call);
      setCallStatus("calling");

      call.on("stream", (remoteStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
        console.log("Received remote stream");
        setCallStatus("connected");
      });

      call.on("close", () => {
        console.log("Call ended by remote peer");
        setCurrentCall(null);
        setCallStatus("");
        // Clean up local stream
        if (localAudioRef.current && localAudioRef.current.srcObject) {
          const stream = localAudioRef.current.srcObject;
          stream.getTracks().forEach((track) => track.stop());
          localAudioRef.current.srcObject = null;
        }
        // Clean up remote stream
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = null;
        }
      });

      call.on("error", (error) => {
        console.error("Call error:", error);
        setCurrentCall(null);
        setCallStatus("error");

        // Clean up streams on error
        if (localAudioRef.current && localAudioRef.current.srcObject) {
          const stream = localAudioRef.current.srcObject;
          stream.getTracks().forEach((track) => track.stop());
          localAudioRef.current.srcObject = null;
        }
      });

      // Monitor connection state
      call.peerConnection.onconnectionstatechange = () => {
        console.log("Connection state:", call.peerConnection.connectionState);
        if (call.peerConnection.connectionState === "failed") {
          console.error(
            "Connection failed - this often indicates NAT/firewall issues"
          );
          setCallStatus("error");
        } else if (call.peerConnection.connectionState === "disconnected") {
          console.log("Connection disconnected - attempting to reconnect...");
          // Don't immediately set error, wait a bit for potential reconnection
          setTimeout(() => {
            if (call.peerConnection.connectionState === "disconnected") {
              console.log("Still disconnected, attempting ICE restart");
              call.peerConnection.restartIce();
            }
          }, 3000);
        }
      };

      call.peerConnection.oniceconnectionstatechange = () => {
        console.log(
          "ICE connection state:",
          call.peerConnection.iceConnectionState
        );
        if (call.peerConnection.iceConnectionState === "failed") {
          console.error("ICE connection failed - NAT traversal failed");
          setCallStatus("error");
        } else if (call.peerConnection.iceConnectionState === "disconnected") {
          console.log("ICE disconnected - network may have changed");
          // Attempt ICE restart after a short delay
          setTimeout(() => {
            if (call.peerConnection.iceConnectionState === "disconnected") {
              console.log("Attempting ICE restart due to disconnection");
              call.peerConnection.restartIce();
            }
          }, 2000);
        } else if (call.peerConnection.iceConnectionState === "connected" || 
                   call.peerConnection.iceConnectionState === "completed") {
          console.log("ICE connection restored");
          if (callStatus === "error") {
            setCallStatus("connected");
          }
        }
      };

      // Emit socket event to notify the other user
      mysocket.emit("call-user", { from: peer.id, to: userId });
      console.log("Calling user:", userId);
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setCallStatus("");
    }
  }

  async function acceptCall() {
    if (!peer || !currentCall) {
      console.error("PeerJS is not initialized or no incoming call");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }

      currentCall.answer(stream);
      setCallStatus("connected");

      currentCall.on("stream", (remoteStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
        console.log("Received remote stream");
      });

      currentCall.on("close", () => {
        console.log("Call ended by remote peer");
        setCurrentCall(null);
        setCallStatus("");
        setIncomingCallData(null);
        // Clean up streams
        if (localAudioRef.current && localAudioRef.current.srcObject) {
          const stream = localAudioRef.current.srcObject;
          stream.getTracks().forEach((track) => track.stop());
          localAudioRef.current.srcObject = null;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = null;
        }
      });

      // Add error handling for accepted calls too
      currentCall.on("error", (error) => {
        console.error("Call error:", error);
        setCurrentCall(null);
        setCallStatus("error");
        setIncomingCallData(null);
      });

      // Monitor connection state for accepted calls
      currentCall.peerConnection.onconnectionstatechange = () => {
        console.log(
          "Connection state:",
          currentCall.peerConnection.connectionState
        );
        if (currentCall.peerConnection.connectionState === "failed") {
          console.error(
            "Connection failed - this often indicates NAT/firewall issues"
          );
          setCallStatus("error");
        } else if (currentCall.peerConnection.connectionState === "disconnected") {
          console.log("Connection disconnected - attempting to reconnect...");
          setTimeout(() => {
            if (currentCall.peerConnection.connectionState === "disconnected") {
              console.log("Still disconnected, attempting ICE restart");
              currentCall.peerConnection.restartIce();
            }
          }, 3000);
        }
      };

      currentCall.peerConnection.oniceconnectionstatechange = () => {
        console.log(
          "ICE connection state:",
          currentCall.peerConnection.iceConnectionState
        );
        if (currentCall.peerConnection.iceConnectionState === "failed") {
          console.error("ICE connection failed - NAT traversal failed");
          setCallStatus("error");
        } else if (currentCall.peerConnection.iceConnectionState === "disconnected") {
          console.log("ICE disconnected - network may have changed");
          setTimeout(() => {
            if (currentCall.peerConnection.iceConnectionState === "disconnected") {
              console.log("Attempting ICE restart due to disconnection");
              currentCall.peerConnection.restartIce();
            }
          }, 2000);
        } else if (currentCall.peerConnection.iceConnectionState === "connected" || 
                   currentCall.peerConnection.iceConnectionState === "completed") {
          console.log("ICE connection restored");
          if (callStatus === "error") {
            setCallStatus("connected");
          }
        }
      };

      // Notify socket that call was accepted
      if (mysocket && incomingCallData) {
        mysocket.emit("call-response", {
          from: peer.id,
          to: incomingCallData.from,
          accepted: true,
        });
      }

      setIncomingCallData(null);
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  }

  async function rejectCall() {
    if (currentCall) {
      currentCall.close();
      setCurrentCall(null);
      setCallStatus("");

      // Notify socket that call was rejected
      if (mysocket && incomingCallData) {
        mysocket.emit("call-response", {
          from: peer.id,
          to: incomingCallData.from,
          accepted: false,
        });
      }

      setIncomingCallData(null);
    }
  }

  async function endCall() {
    if (currentCall) {
      currentCall.close();
      setCurrentCall(null);
      setCallStatus("");
      setIncomingCallData(null);

      // Clean up streams
      if (localAudioRef.current && localAudioRef.current.srcObject) {
        const stream = localAudioRef.current.srcObject;
        stream.getTracks().forEach((track) => track.stop());
        localAudioRef.current.srcObject = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
    }
  }

  return {
    logout,
    login,
    peer,
    isloggedin,
    setisloggedin,
    currentCall,
    setCurrentCall,
    peerRef,
    username,
    setusername,
    mysocket,
    onlineusers,
    localAudioRef,
    remoteAudioRef,
    callUser,
    acceptCall,
    rejectCall,
    endCall,
    callStatus,
    incomingCallData,
    callNotification,
    setCallNotification,
  };
}

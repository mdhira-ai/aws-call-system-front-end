import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";
import NetworkDebugger from "./components/NetworkDebugger.jsx";

export default function App() {
  const [mysocket, setmysocket] = useState(null);
  const [username, setUsername] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [peer, setPeer] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const currentCall = useRef(null);

  // Register user with Socket.IO
  const login = () => {
    if (!username) return;
    const socket = io("https://call.borealsoftwarecompany.com", {
      path: "/socket.io",
      secure: true,
    });
    // const socket = io("http://localhost:3000");
    setmysocket(socket);
    
    // Set up socket event listeners immediately
    socket.on("online-users", (users) => {
      console.log("Received online users:", users);
      setOnlineUsers(users.filter((u) => u !== username));
    });

    // i am now accepting calls
    socket.on("incoming-call", ({ from }) => {
      console.log("Incoming call from:", from);
      setIncomingCall(from);
    });

    socket.on("call-response", ({ from, accepted }) => {
      console.log("Call response:", { from, accepted });
      if (!accepted) alert(`${from} rejected your call.`);
    });
    
    // Register user after setting up listeners
    socket.emit("register", username);
    
    // Set up PeerJS
    // const peer = new Peer(username);
    // setPeer(peer);

    // signaling server details
    setPeer(
      new Peer(username, {
        host: "call.borealsoftwarecompany.com",
        port: 443,
        path: "/peerjs",
        secure: true,
        config: {
          iceServers: [
            // Google's public STUN servers
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
            // Additional STUN servers for redundancy
            { urls: "stun:stun.stunprotocol.org:3478" },
            { urls: "stun:stun.voiparound.com" },
            { urls: "stun:stun.voipbuster.com" },
            { urls: "stun:stun.voipstunt.com" },
            { urls: "stun:stun.voxgratia.org" },
            // OpenRelay TURN servers (free tier available)
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject"
            },
            {
              urls: "turn:openrelay.metered.ca:443",
              username: "openrelayproject",
              credential: "openrelayproject"
            },
            {
              urls: "turn:openrelay.metered.ca:443?transport=tcp",
              username: "openrelayproject",
              credential: "openrelayproject"
            }
          ],
          iceCandidatePoolSize: 10,
          bundlePolicy: "max-bundle",
          rtcpMuxPolicy: "require",
          iceTransportPolicy: "all"
        },
        debug: 2 // Enable debug logging to troubleshoot connection issues
      })
    );
    setLoggedIn(true);
  };

  // Handle PeerJS events
  useEffect(() => {
    if (!peer) return;

    peer.on("call", (call) => {
      console.log("Incoming PeerJS call from:", call.peer);
      setIncomingCall(call.peer);
      currentCall.current = call;
    });

    peer.on("open", (id) => {
      console.log("PeerJS connection opened with ID:", id);
    });

    peer.on("error", (error) => {
      console.error("PeerJS error:", error);
    });
  }, [peer]);

  // Place a call
  const callUser = async (remoteId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localVideoRef.current.srcObject = stream;

      const call = peer.call(remoteId, stream);
      currentCall.current = call;

      call.on("stream", (remoteStream) => {
        remoteVideoRef.current.srcObject = remoteStream;
      });

      // Monitor connection state
      call.peerConnection.onconnectionstatechange = () => {
        console.log("Connection state:", call.peerConnection.connectionState);
        if (call.peerConnection.connectionState === 'failed') {
          console.error("Connection failed - this often indicates NAT/firewall issues");
          alert("Connection failed. This may be due to network/firewall issues.");
        }
      };

      call.peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", call.peerConnection.iceConnectionState);
        if (call.peerConnection.iceConnectionState === 'failed') {
          console.error("ICE connection failed - NAT traversal failed");
          alert("Connection failed due to network restrictions. Try from a different network.");
        }
      };

      mysocket.emit("call-user", { from: username, to: remoteId });
    } catch (err) {
      alert(
        "Could not access camera or microphone. Please check your device and browser permissions."
      );
      console.error(err);
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localVideoRef.current.srcObject = stream;

      currentCall.current.answer(stream);
      currentCall.current.on("stream", (remoteStream) => {
        remoteVideoRef.current.srcObject = remoteStream;
      });

      // Monitor connection state for accepted calls
      currentCall.current.peerConnection.onconnectionstatechange = () => {
        console.log("Connection state:", currentCall.current.peerConnection.connectionState);
        if (currentCall.current.peerConnection.connectionState === 'failed') {
          console.error("Connection failed - this often indicates NAT/firewall issues");
          alert("Connection failed. This may be due to network/firewall issues.");
        }
      };

      currentCall.current.peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", currentCall.current.peerConnection.iceConnectionState);
        if (currentCall.current.peerConnection.iceConnectionState === 'failed') {
          console.error("ICE connection failed - NAT traversal failed");
          alert("Connection failed due to network restrictions. Try from a different network.");
        }
      };

      mysocket.emit("call-response", {
        from: username,
        to: incomingCall,
        accepted: true,
      });
      setIncomingCall(null);
    } catch (err) {
      alert(
        "Could not access camera or microphone. Please check your device and browser permissions."
      );
      console.error(err);
      setIncomingCall(null);
    }
  };

  // Reject incoming call
  const rejectCall = () => {
    if (currentCall.current) currentCall.current.close();
    mysocket.emit("call-response", {
      from: username,
      to: incomingCall,
      accepted: false,
    });
    setIncomingCall(null);
  };

  return (
    <div className="p-4">
      {!loggedIn ? (
        <div>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border p-2"
          />
          <button
            onClick={login}
            className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Login
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Debug Info */}
          <div className="col-span-3 mb-4 p-2 bg-gray-100 rounded">
            <h3 className="font-bold">Debug Info:</h3>
            <p>Username: {username}</p>
            <p>Socket ID: {mysocket?.id}</p>
            <p>Peer ID: {peer?.id}</p>
            <p>Socket Connected: {mysocket?.connected ? 'Yes' : 'No'}</p>
            <p>Peer Connected: {peer?.open ? 'Yes' : 'No'}</p>
            <p>Online Users Count: {onlineUsers.length}</p>
            <p>Online Users: {onlineUsers.join(', ') || 'None'}</p>
          </div>

          {/* Online Users */}
          <div>
            <h2 className="font-bold mb-2">Online Users ({onlineUsers.length})</h2>
            {onlineUsers.length === 0 ? (
              <p className="text-gray-500">No other users online</p>
            ) : (
              onlineUsers.map((user) => (
                <div
                  key={user}
                  className="flex justify-between items-center mb-2"
                >
                  <span>{user}</span>
                  <button
                    onClick={() => callUser(user)}
                    className="px-2 py-1 bg-green-500 text-white rounded"
                  >
                    Call
                  </button>
                </div>
              ))
            )}
          </div>
          {/* call controls */}
          {
            // if i am in a call, show call controls
            currentCall.current && (
              <div className="flex flex-col items-center justify-center">
                <h2 className="font-bold mb-2">Call Controls</h2>
                <button
                  onClick={() => {
                    if (currentCall.current) {
                      currentCall.current.close();
                      remoteVideoRef.current.srcObject = null;
                    }
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded"
                >
                  End Call
                </button>
              </div>
            )
          }

          {/* Videos */}
          <div className="col-span-2">
            <h2 className="font-bold mb-2">Video Call</h2>
            <div className="flex space-x-4">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-1/2 border rounded"
              />
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-1/2 border rounded"
              />
            </div>
          </div>

          {/* Network Debugger */}
          {currentCall.current && (
            <div className="col-span-3">
              <NetworkDebugger peer={peer} callObject={currentCall.current} />
            </div>
          )}
        </div>
      )}

      {/* Incoming Call Popup */}
      {incomingCall && (
        <div className="fixed bottom-4 right-4 bg-white p-4 shadow rounded">
          <p>{incomingCall} is calling you</p>
          <div className="mt-2 flex space-x-2">
            <button
              onClick={acceptCall}
              className="px-3 py-1 bg-green-500 text-white rounded"
            >
              Accept
            </button>
            <button
              onClick={rejectCall}
              className="px-3 py-1 bg-red-500 text-white rounded"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

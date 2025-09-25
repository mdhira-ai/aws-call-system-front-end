import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";


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
    const socket = io("call.borealsoftwarecompany.com:3000");
    setmysocket(socket);
    if (mysocket) mysocket.emit("register", username);
    setPeer(new Peer(username, { host: "call.borealsoftwarecompany.com", port: 9000, path: "/" ,secure: true}));
    setLoggedIn(true);
  };

  // Handle online users
  useEffect(() => {
    if (!mysocket || !username) return;
    mysocket.on("online-users", users => setOnlineUsers(users.filter(u => u !== username)));

    mysocket.on("incoming-call", ({ from }) => {
      setIncomingCall(from);
    });

    mysocket.on("call-response", ({ from, accepted }) => {
      if (!accepted) alert(`${from} rejected your call.`);
    });
  }, [username]);

  // Handle PeerJS events
  useEffect(() => {
    if (!peer) return;

    peer.on("call", call => {
      setIncomingCall(call.peer);
      currentCall.current = call;
    });
  }, [peer]);

  // Place a call
  const callUser = async (remoteId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      localVideoRef.current.srcObject = stream;
      const call = peer.call(remoteId, stream);
      currentCall.current = call;

      call.on("stream", remoteStream => {
        remoteVideoRef.current.srcObject = remoteStream;
      });

      mysocket.emit("call-user", { from: username, to: remoteId });
    } catch (err) {
      alert("Could not access camera or microphone. Please check your device and browser permissions.");
      console.error(err);
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;

      currentCall.current.answer(stream);
      currentCall.current.on("stream", remoteStream => {
        remoteVideoRef.current.srcObject = remoteStream;
      });

      mysocket.emit("call-response", { from: username, to: incomingCall, accepted: true });
      setIncomingCall(null);
    } catch (err) {
      alert("Could not access camera or microphone. Please check your device and browser permissions.");
      console.error(err);
      setIncomingCall(null);
    }
  };

  // Reject incoming call
  const rejectCall = () => {
    if (currentCall.current) currentCall.current.close();
    mysocket.emit("call-response", { from: username, to: incomingCall, accepted: false });
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
          <button onClick={login} className="ml-2 px-4 py-2 bg-blue-500 text-white rounded">
            Login
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Online Users */}
          <div>
            <h2 className="font-bold mb-2">Online Users</h2>
            {onlineUsers.map(user => (
              <div key={user} className="flex justify-between items-center mb-2">
                <span>{user}</span>
                <button
                  onClick={() => callUser(user)}
                  className="px-2 py-1 bg-green-500 text-white rounded"
                >
                  Call
                </button>
              </div>
            ))}
          </div>
          {/* call controls */}
          {
            // if i am in a call, show call controls
            currentCall.current &&
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
          }

          {/* Videos */}
          <div className="col-span-2">
            <h2 className="font-bold mb-2">Video Call</h2>
            <div className="flex space-x-4">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-1/2 border rounded" />
              <video ref={remoteVideoRef} autoPlay playsInline className="w-1/2 border rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Incoming Call Popup */}
      {incomingCall && (
        <div className="fixed bottom-4 right-4 bg-white p-4 shadow rounded">
          <p>{incomingCall} is calling you</p>
          <div className="mt-2 flex space-x-2">
            <button onClick={acceptCall} className="px-3 py-1 bg-green-500 text-white rounded">
              Accept
            </button>
            <button onClick={rejectCall} className="px-3 py-1 bg-red-500 text-white rounded">
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function useMySocket() {
  const [mysocket, setmysocket] = useState(null);
  const [onlineusers, setonlineusers] = useState([]);
  const [callNotification, setCallNotification] = useState("");
  const [callstatus, setcallstatus] = useState("idle");

  // Network change detection for socket reconnection
  useEffect(() => {
    const handleNetworkChange = () => {
      console.log('Network changed — checking socket connection');
      if (mysocket && !mysocket.connected) {
        console.log('Socket disconnected due to network change, reconnecting...');
        mysocket.connect();
      }
    };

    const handleOnline = () => {
      console.log('Device came online — checking socket');
      handleNetworkChange();
    };

    window.addEventListener('online', handleOnline);
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', handleNetworkChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', handleNetworkChange);
      }
    };
  }, [mysocket]);

  function connectSocket(username) {
    if (!username) return;
    const socket = io("https://call.borealsoftwarecompany.com", {
      path: "/socket.io",
      secure: true,
      // Add connection options for better handling of network changes
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    // const socket = io("http://localhost:3000");

    socket.on("connect", () => {
      setmysocket(socket);
      console.log("Socket connected");
      // Re-register user on reconnect
      socket.emit("register", {
        username: username,
        isincall: false,
      });
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      if (reason === "io server disconnect") {
        // Server disconnected, try to reconnect manually
        socket.connect();
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("Socket reconnected after", attemptNumber, "attempts");
    });

    socket.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error);
    });

    // Set up socket event listeners immediately
    socket.on("online-users", (users) => {
      console.log("Received online users:", users);
        setonlineusers(users);
    });

    // i am now accepting calls
    socket.on("incoming-call", ({ from }) => {
      console.log("Incoming call from:", from);
      setCallNotification(`Incoming call from ${from}`);
      // Clear notification after 5 seconds
      setTimeout(() => setCallNotification(""), 5000);
    });

    socket.on("call-response", ({ from, accepted }) => {
      console.log("Call response:", { from, accepted });
      if (accepted) {
        setCallNotification(`${from} accepted your call`);
        setcallstatus("in-call");
      } else {
        setCallNotification(`${from} rejected your call`);
        setcallstatus("rejected");
      }
      // Clear notification after 3 seconds
      setTimeout(() => setCallNotification(""), 3000);
    });

    socket.on("call-ended", ({ from }) => {
      console.log("Call ended by:", from);
      setCallNotification(`Call ended by ${from}`);
      // Clear notification after 3 seconds
      setTimeout(() => setCallNotification(""), 3000);
    });

    // Register user after setting up all listeners
    socket.emit("register", {
        username: username,
        isincall: false,
    });
  }

  function disconnectSocket() {
    if (mysocket) {
      mysocket.disconnect();
      setmysocket(null);
      console.log("Socket disconnected");
    }
  }

  return { 
    mysocket, 
    connectSocket, 
    disconnectSocket, 
    onlineusers, 
    callNotification,
    setCallNotification ,
    callstatus,
  };
}

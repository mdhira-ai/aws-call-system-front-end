import React, { useEffect, useState } from "react";
import Peer from "peerjs";

function DataTransferTest() {
  const [mypeer, setmypeer] = useState(null);
  const [myfrndid, setmyfrndid] = useState("");
  const [messageInput, setMessageInput] = useState("");

  const [isConnected, setisConnected] = useState(false);
  const [ConnectionDetails, setConnectionDetails] = useState(null);

  const [messages, setmessages] = useState([]);

  useEffect(() => {
    // Option 1: Use PeerJS cloud (recommended for testing)
    // const peer = new Peer();

    // Option 2: Use custom server with TURN servers
    const peer = new Peer({
      host: "52.43.54.108",
      port: 9000,
      path: "/",
      config: {
        iceServers: [
          {
            urls: "stun:stun.relay.metered.ca:80",
          },
          {
            urls: "turn:global.relay.metered.ca:80",
            username: "bab250b5fae033f691200920",
            credential: "pOqBBvASslJmUyJ0",
          },
          {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "bab250b5fae033f691200920",
            credential: "pOqBBvASslJmUyJ0",
          },
          {
            urls: "turn:global.relay.metered.ca:443",
            username: "bab250b5fae033f691200920",
            credential: "pOqBBvASslJmUyJ0",
          },
          {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "bab250b5fae033f691200920",
            credential: "pOqBBvASslJmUyJ0",
          },
        ],
      },
    });

    peer.on("open", (id) => {
      setmypeer(peer);
      console.log("My peer ID is: " + id);
    });

    peer.on("error", (err) => {
      console.error("PeerJS error:", err);
    });

    peer.on("iceStateChanged", (iceConnectionState) => {
      console.log("ICE connection state changed:", iceConnectionState);
    });

    peer.on("disconnected", () => {
      console.log("Peer disconnected from server");
    });

    peer.on("connection", handleconnection);

    return () => {
      peer.destroy();
    };
  }, []);

  function handleconnection(conn) {
    // Set connection details immediately for incoming connections
    setConnectionDetails(conn);
    setisConnected(true);
    console.log("Incoming connection from peer:", conn.peer);

    conn.on("data", (data) => {
      console.log("Received", data);
      setmessages((prev) => [...prev, `Received: ${data}`]);
    });

    conn.on("open", () => {
      console.log("Connection opened with peer:", conn.peer);
      // Send a welcome message when connection is established
      // if(mypeer) {
      //   conn.send("Hello from " + mypeer.id);
      // }
    });
  }

  async function startconnection() {
    if (!mypeer) return;
    try {
      if (!myfrndid) {
        console.log("Please enter a valid friend ID");
      }
      var connect = mypeer.connect(myfrndid, { reliable: true });

      connect.on("open", () => {
        setConnectionDetails(connect);
        setisConnected(true);
        console.log("Connection established with peer:", myfrndid);

        // Set up data receiving for outgoing connections
        connect.on("data", (data) => {
          console.log("Received", data);
          setmessages((prev) => [...prev, `Received: ${data}`]);
        });

        connect.send("hey we made a connection with you from " + mypeer.id);
      });

      console.log("Connecting to peer:", myfrndid);
    } catch (err) {
      console.log(err);
    }
  }

  function sendmessage() {
    if (!isConnected || !ConnectionDetails) {
      console.log("No active connection to send message.");
      return;
    }

    const messageToSend =
      messageInput.trim() ||
      "Message from " + mypeer.id + " at " + new Date().toLocaleTimeString();
    ConnectionDetails.send(messageToSend);

    // Add sent message to the message list so the sender can see what they sent
    setmessages((prev) => [...prev, `Sent: ${messageToSend}`]);

    // Clear the input field
    setMessageInput("");

    console.log("Message sent");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Data transfer test</h1>

      {mypeer && <p>Your Peer ID: {mypeer.id}</p>}

      <input
        type="text"
        placeholder="Enter friend's Peer ID"
        value={myfrndid}
        onChange={(e) => setmyfrndid(e.target.value)}
        className="border p-2"
      />

      <button
        onClick={startconnection}
        className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        disabled={!mypeer || !myfrndid.trim()}
      >
        Connect to Friend
      </button>

      {isConnected && (
        <div className="mt-4">
          <input
            type="text"
            placeholder="Enter your message"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendmessage()}
            className="border p-2 mr-2"
          />
          <button
            onClick={sendmessage}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Send Message
          </button>
        </div>
      )}

      {isConnected && (
        <div className="mt-2">
          <p className="text-green-600">✓ Connected to peer</p>
        </div>
      )}

      <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">Messages:</h2>
        <div className="border p-2 h-48 overflow-y-scroll">
          {messages.length === 0 ? (
            <p>No messages yet.</p>
          ) : (
            messages.map((msg, index) => <p key={index}>{msg}</p>)
          )}
        </div>
      </div>
    </div>
  );
}

export default DataTransferTest;

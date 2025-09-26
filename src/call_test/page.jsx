import React, { useState } from "react";
import useMyPeer from "../hooks/useMyPeer";

function Calltest() {
  const {
    peer,
    isloggedin,
    username,
    setusername,
    login,
    logout,
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
  } = useMyPeer();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full">
      <div className="flex gap-2">
        {isloggedin === false ? (
          <>
            <input
              onChange={(e) => setusername(e.target.value)}
              value={username || ""}
              className="border border-black p-2 rounded"
              type="text"
              placeholder="username"
            />
            <button
              onClick={() => login(username)}
              className="border border-black p-2 rounded"
            >
              Login
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-col w-full gap-4">
              <h1>Welcome, {peer?.id}</h1>
              <p>Socket ID: {mysocket?.id || "Not connected"}</p>

              <button
                className="border border-black p-2 rounded"
                onClick={logout}
              >
                Logout
              </button>

              {/* Call Notification */}
              {callNotification && (
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative">
                  <span className="block sm:inline">{callNotification}</span>
                  <button
                    className="absolute top-0 bottom-0 right-0 px-4 py-3"
                    onClick={() => setCallNotification("")}
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
              )}

              {/* Call Status */}
              {callStatus && (
                <div className={`px-4 py-2 rounded text-center font-semibold ${
                  callStatus === "calling" ? "bg-yellow-100 text-yellow-800" :
                  callStatus === "incoming" ? "bg-blue-100 text-blue-800" :
                  callStatus === "connected" ? "bg-green-100 text-green-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {callStatus === "calling" && "Calling..."}
                  {callStatus === "incoming" && `Incoming call from ${incomingCallData?.from}`}
                  {callStatus === "connected" && "Call Connected"}
                </div>
              )}

              {/* Audio Elements */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Your Audio</label>
                  <audio autoPlay muted ref={localAudioRef} className="w-full" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Remote Audio</label>
                  <audio autoPlay controls ref={remoteAudioRef} className="w-full" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 w-[100%] gap-4">
                <div className="col-span-2 flex flex-col gap-4">
                  {/* Call Controls */}
                  {callStatus === "incoming" && incomingCallData && (
                    <div className="border-2 border-blue-400 rounded p-4 bg-blue-50">
                      <h2 className="font-bold mb-2">Incoming Call</h2>
                      <div className="flex flex-row gap-4 items-center justify-between">
                        <span className="mb-2">
                          Call from: {incomingCallData.from}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={acceptCall}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Accept Call
                          </button>
                          <button
                            onClick={rejectCall}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Reject Call
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {callStatus === "connected" && (
                    <div className="border-2 border-green-400 rounded p-4 bg-green-50">
                      <h2 className="font-bold mb-2">Call Active</h2>
                      <div className="flex flex-row gap-4 items-center justify-between">
                        <span className="mb-2">
                          Connected with: {incomingCallData ? incomingCallData.from : "Unknown"}
                        </span>
                        <button
                          onClick={endCall}
                          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          End Call
                        </button>
                      </div>
                    </div>
                  )}

                  {callStatus === "calling" && (
                    <div className="border-2 border-yellow-400 rounded p-4 bg-yellow-50">
                      <h2 className="font-bold mb-2">Outgoing Call</h2>
                      <div className="flex flex-row gap-4 items-center justify-between">
                        <span className="mb-2">Calling...</span>
                        <button
                          onClick={endCall}
                          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Cancel Call
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-span-2 flex flex-col gap-4">
                  <h2 className="font-bold mb-2">
                    Online Users ({onlineusers.length})
                  </h2>
                  {onlineusers.length === 0 ? (
                    <p className="text-gray-500">No other users online</p>
                  ) : (
                    onlineusers.map((user, index) => (
                      <div
                        key={index}
                        className="flex justify-between border rounded h-12 p-2 items-center mb-2"
                      >
                        <span>{user.username}</span>

                        {user.isincall ? (
                          <>
                            <p className="px-2 py-1 bg-gray-500 text-white rounded">
                              In Call
                            </p>
                          </>
                        ) : callStatus ? (
                          <p className="px-2 py-1 bg-gray-300 text-gray-600 rounded">
                            Busy
                          </p>
                        ) : (
                          <button
                            onClick={() => callUser(user.username)}
                            className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Call
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Calltest;

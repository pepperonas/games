import { useState, useEffect } from 'react';
import { useSocket } from '../../store/SocketContext';

const SocketDebug = () => {
  const { socket, isConnected, connect, disconnect } = useSocket();
  const [healthCheckResult, setHealthCheckResult] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [socketEvents, setSocketEvents] = useState<{event: string, timestamp: number, data: any}[]>([]);
  const [transportInfo, setTransportInfo] = useState<string>('N/A');

  // Update transport info when socket changes
  useEffect(() => {
    if (socket && socket.io && socket.io.engine) {
      try {
        // @ts-ignore - Accessing internal properties for debugging
        const transport = socket.io.engine.transport?.name || 'unknown';
        setTransportInfo(transport);
      } catch (e) {
        console.error("Error accessing transport info:", e);
      }
    }
  }, [socket, isConnected]);

  // Attempt to get health info from the server
  const checkHealth = async () => {
    try {
      const response = await fetch('/games/brain-buster/api/health');
      const data = await response.json();
      setHealthCheckResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setHealthCheckResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Force connection
  const handleForceConnect = () => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 100);
  };

  // Send ping to test connection
  const sendPing = () => {
    if (socket && isConnected) {
      const timestamp = Date.now();
      socket.emit('ping_test', { time: timestamp });
      console.log('Sending ping test at:', timestamp);
    } else {
      console.error('Cannot send ping: Socket not connected');
    }
  };

  // Log socket events
  useEffect(() => {
    if (socket) {
      const logEvent = (event: string, ...args: any[]) => {
        console.log(`Socket event: ${event}`, args);
        setSocketEvents(prev => [
          { event, timestamp: Date.now(), data: args[0] || {} },
          ...prev.slice(0, 19)
        ]);
      };

      // Listen for all events
      socket.onAny(logEvent);

      // Listen for pong response to calculate latency
      socket.on('pong_test', (data) => {
        const currentLatency = Date.now() - data.originalTime;
        setLatency(currentLatency);
      });

      return () => {
        socket.offAny(logEvent);
        socket.off('pong_test');
      };
    }
  }, [socket]);

  return (
      <div className="mt-4 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Socket.io Debug</h3>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <span className="text-sm text-gray-400">Connection Status:</span>
            <div className={`ml-2 ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          <div>
            <span className="text-sm text-gray-400">Socket ID:</span>
            <div className="ml-2 text-xs break-all">{socket?.id || 'None'}</div>
          </div>

          {latency !== null && (
              <div className="col-span-2">
                <span className="text-sm text-gray-400">Latency:</span>
                <div className="ml-2">{latency}ms</div>
              </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
              onClick={handleForceConnect}
              className="px-3 py-1 text-sm bg-blue-600 rounded-md"
          >
            Force Reconnect
          </button>

          <button
              onClick={sendPing}
              className="px-3 py-1 text-sm bg-green-600 rounded-md"
              disabled={!isConnected}
          >
            Send Ping
          </button>

          <button
              onClick={checkHealth}
              className="px-3 py-1 text-sm bg-purple-600 rounded-md"
          >
            Check API Health
          </button>
        </div>

        {healthCheckResult && (
            <div className="mt-4">
              <div className="text-sm text-gray-400 mb-1">Health Check Result:</div>
              <pre className="bg-gray-900 p-2 rounded text-xs overflow-auto max-h-32">{healthCheckResult}</pre>
            </div>
        )}

        <div className="mt-4">
          <div className="text-sm text-gray-400 mb-1">Recent Socket Events:</div>
          <div className="bg-gray-900 p-2 rounded text-xs overflow-auto max-h-60">
            {socketEvents.length > 0 ? (
                socketEvents.map((event, index) => (
                    <div key={index} className="mb-1 pb-1 border-b border-gray-800">
                      <div className="flex justify-between">
                        <span className="font-bold">{event.event}</span>
                        <span className="text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                      </div>
                      <pre className="text-green-400 overflow-x-auto">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
                    </div>
                ))
            ) : (
                <div className="text-gray-500">No events recorded yet</div>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>Socket URL: {window.location.protocol}//{window.location.hostname}</p>
          <p>Socket Path: /games/brain-buster/api/socket.io</p>
          <p>Debug Info:</p>
          <ul className="list-disc ml-4">
            <li>Transport: {transportInfo}</li>
          </ul>
        </div>
      </div>
  );
};

export default SocketDebug;
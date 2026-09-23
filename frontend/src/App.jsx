import { useEffect, useState } from 'react';
import { initSocket, getSocket, disconnectSocket } from './services/socket';
import { useVoiceTrigger } from './hooks/useVoiceTrigger';
import { useLocation } from './hooks/useLocation';
import { useSocketEvents } from './hooks/useSocketEvents';
import { MapContainer } from './components/Map/MapContainer';
import { CrisisSelector } from './components/SOS/CrisisSelector';
import { SosTriggerButton } from './components/SOS/SosTriggerButton';
import { IncomingSosModal } from './components/SOS/IncomingSosModal';
import { OfflineTriage } from './components/OfflineTriage';
import { ChatPanel } from './components/Chat/ChatPanel';
import { AiAssistant } from './components/Chat/AiAssistant';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [mode, setMode] = useState('citizen'); // 'citizen' or 'responder'
  const [selectedCrisis, setSelectedCrisis] = useState('medical');

  // Hooks
  const { location, error: locationError } = useLocation();

  useEffect(() => {
    const socket = initSocket();
    
    socket.on('connect', () => {
      setIsConnected(true);
      // Flush offline SOS queue on reconnect
      const queue = JSON.parse(localStorage.getItem('offlineSosQueue') || '[]');
      if (queue.length > 0) {
        queue.forEach(payload => socket.emit('trigger_sos', payload));
        localStorage.removeItem('offlineSosQueue');
        console.log(`[NearHelp] Flushed ${queue.length} queued SOS event(s) after reconnect.`);
      }
    });
    socket.on('disconnect', () => setIsConnected(false));
    socket.connect(); // Actually connect here
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('Service Worker registration failed: ', err);
      });
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      disconnectSocket();
    };
  }, []);

  const { activeIncidents, responders, incomingSosQueue, dismissSos } = useSocketEvents();

  const handleTriggerSos = (isAnon) => {
    const payload = {
      type: selectedCrisis,
      types: [selectedCrisis],
      lat: location?.lat || 0,
      lng: location?.lng || 0,
      isAnon,
      timestamp: Date.now()
    };

    if (!isConnected) {
      alert("Offline mode triggered - Refer to triage instructions below. Your SOS is queued and will be sent when connection is restored.");
      const queue = JSON.parse(localStorage.getItem('offlineSosQueue') || '[]');
      queue.push(payload);
      localStorage.setItem('offlineSosQueue', JSON.stringify(queue));
      return;
    }
    const socket = getSocket();
    socket.emit('trigger_sos', payload);
  };

  const handleVoiceEmergency = (data) => {
    if (isConnected) {
      const socket = getSocket();
      socket.emit('trigger_sos', {
        type: data.type || 'medical',
        types: [data.type || 'medical'],
        lat: location?.lat || 0,
        lng: location?.lng || 0,
        isAnon: false,
        isVoice: true
      });
    } else {
        alert("Voice Trigger: Offline mode active.");
    }
  };

  const { isListening, startListening, stopListening } = useVoiceTrigger(handleVoiceEmergency);

  // Incoming SOS handling
  const currentIncomingSos = incomingSosQueue[0] || null;

  return (
    <div className="app-container tactical-grid h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
      <header className="p-4 border-b border-gray-800 bg-gray-900/90 backdrop-blur-md z-50 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-black text-red-500 tracking-wider">NearHelp <span className="text-gray-500 text-sm font-normal">v2.0</span></h1>
          <p className="text-sm font-mono mt-1">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></span>
            {isConnected ? 'SYS.ONLINE' : 'SYS.OFFLINE'} 
            {location ? ` • GPS [${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}]` : ' • GPS [AWAITING]'}
          </p>
        </div>
        <div className="flex bg-gray-800 p-1 rounded-lg">
            <button 
                onClick={() => setMode('citizen')}
                className={`px-4 py-1.5 rounded-md font-bold text-xs tracking-wider uppercase transition-colors ${mode === 'citizen' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
                Citizen
            </button>
            <button 
                onClick={() => setMode('responder')}
                className={`px-4 py-1.5 rounded-md font-bold text-xs tracking-wider uppercase transition-colors ${mode === 'responder' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                Responder
            </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row relative">
        <div className="w-full h-[40vh] md:w-2/3 md:h-full relative z-0">
            <MapContainer 
                userLocation={location} 
                activeIncidents={activeIncidents} 
                responders={responders} 
                mode={mode} 
            />
        </div>

        <div className="w-full md:w-1/3 h-[60vh] md:h-full bg-gray-900 border-l border-gray-800 flex flex-col overflow-y-auto z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            <div className="p-6 flex-1 flex flex-col gap-4">
                
                {activeIncidents.length === 0 ? (
                    <>
                        <div className="mb-6">
                            <h3 className="text-gray-400 font-bold text-xs tracking-widest uppercase mb-4">CRISIS TYPE</h3>
                            <CrisisSelector 
                                selectedCrisis={selectedCrisis} 
                                onSelect={setSelectedCrisis} 
                            />
                        </div>
                        
                        <div className="mb-8 mt-auto">
                            <SosTriggerButton 
                                onTrigger={handleTriggerSos} 
                                isVoiceActive={isListening} 
                                onToggleVoice={isListening ? stopListening : startListening}
                            />
                        </div>

                        {!isConnected && (
                            <div className="mt-4 border-t border-gray-800 pt-6">
                                <h3 className="text-gray-400 font-bold text-xs tracking-widest uppercase mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-yellow-500">wifi_off</span>
                                    OFFLINE PROTOCOLS
                                </h3>
                                <OfflineTriage />
                            </div>
                        )}
                    </>
                ) : (
                    // ACTIVE INCIDENT VIEW
                    <div className="flex flex-col h-full gap-4">
                        <div className="flex-1 min-h-[300px]">
                            <ChatPanel 
                                sosId={activeIncidents[0]?.id || activeIncidents[0]?._id} 
                                isResponder={mode === 'responder'} 
                            />
                        </div>
                        <div className="h-[250px] shrink-0">
                            <AiAssistant 
                                crisisType={activeIncidents[0]?.type} 
                                description={activeIncidents[0]?.description} 
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>

      <IncomingSosModal 
        sosData={currentIncomingSos}
        queueCount={incomingSosQueue.length - 1}
        onAccept={(id) => {
            getSocket().emit('accept_sos', { sosId: id });
            dismissSos(id);
            setMode('responder');
        }}
        onDismiss={() => {
            dismissSos(currentIncomingSos?.id);
        }}
      />
    </div>
  );
}

export default App;

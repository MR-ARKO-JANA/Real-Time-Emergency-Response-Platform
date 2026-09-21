import React, { useState } from 'react';

export function SosTriggerButton({ onTrigger, isVoiceActive, onToggleVoice }) {
    const [isAnon, setIsAnon] = useState(false);

    return (
        <div className="flex flex-col gap-4">
            <button 
                onClick={() => onTrigger(isAnon)}
                className="w-full relative overflow-hidden bg-gradient-to-br from-red-600 to-red-800 text-white font-black text-2xl tracking-[0.2em] py-8 rounded-2xl shadow-[0_12px_40px_rgba(220,38,38,0.4)] transition-all hover:-translate-y-1 active:translate-y-1 active:scale-95"
            >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_2s_infinite]"></div>
                TRIGGER SOS
            </button>

            <div className="flex justify-between items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-800/60 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors flex-1">
                    <input 
                        type="checkbox" 
                        checked={isAnon}
                        onChange={(e) => setIsAnon(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-600 text-red-500 focus:ring-red-500 bg-gray-900"
                    />
                    <span className="text-gray-300 font-semibold text-sm">Send Anonymously</span>
                </label>

                <button 
                    onClick={onToggleVoice}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border flex-1 transition-all ${
                        isVoiceActive 
                            ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' 
                            : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                    }`}
                >
                    <span className="material-symbols-outlined">
                        {isVoiceActive ? 'mic' : 'mic_off'}
                    </span>
                    <span className="font-semibold text-sm">
                        {isVoiceActive ? 'Listening...' : 'Voice Detect'}
                    </span>
                </button>
            </div>
        </div>
    );
}

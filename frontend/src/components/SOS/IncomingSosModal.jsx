import React, { useEffect } from 'react';
import { useAudioSiren } from '../../hooks/useAudioSiren';

const CRISIS_ICONS = {
    medical: 'cardiology', health: 'cardiology', fire: 'local_fire_department',
    security: 'shield', police: 'shield', mechanic: 'build', other: 'warning'
};

const CRISIS_LABELS = {
    medical: 'MEDICAL EMERGENCY', health: 'HEALTH EMERGENCY',
    fire: 'FIRE EMERGENCY', security: 'SECURITY ALERT',
    police: 'POLICE ALERT', mechanic: 'ROADSIDE ASSIST', other: 'EMERGENCY'
};

export function IncomingSosModal({ sosData, queueCount, onAccept, onDismiss }) {
    const { startSiren, stopSiren } = useAudioSiren();

    useEffect(() => {
        if (sosData) {
            startSiren();
        } else {
            stopSiren();
        }
        return () => stopSiren();
    }, [sosData, startSiren, stopSiren]);

    if (!sosData) return null;

    const type = (sosData.type || 'other').toLowerCase();
    const icon = CRISIS_ICONS[type] || 'emergency';
    const label = CRISIS_LABELS[type] || 'Emergency Nearby';
    const distLabel = sosData.distance < 500 ? `${Math.round(sosData.distance)}m away` : `${(sosData.distance / 1000).toFixed(1)}km away`;
    const pLabel = sosData.priority === 1 ? 'P1 — Specialist' : sosData.priority === 2 ? 'P2 — Helper' : 'P3 — Global';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-red-950/40 backdrop-blur-md animate-[sos-pulse-overlay_2s_infinite]"></div>
            
            <div className="relative z-10 w-full max-w-md bg-gray-900 border-2 border-red-500/50 rounded-3xl p-8 shadow-[0_0_60px_rgba(255,81,106,0.25),0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-yellow-400 to-red-500 bg-[length:200%_100%] animate-[gradient-slide_2s_linear_infinite]"></div>
                
                <div className="relative w-22 h-22 flex items-center justify-center mx-auto mb-5">
                    <div className="absolute inset-0 rounded-full border-2 border-red-500/40 animate-[sos-ring-expand_2s_infinite]"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-red-500/40 animate-[sos-ring-expand_2s_infinite] delay-[0.7s]"></div>
                    <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-[0_0_30px_rgba(255,81,106,0.5)] animate-pulse">
                        <span className="material-symbols-outlined text-3xl text-white animate-bounce">{icon}</span>
                    </div>
                </div>

                <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 font-mono text-xs font-bold tracking-[0.12em] uppercase text-red-500 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></div>
                        {label}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100 mb-1">{sosData.description || 'Citizen needs immediate help'}</h2>
                </div>

                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/25 uppercase">
                        <span className="material-symbols-outlined text-[14px]">{icon}</span> {type}
                    </span>
                    <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/25">
                        <span className="material-symbols-outlined text-[14px]">near_me</span> {distLabel}
                    </span>
                    <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-500/15 text-yellow-300 border border-yellow-500/25">
                        <span className="material-symbols-outlined text-[14px]">priority_high</span> {pLabel}
                    </span>
                    {sosData.isVoice && (
                        <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                            <span className="material-symbols-outlined text-[14px]">mic</span> VOICE TRIGGERED
                        </span>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => onAccept(sosData.id)}
                        className="w-full py-4 rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white font-bold tracking-wide shadow-[0_8px_30px_rgba(255,81,106,0.35)] transition-transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">directions_run</span>
                        ACCEPT & DISPATCH
                    </button>
                    <button 
                        onClick={onDismiss}
                        className="w-full py-3 rounded-xl bg-gray-800 text-gray-400 font-semibold hover:bg-gray-700 hover:text-gray-300 transition-colors"
                    >
                        Ignore Alert
                    </button>
                </div>
                
                {queueCount > 0 && (
                    <div className="mt-4 text-center text-sm font-semibold text-red-400 animate-pulse">
                        +{queueCount} more emergencies waiting
                    </div>
                )}
            </div>
        </div>
    );
}

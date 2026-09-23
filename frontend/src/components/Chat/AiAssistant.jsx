import React, { useState } from 'react';
import { getAiGuidance } from '../../services/api';

export function AiAssistant({ crisisType, description }) {
    const [guidance, setGuidance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchGuidance = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAiGuidance(
                crisisType || 'general emergency', 
                description || ''
            );
            setGuidance(data);
        } catch (err) {
            console.error('AI Guidance error:', err);
            setError('Failed to fetch AI guidance. Ensure you are authenticated and online.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-900 border border-purple-500/30 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.1)] flex flex-col h-full">
            <div className="bg-purple-900/40 p-3 border-b border-purple-500/30 flex justify-between items-center">
                <h3 className="text-purple-100 font-bold text-sm tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400 text-sm">smart_toy</span>
                    GEMINI AI TRIAGE
                </h3>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                {!guidance && !loading && (
                    <div className="text-center mt-4">
                        <p className="text-gray-400 text-sm mb-4">
                            Get immediate AI-powered triage and compliance-safe first aid instructions.
                        </p>
                        <button 
                            onClick={fetchGuidance}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-6 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.4)] transition-all"
                        >
                            Generate Guidance
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 opacity-70">
                        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-purple-300 text-sm font-mono animate-pulse">Analyzing Crisis...</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-950/50 border border-red-500/50 p-3 rounded-lg text-red-400 text-sm">
                        {error}
                        <button onClick={fetchGuidance} className="block mt-2 text-white font-bold underline">Retry</button>
                    </div>
                )}

                {guidance && (
                    <div className="space-y-4 animate-[fade-in_0.3s_ease-out]">
                        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                            <h4 className="text-xs font-bold text-gray-400 tracking-wider mb-2 uppercase">Emergency Summary</h4>
                            <p className="text-sm text-gray-200">{guidance.emergencySummary}</p>
                        </div>
                        
                        <div>
                            <h4 className="text-xs font-bold text-purple-400 tracking-wider mb-2 uppercase flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">health_and_safety</span>
                                Immediate Actions
                            </h4>
                            <ul className="space-y-2">
                                {guidance.firstResponseGuidance?.map((step, idx) => (
                                    <li key={idx} className="flex gap-2 text-sm text-gray-300 bg-gray-800/50 p-2 rounded">
                                        <span className="text-purple-500 font-bold">{idx + 1}.</span>
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

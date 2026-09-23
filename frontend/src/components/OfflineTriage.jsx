import React from 'react';

const staticTriageGuide = {
    cpr: { title: "CPR Instructions", icon: "favorite", steps: "1. Tap victim firmly on shoulders. 2. Push hard and fast in center of chest (100-120 BPM). 3. Do not stop until EMS arrives." },
    bleeding: { title: "Severe Bleeding", icon: "bloodtype", steps: "1. Apply direct pressure to wound with clean cloth. 2. Elevate if possible. 3. Use tourniquet high and tight if bleeding is life-threatening." },
    choking: { title: "Choking (Heimlich)", icon: "sick", steps: "1. Stand behind victim. 2. Place fist above navel. 3. Give 5 quick inward/upward thrusts." },
    burn: { title: "Burn Treatment", icon: "local_fire_department", steps: "1. Cool burn under running cold water for 20 min. 2. Cover with clean non-fluffy material. 3. Do NOT apply ice, butter, or cream." },
    default: { title: "General Emergency", icon: "emergency", steps: "1. Ensure scene safety. 2. Do not move the victim unless in immediate danger. 3. Keep victim calm and warm." }
};

export function OfflineTriage({ queueCount = 0 }) {
    return (
        <div className="bg-red-900/40 border border-red-500/50 p-6 rounded-xl mt-4">
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-500">wifi_off</span>
                    <h3 className="text-xl font-bold text-red-100">Offline Emergency Guide</h3>
                </div>
                {queueCount > 0 && (
                    <span className="bg-yellow-500 text-black text-xs font-black px-2 py-0.5 rounded-full animate-pulse">
                        {queueCount} SOS QUEUED
                    </span>
                )}
            </div>
            <p className="text-red-200 mb-6 text-sm">
                You are currently offline. Please refer to these deterministic triage instructions while you wait for connectivity or SMS dispatch to go through.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(staticTriageGuide).map(([key, guide]) => (
                    <div key={key} className="bg-gray-800/80 p-4 rounded-lg border border-gray-700">
                        <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">{guide.icon}</span>
                            {guide.title}
                        </h4>
                        <p className="text-gray-300 text-sm whitespace-pre-line">
                            {guide.steps.split('. ').join('.\n')}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

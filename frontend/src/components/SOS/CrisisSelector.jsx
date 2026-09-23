import React from 'react';

const CRISIS_TYPES = [
    { id: 'medical', label: 'Medical', icon: 'cardiology' },
    { id: 'fire', label: 'Fire', icon: 'local_fire_department' },
    { id: 'flood', label: 'Flood', icon: 'water' },
    { id: 'security', label: 'Security', icon: 'shield' },
    { id: 'natural_disaster', label: 'Disaster', icon: 'thunderstorm' },
    { id: 'mechanic', label: 'Mechanic', icon: 'build' },
    { id: 'other', label: 'Other', icon: 'warning' }
];

export function CrisisSelector({ selectedCrisis, onSelect }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {CRISIS_TYPES.map((crisis) => (
                <div 
                    key={crisis.id}
                    onClick={() => onSelect(crisis.id)}
                    className={`crisis-card flex flex-col items-center p-4 rounded-xl transition-all ${
                        selectedCrisis === crisis.id 
                            ? 'selected' 
                            : 'hover:bg-gray-800/80'
                    }`}
                >
                    <div className="select-dot absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500"></div>
                    <div className="icon-wrap p-3 rounded-full mb-2 border border-gray-700">
                        <span className="material-symbols-outlined text-2xl text-red-400">
                            {crisis.icon}
                        </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-200 tracking-wide uppercase">
                        {crisis.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

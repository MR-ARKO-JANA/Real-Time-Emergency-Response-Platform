import { useEffect, useState } from 'react';
import { getSocket } from '../services/socket';

export function useSocketEvents() {
    const [activeIncidents, setActiveIncidents] = useState([]);
    const [responders, setResponders] = useState({});
    const [incomingSosQueue, setIncomingSosQueue] = useState([]);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleActiveIncidents = (incidents) => {
            setActiveIncidents(incidents);
        };

        const handleNewSos = (data) => {
            setIncomingSosQueue(prev => [...prev, data]);
            setActiveIncidents(prev => {
                if (prev.some(inc => inc.id === data.id)) return prev;
                return [...prev, data];
            });
        };

        const handleResponderMoved = (data) => {
            setResponders(prev => ({
                ...prev,
                [data.uid]: data
            }));
        };

        const handleSosResolved = (data) => {
            setActiveIncidents(prev => prev.filter(inc => inc.id !== data.sosId));
            setIncomingSosQueue(prev => prev.filter(sos => sos.id !== data.sosId));
        };

        socket.on('active_incidents', handleActiveIncidents);
        socket.on('new_sos', handleNewSos);
        socket.on('responder_moved', handleResponderMoved);
        socket.on('sos_resolved', handleSosResolved);

        return () => {
            socket.off('active_incidents', handleActiveIncidents);
            socket.off('new_sos', handleNewSos);
            socket.off('responder_moved', handleResponderMoved);
            socket.off('sos_resolved', handleSosResolved);
        };
    }, []);

    const dismissSos = (sosId) => {
        setIncomingSosQueue(prev => prev.filter(sos => sos.id !== sosId));
    };

    return {
        activeIncidents,
        responders,
        incomingSosQueue,
        dismissSos
    };
}

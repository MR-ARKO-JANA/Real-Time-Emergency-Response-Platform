import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '../../services/socket';

export function ChatPanel({ sosId, isResponder }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const socket = getSocket();
        
        const handleNewMessage = (msg) => {
            if (msg.sosId === sosId) {
                setMessages(prev => [...prev, msg]);
                scrollToBottom();
            }
        };

        const handleChatHistory = (data) => {
            if (data.sosId === sosId) {
                setMessages(data.messages || []);
                scrollToBottom();
            }
        };

        socket.on('chat_message', handleNewMessage);
        socket.on('chat_history', handleChatHistory);

        // Request history on mount
        socket.emit('get_chat_history', { sosId });

        return () => {
            socket.off('chat_message', handleNewMessage);
            socket.off('chat_history', handleChatHistory);
        };
    }, [sosId]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const socket = getSocket();
        socket.emit('send_message', {
            sosId,
            message: input.trim(),
            sender: isResponder ? 'responder' : 'citizen'
        });

        setInput('');
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-gray-100 font-bold text-sm tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-500 text-sm">forum</span>
                    INCIDENT COMMS
                </h3>
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded font-mono">
                    ID: {sosId.substring(0, 6)}
                </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar bg-gray-950/50">
                {messages.length === 0 ? (
                    <div className="m-auto text-gray-500 text-sm italic">No messages yet.</div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = (msg.sender === 'responder' && isResponder) || (msg.sender === 'citizen' && !isResponder);
                        return (
                            <div key={idx} className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                                isMe 
                                    ? 'bg-blue-600 text-white self-end rounded-br-none shadow-[0_4px_15px_rgba(37,99,235,0.2)]' 
                                    : 'bg-gray-800 text-gray-200 self-start rounded-bl-none border border-gray-700'
                            }`}>
                                <div className="text-[10px] opacity-70 mb-1 font-mono uppercase tracking-wider">
                                    {msg.senderName || msg.sender}
                                </div>
                                <div>{msg.message}</div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-gray-800 border-t border-gray-700 flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type message..." 
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button 
                    type="submit"
                    disabled={!input.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg flex items-center justify-center transition-colors"
                >
                    <span className="material-symbols-outlined text-sm">send</span>
                </button>
            </form>
        </div>
    );
}

import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
    return (
        <div className="bg-gray-950 text-gray-100 min-h-screen p-8 md:p-16">
            <div className="max-w-3xl mx-auto bg-gray-900 p-8 rounded-lg shadow-lg border border-gray-800">
                <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                    <h1 className="text-3xl font-black text-red-500 tracking-wider">Privacy Policy</h1>
                    <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                        &larr; Back to NearHelp
                    </Link>
                </div>

                <div className="space-y-6 text-gray-300">
                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                    
                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">1. Introduction</h2>
                        <p>Welcome to NearHelp. This Privacy Policy explains how we collect, use, and protect your information, particularly regarding location data and emergency broadcasting.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">2. Data Collection and Usage</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Location Data:</strong> We collect and process your precise location data (GPS) to enable the SOS functionality and match you with nearby responders. This data is actively broadcasted to our servers when the app is in use or when an SOS is active.</li>
                            <li><strong>Authentication Data:</strong> We use Firebase Authentication to securely manage your account credentials. We store your email, name, and selected role (Citizen/Responder).</li>
                            <li><strong>Emergency Context:</strong> Any audio, text, or crisis descriptions you provide during an emergency are processed by our backend and OpenAI (for summarization) to quickly inform responders.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">3. Data Sharing</h2>
                        <p>When you trigger an SOS, your location and incident details are broadcasted to nearby volunteer responders to facilitate a rescue. We do not sell your personal data to third parties.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">4. Data Safety & Security</h2>
                        <p>Your data is stored securely using industry-standard encryption in transit and at rest. Emergency incidents are resolved and archived once the situation is addressed.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">5. Contact Us</h2>
                        <p>If you have any questions about this Privacy Policy, please contact our support team.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}

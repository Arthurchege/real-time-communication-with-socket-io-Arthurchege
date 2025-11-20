import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    query, 
    onSnapshot, 
    addDoc,
    orderBy,
    limit 
} from 'firebase/firestore';

// Corrected import path for the socket hook (client/src/socket/socket.js)
import { useSocket } from './socket/socket.js'; 

// --- Global Variables (Mandatory Canvas Environment Variables) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const DUMMY_FIREBASE_CONFIG = {
    apiKey: "DUMMY_API_KEY", // Dummy key structure for local run
    authDomain: "dummy-domain.firebaseapp.com",
    projectId: "dummy-project-id",
    storageBucket: "dummy-bucket.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:234567890:web:abcdefg"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : DUMMY_FIREBASE_CONFIG; 

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Determine if we are running with dummy keys (for local development bypass)
const IS_DUMMY_KEY = firebaseConfig.apiKey === "DUMMY_API_KEY";

// --- Utility Functions ---

// Converts a timestamp to a readable time string
const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// --- Main App Component ---

const App = () => {
    // Firebase State
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Chat State
    const [username, setUsername] = useState('');
    const [input, setInput] = useState('');

    // Socket Hook Integration
    const { 
        messages: liveMessages, // Live system/private messages from hook
        users: onlineUsers, 
        typingUsers, 
        connect, 
        sendMessage, 
        setTyping,
        isConnected
    } = useSocket();

    const [persistentMessages, setPersistentMessages] = useState([]);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const hasConnectedRef = useRef(false);

    // Combine persistent (Firestore) and live (Socket hook) messages for display
    const allMessages = [...persistentMessages, ...liveMessages];
    
    // --- Firebase Initialization and Auth ---
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            
            setDb(dbInstance);

            if (IS_DUMMY_KEY) {
                // LOCAL DEV BYPASS: Skip network calls that rely on a real API key.
                // We fake the auth state so the app loads and Socket.io can connect.
                console.warn("Running with DUMMY_API_KEY. Firestore features will be disabled/fail, but Socket.io chat will function.");
                setUserId("local-dev-user-" + Math.random().toString(36).substring(7));
                setIsAuthReady(true);
                return;
            }

            // Standard Auth Setup (runs when real keys are provided in the production environment)
            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    setIsAuthReady(true);
                } else {
                    await signInAnonymously(authInstance);
                }
            });

            if (initialAuthToken) {
                signInWithCustomToken(authInstance, initialAuthToken).catch(() => signInAnonymously(authInstance));
            } else {
                signInAnonymously(authInstance);
            }

            return () => unsubscribe();

        } catch (error) {
            console.error("Firebase initialization failed:", error);
        }
    }, [initialAuthToken]);


    // --- Firestore Listener for Persistent Global Chat History ---
    useEffect(() => {
        if (!isAuthReady || !db) return;

        const chatPath = `/artifacts/${appId}/public/data/global_chat_messages`;
        const q = query(
            collection(db, chatPath), 
            orderBy('timestamp', 'desc'), 
            limit(50) 
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({ 
                ...doc.data(), 
                id: doc.id 
            })).reverse(); 
            setPersistentMessages(newMessages);
        }, (error) => {
            console.error("Error fetching messages from Firestore:", error);
        });

        return () => unsubscribe();
    }, [isAuthReady, db, appId]);
    
    // --- Socket Connection Trigger ---
    useEffect(() => {
        if (isAuthReady && username && !hasConnectedRef.current) {
            hasConnectedRef.current = true;
            connect(username);
        }
    }, [isAuthReady, username, connect]);


    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [allMessages]);

    // --- Actions ---

    // Function to save message to Firestore for persistence
    const sendMessageToDb = useCallback(async (msg) => {
        if (!db) return;
        try {
            const chatPath = `/artifacts/${appId}/public/data/global_chat_messages`;
            await addDoc(collection(db, chatPath), msg);
        } catch (e) {
            // Log error only if we're not running with dummy keys
            if (!IS_DUMMY_KEY) {
                console.error("Error adding document to Firestore: ", e);
            }
        }
    }, [db, appId]);


    // Handles form submission (Global Chat)
    const handleSend = (e) => {
        e.preventDefault();
        const text = input.trim();

        if (!text || !username) return;

        // 1. Emit to Socket.io (using the hook's function) - This WILL WORK locally.
        sendMessage(text); 
        
        // 2. Save to Firestore for persistence - This will FAIL LOCALLY, but is required for production.
        sendMessageToDb({
             text: text, 
             sender: username,
             timestamp: new Date().toISOString()
        });

        // 3. Stop typing notification
        setTyping(false);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
        
        setInput('');
    };
    
    // Handles typing event (using the hook's function)
    const handleInputChange = (e) => {
        const newText = e.target.value;
        setInput(newText);

        if (newText.length > 0 && !typingTimeoutRef.current) {
            setTyping(true);
        }

        clearTimeout(typingTimeoutRef.current);
        
        typingTimeoutRef.current = setTimeout(() => {
            setTyping(false);
            typingTimeoutRef.current = null;
        }, 2000);
    };

    // --- UI Rendering ---

    // 1. Username Prompt
    if (!username) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white shadow-xl rounded-lg p-6 w-full max-w-sm">
                    <h1 className="text-3xl font-extrabold text-indigo-600 mb-4 text-center">Join Chat</h1>
                    <p className="text-sm text-gray-500 mb-6">Enter a unique username to start chatting.</p>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const name = e.target.usernameInput.value.trim();
                        if (name) setUsername(name);
                    }}>
                        <input
                            id="usernameInput"
                            type="text"
                            placeholder="Your Username"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                        />
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150"
                        >
                            Start Chatting
                        </button>
                    </form>
                    <p className="text-xs text-gray-400 mt-4 text-center">User ID: {userId || 'Authenticating...'}</p>
                </div>
            </div>
        );
    }

    // 2. Main Chat Interface
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row antialiased">
            <style>{`
                /* Font for a cleaner look */
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; }
                .chat-container { height: calc(100vh - 4rem); } 
                .message-list::-webkit-scrollbar { width: 6px; }
                .message-list::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 3px; }
            `}</style>
            
            {/* Sidebar for Online Users */}
            <div className="hidden md:block w-full md:w-64 bg-white border-r border-gray-200 shadow-lg p-4 flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    Online Users 
                    <span className={`ml-2 px-2 py-0.5 text-white text-xs font-semibold rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
                        {onlineUsers.length}
                    </span>
                </h2>
                <ul className="space-y-2">
                    {onlineUsers.map(user => (
                        <li key={user.id} className="flex items-center space-x-2 text-sm text-gray-700 font-medium">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span>{user.username} {user.username === username && '(You)'}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Main Chat Area */}
            <div className="flex-grow flex flex-col bg-white shadow-xl chat-container overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-indigo-600 text-white flex justify-between items-center flex-shrink-0">
                    <h1 className="text-xl font-bold">Global Chat ({username})</h1>
                    <p className="text-sm">Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
                </div>

                {/* Message List */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4 message-list">
                    {allMessages.map((msg, index) => {
                        const isSystem = msg.system || msg.sender === 'System';
                        const isPrivate = msg.isPrivate;
                        const messageSender = msg.sender || msg.username;
                        const messageText = msg.text || msg.message;

                        let chatBubbleColor = messageSender === username 
                            ? (isPrivate ? 'bg-yellow-500' : 'bg-indigo-500') 
                            : (isPrivate ? 'bg-yellow-200' : 'bg-gray-200');

                        return (
                            <div key={msg.id || index} className={`flex ${messageSender === username ? 'justify-end' : 'justify-start'}`}>
                                {isSystem ? (
                                    <div className="text-center w-full text-xs text-gray-500 italic">
                                        {messageText} ({formatTime(msg.timestamp)})
                                    </div>
                                ) : (
                                    <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-xl shadow-md ${chatBubbleColor} ${messageSender === username ? 'text-white rounded-br-none' : 'text-gray-800 rounded-tl-none'}`}>
                                        <p className={`font-semibold text-xs mb-1 ${messageSender === username ? 'text-indigo-200' : 'text-gray-600'}`}>
                                            {messageSender === username ? 'You' : messageSender} {isPrivate && '(Private)'}
                                        </p>
                                        <p className="text-sm break-words">{messageText}</p>
                                        <p className={`text-right text-xs mt-1 ${messageSender === username ? 'text-indigo-300' : 'text-gray-500'}`}>
                                            {formatTime(msg.timestamp)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Typing Indicator */}
                <div className="p-2 h-6 text-sm text-gray-500 font-medium flex items-center">
                    {typingUsers.length > 0 && (
                        <span className="flex items-center space-x-2">
                            <span className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse"></span>
                            <span>{typingUsers.filter(u => u !== username).join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...</span>
                        </span>
                    )}
                </div>

                {/* Message Input Form */}
                <div className="p-4 border-t border-gray-200 flex-shrink-0">
                    <form onSubmit={handleSend} className="flex space-x-3">
                        <input
                            type="text"
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Type a message..."
                            className="flex-grow px-4 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-base"
                            autoFocus
                            disabled={!isConnected}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || !isConnected}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition duration-150 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default App;

// Ci/Cd pipeline test.
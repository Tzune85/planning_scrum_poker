import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    onSnapshot,
    collection,
    addDoc,
    updateDoc,
    serverTimestamp,
    getDocs // Added getDocs
} from 'firebase/firestore';
import { Clipboard, CheckCircle, Users, LogIn, LogOut, PlusCircle, Eye, EyeOff, RotateCcw, Edit3, Send } from 'lucide-react';

// --- Firebase Configuration ---
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDKtaQACRf2_zMN3AyBdS_JsbEqR0u5TFY",
  authDomain: "planning-scrum-poker-cbe5c.firebaseapp.com",
  projectId: "planning-scrum-poker-cbe5c",
  storageBucket: "planning-scrum-poker-cbe5c.firebasestorage.app",
  messagingSenderId: "769821686060",
  appId: "1:769821686060:web:dbc33abce6966c1c589489"
};

const effectiveFirebaseConfig = firebaseConfig;


// --- Global Variables (from Canvas environment) ---
// const appId = "project/planning-scrum-poker-cbe5c"; // Unused variable


// --- Initialize Firebase ---
let auth;
let db;
let app;

try {
    console.log('Initializing Firebase...');
    app = initializeApp(effectiveFirebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('Firebase initialized successfully');
    console.log('Firebase config:', effectiveFirebaseConfig);
} catch (error) {
    console.error("Error initializing Firebase:", error);
}


// --- Constants ---
const CARD_VALUES = [2, 4, 8, 20, '❓', '☕']; // Added ? and coffee
const COLLECTION_NAME = "pokerSessions";

// --- Helper Functions ---
const getSessionDocRef = (sessionId) => doc(db, `sessions/${sessionId}`);
const getParticipantsCollectionRef = (sessionId) => collection(db, `sessions/${sessionId}/participants`);
const getParticipantDocRef = (sessionId, userId) => doc(db, `sessions/${sessionId}/participants/${userId}`);


// --- Main Application Component ---
function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [nickname, setNickname] = useState('');
    const [showNicknameModal, setShowNicknameModal] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [participants, setParticipants] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [copiedLink, setCopiedLink] = useState(false);

    // --- Authentication Effect ---
    useEffect(() => {
        console.log('Auth effect running...');
        if (!auth) {
            console.error('Auth not initialized');
            setError("Firebase was not initialized correctly. The application might not work.");
            setIsLoading(false);
            setIsAuthReady(true);
            return;
        }

        const initializeAuth = async () => {
            console.log('Initializing auth...');
            try {
                const userCredential = await signInAnonymously(auth);
                console.log('Anonymous auth successful:', userCredential.user.uid);
                setCurrentUser(userCredential.user);
                setUserId(userCredential.user.uid);
                const storedNickname = localStorage.getItem(`pokerNickname_${userCredential.user.uid}`);
                if (storedNickname) {
                    setNickname(storedNickname);
                } else {
                    setShowNicknameModal(true);
                }
            } catch (e) {
                console.error("Error signing in anonymously:", e);
                setError("Unable to authenticate. Please try again later.");
            } finally {
                setIsAuthReady(true);
                setIsLoading(false);
            }
        };

        // Set up auth state listener
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('Auth state changed:', user ? user.uid : 'No user');
            if (!user) {
                initializeAuth();
            } else {
                setCurrentUser(user);
                setUserId(user.uid);
                setIsAuthReady(true);
                setIsLoading(false);
            }
        });

        // Initial auth check
        if (!auth.currentUser) {
            console.log('No current user, initializing auth...');
            initializeAuth();
        } else {
            console.log('Current user found:', auth.currentUser.uid);
            setCurrentUser(auth.currentUser);
            setUserId(auth.currentUser.uid);
            setIsAuthReady(true);
            setIsLoading(false);
        }

        return () => unsubscribe();
    }, []);

    // --- Session ID from URL Effect ---
    useEffect(() => {
        const path = window.location.pathname;
        const parts = path.split('/');
        if (parts.length === 3 && parts[1] === 'session') {
            setCurrentSessionId(parts[2]);
        } else {
            // If no session ID in URL, clear any previous session data
            if (currentSessionId !== null) { // Only reset if there was a session ID
                setCurrentSessionId(null);
                setSessionData(null);
                setParticipants({});
                // No window.history.pushState here, let Lobby render naturally
            }
        }
    }, [currentSessionId]); // Removed window.location.pathname from dependencies


    // --- Session Data & Participants Listener Effect ---
    useEffect(() => {
        if (!isAuthReady || !currentSessionId || !db) return;

        setIsLoading(true);
        const sessionDocRef = getSessionDocRef(currentSessionId);
        const unsubscribeSession = onSnapshot(sessionDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setSessionData(docSnap.data());
                setError('');
            } else {
                setError("Session not found or no longer valid. Create a new session or check the link.");
                setSessionData(null);
                setCurrentSessionId(null);
                if (window.location.pathname !== '/') {
                    console.log("Session not found, attempting to pushState to root from session listener.");
                    try {
                        window.history.pushState({}, '', '/');
                        console.log("Successfully pushed state to root from session listener.");
                    } catch (e) {
                        console.warn("Could not update browser history to root from session listener (pushState failed):", e);
                    }
                }
            }
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching session data:", err);
            setError("Error loading session.");
            setIsLoading(false);
        });

        const participantsColRef = getParticipantsCollectionRef(currentSessionId);
        const unsubscribeParticipants = onSnapshot(participantsColRef, (snapshot) => {
            const newParticipants = {};
            snapshot.forEach(doc => {
                newParticipants[doc.id] = doc.data();
            });
            setParticipants(newParticipants);
        }, (err) => {
            console.error("Error fetching participants:", err);
            setError("Error loading participants.");
        });

        return () => {
            unsubscribeSession();
            unsubscribeParticipants();
        };
    }, [isAuthReady, currentSessionId]);

    // --- Join Session Effect ---
    useEffect(() => {
        if (isAuthReady && currentUser && currentSessionId && sessionData && nickname && (!participants[userId] || participants[userId]?.name !== nickname)) {
            const joinOrUpdateSession = async () => {
                try {
                    const participantRef = getParticipantDocRef(currentSessionId, userId);
                    await setDoc(participantRef, {
                        name: nickname,
                        vote: participants[userId]?.vote || null, // Preserve vote if rejoining/updating name
                        hasVoted: participants[userId]?.hasVoted || false,
                        roundId: participants[userId]?.roundId || sessionData.currentRoundId,
                        joinedAt: participants[userId]?.joinedAt || serverTimestamp()
                    }, { merge: true }); // Merge to update or create
                } catch (e) {
                    console.error("Error joining/updating session:", e);
                    setError("Unable to join or update session as participant.");
                }
            };
            joinOrUpdateSession();
        }
    }, [isAuthReady, currentUser, userId, currentSessionId, sessionData, nickname, participants]);


    const handleSetNickname = (newNickname) => { // newNickname is already trimmed
        if (newNickname && currentUser) {
            localStorage.setItem(`pokerNickname_${currentUser.uid}`, newNickname);
            setNickname(newNickname);
            setShowNicknameModal(false);
            setError(''); // Clear any previous errors from App's state

            // The join/update effect will handle participant document update if needed
            // due to nickname change while in a session.
        } else if (!newNickname) {
            setError("Nickname cannot be empty.");
        } else if (!currentUser) {
            setError("Authentication failed. Unable to set nickname.");
            console.error("Attempted to set nickname without a current user.");
        }
    };


    const handleCreateSession = async () => {
        console.log('Creating session...');
        console.log('Current user:', currentUser?.uid);
        console.log('Is auth ready:', isAuthReady);
        console.log('Nickname:', nickname);

        if (!currentUser || !nickname) {
            setShowNicknameModal(true);
            setError("Please set a nickname first.");
            return;
        }

        if (!isAuthReady) {
            setError("Authentication in progress. Please try again in a few seconds.");
            return;
        }

        setIsLoading(true);
        try {
            console.log('Attempting to create session with user:', currentUser.uid);
            const sessionData = {
                taskName: "New Task to Vote",
                creatorId: userId,
                votesRevealed: false,
                createdAt: serverTimestamp(),
                currentRoundId: crypto.randomUUID(),
            };
            console.log('Session data:', sessionData);
            
            const newSessionRef = await addDoc(collection(db, 'sessions'), sessionData);
            console.log('Session created successfully:', newSessionRef.id);
            setCurrentSessionId(newSessionRef.id);
            
            const newPath = `/session/${newSessionRef.id}`;
            try {
                window.history.pushState({ sessionId: newSessionRef.id }, '', newPath);
            } catch (e) {
                console.warn(`Failed to execute 'pushState' for new session path "${newPath}". Error:`, e);
            }
            setCopiedLink(false);
        } catch (e) {
            console.error("Error creating session:", e);
            setError("Unable to create session. Details: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVote = async (value) => {
        if (!currentSessionId || !userId || !sessionData) return;
        try {
            const participantRef = getParticipantDocRef(currentSessionId, userId);
            await updateDoc(participantRef, {
                vote: value,
                hasVoted: true,
                roundId: sessionData.currentRoundId 
            });
        } catch (error) {
            console.error("Error casting vote:", error);
            setError("Unable to register vote.");
        }
    };

    const handleRevealVotes = async () => {
        if (!currentSessionId || !sessionData) return;
        try {
            const sessionDocRef = getSessionDocRef(currentSessionId);
            await updateDoc(sessionDocRef, { votesRevealed: true });
        } catch (error) {
            console.error("Error revealing votes:", error);
            setError("Unable to reveal votes.");
        }
    };

    const handleNewRound = async () => {
        if (!currentSessionId || !sessionData || !db) return;
        setIsLoading(true);
        const newRoundId = crypto.randomUUID();
        try {
            const sessionDocRef = getSessionDocRef(currentSessionId);
            await updateDoc(sessionDocRef, {
                taskName: "New Task to Vote",
                votesRevealed: false,
                currentRoundId: newRoundId,
            });

            const participantsColRef = getParticipantsCollectionRef(currentSessionId);
            const participantQuerySnapshot = await getDocs(participantsColRef); 
            
            const batchPromises = []; 
            participantQuerySnapshot.forEach(doc => {
                batchPromises.push(updateDoc(doc.ref, { vote: null, hasVoted: false, roundId: newRoundId }));
            });
            await Promise.all(batchPromises);

        } catch (error) {
            console.error("Error starting new round:", error);
            setError("Unable to start new round.");
        }
        setIsLoading(false);
    };

    const handleUpdateTaskName = async (newTaskName) => {
        if (!currentSessionId || !sessionData) return;
        try {
            const sessionDocRef = getSessionDocRef(currentSessionId);
            await updateDoc(sessionDocRef, { taskName: newTaskName });
        } catch (error) {
            console.error("Error updating task name:", error);
            setError("Unable to update task name.");
        }
    };

    const copySessionLink = () => {
        const urlToCopy = window.location.origin + window.location.pathname; // Construct full URL based on current path for copying
        navigator.clipboard.writeText(urlToCopy)
            .then(() => {
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
                setError("Unable to copy link. Please copy the URL manually from the address bar.");
            });
    };

    const handleLogout = async () => {
        if(currentUser) localStorage.removeItem(`pokerNickname_${currentUser.uid}`);
        setNickname('');
        
        if (currentSessionId && userId) {
            try {
                // const participantRef = getParticipantDocRef(currentSessionId, userId);
                // await deleteDoc(participantRef); // Optional: remove participant from session on logout
            } catch (error) {
                console.error("Error removing participant on logout:", error);
            }
        }

        setCurrentSessionId(null);
        setSessionData(null);
        setParticipants({});
        if (window.location.pathname !== '/') {
            console.log("Attempting to pushState to root from handleLogout.");
            try {
                window.history.pushState({}, '', '/');
                console.log("Successfully pushed state to root on logout.");
            } catch (error) {
                console.warn("Could not update browser history to root on logout (pushState failed):", error);
            }
        }
        setShowNicknameModal(true); 
    };


    // --- Render Logic ---
    if (!isAuthReady || (isLoading && !error && !sessionData && currentSessionId)) { 
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center text-white p-4">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
                <p className="mt-4 text-xl">Loading application...</p>
            </div>
        );
    }
    
    if (error && !currentSessionId && !showNicknameModal) { 
         return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center text-white p-4 text-center">
                <h1 className="text-3xl font-bold mb-4 text-red-400">Oops! Something went wrong.</h1>
                <p className="text-lg mb-6">{error}</p>
                <button
                    onClick={() => { setError(''); setIsLoading(true); window.location.reload(); }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold shadow-lg transition-colors"
                >
                    Reload Page
                </button>
            </div>
        );
    }


    if (showNicknameModal && !nickname) { // Prioritize nickname modal if needed
        return <NicknameModal
            initialNickname={nickname} // Pass initial nickname for the input
            onSetNickname={handleSetNickname} // Pass the corrected handler
            currentError={error} // Pass App's error state
            clearError={() => setError('')} // Pass function to clear App's error
        />;
    }

    if (!currentSessionId) {
        return <Lobby onCreateSession={handleCreateSession} nickname={nickname} userId={userId} onLogout={handleLogout} />;
    }

    if (!sessionData && isLoading) { // Still loading session specifically
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center text-white p-4">
                 {error && <p className="text-red-400 text-center mb-4">{error}</p>}
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
                <p className="mt-4 text-xl">Loading session...</p>
            </div>
        );
    }
     if (!sessionData && !isLoading) { // Session not found, error should be displayed by PokerSession or handled by redirect
        return (
             <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center text-white p-4 text-center">
                <h1 className="text-3xl font-bold mb-4 text-red-400">Session not available</h1>
                <p className="text-lg mb-6">{error || "The requested session does not exist or is no longer accessible."}</p>
                <button
                    onClick={() => { 
                        if (window.location.pathname !== '/') {
                            try { window.history.pushState({}, '', '/'); } catch(error) { console.warn("Failed pushState on redirect to Lobby", error);}
                        }
                        setCurrentSessionId(null); setError(''); 
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold shadow-lg transition-colors"
                >
                    Return to Lobby
                </button>
            </div>
        )
    }
    
    const amICreator = sessionData.creatorId === userId;
    // const currentUserVoteData = participants[userId]; // Unused variable
   
    return (
        <PokerSession
            sessionData={sessionData}
            participants={participants}
            userId={userId}
            nickname={nickname}
            amICreator={amICreator}
            onVote={handleVote}
            onRevealVotes={handleRevealVotes}
            onNewRound={handleNewRound}
            onUpdateTaskName={handleUpdateTaskName}
            // sessionLink removed - using onCopyLink callback instead
            copiedLink={copiedLink}
            onCopyLink={copySessionLink}
            onLogout={handleLogout}
            appError={error} // Pass down app-level error
            setAppError={setError} // Pass down setter for app-level error
        />
    );
}

// --- UI Components ---

function NicknameModal({ initialNickname, onSetNickname, currentError, clearError }) {
    const [localNick, setLocalNick] = useState(initialNickname || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!localNick.trim()) {
            onSetNickname(localNick.trim()); 
            return;
        }
        onSetNickname(localNick.trim()); 
    }

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-90 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                <h2 className="text-3xl font-bold text-center text-blue-400 mb-6">Welcome!</h2>
                <p className="text-slate-300 text-center mb-8">Choose a nickname to participate.</p>
                {currentError && <p className="text-red-400 text-sm mb-4 text-center">{currentError}</p>}
                <input
                    type="text"
                    value={localNick}
                    onChange={(e) => {
                        setLocalNick(e.target.value);
                        if (currentError) clearError(); 
                    }}
                    placeholder="Your Nickname"
                    className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
                    maxLength={20}
                    autoFocus
                />
                <button
                    type="submit"
                    className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out text-lg flex items-center justify-center"
                >
                    <LogIn className="mr-2 h-5 w-5" /> Confirm Nickname
                </button>
            </form>
        </div>
    );
}

function Lobby({ onCreateSession, nickname, userId, onLogout }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center p-6">
            <header className="absolute top-6 right-6 flex items-center space-x-4">
                {nickname && <span className="text-slate-300">Hi, <span className="font-semibold text-blue-400">{nickname}</span>!</span>}
                 <button
                    onClick={onLogout}
                    title="Exit and change nickname"
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-full text-white shadow-md transition-colors"
                >
                    <LogOut size={20} />
                </button>
            </header>
            <div className="text-center">
                <h1 className="text-5xl font-extrabold mb-4">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        Planning Poker SCRUM
                    </span>
                </h1>
                <p className="text-slate-300 text-xl mb-12 max-w-2xl">
                    Create a collaborative estimation session or join an existing one via a shared link.
                </p>
                {nickname && userId ? (
                    <button
                        onClick={onCreateSession}
                        className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl text-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 ease-in-out flex items-center mx-auto"
                    >
                        <PlusCircle className="mr-3 h-8 w-8" /> Create New Session
                    </button>
                ) : (
                    <p className="text-yellow-400">Authentication in progress or nickname not set...</p>
                )}
                <p className="mt-10 text-slate-400">
                    If you have a link, open it in your browser to join the session.
                </p>
            </div>
             <footer className="absolute bottom-4 right-4 text-slate-500 text-sm">
                User ID: <span className="font-mono">{userId || 'N/A'}</span>
            </footer>
        </div>
    );
}

function PokerSession({
    sessionData, participants, userId, nickname, amICreator,
    onVote, onRevealVotes, onNewRound, onUpdateTaskName,
    copiedLink, onCopyLink, onLogout, appError, setAppError
}) {
    const [editingTask, setEditingTask] = useState(false);
    const [currentTaskName, setCurrentTaskName] = useState(sessionData.taskName);

    useEffect(() => {
        setCurrentTaskName(sessionData.taskName); 
    }, [sessionData.taskName]);

    const handleTaskNameSubmit = (e) => {
        e.preventDefault();
        if (currentTaskName.trim() === "") {
            setAppError("Task name cannot be empty.");
            return;
        }
        setAppError('');
        onUpdateTaskName(currentTaskName.trim());
        setEditingTask(false);
    };

    const participantArray = Object.entries(participants)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => (a.joinedAt?.seconds || 0) - (b.joinedAt?.seconds || 0)); 

    const localUserParticipantData = participants[userId];
    const userHasVotedThisRound = localUserParticipantData?.hasVoted && localUserParticipantData?.roundId === sessionData.currentRoundId;

    const allParticipantsVoted = participantArray.length > 0 && participantArray.every(p => p.hasVoted && p.roundId === sessionData.currentRoundId);

    let averageVote = 0;
    let voteCounts = {};
    let consensus = false;
    if (sessionData.votesRevealed) {
        const numericVotes = participantArray
            .filter(p => p.vote !== null && typeof p.vote === 'number' && p.roundId === sessionData.currentRoundId)
            .map(p => p.vote);

        if (numericVotes.length > 0) {
            averageVote = numericVotes.reduce((sum, v) => sum + v, 0) / numericVotes.length;
            numericVotes.forEach(v => { voteCounts[v] = (voteCounts[v] || 0) + 1; });
            consensus = new Set(numericVotes).size === 1;
        }
    }
    
    const getCardColor = (value) => {
        if (typeof value === 'string') return 'bg-yellow-500 hover:bg-yellow-600'; 
        if (value <= 4) return 'bg-green-500 hover:bg-green-600';
        if (value <= 8) return 'bg-blue-500 hover:bg-blue-600';
        return 'bg-purple-500 hover:bg-purple-600';
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col p-4 md:p-6 relative pb-32 md:pb-40"> {/* Added padding-bottom for voting cards */}
            <header className="mb-6 flex flex-col sm:flex-row justify-between items-center">
                <div className="flex items-center space-x-3 mb-4 sm:mb-0">
                    <h1 className="text-3xl font-bold text-blue-400">Planning Poker</h1>
                    <button
                        onClick={onCopyLink}
                        title="Copy session link"
                        className={`p-2 rounded-lg transition-colors text-sm flex items-center space-x-2 ${copiedLink ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-600'}`}
                    >
                        <Clipboard size={18} />
                        <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                </div>
                 <div className="flex items-center space-x-3">
                     <span className="text-slate-400 text-sm">
                        Hi, <span className="font-semibold text-blue-300">{nickname}</span>!
                    </span>
                    <button
                        onClick={onLogout}
                        title="Exit session"
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-full text-white shadow-md transition-colors"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {appError && <p className="bg-red-800 text-red-200 p-3 rounded-md mb-4 text-center">{appError}</p>}

            <div className="mb-8 p-6 bg-slate-800 rounded-xl shadow-lg">
                {editingTask && amICreator ? (
                    <form onSubmit={handleTaskNameSubmit} className="flex items-center gap-3">
                        <input
                            type="text"
                            value={currentTaskName}
                            onChange={(e) => {
                                setCurrentTaskName(e.target.value);
                                if (appError) setAppError('');
                            }}
                            className="flex-grow p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                            autoFocus
                        />
                        <button type="submit" className="p-3 bg-green-600 hover:bg-green-700 rounded-lg text-white flex items-center">
                            <Send size={20} className="mr-2"/> Save
                        </button>
                        <button type="button" onClick={() => { setEditingTask(false); setCurrentTaskName(sessionData.taskName); setAppError(''); }} className="p-3 bg-slate-600 hover:bg-slate-500 rounded-lg text-white">
                            Cancel
                        </button>
                    </form>
                ) : (
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl md:text-3xl font-semibold text-sky-300 break-all min-h-[3rem] flex items-center">{sessionData.taskName}</h2>
                        {amICreator && (
                            <button onClick={() => setEditingTask(true)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white flex items-center text-sm shrink-0 ml-2">
                                <Edit3 size={18} className="mr-1 md:mr-2"/> Edit Task
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-grow flex flex-col items-center justify-center mb-8">
                <div className="bg-slate-800 p-4 md:p-8 rounded-3xl shadow-2xl w-full max-w-4xl aspect-[16/10] md:aspect-[16/7] flex flex-col items-center justify-around relative border-2 border-slate-700">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4 w-full px-2">
                        {participantArray.map(p => (
                            <ParticipantChip
                                key={p.id}
                                participant={p}
                                votesRevealed={sessionData.votesRevealed}
                                currentRoundId={sessionData.currentRoundId}
                            />
                        ))}
                        {participantArray.length === 0 && <p className="col-span-full text-center text-slate-400">No participants yet.</p>}
                    </div>
                    
                    <div className="text-center my-2 md:my-4">
                        {sessionData.votesRevealed ? (
                            <>
                                <h3 className="text-xl md:text-2xl font-semibold text-blue-300 mb-1 md:mb-2">Votes Revealed!</h3>
                                {Object.keys(voteCounts).length > 0 ? (
                                    <>
                                        <p className="text-base md:text-lg">Average: <span className="font-bold text-yellow-400">{averageVote.toFixed(2)}</span></p>
                                        {consensus && <p className="text-green-400 font-semibold text-lg md:text-xl mt-1">Consensus Reached!</p>}
                                        {!consensus && Object.keys(voteCounts).length > 0 && <p className="text-orange-400 font-semibold text-lg md:text-xl mt-1">Discussion Needed.</p>}
                                    </>
                                ) : (
                                    <p className="text-slate-400">No numeric votes to calculate average.</p>
                                )}
                            </>
                        ) : (
                            <h3 className="text-lg md:text-2xl font-semibold text-slate-300">
                                {allParticipantsVoted && participantArray.length > 0 ? "Everyone has voted! Ready to reveal?" : (participantArray.length > 0 ? "Waiting for votes..." : "Waiting for participants...")}
                            </h3>
                        )}
                    </div>
                </div>
            </div>

            <div className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
                {!sessionData.votesRevealed && (
                    <button
                        onClick={onRevealVotes}
                        disabled={(!amICreator && !allParticipantsVoted) || participantArray.length === 0} 
                        className={`px-6 py-3 text-lg font-semibold rounded-lg shadow-md transition-all flex items-center justify-center
                                    ${((!amICreator && !allParticipantsVoted) || participantArray.length === 0) ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}
                    >
                        <Eye size={22} className="mr-2"/> Reveal Votes
                    </button>
                )}
                {sessionData.votesRevealed && amICreator && (
                    <button
                        onClick={onNewRound}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-lg shadow-md transition-all flex items-center justify-center"
                    >
                        <RotateCcw size={22} className="mr-2"/> New Round
                    </button>
                )}
            </div>
            
            {(!sessionData.votesRevealed && !userHasVotedThisRound && localUserParticipantData) && (
                <div className="fixed bottom-0 left-0 right-0 bg-slate-800 bg-opacity-90 p-3 md:p-4 border-t-2 border-slate-700 shadow-2xl">
                    <p className="text-center text-slate-300 mb-2 md:mb-3 text-sm md:text-base">Choose your card for: <strong className="text-sky-300">{sessionData.taskName}</strong></p>
                    <div className="flex justify-center items-center gap-1 md:gap-2 flex-wrap">
                        {CARD_VALUES.map(value => (
                            <button
                                key={value}
                                onClick={() => onVote(value)}
                                className={`w-12 h-16 md:w-16 md:h-24 rounded-md md:rounded-lg text-lg md:text-2xl font-bold shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center
                                            ${getCardColor(value)}
                                            ${(localUserParticipantData?.vote === value && userHasVotedThisRound) ? 'ring-4 ring-offset-2 ring-offset-slate-800 ring-yellow-400 scale-105' : ''}`}
                                disabled={userHasVotedThisRound}
                            >
                                {value}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {(userHasVotedThisRound && !sessionData.votesRevealed && localUserParticipantData) && (
                <div className="fixed bottom-0 left-0 right-0 bg-slate-800 bg-opacity-90 p-4 border-t-2 border-slate-700 shadow-2xl">
                    <p className="text-center text-slate-300 text-lg">You voted <span className="font-bold text-xl text-yellow-400">{localUserParticipantData.vote}</span>. Waiting for others...</p>
                </div>
            )}
        </div>
    );
}

function ParticipantChip({ participant, votesRevealed, currentRoundId }) {
    const hasVotedThisRound = participant.hasVoted && participant.roundId === currentRoundId;
    const voteToShow = (votesRevealed && hasVotedThisRound) ? participant.vote : (hasVotedThisRound ? '✔️' : '...');
    const cardColor = votesRevealed && hasVotedThisRound && typeof participant.vote === 'number' 
        ? (participant.vote <= 4 ? 'bg-green-700' : participant.vote <= 8 ? 'bg-blue-700' : 'bg-purple-700')
        : (votesRevealed && hasVotedThisRound && typeof participant.vote === 'string' ? 'bg-yellow-700' : 'bg-slate-600');

    return (
        <div className={`p-2 md:p-3 rounded-lg shadow-md text-center transition-all duration-300 ${cardColor} ${hasVotedThisRound && !votesRevealed ? 'border-2 border-green-400' : ''}`}>
            <p className="text-xs md:text-sm font-semibold text-white truncate" title={participant.name}>{participant.name}</p>
            <p className={`text-lg md:text-2xl font-bold mt-1 ${votesRevealed && hasVotedThisRound ? 'text-white' : 'text-slate-200'}`}>{voteToShow}</p>
        </div>
    );
}


export default App;


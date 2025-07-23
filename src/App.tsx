import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  QuerySnapshot,
  DocumentData,
  QueryDocumentSnapshot,
  deleteDoc,
  getDocs
} from 'firebase/firestore';

// Define message type
interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp?: Date;
  reactions?: string[];
  isTyping?: boolean;
  messageType?: 'text' | 'image' | 'file' | 'code';
  aiPersonality?: string;
  mood?: 'happy' | 'sad' | 'excited' | 'serious' | 'funny';
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ChatRoom {
  id: string;
  name: string;
  description: string;
  participants: number;
  isActive: boolean;
}

const AI_PERSONALITIES = [
  { id: 'assistant', name: '🤖 Assistant', description: 'Helpful and professional' },
  { id: 'creative', name: '🎨 Creative', description: 'Artistic and imaginative' },
  { id: 'technical', name: '⚡ Technical', description: 'Expert in coding and tech' },
  { id: 'philosopher', name: '🧠 Philosopher', description: 'Deep and thoughtful' },
  { id: 'comedian', name: '😄 Comedian', description: 'Funny and entertaining' },
  { id: 'teacher', name: '📚 Teacher', description: 'Educational and patient' }
];

const MESSAGE_TEMPLATES = [
  "Explain this concept to me",
  "Write a code example for",
  "What's the latest trend in",
  "Help me brainstorm ideas for",
  "Create a step-by-step guide for",
  "What are the pros and cons of"
];

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🤔', '✨'];

function App() {
  // State to store all messages
  const [messages, setMessages] = useState<Message[]>([]);
  
  // State for current input
  const [input, setInput] = useState<string>('');
  
  // State to track if AI is responding
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Counter for unique message IDs
  const [messageCounter, setMessageCounter] = useState<number>(1);

  // Theme and UI states
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [currentTheme, setCurrentTheme] = useState<'cyber' | 'neon' | 'matrix' | 'hologram'>('cyber');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastCounter, setToastCounter] = useState<number>(1);

  // Advanced features
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [showParticles, setShowParticles] = useState<boolean>(true);
  const [messageFilter, setMessageFilter] = useState<'all' | 'user' | 'ai'>('all');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [showTypingSimulation, setShowTypingSimulation] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // New revolutionary features
  const [selectedPersonality, setSelectedPersonality] = useState<string>('assistant');
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([
    { id: 'general', name: 'General Chat', description: 'Main discussion room', participants: 42, isActive: true },
    { id: 'tech', name: 'Tech Talk', description: 'Technology discussions', participants: 28, isActive: false },
    { id: 'creative', name: 'Creative Corner', description: 'Art and creativity', participants: 15, isActive: false }
  ]);
  const [activeChatRoom, setActiveChatRoom] = useState<string>('general');
  const [showChatRooms, setShowChatRooms] = useState<boolean>(false);
  const [userMood, setUserMood] = useState<string>('😊');
  const [showAIStatus, setShowAIStatus] = useState<boolean>(true);
  const [messageCount, setMessageCount] = useState<number>(0);
  const [typingSpeed, setTypingSpeed] = useState<number>(50);
  const [showMessagePreview, setShowMessagePreview] = useState<boolean>(false);
  const [draggedFile, setDraggedFile] = useState<File | null>(null);

  // Voice recognition
  const [recognition, setRecognition] = useState<any>(null);

  // Reference for auto-scrolling to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize voice recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
        showToast('Voice input captured! 🎤', 'success');
      };

      recognitionInstance.onerror = () => {
        setIsRecording(false);
        showToast('Voice recognition failed', 'error');
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, autoScroll]);

  // Load chat history from Firebase when component mounts
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('chatbot-theme');
    const savedSettings = localStorage.getItem('chatbot-settings');
    
    if (savedTheme) {
      setCurrentTheme(savedTheme as any);
    }
    
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setShowParticles(settings.showParticles ?? true);
      setAutoScroll(settings.autoScroll ?? true);
      setShowTypingSimulation(settings.showTypingSimulation ?? true);
      setSoundEnabled(settings.soundEnabled ?? true);
      setTypingSpeed(settings.typingSpeed ?? 50);
    }
  }, []);

  // Apply theme to body
  useEffect(() => {
    document.body.className = `theme-${currentTheme}`;
    localStorage.setItem('chatbot-theme', currentTheme);
  }, [currentTheme]);

  // Save settings
  useEffect(() => {
    const settings = {
      showParticles,
      autoScroll,
      showTypingSimulation,
      soundEnabled,
      typingSpeed
    };
    localStorage.setItem('chatbot-settings', JSON.stringify(settings));
  }, [showParticles, autoScroll, showTypingSimulation, soundEnabled, typingSpeed]);

  // Function to load chat history from Firebase
  const loadChatHistory = () => {
    const messagesRef = collection(db, 'chats', activeChatRoom, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(
      q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const loadedMessages: Message[] = [];
        let counter = 1;
        
        // Add welcome message if no messages exist
        if (snapshot.empty) {
          loadedMessages.push({
            id: counter++,
            text: `🚀 Welcome to the ${activeChatRoom.toUpperCase()} chat room! I'm your AI companion with multiple personalities. How can I assist you today? ✨`,
            isUser: false,
            timestamp: new Date(),
            aiPersonality: selectedPersonality,
            messageType: 'text'
          });
        } else {
          snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            loadedMessages.push({
              id: counter++,
              text: data.text,
              isUser: data.isUser,
              timestamp: data.timestamp?.toDate() || new Date(),
              reactions: data.reactions || [],
              aiPersonality: data.aiPersonality || 'assistant',
              messageType: data.messageType || 'text',
              mood: data.mood
            });
          });
        }
        
        setMessages(loadedMessages);
        setMessageCounter(counter);
        setMessageCount(loadedMessages.length);
        setIsConnected(true);
        setError('');
      },
      (error) => {
        console.error('Error loading chat history:', error);
        setIsConnected(false);
        setError('Failed to load chat history. Please check your connection.');
      }
    );

    return unsubscribe;
  };

  // Function to save message to Firebase
  const saveMessageToFirebase = async (text: string, isUser: boolean, messageType: string = 'text'): Promise<void> => {
    try {
      const messagesRef = collection(db, 'chats', activeChatRoom, 'messages');
      await addDoc(messagesRef, {
        text: text,
        isUser: isUser,
        timestamp: Timestamp.fromDate(new Date()),
        reactions: [],
        aiPersonality: isUser ? null : selectedPersonality,
        messageType: messageType,
        mood: isUser ? userMood : null
      });
      console.log('✅ Message saved to Firebase');
      setError('');
    } catch (error) {
      console.error('❌ Error saving message to Firebase:', error);
      setError('Failed to save message. Please try again.');
    }
  };

  // Play advanced sound effect
  const playSound = (type: 'send' | 'receive' | 'notification' | 'error' | 'success') => {
    if (!soundEnabled) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const frequencies = { 
      send: 800, 
      receive: 600, 
      notification: 1000,
      error: 300,
      success: 1200
    };
    
    oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
    oscillator.type = type === 'error' ? 'sawtooth' : 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  // Enhanced typing simulation with personality
  const simulateTyping = async (text: string, personality: string): Promise<void> => {
    if (!showTypingSimulation) {
      await saveMessageToFirebase(text, false);
      return;
    }

    const words = text.split(' ');
    let currentText = '';
    
    // Add typing indicator with personality
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: `${AI_PERSONALITIES.find(p => p.id === personality)?.name || '🤖'} is thinking...`,
      isUser: false,
      timestamp: new Date(),
      isTyping: true,
      aiPersonality: personality
    }]);
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      
      // Update the typing message
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.isTyping) {
          lastMessage.text = currentText + '█';
        }
        return newMessages;
      });
      
      await new Promise(resolve => setTimeout(resolve, typingSpeed + Math.random() * 50));
    }
    
    // Remove typing indicator and save final message
    setMessages(prev => prev.filter(msg => !msg.isTyping));
    await saveMessageToFirebase(text, false);
  };

  // Enhanced message sending with personality
  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return;
    
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setError('');

    playSound('send');

    // Save user message with current mood
    await saveMessageToFirebase(currentInput, true);
    
    try {
      // Send to backend with personality context
      const response = await axios.post('http://localhost:8000/chat', {
        message: currentInput,
        personality: selectedPersonality,
        mood: userMood,
        chatRoom: activeChatRoom
      }, {
        timeout: 30000
      });
      
      playSound('receive');
      
      // Simulate typing for AI response with personality
      await simulateTyping(response.data.response, selectedPersonality);
      
    } catch (error) {
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      
      let errorMessage = "⚠️ Connection lost! The AI servers might be down.";
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          errorMessage = "🔌 Backend offline! Please start the server.";
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = "⏱️ Request timeout! The AI is overwhelmed.";
        }
      }
      
      await saveMessageToFirebase(errorMessage, false);
      setError(errorMessage);
      playSound('error');
    }
    
    setIsLoading(false);
  };

  // Handle key press with advanced features
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setShowTemplates(!showTemplates);
    }
  };

  // Format timestamp
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Enhanced toast system
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void => {
    const newToast: Toast = {
      id: toastCounter,
      message,
      type
    };
    
    setToasts(prev => [...prev, newToast]);
    setToastCounter(prev => prev + 1);
    
    playSound(type === 'success' ? 'success' : type === 'error' ? 'error' : 'notification');
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== newToast.id));
    }, 4000);
  };

  // Remove toast
  const removeToast = (id: number): void => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Copy message with enhanced feedback
  const copyMessage = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Message copied to clipboard! 📋✨', 'success');
    } catch (error) {
      showToast('Failed to copy message 😞', 'error');
    }
  };

  // Add reaction to message
  const addReaction = async (messageId: number, emoji: string): Promise<void> => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        const newReactions = reactions.includes(emoji) 
          ? reactions.filter(r => r !== emoji)
          : [...reactions, emoji];
        return { ...msg, reactions: newReactions };
      }
      return msg;
    }));
    showToast(`Reaction ${emoji} added!`, 'success');
  };

  // Voice input
  const startVoiceInput = (): void => {
    if (recognition && !isRecording) {
      setIsRecording(true);
      recognition.start();
    }
  };

  // Switch chat room
  const switchChatRoom = (roomId: string): void => {
    setActiveChatRoom(roomId);
    setChatRooms(prev => prev.map(room => ({
      ...room,
      isActive: room.id === roomId
    })));
    showToast(`Switched to ${roomId.toUpperCase()} room 🚀`, 'info');
    loadChatHistory();
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileName = file.name;
      const fileSize = (file.size / 1024).toFixed(2);
      setInput(`📎 Uploaded: ${fileName} (${fileSize}KB)`);
      showToast(`File uploaded: ${fileName} 📁`, 'success');
    }
  };

  // Use message template
  const useTemplate = (template: string): void => {
    setInput(template + ' ');
    setShowTemplates(false);
    showToast('Template applied! ✨', 'success');
  };

  // Export chat with enhanced features
  const exportChat = (): void => {
    const chatData = {
      chatRoom: activeChatRoom,
      personality: selectedPersonality,
      exportDate: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages.map(msg => ({
        timestamp: msg.timestamp?.toISOString(),
        sender: msg.isUser ? 'You' : `AI (${msg.aiPersonality})`,
        message: msg.text,
        reactions: msg.reactions,
        type: msg.messageType,
        mood: msg.mood
      }))
    };
    
    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeChatRoom}-chat-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('Chat exported successfully! 📁✨', 'success');
  };

  // Clear chat
  const clearChat = async (): Promise<void> => {
    if (window.confirm('🗑️ Clear all messages? This action cannot be undone!')) {
      try {
        const messagesRef = collection(db, 'chats', activeChatRoom, 'messages');
        const snapshot = await getDocs(messagesRef);
        
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        setMessages([]);
        setMessageCounter(1);
        setMessageCount(0);
        showToast('Chat cleared! Fresh start! 🧹✨', 'success');
      } catch (error) {
        showToast('Failed to clear chat 😞', 'error');
      }
    }
  };

  // Get filtered messages
  const filteredMessages = messages.filter(message => {
    const matchesSearch = searchQuery === '' || 
      message.text.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = messageFilter === 'all' || 
      (messageFilter === 'user' && message.isUser) ||
      (messageFilter === 'ai' && !message.isUser);
    
    return matchesSearch && matchesFilter && !message.isTyping;
  });

  // Character count info
  const getCharacterInfo = () => {
    const maxLength = 2000;
    const currentLength = input.length;
    const isNearLimit = currentLength > maxLength * 0.8;
    return { currentLength, maxLength, isNearLimit };
  };

  const characterInfo = getCharacterInfo();

  return (
    <div className={`app-container theme-${currentTheme} ${showSidebar ? 'sidebar-open' : ''}`}>
      {/* Cyberpunk Background Effects */}
      {showParticles && (
        <div className="cyber-background">
          <div className="grid-overlay"></div>
          <div className="scan-lines"></div>
          <div className="floating-code">
            {[...Array(15)].map((_, i) => (
              <div key={i} className={`code-fragment fragment-${i % 5}`}>
                {['01010101', 'LOADING...', 'SYSTEM OK', 'NEURAL NET', 'AI ACTIVE'][i % 5]}
              </div>
            ))}
          </div>
          <div className="neon-particles">
            {[...Array(30)].map((_, i) => (
              <div key={i} className={`neon-particle particle-${i % 6}`}></div>
            ))}
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className={`toast toast-${toast.type} cyber-toast`}
            onClick={() => removeToast(toast.id)}
          >
            <span className="toast-icon">
              {toast.type === 'success' ? '✅' : 
               toast.type === 'error' ? '❌' : 
               toast.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}>×</button>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? 'sidebar-visible' : ''}`}>
        <div className="sidebar-header">
          <h3>🚀 Control Center</h3>
          <button className="close-sidebar" onClick={() => setShowSidebar(false)}>×</button>
        </div>
        
        {/* AI Personality Selector */}
        <div className="sidebar-section">
          <h4>🎭 AI Personality</h4>
          <div className="personality-grid">
            {AI_PERSONALITIES.map(personality => (
              <button
                key={personality.id}
                className={`personality-btn ${selectedPersonality === personality.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedPersonality(personality.id);
                  showToast(`Switched to ${personality.name}! 🎭`, 'success');
                }}
              >
                <span className="personality-emoji">{personality.name.split(' ')[0]}</span>
                <span className="personality-name">{personality.name.split(' ')[1]}</span>
                <span className="personality-desc">{personality.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Rooms */}
        <div className="sidebar-section">
          <h4>🏠 Chat Rooms</h4>
          <div className="chat-rooms">
            {chatRooms.map(room => (
              <button
                key={room.id}
                className={`room-btn ${room.isActive ? 'active' : ''}`}
                onClick={() => switchChatRoom(room.id)}
              >
                <div className="room-info">
                  <span className="room-name">{room.name}</span>
                  <span className="room-desc">{room.description}</span>
                </div>
                <div className="room-participants">👥 {room.participants}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Theme Selector */}
        <div className="sidebar-section">
          <h4>🌈 Visual Themes</h4>
          <div className="theme-grid">
            {['cyber', 'neon', 'matrix', 'hologram'].map(theme => (
              <button
                key={theme}
                className={`theme-btn theme-${theme} ${currentTheme === theme ? 'active' : ''}`}
                onClick={() => {
                  setCurrentTheme(theme as any);
                  showToast(`${theme.toUpperCase()} theme activated! 🎨`, 'success');
                }}
              >
                {theme.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="sidebar-section">
          <h4>⚙️ Settings</h4>
          <div className="settings-list">
            <label className="setting-toggle">
              <input
                type="checkbox"
                checked={showParticles}
                onChange={(e) => setShowParticles(e.target.checked)}
              />
              <span>✨ Visual Effects</span>
            </label>
            <label className="setting-toggle">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
              />
              <span>🔊 Sound Effects</span>
            </label>
            <label className="setting-toggle">
              <input
                type="checkbox"
                checked={showTypingSimulation}
                onChange={(e) => setShowTypingSimulation(e.target.checked)}
              />
              <span>⌨️ Typing Animation</span>
            </label>
            <div className="setting-slider">
              <label>⚡ Typing Speed</label>
              <input
                type="range"
                min="10"
                max="200"
                value={typingSpeed}
                onChange={(e) => setTypingSpeed(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="cyber-header">
        <div className="header-left">
          <button className="sidebar-toggle" onClick={() => setShowSidebar(!showSidebar)}>
            ☰
          </button>
          <div className="ai-status">
            <div className="ai-avatar-main">
              <div className="avatar-core">🤖</div>
              <div className="avatar-ring"></div>
              <div className="avatar-pulse"></div>
            </div>
            <div className="ai-info">
              <h1 className="cyber-title">CYBER CHAT AI</h1>
              <div className="status-bar">
                <span className={`connection-status ${isConnected ? 'online' : 'offline'}`}>
                  {isConnected ? '🟢 ONLINE' : '🔴 OFFLINE'}
                </span>
                <span className="room-indicator">📍 {activeChatRoom.toUpperCase()}</span>
                <span className="message-counter">💬 {messageCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button 
            className={`action-btn ${showSearch ? 'active' : ''}`}
            onClick={() => setShowSearch(!showSearch)}
            title="Search Messages"
          >
            🔍
          </button>
          <button 
            className="action-btn"
            onClick={exportChat}
            title="Export Chat"
          >
            📁
          </button>
          <button 
            className="action-btn"
            onClick={clearChat}
            title="Clear Chat"
          >
            🗑️
          </button>
          <div className="mood-selector">
            <span>😊</span>
            <select value={userMood} onChange={(e) => setUserMood(e.target.value)}>
              <option value="😊">Happy</option>
              <option value="😔">Sad</option>
              <option value="😎">Cool</option>
              <option value="🤔">Thinking</option>
              <option value="😴">Sleepy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="search-panel">
          <div className="search-wrapper">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search through messages..."
              className="search-input"
            />
            <select
              value={messageFilter}
              onChange={(e) => setMessageFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Messages</option>
              <option value="user">Your Messages</option>
              <option value="ai">AI Messages</option>
            </select>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} className="error-close">×</button>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="chat-wrapper">
        <div className="chat-container cyber-chat" ref={chatContainerRef}>
          {filteredMessages.map((message) => (
            <div 
              key={message.id} 
              className={`message-row ${message.isUser ? 'user-row' : 'ai-row'}`}
            >
              {/* AI Avatar */}
              {!message.isUser && (
                <div className="message-avatar ai-avatar">
                  <div className="avatar-container">
                    <span className="avatar-emoji">
                      {AI_PERSONALITIES.find(p => p.id === message.aiPersonality)?.name.split(' ')[0] || '🤖'}
                    </span>
                    <div className="avatar-glow-ring"></div>
                  </div>
                </div>
              )}
              
              {/* Message Bubble */}
              <div className={`message-bubble ${message.isUser ? 'user-message' : 'ai-message'} ${message.isTyping ? 'typing' : ''}`}>
                <div className="message-header">
                  {!message.isUser && (
                    <span className="ai-personality">
                      {AI_PERSONALITIES.find(p => p.id === message.aiPersonality)?.name || 'AI Assistant'}
                    </span>
                  )}
                  {message.isUser && message.mood && (
                    <span className="user-mood">{message.mood}</span>
                  )}
                  <span className="message-time">{message.timestamp && formatTime(message.timestamp)}</span>
                </div>
                
                <div className="message-content">
                  <div className="message-text">
                    {message.isTyping ? (
                      <span className="typing-text">{message.text}</span>
                    ) : (
                      message.text
                    )}
                  </div>
                  
                  {!message.isTyping && (
                    <div className="message-actions">
                      <button
                        className="action-btn-small"
                        onClick={() => copyMessage(message.text)}
                        title="Copy"
                      >
                        📋
                      </button>
                      <div className="reactions-container">
                        {QUICK_REACTIONS.map(emoji => (
                          <button
                            key={emoji}
                            className="reaction-btn"
                            onClick={() => addReaction(message.id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="message-reactions">
                          {message.reactions.map((reaction, idx) => (
                            <span key={idx} className="reaction">{reaction}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="message-glow"></div>
              </div>

              {/* User Avatar */}
              {message.isUser && (
                <div className="message-avatar user-avatar">
                  <div className="avatar-container">
                    <span className="avatar-emoji">👤</span>
                    <div className="avatar-glow-ring"></div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Loading Animation */}
          {isLoading && !showTypingSimulation && (
            <div className="message-row ai-row">
              <div className="message-avatar ai-avatar">
                <div className="avatar-container">
                  <span className="avatar-emoji">🤖</span>
                  <div className="avatar-glow-ring loading"></div>
                </div>
              </div>
              <div className="message-bubble ai-message loading-message">
                <div className="cyber-loading">
                  <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div className="loading-text">AI PROCESSING...</div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Templates */}
      {showTemplates && (
        <div className="templates-panel">
          <div className="templates-header">
            <h4>💡 Quick Templates</h4>
            <button onClick={() => setShowTemplates(false)}>×</button>
          </div>
          <div className="templates-grid">
            {MESSAGE_TEMPLATES.map((template, idx) => (
              <button
                key={idx}
                className="template-btn"
                onClick={() => useTemplate(template)}
              >
                {template}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="cyber-input-container">
        <div className="input-panel">
          <div className="input-tools">
            <button 
              className={`tool-btn ${showTemplates ? 'active' : ''}`}
              onClick={() => setShowTemplates(!showTemplates)}
              title="Message Templates"
            >
              💡
            </button>
            <button 
              className="tool-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Upload File"
            >
              📎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileUpload}
              accept="*/*"
            />
            {recognition && (
              <button
                className={`tool-btn voice-btn ${isRecording ? 'recording' : ''}`}
                onClick={startVoiceInput}
                disabled={isLoading || isRecording}
                title="Voice Input"
              >
                {isRecording ? '🎙️' : '🎤'}
              </button>
            )}
          </div>

          <div className="input-field-wrapper">
            <div className="input-glow-effect"></div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 2000))}
              onKeyPress={handleKeyPress}
              placeholder="Enter your message... Press Tab for templates ✨"
              disabled={isLoading}
              className="cyber-input"
              maxLength={2000}
              rows={1}
              style={{
                resize: 'none',
                overflow: 'hidden',
                minHeight: '60px',
                maxHeight: '150px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 150) + 'px';
              }}
            />
            
            {characterInfo.currentLength > 0 && (
              <div className={`character-count ${characterInfo.isNearLimit ? 'near-limit' : ''}`}>
                {characterInfo.currentLength}/{characterInfo.maxLength}
              </div>
            )}
          </div>

          <button 
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading}
            className="cyber-send-btn"
            title="Send Message"
          >
            {isLoading ? (
              <div className="cyber-spinner"></div>
            ) : (
              <>
                <span className="send-icon">🚀</span>
                <div className="send-glow"></div>
              </>
            )}
          </button>
        </div>

        <div className="input-footer">
          <div className="status-indicators">
            <span className="typing-indicator">⌨️ Press Tab for templates</span>
            <span className="personality-indicator">
              🎭 {AI_PERSONALITIES.find(p => p.id === selectedPersonality)?.name}
            </span>
            <span className="room-indicator">📍 {activeChatRoom.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

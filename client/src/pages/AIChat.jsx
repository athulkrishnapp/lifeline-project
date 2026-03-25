import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
// FIXED: Replaced FaSparkles with FaMagic
import { FaRobot, FaPaperPlane, FaUser, FaHeartbeat, FaArrowLeft, FaMagic } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function AIChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { sender: 'ai', text: "Hello! I am your Lifeline AI Assistant. I have securely connected to your medical records. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // 1. Add User Message
    const userText = input;
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    try {
        const token = localStorage.getItem('token');
        
        // 2. Call Real Backend API (Gemini)
        const res = await axios.post('http://localhost:5000/api/ai-chat', 
            { message: userText }, 
            // ✅ FIXED: Added Bearer prefix here
            { headers: { Authorization: `Bearer ${token}` } } 
        );

        // 3. Add AI Response from Gemini
        setMessages(prev => [...prev, { sender: 'ai', text: res.data.response }]);

    } catch (err) {
        setMessages(prev => [...prev, { sender: 'ai', text: "I'm having trouble accessing the secure server. Please try again." }]);
    } finally {
        setIsTyping(false);
    }
  };

  return (
    <div className="ai-fullscreen-container d-flex flex-column">
      
      {/* --- HEADER --- */}
      <div className="ai-header d-flex align-items-center justify-content-between p-3 p-md-4 shadow-sm">
          <div className="d-flex align-items-center gap-3">
              {/* Back Button to return to normal dashboard */}
              <button onClick={() => navigate(-1)} className="btn btn-link text-white p-0 text-decoration-none me-2 hover-scale">
                  <FaArrowLeft size={22}/>
              </button>
              <div className="ai-avatar-glow d-flex align-items-center justify-content-center rounded-circle" style={{width: '45px', height: '45px'}}>
                  <FaRobot size={24} className="text-white"/>
              </div>
              <div>
                  <h4 className="fw-bold m-0 text-white d-flex align-items-center gap-2" style={{letterSpacing: '1px'}}>
                      Lifeline AI <FaMagic size={16} className="text-warning"/>
                  </h4>
                  <small className="text-success fw-bold d-flex align-items-center gap-1 mt-1" style={{fontSize: '11px'}}>
                      <FaHeartbeat/> Securely Linked to Medical Records
                  </small>
              </div>
          </div>
      </div>

      {/* --- CHAT AREA --- */}
      <div className="flex-grow-1 overflow-auto p-4 custom-ai-scrollbar d-flex flex-column gap-4">
          <div className="container" style={{maxWidth: '900px'}}>
              {messages.map((msg, i) => (
                  <div key={i} className={`d-flex mb-4 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                      <div className={`d-flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`} style={{maxWidth: '85%'}}>
                          
                          {/* Avatar */}
                          <div className={`flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center shadow-sm ${msg.sender === 'user' ? 'bg-light text-dark' : 'ai-avatar-glow'}`} style={{width:'40px', height:'40px'}}>
                              {msg.sender === 'user' ? <FaUser size={16}/> : <FaRobot size={18} className="text-white"/>}
                          </div>
                          
                          {/* Bubble */}
                          <div className={`p-3 rounded-4 shadow-sm ${msg.sender === 'user' ? 'user-bubble' : 'ai-bubble'}`}>
                              <p className="m-0" style={{lineHeight: '1.6', whiteSpace: 'pre-wrap', fontSize: '15px'}}>{msg.text}</p>
                          </div>
                      </div>
                  </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                  <div className="d-flex justify-content-start mb-4">
                       <div className="d-flex gap-3" style={{maxWidth: '85%'}}>
                          <div className="flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center ai-avatar-glow" style={{width:'40px', height:'40px'}}>
                              <FaRobot size={18} className="text-white"/>
                          </div>
                          <div className="ai-bubble p-3 rounded-4 shadow-sm d-flex align-items-center gap-2">
                              <div className="typing-dot"></div>
                              <div className="typing-dot" style={{animationDelay: '0.2s'}}></div>
                              <div className="typing-dot" style={{animationDelay: '0.4s'}}></div>
                          </div>
                      </div>
                  </div>
              )}
              <div ref={messagesEndRef} />
          </div>
      </div>

      {/* --- INPUT AREA --- */}
      <div className="p-3 p-md-4 ai-input-area border-top">
          <div className="container-fluid p-0 mx-auto" style={{maxWidth: '900px'}}>
              <div className="input-group ai-input-group shadow-lg rounded-pill p-1">
                  <input 
                      className="form-control border-0 bg-transparent text-white px-4 py-3" 
                      placeholder="Ask about your prescriptions, lab reports, or health advice..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      style={{boxShadow: 'none'}}
                  />
                  <button onClick={handleSend} className="btn ai-send-btn rounded-circle m-1 d-flex align-items-center justify-content-center" style={{width: '46px', height: '46px'}}>
                      <FaPaperPlane size={16}/>
                  </button>
              </div>
              <div className="text-center mt-3">
                  <small className="text-white-50" style={{fontSize: '11px', letterSpacing: '0.5px'}}>
                      Lifeline AI can make mistakes. Always consult your doctor for critical medical emergencies.
                  </small>
              </div>
          </div>
      </div>

      {/* --- DEDICATED AI STYLES --- */}
      <style>{`
        /* FULL SCREEN OVERLAY: Hides the normal app background and navbar */
        .ai-fullscreen-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(145deg, #050b14 0%, #0f172a 100%);
            z-index: 9999;
            color: white;
            font-family: 'Inter', sans-serif;
        }

        .ai-header {
            background: rgba(15, 23, 42, 0.7);
            backdrop-filter: blur(15px);
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .ai-avatar-glow {
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
        }

        .ai-bubble {
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(255,255,255,0.05);
            color: #f8fafc;
            border-top-left-radius: 4px !important;
        }

        .user-bubble {
            background: #f8fafc;
            color: #0f172a;
            border-top-right-radius: 4px !important;
        }

        .ai-input-area {
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(15px);
            border-color: rgba(255,255,255,0.05) !important;
        }

        .ai-input-group {
            background: rgba(30, 41, 59, 0.9);
            border: 1px solid rgba(255,255,255,0.1);
            transition: all 0.3s;
        }
        
        .ai-input-group:focus-within {
            border-color: #6366f1;
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.2) !important;
            background: rgba(15, 23, 42, 1);
        }

        .ai-input-group input::placeholder {
            color: #64748b;
        }

        .ai-send-btn {
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            color: white;
            border: none;
            transition: transform 0.2s;
        }
        
        .ai-send-btn:hover {
            transform: scale(1.05);
            color: white;
            box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
        }

        .hover-scale { transition: transform 0.2s; }
        .hover-scale:hover { transform: scale(1.1); color: #a855f7 !important; }

        /* Custom Scrollbar for AI interface */
        .custom-ai-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-ai-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-ai-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }

        /* Typing Dots Animation */
        .typing-dot {
            width: 6px;
            height: 6px;
            background-color: #94a3b8;
            border-radius: 50%;
            animation: typing 1.4s infinite ease-in-out both;
        }
        @keyframes typing {
            0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default AIChat;
import React, { useState } from 'react';
import { FaRobot, FaPaperPlane, FaUser } from 'react-icons/fa';

function AIChat() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: "Hello! I am your Lifeline Health Assistant. I have access to your medical history. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsgs = [...messages, { sender: 'user', text: input }];
    setMessages(newMsgs);
    setInput('');
    
    // Simulate AI Response (In real app, call /api/ai-chat)
    setTimeout(() => {
        setMessages(prev => [...prev, { sender: 'ai', text: "I've noted that. Based on your profile, I recommend monitoring your blood pressure daily. Would you like me to log a reading?" }]);
    }, 1000);
  };

  return (
    <div className="page-background min-vh-100 p-5 d-flex justify-content-center">
      <div className="card shadow-lg border-0 rounded-4 overflow-hidden" style={{width: '800px', height: '80vh'}}>
        
        {/* Header */}
        <div className="bg-primary p-4 text-white d-flex align-items-center gap-3">
            <div className="bg-white text-primary p-3 rounded-circle"><FaRobot size={24}/></div>
            <div>
                <h5 className="fw-bold m-0">Health Assistant</h5>
                <small className="opacity-75">Online • Access to Medical Records</small>
            </div>
        </div>

        {/* Chat Area */}
        <div className="card-body bg-light overflow-auto p-4 d-flex flex-column gap-3">
            {messages.map((msg, i) => (
                <div key={i} className={`d-flex ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                    <div className={`p-3 rounded-4 shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-white text-dark'}`} style={{maxWidth: '70%'}}>
                        {msg.text}
                    </div>
                </div>
            ))}
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-top">
            <div className="input-group">
                <input 
                    className="form-control border-0 bg-light rounded-pill px-4" 
                    placeholder="Type your health query..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <button onClick={handleSend} className="btn btn-primary rounded-circle ms-2" style={{width: '45px', height: '45px'}}><FaPaperPlane/></button>
            </div>
        </div>

      </div>
    </div>
  );
}

export default AIChat;
import { useState, useEffect, useRef } from 'react';
import { startInterview, sendChatMessage, endInterview } from '../services/api';

export default function InterviewRoom({ sessionData, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await startInterview(sessionData.session_id, sessionData.user_id);
        setMessages([{ role: 'ai', text: res.question }]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [sessionData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setMessages(prev => [...prev, { role: 'human', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(sessionData.session_id, userText);
      setMessages(prev => [...prev, { role: 'ai', text: res.response }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    setEnding(true);
    try {
      const res = await endInterview(sessionData.session_id);
      onComplete(res.feedback);
    } catch (err) {
      console.error(err);
      setEnding(false);
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '85vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Interview Session 🎙️</h2>
        <button 
          onClick={handleEnd} 
          disabled={ending || loading}
          style={{ background: '#ef4444', padding: '0.5rem 1rem', borderRadius: '8px', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          {ending ? 'Evaluating...' : 'End Interview'}
        </button>
      </div>

      <div className="chat-container" style={{ flexGrow: 1 }}>
        {messages.map((m, idx) => (
          <div key={idx} className={`chat-bubble ${m.role}`}>
            {m.text.split('\n').map((line, i) => <p key={i} style={{margin: 0, color: 'inherit'}}>{line}</p>)}
          </div>
        ))}
        {loading && !ending && (
          <div className="chat-bubble ai">
            <span className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px'}}></span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem' }}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer here..."
          disabled={loading || ending}
          style={{ marginBottom: 0 }}
        />
        <button type="submit" className="btn-primary" disabled={loading || ending} style={{ width: 'auto' }}>
          Send
        </button>
      </form>
    </div>
  );
}

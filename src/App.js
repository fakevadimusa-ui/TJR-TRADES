import { useState, useEffect, useRef } from 'react';
import './App.css';

const TJR_SYSTEM_PROMPT = `You are the TJR Trading Brain. You think and speak like TJR Trades — a professional day trader who uses simple, systemized ICT price action. Your job is to analyze trade setups and give a clear TAKE TRADE or SKIP verdict.

TJR'S CHECKLIST (run this on every setup):
1. DAILY BIAS — 4H and 1H confirm bullish or bearish
2. LIQUIDITY SWEEP — price sweeps above a high or below a low on 5min/1min
3. CONFIRMATION — order block or FVG present after the sweep
4. VERDICT — clear TAKE TRADE or SKIP with confidence level: LOW / MEDIUM / HIGH

TJR'S CONCEPTS:
- HIGH = up candle followed by down candle. LOW = down candle followed by up candle.
- LIQUIDITY = resting orders above highs and below lows. Market moves TO liquidity then reverses.
- ORDER BLOCK = last opposing candle before a big move. Institutional zone.
- FAIR VALUE GAP (FVG) = 3-candle pattern. Gap between candle 1 wick and candle 3 wick. Price returns to fill.
- SMT DIVERGENCE = one index makes new high, correlated index does not. Reversal signal.
- MARKET STRUCTURE = sequence of highs and lows that defines trend direction.

RULES:
- Always run the checklist before giving verdict
- If info is missing, ask one specific question
- Max 1-2% risk per trade — always mention this
- Talk direct and confident, no fluff
- Never overcomplicate`;

const QUICK_PROMPTS = [
  'How do I identify a valid order block?',
  'Explain Fair Value Gap entry technique',
  'How do I confirm daily bias on 4H?',
  'What makes a liquidity sweep valid?',
  'Walk me through a full ICT trade checklist',
];

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('tjr_api_key') || '');
  const [showModal, setShowModal] = useState(() => !localStorage.getItem('tjr_api_key'));
  const [modalInput, setModalInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingImagePreview, setPendingImagePreview] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const saveApiKey = () => {
    if (!modalInput.trim()) return;
    localStorage.setItem('tjr_api_key', modalInput.trim());
    setApiKey(modalInput.trim());
    setShowModal(false);
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handlePaste = async (e) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(i => i.type.startsWith('image/'));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    const base64 = await fileToBase64(file);
    setPendingImage(base64);
    setPendingImagePreview(URL.createObjectURL(file));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setPendingImage(base64);
    setPendingImagePreview(URL.createObjectURL(file));
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if ((!userText && !pendingImage) || isLoading) return;
    setInput('');

    const userContent = pendingImage
      ? [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: pendingImage } },
          { type: 'text', text: userText || "Analyze this chart using TJR's strategy. Where is price most likely to go and why?" },
        ]
      : userText;

    const userMsg = { role: 'user', content: userContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);
    setPendingImage(null);
    setPendingImagePreview(null);

    const conversationHistory = newMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: TJR_SYSTEM_PROMPT,
          messages: conversationHistory,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'API error');
      }

      const data = await response.json();
      const aiMsg = { role: 'assistant', content: data.content[0].text };
      setMessages([...newMessages, aiMsg]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `Error: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <div className="app" onPaste={handlePaste}>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-logo">TJR</div>
            <h2>Enter API Key</h2>
            <p>Paste your Anthropic API key to start analyzing trades.</p>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
              autoFocus
            />
            <button onClick={saveApiKey}>Activate TJR Brain</button>
          </div>
        </div>
      )}

      <header className="header">
        <div className="logo">TJR</div>
        <span className="header-title">Trading Brain</span>
        {messages.length > 0 && (
          <button className="clear-btn" onClick={clearChat}>
            Clear
          </button>
        )}
      </header>

      <main className="chat">
        {messages.length === 0 && !isLoading ? (
          <div className="empty-state">
            <div className="empty-logo">TJR</div>
            <p className="empty-tagline">ICT Price Action Analyzer</p>
            <div className="quick-prompts">
              {QUICK_PROMPTS.map((q, i) => (
                <button key={i} className="quick-btn" onClick={() => sendMessage(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg msg--${m.role}`}>
                <div className="msg-label">{m.role === 'user' ? 'YOU' : 'TJR BRAIN'}</div>
                <div className="msg-text">
                  {Array.isArray(m.content)
                    ? m.content.map((block, j) =>
                        block.type === 'text' ? <span key={j}>{block.text}</span> :
                        block.type === 'image' ? <img key={j} src={`data:image/png;base64,${block.source.data}`} alt="chart" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8, display: 'block' }} /> : null
                      )
                    : m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="msg msg--assistant">
                <div className="msg-label">TJR BRAIN</div>
                <div className="typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <footer className="input-bar">
        {pendingImagePreview && (
          <div className="image-preview">
            <img src={pendingImagePreview} alt="chart" />
            <button className="remove-img" onClick={() => { setPendingImage(null); setPendingImagePreview(null); }}>✕</button>
          </div>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your setup — or paste/upload a chart image..."
          rows={1}
          disabled={isLoading}
        />
        <label className="upload-btn" title="Upload chart image">
          📎
          <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
        <button
          className="send-btn"
          onClick={() => sendMessage()}
          disabled={isLoading || (!input.trim() && !pendingImage)}
        >
          Send
        </button>
      </footer>
    </div>
  );
}

export default App;

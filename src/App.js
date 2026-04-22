import { useState, useEffect, useRef } from 'react';
import './App.css';
import PriceVisual from './PriceVisual';

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
- Never overcomplicate

When analyzing charts, end your response with a JSON block like this:
\`\`\`json
{
  "direction": "bullish or bearish",
  "currentPrice": 0,
  "target": 0,
  "stopLoss": 0,
  "confidence": "HIGH or MEDIUM or LOW",
  "reason": "one sentence explanation",
  "conditions": [
    { "label": "Daily Bias Confirmed (4H + 1H)", "met": true },
    { "label": "Liquidity Sweep Identified", "met": true },
    { "label": "Order Block or FVG Present", "met": false },
    { "label": "R:R Minimum 1:2", "met": false }
  ]
}
\`\`\``;

const QUICK_PROMPTS = [
  'How do I identify a valid order block?',
  'Explain Fair Value Gap entry technique',
  'How do I confirm daily bias on 4H?',
  'What makes a liquidity sweep valid?',
  'Walk me through a full ICT trade checklist',
];

const CHART_SLOTS = [
  { key: 'h4', label: '4H Chart' },
  { key: 'h1', label: '1H Chart' },
  { key: 'm5', label: '5min Chart' },
];

const extractVisual = (text) => {
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
};

const cleanText = (text) => text.replace(/```json\n[\s\S]*?\n```/, '').trim();

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('tjr_api_key') || '');
  const [showModal, setShowModal] = useState(() => !localStorage.getItem('tjr_api_key'));
  const [modalInput, setModalInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [charts, setCharts] = useState({ h4: null, h1: null, m5: null });
  const [chartPreviews, setChartPreviews] = useState({ h4: null, h1: null, m5: null });
  const [activeSlot, setActiveSlot] = useState(null);
  const [time, setTime] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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
    if (!activeSlot) return;
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(i => i.type.startsWith('image/'));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    const base64 = await fileToBase64(file);
    setCharts(prev => ({ ...prev, [activeSlot]: base64 }));
    setChartPreviews(prev => ({ ...prev, [activeSlot]: URL.createObjectURL(file) }));
    setActiveSlot(null);
  };

  const handleFileUpload = async (e, slot) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setCharts(prev => ({ ...prev, [slot]: base64 }));
    setChartPreviews(prev => ({ ...prev, [slot]: URL.createObjectURL(file) }));
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    const hasCharts = Object.values(charts).some(v => v);
    if ((!userText && !hasCharts) || isLoading) return;
    setInput('');

    const imageBlocks = Object.entries(charts)
      .filter(([, b64]) => b64)
      .map(([, b64]) => ({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: b64 },
      }));

    const defaultAnalysis = 'Run TJR full checklist on all 3 timeframes. Give TAKE TRADE or SKIP verdict with confidence level. Describe where price is likely to go and why. End with a JSON block as instructed in the system prompt.';
    const labelBlock = {
      type: 'text',
      text: 'Chart order: 4H first, 1H second, 5min third. ' + (userText || defaultAnalysis),
    };

    const userContent = imageBlocks.length > 0 ? [...imageBlocks, labelBlock] : userText;
    const userMsg = { role: 'user', content: userContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);
    setCharts({ h4: null, h1: null, m5: null });
    setChartPreviews({ h4: null, h1: null, m5: null });

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
          max_tokens: 1500,
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
        <span className="live-clock">{time} EST</span>
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
                    : cleanText(m.content)}
                </div>
                {m.role === 'assistant' && (() => {
                  const visual = extractVisual(typeof m.content === 'string' ? m.content : '');
                  return visual ? <PriceVisual data={visual} /> : null;
                })()}
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
        <div className="chart-slots">
          {CHART_SLOTS.map(({ key, label }) => (
            <div
              key={key}
              className={`chart-slot${activeSlot === key ? ' active' : ''}${chartPreviews[key] ? ' filled' : ''}`}
              onClick={() => setActiveSlot(activeSlot === key ? null : key)}
            >
              {chartPreviews[key] ? (
                <>
                  <img src={chartPreviews[key]} alt={label} />
                  <button className="remove-img" onClick={(e) => {
                    e.stopPropagation();
                    setCharts(prev => ({ ...prev, [key]: null }));
                    setChartPreviews(prev => ({ ...prev, [key]: null }));
                  }}>✕</button>
                  <span className="slot-label">{label}</span>
                </>
              ) : (
                <>
                  <span className="slot-icon">📊</span>
                  <span className="slot-label">{label}</span>
                  <span className="slot-hint">{activeSlot === key ? 'Ctrl+V to paste' : 'Click to select'}</span>
                </>
              )}
              <label className="slot-upload">
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, key)} style={{ display: 'none' }} />
              </label>
            </div>
          ))}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add context — asset, session, notes... (optional if charts attached)"
          rows={1}
          disabled={isLoading}
        />
        <button
          className="send-btn"
          onClick={() => sendMessage()}
          disabled={isLoading || (Object.values(charts).every(v => !v) && !input.trim())}
        >
          Send
        </button>
      </footer>
    </div>
  );
}

export default App;

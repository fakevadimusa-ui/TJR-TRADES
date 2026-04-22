import React from 'react';

export default function PriceVisual({ data }) {
  const { direction, currentPrice, target, stopLoss, confidence, reason } = data;
  const isBull = direction === 'bullish';
  const color = isBull ? '#00ff88' : '#ff4466';
  const arrow = isBull ? '▲' : '▼';
  const priceDiff = Math.abs(target - currentPrice).toFixed(2);
  const slDiff = Math.abs(currentPrice - stopLoss).toFixed(2);
  const rr = slDiff > 0 ? (priceDiff / slDiff).toFixed(1) : '?';

  return (
    <div style={{
      background: '#0d1117',
      border: `1px solid ${color}`,
      borderRadius: 12,
      padding: '20px 24px',
      margin: '12px 0',
      fontFamily: "'Space Mono', monospace",
      maxWidth: 420,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 28, color }}>{arrow}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color, textTransform: 'uppercase' }}>{direction}</span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, padding: '3px 10px',
          background: color + '22', color, borderRadius: 20, border: `1px solid ${color}`
        }}>{confidence}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8b949e' }}>Current</span>
          <span style={{ color: '#e6edf3' }}>{currentPrice}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8b949e' }}>Target</span>
          <span style={{ color }}>{target} <span style={{ color: '#8b949e' }}>(+{priceDiff})</span></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8b949e' }}>Stop Loss</span>
          <span style={{ color: '#ff4466' }}>{stopLoss} <span style={{ color: '#8b949e' }}>(-{slDiff})</span></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #21262d', paddingTop: 8 }}>
          <span style={{ color: '#8b949e' }}>R:R Ratio</span>
          <span style={{ color: '#e6edf3' }}>1 : {rr}</span>
        </div>
      </div>

      <div style={{
        marginTop: 14, padding: '10px 14px',
        background: '#161b22', borderRadius: 8,
        fontSize: 12, color: '#8b949e', lineHeight: 1.6
      }}>
        {reason}
      </div>

      <div style={{ marginTop: 14, position: 'relative', height: 80, background: '#161b22', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: '30%', top: '50%', transform: 'translateY(-50%)',
          width: '40%', height: 3, background: color,
          clipPath: isBull ? 'polygon(0 100%, 85% 100%, 85% 0, 100% 50%, 85% 100%)' : undefined
        }} />
        {isBull ? (
          <div style={{
            position: 'absolute', left: '30%', bottom: '20%',
            width: '40%', height: 2, background: '#ff4466', opacity: 0.5
          }} />
        ) : (
          <div style={{
            position: 'absolute', left: '30%', top: '20%',
            width: '40%', height: 2, background: '#ff4466', opacity: 0.5
          }} />
        )}
        <span style={{ position: 'absolute', left: '10%', top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#8b949e' }}>NOW</span>
        <span style={{ position: 'absolute', right: '8%', top: isBull ? '20%' : '65%', fontSize: 10, color }}>{arrow} TARGET</span>
        <span style={{ position: 'absolute', right: '8%', top: isBull ? '65%' : '20%', fontSize: 10, color: '#ff4466' }}>✕ SL</span>
      </div>
    </div>
  );
}

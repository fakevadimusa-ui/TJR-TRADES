import React from 'react';

export default function PriceVisual({ data, accountSize = 25000 }) {
  if (!data || !data.direction) return null;
  const { currentPrice = 0, target = 0, stopLoss = 0, reason = '', conditions } = data;
  const direction = (data.direction || '').toLowerCase();
  const confidence = (data.confidence || 'LOW').toUpperCase();
  const isBull = direction === 'bullish';
  const accent = isBull ? '#00d4aa' : '#ff4757';
  const arrow = isBull ? '▲' : '▼';
  const priceDiff = (target - currentPrice).toFixed(2);
  const slDiff = (currentPrice - stopLoss).toFixed(2);
  const rr = Math.abs(slDiff) > 0 ? (Math.abs(priceDiff) / Math.abs(slDiff)).toFixed(2) : '?';
  const rrNum = parseFloat(rr);
  const rrColor = rrNum >= 2 ? '#00d4aa' : rrNum >= 1 ? '#ffa502' : '#ff4757';

  const riskAmount = accountSize * 0.01;
  const slDistance = Math.abs(currentPrice - stopLoss);
  const contractsEstimate = slDistance > 0 ? Math.floor(riskAmount / slDistance) : 0;
  const entryPrice = data.entryTrigger || currentPrice;
  const dollarProfit = (Math.abs(target - entryPrice) * contractsEstimate).toFixed(2);
  const dollarLoss = (slDistance * contractsEstimate).toFixed(2);

  const checklist = conditions || [
    { label: 'Daily Bias Confirmed (4H + 1H)', met: true },
    { label: 'Liquidity Sweep Identified', met: true },
    { label: 'Order Block or FVG Present', met: true },
    { label: 'R:R Minimum 1:2', met: rrNum >= 2 },
  ];

  const candles = isBull
    ? [
        { o: 60, c: 45, h: 62, l: 43, bear: true },
        { o: 45, c: 40, h: 47, l: 38, bear: true },
        { o: 40, c: 42, h: 50, l: 38, bear: false },
        { o: 42, c: 55, h: 57, l: 41, bear: false },
        { o: 55, c: 65, h: 67, l: 54, bear: false },
        { o: 65, c: 72, h: 74, l: 64, bear: false },
      ]
    : [
        { o: 40, c: 55, h: 57, l: 38, bear: false },
        { o: 55, c: 65, h: 67, l: 54, bear: false },
        { o: 65, c: 60, h: 68, l: 58, bear: true },
        { o: 60, c: 50, h: 62, l: 48, bear: true },
        { o: 50, c: 42, h: 52, l: 40, bear: true },
        { o: 42, c: 35, h: 44, l: 33, bear: true },
      ];

  const svgH = 100;
  const svgW = 200;
  const candleW = 18;
  const gap = 14;

  return (
    <div style={{
      background: '#0d1117',
      border: `1px solid ${accent}33`,
      borderRadius: 10,
      overflow: 'hidden',
      maxWidth: 480,
      margin: '12px 0',
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>

      {/* Header bar */}
      <div style={{
        background: accent + '15',
        borderBottom: `1px solid ${accent}33`,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, color: accent }}>{arrow}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: accent, letterSpacing: 1, fontFamily: "'IBM Plex Mono', monospace" }}>
            {direction.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
        <span style={{
          fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          padding: '3px 10px',
          border: `1px solid ${
            confidence === 'HIGH' ? '#00d4aa' :
            confidence === 'MEDIUM' ? '#ffa502' : '#ff4757'
          }`,
          color: confidence === 'HIGH' ? '#00d4aa' :
            confidence === 'MEDIUM' ? '#ffa502' : '#ff4757',
          borderRadius: 3,
          letterSpacing: 1,
        }}>{confidence} CONFIDENCE</span>
      </div>

      <div style={{ display: 'flex', gap: 0 }}>

        {/* Left: price data */}
        <div style={{ flex: 1, padding: '14px 16px', borderRight: '1px solid #21262d' }}>

          {[
            { label: 'ENTRY', value: currentPrice, color: '#e6edf3' },
            { label: 'TARGET', value: target, color: accent, sub: `${isBull ? '+' : ''}${priceDiff}` },
            { label: 'STOP', value: stopLoss, color: '#ff4757', sub: `${slDiff}` },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: '#8b949e', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1 }}>{label}</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color, fontFamily: "'IBM Plex Mono', monospace" }}>{value}</span>
                {sub && <span style={{ fontSize: 10, color: '#8b949e', marginLeft: 6, fontFamily: "'IBM Plex Mono', monospace" }}>{sub}</span>}
              </div>
            </div>
          ))}

          <div style={{ borderTop: '1px solid #21262d', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#8b949e', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1 }}>R:R RATIO</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: rrColor, fontFamily: "'IBM Plex Mono', monospace" }}>1 : {rr}</span>
          </div>

          {rrNum < 2 && (
            <div style={{ marginTop: 8, padding: '6px 10px', background: '#ffa50215', border: '1px solid #ffa50233', borderRadius: 4, fontSize: 11, color: '#ffa502' }}>
              ⚠ R:R below 1:2 — TJR would wait for better entry
            </div>
          )}

          {/* Profit Calculator */}
          <div style={{ borderTop: '1px solid #21262d', marginTop: 10, paddingTop: 10 }}>
            <div style={{ fontSize: 10, color: '#8b949e', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1, marginBottom: 8 }}>
              PROFIT CALC — ${accountSize.toLocaleString()} ACCOUNT
            </div>
            {[
              { label: '1% RISK', value: '$' + riskAmount.toLocaleString() },
              { label: 'EST PROFIT', value: '$' + Number(dollarProfit).toLocaleString(), color: accent },
              { label: 'MAX LOSS', value: '$' + Number(dollarLoss).toLocaleString(), color: '#ff4757' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#8b949e', fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: color || '#e6edf3', fontFamily: "'IBM Plex Mono', monospace" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: mini candlestick chart */}
        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: '#8b949e', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1 }}>PRICE ACTION</span>
          <svg width={svgW} height={svgH} style={{ overflow: 'visible' }}>
            <line x1={0} y1={isBull ? 8 : 92} x2={svgW} y2={isBull ? 8 : 92}
              stroke={accent} strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
            <line x1={0} y1={isBull ? 92 : 8} x2={svgW} y2={isBull ? 92 : 8}
              stroke="#ff4757" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />

            {candles.map((c, i) => {
              const x = 10 + i * (candleW + gap);
              const scaleY = (v) => svgH - (v / 100) * svgH;
              const top = scaleY(Math.max(c.o, c.c));
              const bot = scaleY(Math.min(c.o, c.c));
              const bodyH = Math.max(bot - top, 2);
              const clr = c.bear ? '#ff4757' : '#00d4aa';
              return (
                <g key={i}>
                  <line x1={x + candleW / 2} y1={scaleY(c.h)} x2={x + candleW / 2} y2={scaleY(c.l)} stroke={clr} strokeWidth={1.5} />
                  <rect x={x} y={top} width={candleW} height={bodyH} fill={clr} rx={1} opacity={0.9} />
                </g>
              );
            })}

            {isBull ? (
              <polygon points={`${svgW - 12},20 ${svgW - 4},20 ${svgW - 8},10`} fill={accent} />
            ) : (
              <polygon points={`${svgW - 12},80 ${svgW - 4},80 ${svgW - 8},90`} fill="#ff4757" />
            )}

            <text x={2} y={isBull ? 7 : 97} fontSize={8} fill={accent} fontFamily="IBM Plex Mono">T</text>
            <text x={2} y={isBull ? 97 : 7} fontSize={8} fill="#ff4757" fontFamily="IBM Plex Mono">SL</text>
          </svg>
        </div>
      </div>

      {/* Checklist */}
      <div style={{ borderTop: '1px solid #21262d', padding: '12px 16px' }}>
        <div style={{ fontSize: 10, color: '#8b949e', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1, marginBottom: 8 }}>TJR CHECKLIST</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {checklist.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 16, height: 16, borderRadius: 3,
                background: item.met ? '#00d4aa22' : '#ff475722',
                border: `1px solid ${item.met ? '#00d4aa' : '#ff4757'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 10, color: item.met ? '#00d4aa' : '#ff4757' }}>
                  {item.met ? '✓' : '✗'}
                </span>
              </div>
              <span style={{ fontSize: 12, color: item.met ? '#e6edf3' : '#8b949e' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trade Plan */}
      {(data.entryTrigger || data.invalidation || data.checkBackIn) && (
        <div style={{ borderTop: '1px solid #21262d', padding: '12px 16px' }}>
          <div style={{ fontSize: 10, color: '#8b949e', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1, marginBottom: 10 }}>TRADE PLAN</div>
          {[
            { label: '⏳ WAIT FOR PRICE TO HIT', value: data.entryTrigger, color: '#ffa502' },
            { label: '✕ INVALIDATED IF PRICE HITS', value: data.invalidation, color: '#ff4757' },
            { label: '🕐 CHECK BACK', value: data.checkBackIn, color: '#8b949e', isText: true },
          ].filter(({ value }) => value !== undefined && value !== null && value !== 0).map(({ label, value, color, isText }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#8b949e' }}>{label}</span>
              <span style={{ fontSize: isText ? 11 : 14, fontWeight: 600, color, fontFamily: "'IBM Plex Mono', monospace" }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reason */}
      <div style={{
        borderTop: '1px solid #21262d',
        padding: '10px 16px',
        fontSize: 12,
        color: '#8b949e',
        lineHeight: 1.6,
        fontStyle: 'italic',
      }}>
        {reason}
      </div>
    </div>
  );
}

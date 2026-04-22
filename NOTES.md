# TJR Trading Brain — Project Notes

React web app — AI-powered trade analyzer trained on TJR's ICT price action strategy.

## Stack
- React (Create React App, react-scripts 5)
- Plain CSS — no component library
- Anthropic API via direct browser fetch (`anthropic-dangerous-direct-browser-access: true`)
- Model: `claude-sonnet-4-20250514`, max_tokens: 1500
- Fonts: IBM Plex Mono + IBM Plex Sans (Google Fonts)

## Key Files
| File | Purpose |
|------|---------|
| `src/App.js` | Main app — all state, API call, chat UI, follow-up mode |
| `src/App.css` | Bloomberg terminal dark aesthetic, CSS vars |
| `src/PriceVisual.js` | Trade analysis card component |

## CSS Variables
```
--bg: #080a0e      --bg2: #0d1117     --bg3: #161b22
--accent: #00d4aa  --accent2: #00b894
--red: #ff4757     --yellow: #ffa502
--font-mono: IBM Plex Mono
--font-body: IBM Plex Sans
```

## Features
1. **API key modal** — stored in localStorage as `tjr_api_key`
2. **Chat interface** — messages, typing indicator, auto-scroll, Enter to send
3. **5 quick-prompt buttons** on empty state
4. **Live clock** in header (HH:MM:SS EST) + clear chat button
5. **3-chart image slots** — 4H / 1H / 5min
   - Click slot to activate → Ctrl+V paste OR file picker upload
   - All 3 images sent as base64 vision blocks to Claude
6. **PriceVisual card** — renders after every chart analysis:
   - Direction (▲ BULLISH / ▼ BEARISH) + confidence badge (HIGH/MEDIUM/LOW color-coded)
   - Price table: ENTRY / TARGET / STOP with diffs
   - R:R ratio (green ≥2, amber ≥1, red <1) + warning if below 1:2
   - Profit calculator: 1% risk, est profit, max loss ($25K account)
   - SVG candlestick mini-chart with direction arrow + dashed target/SL lines
   - TJR checklist: 4 conditions with ✓/✗
   - TRADE PLAN: entry trigger (amber), invalidation (red), check-back time
7. **Follow-up mode** — `📍 Check Up On Trade Plan` button after any chart analysis
   - Sends original plan JSON + new 5min chart
   - Asks Claude: ENTER / WAIT / EXIT?
   - Auto-resets after response

## System Prompt (TJR_SYSTEM_PROMPT)
- 4-step checklist: daily bias → liquidity sweep → OB/FVG confirmation → verdict
- Always outputs WAIT FOR / CHECK BACK / INVALIDATION in trade plan
- Ends every chart analysis with a JSON block:
```json
{
  "direction": "bullish|bearish",
  "currentPrice": 0,
  "target": 0,
  "stopLoss": 0,
  "entryTrigger": 0,
  "invalidation": 0,
  "checkBackIn": "2-4 hours",
  "confidence": "HIGH|MEDIUM|LOW",
  "reason": "one sentence",
  "conditions": [
    { "label": "Daily Bias Confirmed (4H + 1H)", "met": true },
    { "label": "Liquidity Sweep Identified", "met": true },
    { "label": "Order Block or FVG Present", "met": false },
    { "label": "R:R Minimum 1:2", "met": false }
  ]
}
```

## Resuming Development
- `cd C:\Users\Vu1025070\TJR-TRADES`
- `npm start` → http://localhost:3000
- Enter Anthropic API key in the modal on first launch

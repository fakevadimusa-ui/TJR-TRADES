require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const twilio = require('twilio');

const app = express();
app.use(express.json());

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const TJR_SYSTEM_PROMPT = `You are the TJR Trading Brain. Analyze price data using TJR's ICT strategy.

TJR CHECKLIST:
1. DAILY BIAS — Is price making lower highs/lower lows (bearish) or higher highs/higher lows (bullish)?
2. LIQUIDITY — Has price recently swept above a high or below a low?
3. CONFIRMATION — Is there an order block or fair value gap present?
4. R:R — Is there at least 1:2 risk to reward available?

Respond ONLY with valid JSON, no other text:
{
  "setupFound": true or false,
  "direction": "bullish or bearish",
  "confidence": "HIGH or MEDIUM or LOW",
  "entryTrigger": 0,
  "target": 0,
  "stopLoss": 0,
  "rr": "1:2",
  "reason": "one sentence max"
}

Only set setupFound to true if ALL checklist items are met and confidence is MEDIUM or HIGH.`;

// Fetch OHLC candles from Polygon
async function getCandles(ticker, timespan, limit) {
  try {
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/${timespan}/${from}/${to}?adjusted=true&sort=desc&limit=${limit}&apiKey=${process.env.POLYGON_API_KEY}`;
    const res = await axios.get(url);
    return res.data.results || [];
  } catch (err) {
    console.error(`Error fetching ${ticker}:`, err.message);
    return [];
  }
}

// Analyze with Claude
async function analyzeWithTJR(symbol, candles4h, candles1h, candles5m) {
  try {
    const prompt = `Analyze ${symbol} futures using these recent candles:

4H CANDLES (last 10, newest first):
${candles4h.slice(0, 10).map(c => `O:${c.o} H:${c.h} L:${c.l} C:${c.c}`).join('\n')}

1H CANDLES (last 10, newest first):
${candles1h.slice(0, 10).map(c => `O:${c.o} H:${c.h} L:${c.l} C:${c.c}`).join('\n')}

5MIN CANDLES (last 10, newest first):
${candles5m.slice(0, 10).map(c => `O:${c.o} H:${c.h} L:${c.l} C:${c.c}`).join('\n')}

Run the full TJR checklist and respond with JSON only.`;

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: TJR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });

    const text = response.data.content[0].text.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Claude analysis error:', err.message);
    return null;
  }
}

// Send text alert
async function sendAlert(symbol, analysis) {
  const msg = `TJR BRAIN ALERT
${symbol} — ${analysis.direction.toUpperCase()} ${analysis.confidence} CONFIDENCE

Entry: ${analysis.entryTrigger}
Target: ${analysis.target}
Stop: ${analysis.stopLoss}
R:R: ${analysis.rr}

${analysis.reason}

Check TJR Brain app now.`;

  try {
    await twilioClient.messages.create({
      body: msg,
      from: process.env.TWILIO_FROM,
      to: process.env.TWILIO_TO
    });
    console.log(`Alert sent for ${symbol}`);
  } catch (err) {
    console.error('Twilio error:', err.message);
  }
}

// Check if market is open (9:30AM - 4PM EST Mon-Fri)
function isMarketOpen() {
  const now = new Date();
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = est.getDay();
  const hour = est.getHours();
  const min = est.getMinutes();
  const time = hour * 60 + min;
  if (day === 0 || day === 6) return false;
  return time >= 570 && time <= 960; // 9:30AM to 4:00PM
}

// Main scan function
async function runScan() {
  if (!isMarketOpen()) {
    console.log('Market closed — skipping scan');
    return;
  }

  console.log(`\nScanning ES and NQ — ${new Date().toLocaleTimeString()}`);

  const instruments = [
    { symbol: 'ES', ticker: 'I:SPX' },
    { symbol: 'NQ', ticker: 'I:NDX' }
  ];

  for (const inst of instruments) {
    const [c4h, c1h, c5m] = await Promise.all([
      getCandles(inst.ticker, 'hour', 40),
      getCandles(inst.ticker, 'hour', 20),
      getCandles(inst.ticker, 'minute', 30)
    ]);

    if (!c4h.length) {
      console.log(`No data for ${inst.symbol}`);
      continue;
    }

    const analysis = await analyzeWithTJR(inst.symbol, c4h, c1h, c5m);
    if (!analysis) continue;

    console.log(`${inst.symbol}: setupFound=${analysis.setupFound} confidence=${analysis.confidence}`);

    if (analysis.setupFound && analysis.confidence !== 'LOW') {
      await sendAlert(inst.symbol, analysis);
    }
  }
}

// Run every 15 minutes
cron.schedule('*/15 * * * *', runScan);

// Manual trigger endpoint for testing
app.get('/scan', async (req, res) => {
  await runScan();
  res.json({ message: 'Scan complete' });
});

app.get('/health', (req, res) => res.json({ status: 'running', time: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`TJR Auto-Scanner running on port ${PORT}`);
  console.log('Scanning ES + NQ every 15min during market hours');
  runScan(); // Run immediately on start
});

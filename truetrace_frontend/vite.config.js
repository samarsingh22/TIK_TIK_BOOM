import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function geminiDevProxyPlugin(geminiApiKey = '') {
  const route = '/api/gemini-chat'

  const handler = async (req, res) => {
    if (req.url !== route) return false
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return true
    }

    const apiKey = String(geminiApiKey || '').trim()
    if (!apiKey) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Gemini API key missing on server. Set GEMINI_API_KEY.' }))
      return true
    }

    try {
      const raw = await readRawBody(req)
      const parsed = raw ? JSON.parse(raw) : {}
      const messages = Array.isArray(parsed.messages) ? parsed.messages : []
      const userInput = String(parsed.userInput || '').trim()

      if (!userInput) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'userInput is required.' }))
        return true
      }

      const payload = {
        systemInstruction: {
          parts: [
            {
              text: 'You are True Trace AI assistant. Help users summarize content, explain platform analytics, trust score, anomalies, regulator actions, and supply-chain traceability in concise clear language.',
            },
          ],
        },
        contents: [
          ...messages.filter((m) => m && (m.role === 'user' || m.role === 'model') && Array.isArray(m.parts)).slice(-12),
          { role: 'user', parts: [{ text: userInput }] },
        ],
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
          maxOutputTokens: 700,
        },
      }

      const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!upstream.ok) {
        const upstreamError = await upstream.text().catch(() => '')
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: upstreamError || 'Gemini upstream request failed.' }))
        return true
      }

      const data = await upstream.json()
      const text = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('\n').trim()
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ text: text || 'Gemini returned an empty response.' }))
      return true
    } catch {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Failed to process Gemini proxy request.' }))
      return true
    }
  }

  return {
    name: 'truetrace-gemini-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await handler(req, res)
        if (!handled) next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await handler(req, res)
        if (!handled) next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const geminiApiKey = String(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim()

  return {
    plugins: [react(), geminiDevProxyPlugin(geminiApiKey)],
  }
})

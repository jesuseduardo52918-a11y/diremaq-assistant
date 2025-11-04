// api/ai_search.js
import fetch from 'node-fetch';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicialización de APIs
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export default async function handler(req, res) {
  try {
    // Leer query desde query param "q"
    const q = req.query.q?.trim();
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // Verificar que las variables de entorno existan
    const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
    const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
      console.error('Shopify credentials missing');
      return res.status(500).json({ error: 'Shopify credentials not configured' });
    }

    // 1️⃣ Buscar productos en Shopify
    const shopifyRes = await fetch(
      `https://${SHOPIFY_STORE_URL}/admin/api/2024-10/products.json?title=${encodeURIComponent(q)}`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    if (!shopifyRes.ok) {
      const errText = await shopifyRes.text();
      console.error('Shopify API Error:', errText);
      return res.status(shopifyRes.status).json({ error: `Error fetching data from Shopify: ${errText}` });
    }

    const data = await shopifyRes.json();
    const products = (data.products || []).map(p => ({
      title: p.title,
      sku: p.variants?.[0]?.sku || '',
      price: `$${p.variants?.[0]?.price || '0.00'}`,
      image: p.image?.src || '',
      url: `https://${SHOPIFY_STORE_URL}/products/${p.handle}`
    }));

    // 2️⃣ Generar resumen técnico con Google Gemini
    let techSummary = '';
    if (process.env.GOOGLE_API_KEY) {
      try {
        const model = gemini.getGenerativeModel({ model: "gemini-pro" });
        const googleResp = await model.generateContent(
          `Busca en manuales, fichas técnicas o Google información sobre: ${q}. Devuelve un resumen breve y técnico en español.`
        );
        techSummary = googleResp.response.text();
      } catch (err) {
        console.warn('Error Gemini:', err.message);
      }
    }

    // 3️⃣ Generar respuesta con OpenAI
    let answer = '';
    if (process.env.OPENAI_API_KEY) {
      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Eres un asistente técnico experto en refacciones Diremaq." },
            { role: "user", content: `Consulta: ${q}\nResumen técnico: ${techSummary}\nProductos encontrados: ${products.map(p=>p.title).join(', ')}` }
          ]
        });
        answer = aiResp.choices[0].message.content;
      } catch (err) {
        console.warn('Error OpenAI:', err.message);
        answer = techSummary || 'No se pudo generar respuesta AI.';
      }
    }

    res.status(200).json({
      answer,
      results: products,
      found: products.length > 0
    });

  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Error interno del asistente', results: [], found: false });
  }
}

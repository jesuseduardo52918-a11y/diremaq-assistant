import fetch from 'node-fetch';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from "@google/generative-ai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export default async function handler(req, res) {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });

    // 1️⃣ Buscar productos en Shopify
    const shopifyRes = await fetch(
      `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-10/products.json?title=${encodeURIComponent(q)}`,
      {
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );
    const shopifyData = await shopifyRes.json();

    const products = (shopifyData.products || []).map(p => ({
      title: p.title,
      sku: p.variants?.[0]?.sku || '',
      price: `$${p.variants?.[0]?.price || '0.00'}`,
      image: p.image?.src || '',
      url: `https://${process.env.SHOPIFY_STORE_URL}/products/${p.handle}`
    }));

    // 2️⃣ Generar resumen técnico con Gemini (Google)
    let techSummary = '';
    try {
      const model = gemini.getGenerativeModel({ model: "chat-bison" }); // modelo disponible
      const googleResp = await model.generateContent(
        `Consulta: ${q}\nResume la información técnica relevante en español de forma breve.`
      );
      techSummary = googleResp.response?.text || '';
    } catch (err) {
      console.warn("Error Gemini:", err.message);
      techSummary = 'No se pudo generar resumen técnico (Gemini).';
    }

    // 3️⃣ Generar respuesta AI con OpenAI
    let aiAnswer = '';
    try {
      const aiResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un asistente técnico experto en refacciones Diremaq." },
          { role: "user", content: `Consulta: ${q}\nResumen técnico: ${techSummary}\nProductos encontrados: ${products.map(p=>p.title).join(', ')}` }
        ]
      });
      aiAnswer = aiResp.choices[0].message.content;
    } catch (err) {
      console.warn("Error OpenAI:", err.message);
      aiAnswer = 'No se pudo generar respuesta AI (OpenAI).';
    }

    res.status(200).json({
      answer: aiAnswer,
      results: products,
      found: !!products.length
    });

  } catch (err) {
    console.error("Error general:", err);
    res.status(500).json({ answer: "Error interno del asistente.", results: [], found: false });
  }
}

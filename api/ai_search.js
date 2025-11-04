import fetch from 'node-fetch';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from "@google/generative-ai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export default async function handler(req, res) {
  try {
    // Leer la consulta del cuerpo del request
    const { query } = await req.json();

    // 1️⃣ Buscar productos en Shopify
    const shopifyRes = await fetch(
      `https://${process.env.SHOPIFY_STORE}/admin/api/2024-10/products.json?title=${encodeURIComponent(query)}`,
      {
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );
    const data = await shopifyRes.json();

    const products = (data.products || []).map(p => ({
      title: p.title,
      sku: p.variants?.[0]?.sku || '',
      price: `$${p.variants?.[0]?.price || '0.00'}`,
      image: p.image?.src || '',
      url: `https://${process.env.SHOPIFY_STORE}/products/${p.handle}`
    }));

    // 2️⃣ Consultar contexto técnico con Gemini (Google)
    const model = gemini.getGenerativeModel({ model: "gemini-pro" });
    const googleResp = await model.generateContent(
      `Busca en manuales, fichas técnicas o Google información sobre: ${query}. 
       Devuelve un resumen breve y técnico en español.`
    );
    const techSummary = googleResp.response.text();

    // 3️⃣ Combinar todo con OpenAI (GPT)
    const aiResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres un asistente técnico experto en refacciones Diremaq." },
        { role: "user", content: `Consulta: ${query}\nResumen técnico: ${techSummary}\nProductos encontrados: ${products.map(p=>p.title).join(', ')}` }
      ]
    });

    const answer = aiResp.choices[0].message.content;

    res.status(200).json({
      answer,
      results: products,
      found: !!products.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ answer: "Error interno del asistente.", results: [], found: false });
  }
}

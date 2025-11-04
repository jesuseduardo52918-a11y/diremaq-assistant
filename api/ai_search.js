// api/ai_search.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const q = req.query.q?.toLowerCase() || '';

    // Ejemplo simple de búsqueda simulada (puedes reemplazarlo luego con la API de Shopify)
    if (q.includes('580') || q.includes('case')) {
      return res.status(200).json({
        answer: 'He encontrado estas refacciones para Case 580N — revisa las opciones abajo:',
        results: [
          { title: 'Buje estabilizador RH - Case 580N', sku: '84421603', price: '$1,250.00', image: '' },
          { title: 'Buje estabilizador LH - Case 580N', sku: '84210937', price: '$1,250.00', image: '' },
        ],
        found: true
      });
    }

    // Si no encuentra coincidencias
    return res.status(200).json({
      answer: 'No encontré coincidencias exactas. ¿Puedes dar más detalles (año, medida o SKU)?',
      results: [],
      found: false
    });

  } catch (err) {
    console.error('Error en /api/ai_search:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

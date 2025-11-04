// /api/ai_search.js
import fetch from 'node-fetch';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

export default async function handler(req, res) {
  try {
    const q = req.query.q?.trim() || '';

    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Shopify credentials not configured' });
    }

    // GraphQL query para buscar productos por título o descripción
    const graphqlQuery = {
      query: `
        {
          products(first: 5, query: "${q}") {
            edges {
              node {
                id
                title
                description
                variants(first: 1) {
                  edges {
                    node {
                      sku
                      price
                    }
                  }
                }
                images(first: 1) {
                  edges {
                    node {
                      transformedSrc
                    }
                  }
                }
              }
            }
          }
        }
      `
    };

    // Llamada al Admin API de Shopify
    const response = await fetch(`${SHOPIFY_STORE_URL}/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      },
      body: JSON.stringify(graphqlQuery)
    });

    const data = await response.json();

    if (data.errors) {
      console.error('Error Shopify API:', data.errors);
      return res.status(500).json({ error: 'Error fetching data from Shopify' });
    }

    const products = data.data.products.edges.map(edge => {
      const node = edge.node;
      return {
        title: node.title,
        description: node.description,
        sku: node.variants.edges[0]?.node.sku || '',
        price: node.variants.edges[0]?.node.price || '',
        image: node.images.edges[0]?.node.transformedSrc || ''
      };
    });

    // Respuesta para tu chat embebido
    const answer = products.length
      ? `Encontré ${products.length} productos relacionados con "${q}".`
      : 'No encontré productos exactos. ¿Puedes dar más detalles?';

    res.status(200).json({ answer, results: products, found: products.length > 0 });

  } catch (err) {
    console.error('Error en /api/ai_search:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

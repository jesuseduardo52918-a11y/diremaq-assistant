// api/ai_search.js
import fetch from 'node-fetch';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

export default async function handler(req, res) {
  try {
    const q = req.query.q?.toLowerCase() || '';

    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Shopify credentials not configured' });
    }

    // GraphQL query para buscar productos por título y descripción
    const graphqlQuery = {
      query: `
        {
          products(first: 5, query: "${q}") {
            edges {
              node {
                id
                title
                description
                variants(first:1) {
                  edges {
                    node {
                      sku
                      price
                    }
                  }
                }
                images(first:1) {
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

    const response = await fetch(`${SHOPIFY_STORE_URL}/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify(graphqlQuery),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error Shopify API:', errorText);
      return res.status(500).json({ error: 'Error fetching data from Shopify' });
    }

    const data = await response.json();

    // Procesamos resultados para devolver solo lo necesario
    const results = data.data.products.edges.map(({ node }) => ({
      title: node.title,
      description: node.description,
      sku: node.variants.edges[0]?.node.sku || '',
      price: node.variants.edges[0]?.node.price || '',
      image: node.images.edges[0]?.node.transformedSrc || '',
    }));

    return res.status(200).json({
      answer: results.length
        ? `Encontré ${results.length} resultados para "${q}":`
        : 'No encontré resultados para tu búsqueda.',
      results,
      found: results.length > 0,
    });

  } catch (error) {
    console.error('Error en /api/ai_search:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

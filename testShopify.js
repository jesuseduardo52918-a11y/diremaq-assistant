import fetch from 'node-fetch';

const SHOPIFY_STORE_URL = 'https://mystore.myshopify.com'; // cambia aquí
const SHOPIFY_ACCESS_TOKEN = 'tu_token_privado'; // cambia aquí

async function testShopify() {
  const query = {
    query: `
      {
        products(first: 1) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `
  };

  try {
    const res = await fetch(`${SHOPIFY_STORE_URL}/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify(query),
    });

    const data = await res.json();
    console.log('Respuesta Shopify:', data);

  } catch (err) {
    console.error('Error fetch Shopify:', err);
  }
}

testShopify();

/**
 * Rule-based Neem Sourcing Assistant – answers common queries and guides users.
 */
(function () {
  const BOT_ID = 'neem-assistant';

  const rules = [
    {
      keywords: ['hello', 'hi', 'hey', 'start'],
      response: 'Hello! I\'m the Neem Sourcing Assistant. I can help you with availability, pricing, how to source neem, trust scores, seasonal tips, and using the platform. What would you like to know?'
    },
    {
      keywords: ['recommend', 'suggest', 'what should i buy', 'which product'],
      response: 'For most buyers, a balanced neem portfolio includes: (1) neem oil for formulations, (2) neem kernels or seeds for processing, and (3) neem cake or powder for soil applications. Use the Products page to filter by these categories, then sort by trust score and ask suppliers for current quality and moisture details.'
    },
    {
      keywords: ['help', 'what can you do', 'guide'],
      response: 'I can help you with:\n• **Finding neem** – Use the Products page to search and filter by category.\n• **Trust scores** – Shown on each supplier; higher means better responsiveness and history.\n• **Seasonal availability** – Check the seasonal tip on your dashboard and product list.\n• **Chat** – Message suppliers directly from a product page.\n• **Map** – View supplier locations under the Map page.\n• **Voice** – Use the microphone in chat to speak your request. What do you need?'
    },
    {
      keywords: ['availability', 'available', 'stock', 'quantity'],
      response: 'Availability is shown on each product page and in the supplier\'s listing. For the latest stock, message the supplier from the product detail page. Suppliers can update availability in "My products" → Edit → Availability.'
    },
    {
      keywords: ['price', 'pricing', 'cost', 'bulk', 'order'],
      response: 'Each product shows price per unit and minimum order quantity. For bulk or custom pricing, use the chat to ask the supplier directly. Quick prompt "Bulk price" in chat can start that conversation.'
    },
    {
      keywords: ['delivery', 'deliver', 'shipping', 'when can you'],
      response: 'Delivery terms are agreed with the supplier via chat. After you find a product, click "Message supplier" and ask about delivery timeline and options.'
    },
    {
      keywords: ['trust', 'trust score', 'rating', 'reliable'],
      response: 'Trust scores (0–100) are shown on products and the map. They reflect supplier responsiveness and transaction history. Prefer suppliers with higher scores for more reliable sourcing.'
    },
    {
      keywords: ['seasonal', 'season', 'when to buy', 'best time'],
      response: 'Neem availability varies by season. Check the "Seasonal tip" on your dashboard and on the Products page—they show month-wise guidance. Summer and monsoon often have higher availability for seeds and kernels.'
    },
    {
      keywords: ['how to source', 'how do i', 'find supplier', 'source neem'],
      response: 'To source neem: 1) Go to Products and search or filter. 2) Open a product and check trust score and availability. 3) Click "Message supplier" to chat. 4) Use the Map to see supplier locations and choose nearby options. 5) Use voice or quick prompts in chat for faster requests.'
    },
    {
      keywords: ['map', 'location', 'where', 'nearby'],
      response: 'The Map page shows all suppliers who have set their location. Use it to find nearby suppliers and reduce logistics cost. Suppliers set location in Dashboard → "Your location (for map)".'
    },
    {
      keywords: ['voice', 'speak', 'microphone'],
      response: 'In the chat window, use the microphone button next to the message box. Click it, allow the browser to use your mic, then speak your request. It will be converted to text so you can edit and send.'
    },
    {
      keywords: ['product', 'add product', 'list product'],
      response: 'Suppliers can add products from Dashboard → "Add product", or from the Products page when viewing "My products". Fill in name, category, unit, price, and min order. Then update availability in the product edit page.'
    },
    {
      keywords: ['thank', 'thanks', 'bye', 'goodbye'],
      response: 'You\'re welcome! Happy sourcing. Type "help" anytime for guidance.'
    }
  ];

  const defaultResponse = 'I\'m not sure about that. Try asking about availability, pricing, trust scores, seasonal tips, or how to source neem. Or type **help** for a full guide.';

  function getBotResponse(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') return defaultResponse;
    const text = userMessage.trim().toLowerCase();
    if (!text) return defaultResponse;
    for (const rule of rules) {
      const found = rule.keywords.some(kw => text.includes(kw));
      if (found) return rule.response;
    }
    return defaultResponse;
  }

  window.NeemChatbot = {
    BOT_ID,
    getResponse: getBotResponse
  };
})();

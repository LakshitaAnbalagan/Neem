# Neem Sourcing Platform

A consultancy solution for neem-based businesses to simplify and improve raw material sourcing. The platform connects shops (buyers) with suppliers, provides availability listings, real-time chat, location visibility, supplier trust scores, seasonal availability intelligence, and voice-based sourcing requests.

## Features

- **Product availability** – Browse and search neem products; filter by category and supplier
- **Buyer–supplier chat** – Real-time messaging via Socket.IO with optional voice input
- **Neem Assistant (chatbot with RAG)** – AI-powered (Groq, free tier) with RAG (Retrieval-Augmented Generation): retrieves real products, suppliers, availability, and trust scores from your database to provide accurate, context-aware answers. Falls back to rule-based when Groq API key is not set. Click "Neem Assistant" in Chat for guidance.
- **Smart search** – On Products, enable "Smart search (AI)" to interpret natural language (e.g. "oil for pesticide") into neem product search terms
- **AI seasonal tips** – Shop and supplier dashboards show an AI-generated seasonal tip when Groq is configured
- **Product suggest** – Suppliers can use "Suggest with AI" when adding or editing a product to get suggested category and description
- **Supplier map** – Interactive map (Leaflet/OpenStreetMap): view supplier locations, click list to focus marker and open popup, "Message supplier" from list or popup
- **Trust score** – Supplier trust badges (based on responsiveness and transaction history)
- **Seasonal intelligence** – Month-wise sourcing tips on dashboards and product search
- **Voice requests** – Shop owners can use microphone to speak requirements (browser Speech API)
- **Role-based access** – Separate flows for Shop (buyer) and Supplier

## Tech Stack

- **Frontend:** HTML5, CSS3, Bootstrap 5, vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Real-time:** Socket.IO
- **Map:** Leaflet with OpenStreetMap (no API key required)

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

## Setup

1. **Clone and install**

   ```bash
   cd "Neem Sourcing"
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and adjust if needed:

   ```env
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/neem-sourcing
   JWT_SECRET=your-secret-key

   # Optional: Groq API key (free at https://console.groq.com) for AI-powered Neem Assistant.
   # If omitted, the assistant uses built-in rule-based replies.
   GROQ_API_KEY=your-groq-api-key
   ```

3. **Run**

   ```bash
   npm start
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Usage

> **Domain restriction:** This platform is intentionally limited to **neem and neem-derived products only** – for example neem oil, neem kernels, neem cake, neem leaves, neem powder, neem-based formulations, etc.

1. **Register** – Choose “Shop / Buyer” or “Supplier” and create an account.
2. **Shop** – Search neem products, view trust scores and seasonal tips, open product details, message suppliers, use map to see supplier locations. Use voice or quick prompts in chat.
3. **Supplier** – Add neem products only, set availability and price, update listings, reply to buyer chats. Add location (lat/lng) in profile for map visibility.

## Project Structure

```
├── config/         # DB connection
├── middleware/     # Auth, role checks
├── models/         # User, Product, Availability, Chat, TrustScore
├── routes/         # auth, products, chat, users
├── public/         # Frontend
│   ├── css/        # theme.css
│   ├── js/         # app.js, chat.js, voice.js, map.js
│   ├── index.html, login.html, register.html
│   ├── dashboard-shop.html, dashboard-supplier.html
│   ├── products.html, product-detail.html, product-edit.html
│   ├── chat.html, map.html
├── server.js
├── package.json
└── README.md
```

## API Overview

- `POST /api/auth/register` – Register (shop or supplier)
- `POST /api/auth/login` – Login
- `GET /api/auth/me` – Current user (auth required)
- `GET /api/products` – List products (query: q, category, supplierId, smart=1 for AI-interpreted search)
- `POST /api/products/suggest` – Suggest category and description for a product (supplier, body: name, description?)
- `GET /api/products/:id` – Product detail with availability and trust
- `POST /api/products` – Create product (supplier)
- `PATCH /api/products/:id` – Update product (supplier)
- `POST /api/products/:id/availability` – Set/update availability (supplier)
- `GET /api/chat/conversations` – List conversations (auth)
- `POST /api/chat/assistant` – Neem Assistant reply (auth, body: `{ "message": "..." }`)
- `GET /api/chat/:otherId/messages` – Messages with a user (auth)
- `GET /api/tips/seasonal` – AI seasonal tip (auth, query: role=shop|supplier)
- `GET /api/users/suppliers` – Suppliers with trust scores and coordinates (auth)

Chat messages are sent and received in real time via Socket.IO (event `chat:message`).

## Future Enhancements

- Mobile app
- AI-based demand prediction
- Supplier verification system
- Analytics dashboard for sourcing trends

## License

MIT.

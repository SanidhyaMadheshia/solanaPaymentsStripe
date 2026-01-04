# SolanaPay - Stripe for Solana

> **Accept Web3 payments without the Web3 complexity.**

SolanaPay is a Stripe-like payment infrastructure built for Solana. It empowers Web2 developers, e-commerce platforms, and website builders to accept blockchain-based payments through a familiar, API-driven workflow.

[Live Demo](https://solanapay.sanidhyamadeshia.me) | [Documentation](https://solanapay.sanidhyamadeshia.me/docs)

---

## 🚀 The Problem & Solution
Web3 payments are often complex to integrate, requiring deep knowledge of wallets, private keys, and blockchain mechanics. SolanaPay abstracts this away, offering a developer experience similar to Stripe.

**Target Users:**
*   **E-commerce platforms** looking to add crypto payment options.
*   **Web2 Developers** who want a simple API integration.
*   **SaaS Founders** needing a quick way to monetize via Solana.

## 🛠️ How It Works (Integration Flow)
The system is designed to seamlessly integrate with your existing backend.

1.  **Account Setup**: Create an account and obtain your API keys.
2.  **Product Management**: Define Products and Prices (e.g., "New Year Campaign", "Premium Plan") via the dashboard.
3.  **Database Mapping**: Store the generated `productId` and `priceId` in your own database.
4.  **Checkout API**: Expose a backend endpoint that calls our checkout service.
5.  **Hosted Checkout**: Receive a hosted checkout page URL and redirect your customer.
6.  **Payment**: The customer completes the payment using their Solana wallet.
7.  **Webhooks**: Receive real-time payment events (success/failed) via your configured webhook URL.

## 🏗️ Tech Stack

### Frontend
-   **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [Radix UI](https://www.radix-ui.com/)
-   **Solana Integration**: `@solana/wallet-adapter`

### Backend
-   **Runtime**: [Node.js](https://nodejs.org/)
-   **Framework**: [Express](https://expressjs.com/)
-   **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Prisma ORM](https://www.prisma.io/))
-   **Caching/Queues**: [Redis](https://redis.io/)
-   **Real-time**: [Socket.io](https://socket.io/)

## 🏁 Getting Started (Local Development)

The project is structured as a monorepo containing both frontend and backend.

### Prerequisites
-   Node.js (v18+)
-   PostgreSQL
-   Redis

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/solanaPaymentsStripe.git
cd solanaPaymentsStripe
```

### 2. Backend Setup
```bash
cd backend
npm install
```
*   Create a `.env` file in the `backend` directory (refer to `.env.example` if available).
*   Run database migrations:
    ```bash
    npm run prisma:migrate
    ```
*   Start the backend server:
    ```bash
    npm run dev
    ```

### 3. Frontend Setup
Open a new terminal.
```bash
cd frontend
npm install
```
*   Create a `.env` file in the `frontend` directory.
*   Start the frontend development server:
    ```bash
    npm run dev
    ```

## 🛣️ Roadmap
-   [x] **Solana Devnet Support**: Currently live and running.
-   [x] **Hosted Checkout Page**: Secure and user-friendly payment interface.
-   [x] **Webhook Events**: Real-time notifications for payment status.
-   [ ] **Mainnet Support**: Coming soon for real-world transactions.
-   [ ] **Analytics Dashboard**: Deeper insights into your revenue.

## 📜 License
This project is licensed under the ISC License.

---

> *Shipping this reinforced an important lesson: execution matters more than ideas.*







### todo :


1. make a Message queue and a server that completes the verification process as Devnet rate limits are : 

- Maximum number of requests per 10 seconds per IP: 100
- Maximum number of requests per 10 seconds per IP for a single RPC: 40
- Maximum concurrent connections per IP: 40
- Maximum connection rate per 10 seconds per IP: 40
- Maximum amount of data per 30 second: 100 MB


2. create docs for the developers for copy pasting.

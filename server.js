import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DISCORD_URL = process.env.DISCORD_URL;
const SHOP_ID = process.env.SHOP_ID;
const SELLAUTH_API_KEY = process.env.SELLAUTH_API_KEY;

// Memory store for invoices
const invoices = new Map();

// Helper: Poll invoice status from SellAuth API
async function fetchInvoiceStatus(invoiceId) {
  try {
    const resp = await fetch(`https://api.sellauth.com/v1/invoices/${invoiceId}`, {
      headers: { "Authorization": `Bearer ${SELLAUTH_API_KEY}` }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data.status || data.payment_status || "").toLowerCase();
  } catch (e) {
    return null;
  }
}

// Start checkout (demo)
app.post("/start-checkout", async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing productId" });
  // In produzione qui chiameresti /v1/shops/{SHOP_ID}/checkout di SellAuth
  const invoiceId = Math.random().toString(36).slice(2, 10);
  invoices.set(invoiceId, { status: "created" });
  res.json({ ok: true, invoiceId, url: `/pay?invoice=${invoiceId}` });
});

// Pay page (demo) + redirect
app.get("/pay", (req, res) => {
  const { invoice } = req.query;
  if (!invoice) return res.status(400).send("Missing invoice id");
  const html = `
  <html><body style="font-family:sans-serif">
    <h2>Pagamento demo</h2>
    <p>Invoice: <b>${invoice}</b></p>
    <button onclick="finish()">Segna come PAGATO</button>
    <script>
      function finish(){
        fetch('/simulate-complete?invoice=${invoice}').then(()=>{
          window.location.href='/success?invoice=${invoice}';
        });
      }
    </script>
  </body></html>`;
  res.send(html);
});

// Simulate completion (demo)
app.get("/simulate-complete", (req, res) => {
  const { invoice } = req.query;
  invoices.set(String(invoice), { status: "completed" });
  res.send("ok");
});

// Success page â†’ redirect to Discord when completed
app.get("/success", async (req, res) => {
  const { invoice } = req.query;
  let status = invoices.get(String(invoice))?.status || "pending";
  if (status !== "completed") {
    const apiStatus = await fetchInvoiceStatus(String(invoice));
    if (apiStatus === "completed" || apiStatus === "paid" || apiStatus === "success") status = "completed";
  }
  if (!DISCORD_URL) return res.status(500).send("DISCORD_URL not set");
  if (status === "completed") return res.redirect(DISCORD_URL);
  res.send("<p>Pagamento in attesaâ€¦ aggiorna tra poco.</p>");
});
// --- KEEP-ALIVE ENDPOINT ---
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});
// --- FINE KEEP-ALIVE ---

// --- KEEP-ALIVE ENDPOINT ---
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});
// --- FINE KEEP-ALIVE ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


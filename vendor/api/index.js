import express from "express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactSvmScheme } from "@x402/svm/exact/server";

const app = express();
app.set("trust proxy", true);

const facilitatorUrl =
  process.env.X402_FACILITATOR_URL || "https://www.x402.org/facilitator";
const payTo = process.env.SVM_PAY_TO;
const network =
  process.env.X402_NETWORK || "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

if (!payTo) {
  throw new Error("SVM_PAY_TO is required");
}

const facilitatorClient = new HTTPFacilitatorClient({
  url: facilitatorUrl,
});

const resourceServer = new x402ResourceServer(facilitatorClient).register(
  network,
  new ExactSvmScheme(),
);

app.get("/", (_req, res) => {
  res.json({
    service: "MandateX vendor",
    premium: "/premium",
    network,
  });
});

app.use(
  paymentMiddleware(
    {
      "GET /premium": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network,
            payTo,
          },
        ],
        description: "MandateX premium vendor data",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

app.get("/premium", (_req, res) => {
  res.json({
    vendor: "OpenWeather",
    product: "PremiumData",
    result: "paid premium data unlocked",
    timestamp: new Date().toISOString(),
  });
});

const port = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`MandateX vendor listening on http://localhost:${port}`);
  });
}

export default app;

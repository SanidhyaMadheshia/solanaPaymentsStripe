import { Router, type Request } from "express";
import { apiKeyAuth, merchantIdOf } from "../middlewares/auth.js";
import { CreateInvoiceSchema, createInvoice, getInvoiceForMerchant } from "../services/invoices.js";
import type { Deps } from "../services/merchant.js";

/** Server-to-server API, authenticated with a secret API key. */
export function merchantApiRouter(deps: Deps) {
  const r = Router();
  r.use(apiKeyAuth(deps));

  const create = async (req: Request, res: import("express").Response) => {
    // Accept JSON body (preferred) and, for the legacy GET route, query parameters.
    const input = CreateInvoiceSchema.parse({ ...req.query, ...(req.body ?? {}) });
    res.status(201).json(await createInvoice(deps, merchantIdOf(req), input));
  };

  r.post("/invoices", create);
  r.get("/invoices/:invoiceId", async (req, res) => {
    res.json(await getInvoiceForMerchant(deps, merchantIdOf(req), req.params.invoiceId));
  });

  // Legacy endpoint names kept for existing integrations.
  r.post("/getSessionUrl", create);
  r.get("/getSessionUrl", create);

  return r;
}

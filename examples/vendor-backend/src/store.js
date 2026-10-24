// Tiny JSON-file order store. Swap for your real database in production.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function createOrderStore(file) {
  let orders = [];
  if (file && fs.existsSync(file)) orders = JSON.parse(fs.readFileSync(file, "utf8"));

  const save = () => {
    if (!file) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(orders, null, 2));
    fs.renameSync(tmp, file); // atomic replace
  };

  return {
    all: () => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    get: (id) => orders.find((o) => o.id === id) ?? null,
    byInvoice: (invoiceId) => orders.find((o) => o.invoiceId === invoiceId) ?? null,
    create(data) {
      const order = { id: `ord_${crypto.randomBytes(6).toString("hex")}`, status: "pending", createdAt: new Date().toISOString(), events: [], ...data };
      orders.push(order);
      save();
      return order;
    },
    update(id, patch, event) {
      const o = orders.find((x) => x.id === id);
      if (!o) return null;
      Object.assign(o, patch);
      if (event) o.events.push({ at: new Date().toISOString(), ...event });
      save();
      return o;
    },
  };
}

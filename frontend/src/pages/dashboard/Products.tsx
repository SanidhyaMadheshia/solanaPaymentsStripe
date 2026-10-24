import { Archive, ArchiveRestore, ExternalLink, Link2, MoreHorizontal, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useToast } from "@/components/toast-context";
import { Badge, Button, Card, ConfirmModal, CopyField, EmptyState, Field, Input, Modal, Skeleton, Textarea } from "@/components/ui";
import { buttonClass } from "@/components/ui-variants";
import { dash, errorMessage } from "@/lib/api";
import { formatDate, formatSol } from "@/lib/format";
import type { CreatedInvoice, Merchant, Price, Product } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { cn } from "@/lib/utils";
import { ErrorPanel, PageHeader } from "./shared";

/* ------------------------------------------------------------ product form */

function ProductModal({ open, product, onClose, onSaved }: { open: boolean; product: Product | null; onClose: () => void; onSaved: (p: Product) => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [firstLabel, setFirstLabel] = useState("Standard");
  const [firstAmount, setFirstAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setDescription(product?.description ?? "");
    setImage(product?.image ?? "");
    setFirstLabel("Standard");
    setFirstAmount("");
    setError(null);
  }, [open, product]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { name: name.trim(), description: description.trim(), image: image.trim() };
      let saved: Product;
      if (product) {
        saved = await dash.patch<Product>(`/products/${product.id}`, body);
      } else {
        saved = await dash.post<Product>("/products", body);
        if (firstAmount.trim()) {
          const price = await dash.post<Price>(`/products/${saved.id}/prices`, { label: firstLabel.trim() || "Standard", amount: firstAmount.trim() });
          saved = { ...saved, prices: [price] };
        }
      }
      toast.success(product ? "Product updated" : "Product created");
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? "Edit product" : "New product"}
      description={product ? undefined : "Products are what your customers buy. Each one can have several prices."}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={saving} disabled={!name.trim()}>
            {product ? "Save changes" : "Create product"}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="space-y-4">
        <Field label="Name">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pro plan" required maxLength={200} autoFocus />}</Field>
        <Field label="Description" optional hint="Shown to customers on the checkout page.">
          {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does the customer get?" maxLength={2000} />}
        </Field>
        <Field label="Image URL" optional>
          {(p) => <Input {...p} type="url" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" />}
        </Field>
        {!product && (
          <div className="grid gap-4 rounded-xl border border-line bg-surface-2/50 p-4 sm:grid-cols-2">
            <Field label="Price label" optional>
              {(p) => <Input {...p} value={firstLabel} onChange={(e) => setFirstLabel(e.target.value)} maxLength={100} />}
            </Field>
            <Field label="Amount (SOL)" optional hint="You can add more prices later.">
              {(p) => <Input {...p} inputMode="decimal" value={firstAmount} onChange={(e) => setFirstAmount(e.target.value)} placeholder="0.10" pattern="^\d+(\.\d{1,8})?$" />}
            </Field>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------ payment link */

function PaymentLinkModal({ target, onClose, hasWallet }: { target: { product: Product; price: Price } | null; onClose: () => void; hasWallet: boolean }) {
  const [qty, setQty] = useState("1");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<CreatedInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setQty("1");
    setEmail("");
    setResult(null);
    setError(null);
  }, [target]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { product_id: target.product.id, price_id: target.price.id, numberOfItems: Number(qty) || 1 };
      if (email.trim()) body.buyer_email = email.trim();
      setResult(await dash.post<CreatedInvoice>("/payment-links", body));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      title="Create payment link"
      description={target ? `${target.product.name} · ${target.price.label}` : undefined}
      footer={
        result ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="link-form" loading={saving} disabled={!hasWallet}>
              Create link
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Share this one-time checkout link. It expires {formatDate(result.expires_at)} and can be paid once for{" "}
            <span className="text-fg">
              {formatSol(result.amount)} {result.currency}
            </span>
            .
          </p>
          <CopyField value={result.checkout_url} className="w-full" />
          <a href={result.checkout_url} target="_blank" rel="noreferrer" className={buttonClass("secondary", "md", "w-full")}>
            Open checkout <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <form id="link-form" onSubmit={submit} className="space-y-4">
          {!hasWallet && (
            <p role="alert" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              Set a receiving wallet in{" "}
              <Link to="/dashboard/settings" className="underline">
                Settings
              </Link>{" "}
              first.
            </p>
          )}
          <Field label="Quantity">{(p) => <Input {...p} type="number" min={1} max={10000} value={qty} onChange={(e) => setQty(e.target.value)} required />}</Field>
          <Field label="Customer email" optional>
            {(p) => <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" />}
          </Field>
          {target && (
            <p className="text-sm text-muted">
              Total:{" "}
              <span className="font-medium text-fg">
                {formatSol((Number(target.price.amount) * (Number(qty) || 1)).toFixed(8))} {target.price.currency}
              </span>
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------ product card */

function AddPriceForm({ productId, onAdded }: { productId: string; onAdded: (p: Price) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) labelRef.current?.focus();
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const price = await dash.post<Price>(`/products/${productId}/prices`, { label: label.trim(), amount: amount.trim() });
      onAdded(price);
      setLabel("");
      setAmount("");
      setOpen(false);
      toast.success("Price added");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add price
      </Button>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input ref={labelRef} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label, e.g. Monthly" aria-label="Price label" required maxLength={100} className="h-9 sm:w-48" />
      <div className="relative sm:w-36">
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.10" aria-label="Amount in SOL" required pattern="^\d+(\.\d{1,8})?$" className="h-9 pr-11" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-subtle">SOL</span>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={saving}>
          Save
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ProductCard({
  product,
  onChange,
  onEdit,
  onDelete,
  onLink,
}: {
  product: Product;
  onChange: (p: Product) => void;
  onEdit: () => void;
  onDelete: () => void;
  onLink: (price: Price) => void;
}) {
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletePrice, setDeletePrice] = useState<Price | null>(null);

  const toggleProduct = async () => {
    setMenuOpen(false);
    try {
      onChange(await dash.patch<Product>(`/products/${product.id}`, { active: !product.active }));
      toast.success(product.active ? "Product archived" : "Product restored");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const togglePrice = async (price: Price) => {
    try {
      const updated = await dash.patch<Price>(`/prices/${price.id}`, { active: !price.active });
      onChange({ ...product, prices: product.prices.map((p) => (p.id === price.id ? updated : p)) });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const removePrice = async () => {
    if (!deletePrice) return;
    try {
      await dash.del(`/prices/${deletePrice.id}`);
      onChange({ ...product, prices: product.prices.filter((p) => p.id !== deletePrice.id) });
      toast.success("Price deleted");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeletePrice(null);
    }
  };

  return (
    <Card className={cn("overflow-hidden", !product.active && "opacity-70")}>
      <div className="flex flex-wrap items-start gap-4 p-5">
        {product.image ? (
          <img src={product.image} alt="" className="h-12 w-12 rounded-xl border border-line object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface-2 text-muted">
            <Package className="h-5 w-5" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{product.name}</h3>
            {product.active ? <Badge tone="success">Active</Badge> : <Badge>Archived</Badge>}
          </div>
          {product.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{product.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-subtle">
            <span>Product ID</span>
            <CopyField value={product.id} />
          </div>
        </div>
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen((o) => !o)} aria-label={`Actions for ${product.name}`} aria-expanded={menuOpen} aria-haspopup="menu">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
              <div role="menu" className="absolute right-0 z-20 mt-1 w-44 animate-fade-in overflow-hidden rounded-lg border border-line-strong bg-surface-2 py-1 shadow-xl">
                <button role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-3" onClick={() => { setMenuOpen(false); onEdit(); }}>
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-3" onClick={toggleProduct}>
                  {product.active ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                  {product.active ? "Archive" : "Restore"}
                </button>
                <button role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10" onClick={() => { setMenuOpen(false); onDelete(); }}>
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-line bg-surface-2/30">
        {product.prices.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">No prices yet. Add one to start selling this product.</p>
        ) : (
          <ul className="divide-y divide-line">
            {product.prices.map((price) => (
              <li key={price.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium tabular-nums">
                      {formatSol(price.amount)} {price.currency}
                    </span>
                    <span className="text-sm text-muted">· {price.label}</span>
                    {!price.active && <Badge>Archived</Badge>}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-subtle">
                    <span>Price ID</span>
                    <CopyField value={price.id} />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {price.active && product.active && (
                    <Button variant="secondary" size="sm" onClick={() => onLink(price)}>
                      <Link2 className="h-3.5 w-3.5" /> Payment link
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => togglePrice(price)} aria-label={price.active ? `Archive price ${price.label}` : `Restore price ${price.label}`} title={price.active ? "Archive" : "Restore"}>
                    {price.active ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeletePrice(price)} aria-label={`Delete price ${price.label}`} title="Delete" className="hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-line px-3 py-2">
          <AddPriceForm productId={product.id} onAdded={(p) => onChange({ ...product, prices: [...product.prices, p] })} />
        </div>
      </div>

      <ConfirmModal
        open={Boolean(deletePrice)}
        onClose={() => setDeletePrice(null)}
        onConfirm={removePrice}
        danger
        title="Delete price?"
        description="Existing invoices keep their amount, but new invoices can no longer use this price. Consider archiving instead."
        confirmLabel="Delete price"
      />
    </Card>
  );
}

/* ------------------------------------------------------------ page */

export default function Products() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync((signal) => dash.get<{ products: Product[] }>("/products", signal), []);
  const settings = useAsync((signal) => dash.get<Merchant>("/settings", signal), []);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [linkTarget, setLinkTarget] = useState<{ product: Product; price: Price } | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const products = data?.products ?? [];
  const visible = showArchived ? products : products.filter((p) => p.active);
  const archivedCount = products.length - products.filter((p) => p.active).length;

  const upsert = (p: Product) =>
    setData((d) => {
      const list = d?.products ?? [];
      return { products: list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [p, ...list] };
    });

  const remove = async () => {
    if (!deleting) return;
    try {
      await dash.del(`/products/${deleting.id}`);
      setData((d) => ({ products: (d?.products ?? []).filter((p) => p.id !== deleting.id) }));
      toast.success("Product deleted");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="Define what you sell and how much it costs. Use the IDs in API calls."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New product
          </Button>
        }
      />

      {archivedCount > 0 && (
        <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-white" />
          Show {archivedCount} archived
        </label>
      )}

      {error ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package className="h-5 w-5" />}
            title="No products yet"
            description="Create your first product with a price to start accepting payments."
            action={
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" /> New product
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onChange={upsert}
              onEdit={() => {
                setEditing(p);
                setFormOpen(true);
              }}
              onDelete={() => setDeleting(p)}
              onLink={(price) => setLinkTarget({ product: p, price })}
            />
          ))}
        </div>
      )}

      <ProductModal open={formOpen} product={editing} onClose={() => setFormOpen(false)} onSaved={upsert} />
      <PaymentLinkModal target={linkTarget} onClose={() => setLinkTarget(null)} hasWallet={Boolean(settings.data?.walletAddress)} />
      <ConfirmModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        danger
        title={`Delete “${deleting?.name ?? ""}”?`}
        description="The product and all its prices will be removed. Past invoices are kept. Archive the product instead if you may sell it again."
        confirmLabel="Delete product"
      />
    </>
  );
}

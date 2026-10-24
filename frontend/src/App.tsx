import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { Spinner } from "./components/ui";
import Landing from "./pages/landing/Landing";
import NotFound from "./pages/NotFound";

// Heavy routes are code-split: wallet libraries only load on the checkout page.
const Docs = lazy(() => import("./pages/docs/Docs"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const About = lazy(() => import("./pages/trust/About"));
const Contact = lazy(() => import("./pages/trust/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/trust/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/trust/Terms"));
const CheckoutPage = lazy(() => import("./pages/checkout/CheckoutPage"));
const SuccessPage = lazy(() => import("./pages/checkout/SuccessPage"));
const FailurePage = lazy(() => import("./pages/checkout/FailurePage"));
const DashboardLayout = lazy(() => import("./pages/dashboard/DashboardLayout"));
const Overview = lazy(() => import("./pages/dashboard/Overview"));
const Payments = lazy(() => import("./pages/dashboard/Payments"));
const Products = lazy(() => import("./pages/dashboard/Products"));
const ApiKeys = lazy(() => import("./pages/dashboard/ApiKeys"));
const Integration = lazy(() => import("./pages/dashboard/Integration"));
const Settings = lazy(() => import("./pages/dashboard/Settings"));

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="h-6 w-6 text-muted" />
    </div>
  );
}

/** Scroll to top (or to the #hash target) on navigation. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />

          <Route path="/checkout/:invoiceId" element={<CheckoutPage />} />
          <Route path="/success/:invoiceId" element={<SuccessPage />} />
          <Route path="/failure" element={<FailurePage />} />

          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="payments" element={<Payments />} />
            <Route path="products" element={<Products />} />
            <Route path="api-keys" element={<ApiKeys />} />
            <Route path="integration" element={<Integration />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Old URLs from the Clerk-based version. */}
          <Route path="/signup" element={<Navigate to="/register" replace />} />
          <Route path="/user/dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

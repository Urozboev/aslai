import { Routes, Route, Outlet } from "react-router";
import AppLayout from "@/components/shared/AppLayout";
import Toaster from "@/components/shared/Toaster";
import Home from "./pages/Home";
import Market from "./pages/Market";
import Reviews from "./pages/Reviews";
import AdAnalysis from "./pages/AdAnalysis";
import Business from "./pages/Business";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Mobile screens
import MobileHome from "./mobile/screens/MobileHome";
import MobileMarket from "./mobile/screens/MobileMarket";
import MobileReviews from "./mobile/screens/MobileReviews";
import MobileAdAnalysis from "./mobile/screens/MobileAdAnalysis";
import MobileBusiness from "./mobile/screens/MobileBusiness";

function LayoutWrapper() {
  return (
    <>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Desktop routes */}
      <Route element={<LayoutWrapper />}>
        <Route path="/" element={<Home />} />
        <Route path="/market" element={<Market />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/ads" element={<AdAnalysis />} />
        <Route path="/business" element={<Business />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      {/* Mobile routes - standalone layout */}
      <Route path="/mobile" element={<MobileHome />} />
      <Route path="/mobile/market" element={<MobileMarket />} />
      <Route path="/mobile/reviews" element={<MobileReviews />} />
      <Route path="/mobile/ads" element={<MobileAdAnalysis />} />
      <Route path="/mobile/business" element={<MobileBusiness />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

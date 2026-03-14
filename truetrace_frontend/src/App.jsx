import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import RegisterBatch from "./pages/RegisterBatch";
import ConsumerDashboard from "./dashboards/ConsumerDashboard";
import ManufacturerDashboard from "./dashboards/ManufacturerDashboard";
import DistributorDashboard from "./dashboards/DistributorDashboard";
import RetailerDashboard from "./dashboards/RetailerDashboard";
import RegulatorDashboard from "./dashboards/RegulatorDashboard";
import AnalyticsDashboard from "./analytics/AnalyticsDashboard";
import Docs from "./Docs";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleDashboardRedirect from "./components/RoleDashboardRedirect";
import ProductVerification from "./pages/ProductVerification";
import FloatingChatbot from "./components/FloatingChatbot";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/dashboard" element={<RoleDashboardRedirect />} />
        <Route path="/verify/:batchId" element={<ProductVerification />} />

        <Route
          path="/register-batch"
          element={
            <ProtectedRoute role="Manufacturer">
              <RegisterBatch />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/manufacturer"
          element={
            <ProtectedRoute role="Manufacturer">
              <ManufacturerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/distributor"
          element={
            <ProtectedRoute role="Distributor">
              <DistributorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/retailer"
          element={
            <ProtectedRoute role="Retailer">
              <RetailerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/consumer"
          element={
            <ProtectedRoute role="Consumer">
              <ConsumerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/regulator"
          element={
            <ProtectedRoute role="Regulator">
              <RegulatorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/docs"
          element={
            <ProtectedRoute>
              <Docs />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Landing />} />
      </Routes>
      <FloatingChatbot />
    </Router>
  );
}

export default App;
import { Route, Routes } from "react-router-dom";

import { AdminCompaniesPage, AdminCompanyDetailPage } from "./pages/admin-pages.js";
import { LoginPage, RegisterCompanyPage } from "./pages/auth-pages.js";
import { CompanyAreaPage } from "./pages/company-pages.js";
import {
  CompaniesSearchPage,
  HomePage,
  OnboardingPage,
  PublicCompanyProfilePage,
  PublicRecoveryPage,
  PublicTrackingPage,
  QuoteRequestPage,
} from "./pages/public-pages.js";

export function App() {
  return (
    <Routes>
      <Route element={<HomePage />} path="/" />
      <Route element={<OnboardingPage />} path="/onboarding" />
      <Route element={<CompaniesSearchPage />} path="/empresas" />
      <Route element={<PublicCompanyProfilePage />} path="/empresa/:slug" />
      <Route element={<QuoteRequestPage />} path="/empresa/:slug/orcamento" />
      <Route element={<PublicTrackingPage />} path="/acompanhar/:token" />
      <Route element={<PublicRecoveryPage />} path="/recuperar" />
      <Route element={<LoginPage />} path="/login" />
      <Route element={<RegisterCompanyPage />} path="/cadastro/empresa" />
      <Route element={<CompanyAreaPage />} path="/app" />
      <Route element={<CompanyAreaPage />} path="/app/pendente" />
      <Route element={<AdminCompaniesPage />} path="/admin" />
      <Route element={<AdminCompanyDetailPage />} path="/admin/empresas/:companyId" />
    </Routes>
  );
}

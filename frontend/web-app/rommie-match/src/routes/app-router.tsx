import { Route, Routes } from "react-router-dom";

import { AIChatbox } from "@/components/common/ai-chatbox";
import { ROUTES } from "@/constants/routes";
import AdminPage from "@/pages/admin-page";
import ChatPage from "@/pages/chat-page";
import CommunityGuidelinesPage from "@/pages/community-guidelines-page";
import DashboardPage from "@/pages/dashboard-page";
import LandingPage from "@/pages/landing-page";
import LoginPage from "@/pages/login-page";
import MatchesPage from "@/pages/matches-page";
import NotFoundPage from "@/pages/not-found-page";
import OnboardingPage from "@/pages/onboarding-page";
import PremiumPage from "@/pages/premium-page";
import ProfilePage from "@/pages/profile-page";
import QuizPage from "@/pages/quiz-page";
import RegisterPage from "@/pages/register-page";
import ServicesPage from "@/pages/services-page";
import SettingsPage from "@/pages/settings-page";

export function AppRouter() {
  return (
    <>
      <Routes>
        <Route path={ROUTES.landing} element={<LandingPage />} />
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.register} element={<RegisterPage />} />
        <Route path={ROUTES.onboarding} element={<OnboardingPage />} />
        <Route path={ROUTES.quiz} element={<QuizPage />} />
        <Route path={ROUTES.dashboard} element={<DashboardPage />} />
        <Route path={ROUTES.matches} element={<MatchesPage />} />
        <Route path={ROUTES.chat} element={<ChatPage />} />
        <Route path={ROUTES.services} element={<ServicesPage />} />
        <Route path={ROUTES.premium} element={<PremiumPage />} />
        <Route path={ROUTES.communityGuidelines} element={<CommunityGuidelinesPage />} />
        <Route path={ROUTES.settings} element={<SettingsPage />} />
        <Route path={ROUTES.admin} element={<AdminPage />} />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <AIChatbox />
    </>
  );
}

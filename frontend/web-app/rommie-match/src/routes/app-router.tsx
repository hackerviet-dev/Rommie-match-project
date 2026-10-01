import { AuthGuard } from "./auth-guard";
import { useAuthSession } from "@/features/auth";
import { Route, Routes } from "react-router-dom";

import { AIChatbox } from "@/components/common/ai-chatbox";
import { PageTransition } from "@/components/common/page-transition";
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
import PremiumResultPage from "@/pages/premium-result-page";
import ProfilePage from "@/pages/profile-page";
import QuizPage from "@/pages/quiz-page";
import RegisterPage from "@/pages/register-page";
import ServicesPage from "@/pages/services-page";
import SettingsPage from "@/pages/settings-page";
import RoomsPage from "@/pages/rooms-page";

export function AppRouter() {
  useAuthSession();
  return (
    <>
      <PageTransition><Routes>
        <Route path={ROUTES.landing} element={<LandingPage />} />
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.register} element={<RegisterPage />} />
        <Route path={ROUTES.onboarding} element={<AuthGuard><OnboardingPage /></AuthGuard>} />
        <Route path={ROUTES.quiz} element={<AuthGuard><QuizPage /></AuthGuard>} />
        <Route path={ROUTES.dashboard} element={<AuthGuard><DashboardPage /></AuthGuard>} />
        <Route path={ROUTES.matches} element={<AuthGuard><MatchesPage /></AuthGuard>} />
        <Route path={ROUTES.chat} element={<AuthGuard><ChatPage /></AuthGuard>} />
        <Route path={ROUTES.services} element={<ServicesPage />} />
        <Route path={ROUTES.rooms} element={<RoomsPage />} />
        <Route path={ROUTES.premium} element={<PremiumPage />} />
        <Route path="/premium/result" element={<PremiumResultPage />} />
        <Route path={ROUTES.communityGuidelines} element={<CommunityGuidelinesPage />} />
        <Route path={ROUTES.settings} element={<AuthGuard><SettingsPage /></AuthGuard>} />
        <Route path={ROUTES.admin} element={<AuthGuard staff><AdminPage /></AuthGuard>} />
        <Route path={ROUTES.profile} element={<AuthGuard><ProfilePage /></AuthGuard>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes></PageTransition>
      <AIChatbox />
    </>
  );
}

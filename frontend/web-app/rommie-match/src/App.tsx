import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";

import Landing from "./routes/index";
import Login from "./routes/login";
import Register from "./routes/register";
import Onboarding from "./routes/onboarding";
import Quiz from "./routes/quiz";
import Dashboard from "./routes/dashboard";
import Matches from "./routes/matches";
import Chat from "./routes/chat";
import Services from "./routes/services";
import Premium from "./routes/premium";
import Settings from "./routes/settings";
import Admin from "./routes/admin";
import Profile from "./routes/profile";
import NotFound from "./routes/not-found";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/services" element={<Services />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </QueryClientProvider>
  );
}

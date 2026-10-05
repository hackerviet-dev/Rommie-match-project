import { AppProviders } from "@/app/providers";
import { AppRouter } from "@/routes/app-router";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  { path: "*", element: <AppProviders><AppRouter /></AppProviders> },
], { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" });

export default function App() {
  return <RouterProvider router={router} />;
}

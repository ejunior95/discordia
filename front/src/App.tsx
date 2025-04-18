import { ThemeProvider } from './components/theme-provider';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Loader from './custom-components/Loader';

const Home = lazy(() => import('./pages/Home'));
const Chat = lazy(() => import('./pages/Chat'));

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="discordia-theme-select">
      <BrowserRouter>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chat" element={<Chat />} />
            {/* Nested route with layout
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route path="stats" element={<Stats />} />
            </Route> */}
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
};

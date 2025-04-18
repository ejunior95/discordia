import { ThemeProvider } from './components/theme-provider';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";

const Chat = lazy(() => import('./pages/Chat'));

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="discordia-theme-select">
      <BrowserRouter>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Chat />} />
            {/* <Route path="/about" element={<About />} /> */}
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

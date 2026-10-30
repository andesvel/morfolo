import { useEffect } from "react";
import { Route, Router, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Footer } from "./components/layout/Footer.tsx";
import { GridLines } from "./components/layout/GridLines.tsx";
import { Header } from "./components/layout/Header.tsx";
import { Toaster } from "./components/ui/sonner.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { useLocale } from "./i18n/index.ts";
import { applyTheme, watchSystemTheme } from "./lib/theme.ts";
import { aroundNav } from "./lib/view-transition.ts";
import { useEngine } from "./stores/engine.ts";
import { useSettings } from "./stores/settings.ts";
import { ConvertView } from "./views/ConvertView.tsx";
import { LandingView } from "./views/LandingView.tsx";
import { SettingsView } from "./views/SettingsView.tsx";

function App() {
  useEffect(() => {
    const engine = useEngine.getState();
    if (useSettings.getState().preloadEngine) void engine.warm();
    else void engine.refresh();
  }, []);

  const theme = useSettings((state) => state.theme);
  const locale = useLocale();

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    return watchSystemTheme(() => applyTheme("system"));
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <TooltipProvider>
      <Router hook={useHashLocation} aroundNav={aroundNav}>
        <div className="relative isolate flex min-h-svh flex-col bg-bone font-sans text-ink">
          <GridLines />
          <Header />
          <main className="flex-1">
            <Switch>
              <Route path="/convert" component={ConvertView} />
              <Route path="/settings" component={SettingsView} />
              <Route component={LandingView} />
            </Switch>
          </main>
          <Footer />
          <Toaster />
        </div>
      </Router>
    </TooltipProvider>
  );
}

export default App;

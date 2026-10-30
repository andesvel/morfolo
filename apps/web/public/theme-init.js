// Apply the saved theme and language before first paint (no flash).
// Mirrors resolveTheme/resolveLocale; lib/theme.ts takes over once React mounts.
(function () {
  var root = document.documentElement;
  var state = {};
  try {
    state = (JSON.parse(localStorage.getItem("morfolo:settings") || "{}").state) || {};
  } catch {}
  var theme = state.theme || "system";
  var dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]').setAttribute("content", dark ? "#121316" : "#E6E7E4");
  var locale = state.locale;
  if (locale !== "en" && locale !== "es") {
    locale = "en";
    var tags = navigator.languages || [];
    for (var i = 0; i < tags.length; i++) {
      var tag = tags[i].toLowerCase();
      if (tag.indexOf("es") === 0) { locale = "es"; break; }
      if (tag.indexOf("en") === 0) break;
    }
  }
  root.lang = locale;
})();

import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { PeachBoot, BOOT_TICK_JS } from "@/components/kt/peach-boot";
import appCss from "../styles.css?url";

const APP_NAME = "知识树";

function publicShareHost(): string {
  const raw =
    (typeof process !== "undefined" &&
      (process.env.VITE_PUBLIC_HOSTNAME || process.env.PUBLIC_HOSTNAME)) ||
    "";
  const host = String(raw).split(",")[0].trim().split(":")[0].toLowerCase();
  if (!host || !/^[a-z0-9.-]+$/.test(host) || !host.includes(".")) return "";
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return "";
  if (host.endsWith(".vercel.app") || host.endsWith(".vercel.com")) return "";
  return host;
}

export const Route = createRootRoute({
  head: () => {
    const host = publicShareHost();
    const xBanner = host ? `https://${host}/x-banner.jpg` : "";
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: APP_NAME },
        { name: "theme-color", content: "#8b3a2a" },
        ...(xBanner ? [{ property: "x:game:image", content: xBanner }] : []),
      ],
      links: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "stylesheet", href: appCss },
        { rel: "preload", as: "image", href: "/theme/boot-cover.jpg" },
        { rel: "preload", as: "image", href: "/theme/shan-shui.jpg" },
        { rel: "manifest", href: "/__grok/manifest.webmanifest" },
        { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      ],
    };
  },
  component: () => (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <PeachBoot />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.__LEO_BOOT_AT=Date.now();" +
              BOOT_TICK_JS +
              "try{var p=JSON.parse(localStorage.getItem('leo-tree-prefs-v1')||'{}');var s={sm:'.9',md:'1',lg:'1.14',xl:'1.28'};if(p.font&&s[p.font])document.documentElement.style.setProperty('--leo-fs',s[p.font]);if(p.locale==='en')document.documentElement.lang='en';}catch(e){}",
          }}
        />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});

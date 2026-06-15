// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import {
  type DevEnvironment,
  createRunnableDevEnvironment,
  createServerHotChannel,
  createServerModuleRunnerTransport,
} from "vite";
import {
  ModuleRunner,
  ESModulesEvaluator,
  createNodeImportMeta,
} from "vite/module-runner";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // WSL2 fix: TanStack Start forces all @tanstack/start** and
    // @tanstack/react-start** packages through Vite's SSR module runner instead
    // of externalizing them. In WSL2, hundreds of concurrent fetchModule calls
    // compete for /mnt/c/ (Windows FS) and hit the hard-coded 60s transport
    // timeout. Providing a custom SSR environment with timeout:0 on the module
    // runner transport makes it wait indefinitely rather than failing.
    environments: {
      ssr: {
        dev: {
          createEnvironment: (name, config) => {
            console.log("[WSL2-patch] createEnvironment called for:", name);
            return createRunnableDevEnvironment(name, config, {
              transport: createServerHotChannel(),
              runner: (env: DevEnvironment) =>
                new ModuleRunner(
                  {
                    transport: {
                      ...createServerModuleRunnerTransport({
                        channel: (env as DevEnvironment & { hot: Parameters<typeof createServerModuleRunnerTransport>[0]["channel"] }).hot,
                      }),
                      // 0 = no timeout — module runner waits as long as needed
                      // for WSL2 /mnt/c/ Windows FS to serve each SSR module.
                      timeout: 0,
                    },
                    createImportMeta: createNodeImportMeta,
                    sourcemapInterceptor: "prepend",
                  },
                  new ESModulesEvaluator(),
                ),
            });
          },
        },
      },
    },
    server: {
      // Required for WSL: inotify doesn't fire across the WSL↔Windows FS boundary,
      // so Vite never sees edits made from inside WSL. Polling detects them.
      watch: {
        usePolling: true,
        interval: 1000,
      },
    },
  },
});

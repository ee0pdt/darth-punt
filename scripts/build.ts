import * as esbuild from "npm:esbuild@^0.24";

let gitSha = "dev";
try {
  gitSha = new TextDecoder()
    .decode(
      (await new Deno.Command("git", { args: ["rev-parse", "--short", "HEAD"] }).output()).stdout,
    )
    .trim() || "dev";
} catch {
  // No git available (fresh CI environment etc.) — fine, leave VERSION as "dev"
}

const result = await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "dist/main.js",
  format: "esm",
  target: "es2022",
  sourcemap: "inline",
  logLevel: "info",
  define: { __GIT_SHA__: JSON.stringify(gitSha) },
});

if (result.errors.length > 0) {
  console.error(result.errors);
  Deno.exit(1);
}

console.log("build: dist/main.js produced");
esbuild.stop();

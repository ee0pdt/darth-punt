# Contributing

Thanks for taking an interest. This is a small hobby project, but PRs and issues are welcome.

## Setup

```bash
git clone git@github.com:ee0pdt/darth-punt.git
cd darth-punt
deno task dev
```

Open <http://localhost:8000>. The dev server watches `src/` and `index.html` and live-reloads the
page on rebuild.

## Before opening a PR

```bash
deno task check    # fmt + lint + type-check
deno task build    # confirms the bundle still produces
```

Keep diffs small and focused &mdash; touch one module at a time where possible. The audio engine is
timing-sensitive; avoid blocking the main thread inside the scheduler.

## License

By contributing you agree your contribution is licensed under the [MIT License](./LICENSE).

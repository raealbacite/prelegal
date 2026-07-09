# Next.js version note

This project pins Next.js 16.2.10, a version newer than most AI training data. Its APIs, conventions, and file structure can differ from what you'd expect by default (for example, static exports still use `output: "export"`, but other config or CLI behavior may have moved).

Before relying on prior Next.js knowledge for anything version-sensitive, check the docs bundled with the installed version at `node_modules/next/dist/docs/` and check for deprecation notices there.

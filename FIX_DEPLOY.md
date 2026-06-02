# Fix Railway build error (package-lock.json out of sync)

Problem: The build fails because package-lock.json does not match package.json. Railway (Railpack) runs `npm ci`, which requires an exact match between these files.

Steps to fix locally:

1. Pull the latest main branch.
2. Run `npm install` in the project root to regenerate package-lock.json (or use `npm i --package-lock-only`).
3. Commit and push the updated package-lock.json.

Alternative quick command (regenerates lock without installing):

```
npm i --package-lock-only
```

Then commit and push the updated `package-lock.json`.

After pushing, re-deploy on Railway.

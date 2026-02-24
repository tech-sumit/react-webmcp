# WebMCP Debugger - Chrome Web Store Signing

Keys and signed package for Chrome Web Store verified CRX uploads.

## Files

| File | Purpose |
|------|---------|
| `sign.sh` | Run from this directory to build and sign the extension. |
| `privatekey.pem` | **Keep secret!** Used to sign extension updates. Never commit or share. |
| `publickey.pem` | Paste this into the Chrome Web Store "Opt in to verified CRX uploads" modal. |
| `webmcp-debugger-1.0.0.crx` | Signed package ready for upload. |

## Opt in (one-time)

1. Go to Chrome Web Store Developer Dashboard → your item → **Package** tab
2. Click **Opt in** under Verified CRX Uploads
3. Paste the contents of `publickey.pem` into the modal
4. Click **Opt in**

## Sign and package (for each update)

Run from this directory:

```bash
./sign.sh
```

This builds the extension and creates `dist.crx` in `projects/webmcp/webmcp-debugger-chrome-extension/`. Upload it via **Upload New Package** in the dashboard.

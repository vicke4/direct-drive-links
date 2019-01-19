# Direct Drive Links

[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)

Manage your Google Drive files on a spreadsheet. Get direct links for the files, know with whom you have shared the file and much more [Direct Drive Links](https://gsuite.google.com/marketplace/app/drive_direct_links/520711270513).

## How to install & configure

- As this add-on is built using [clasp](https://github.com/google/clasp), install it globally on your machine.

```
npm install @google/clasp -g
clasp login // to login to your Google account for authentication
```

- Now clone this repo and install dependencies.

```
git clone https://github.com/vicke4/direct-drive-links && cd direct-drive-links
npm install
```

- Edit .clasp.json and add your script id in the json.

- Run `npm run build` to generate bundled code that'll be pushed to your script. Then run clasp push.

We thank [labnol](https://github.com/labnol) for the boilerplate - [apps-script-starter](https://github.com/labnol/apps-script-starter).

## License

MIT

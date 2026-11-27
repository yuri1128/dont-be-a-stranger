# DON'T BE A STRANGER

A tiny website for the matchbook. A terminal-style page with two screens:
**THE ALBUM** (guests add photos, everyone sees them) and **YOUR FORTUNE**.

Live address: https://yuri1128.github.io/dont-be-a-stranger/
(That address is what goes on the NFC tags. Don't change it.)

## Files

| File | What it does | Edit it? |
|---|---|---|
| `config.js` | Date, year tag, and photo-service settings | **Yes** |
| `fortunes.js` | The list of fortunes | **Yes** |
| `index.html`, `styles.css`, `app.js` | The page itself | Only to change the design |
| `fonts/` | The two pixel fonts (self-hosted) | No |

To change a file on GitHub: open it, click the pencil icon, edit, then **Commit changes**. The site updates in about a minute.

## 1. Turn on the live album (about 5 minutes)

Photos are stored on Cloudinary (free plan). Use a **new, dedicated account** for this: step 3 makes photo lists readable by anyone who knows the tag name.

1. Sign up at cloudinary.com. On the dashboard, copy your **Cloud name**.
2. **Settings > Upload > Upload presets > Add upload preset.**
   - Signing mode: **Unsigned**
   - Name: anything, e.g. `stranger_2026`
   - Allowed formats: `jpg,jpeg,png,heic,heif,webp`
   - Save.
3. **Settings > Security.** Under *Restricted media types*, **clear the "Resource list" checkbox** and save. Without this the page can't list photos.
4. Open `config.js` on GitHub and fill in:
   ```js
   cloudinary: { cloudName: "your-cloud-name", uploadPreset: "stranger_2026" }
   ```
5. Open the site on your phone, add a photo, and check it appears.

Notes:
- New photos can take up to a minute to show up for *other* people. Your own upload appears instantly.
- Delete or hide a photo any time from the Cloudinary **Media Library**.
- Anyone with the page can upload, so after the party you can switch uploads off by deleting the upload preset (Settings > Upload). The album keeps working for viewing.

## 2. Connect the NFC tags

1. Install the free **NFC Tools** app on your iPhone.
2. **Write > Add a record > URL/URI**, type `https://yuri1128.github.io/dont-be-a-stranger/`, then **Write** and hold the phone to the tag.
3. Test it: close the app, tap the tag with the phone's top edge. The site should open.
4. Only once it works, you can lock the tag (**Other > Lock tag**). **Locking is permanent.**

## 3. Next year

In `config.js`, add one line under `editions` (new year, date, and a new tag such as `stranger-2027`). The cover shows the newest date, new photos go to the new year, and the album gets year buttons so people can look back. Add new lines to `fortunes.js` whenever you like.

## Privacy

The page tells search engines not to list it (`noindex`), and photo links aren't posted anywhere. It's still "private by obscurity": anyone with the link can see the photos. The repository itself is public (GitHub Pages needs that on a free plan), so don't put anything private in it.

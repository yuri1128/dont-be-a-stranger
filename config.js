/* ============================================================
   SITE SETTINGS — the only file you need to edit for setup.
   ============================================================ */
window.SITE_CONFIG = {

  /* EDITIONS — one line per year. The LAST line is the live party:
     it sets the date on the cover and where new photos go.
     Next year, add a new line at the bottom; older years stay in the
     album as an archive.  "tag" is the label photos are filed under —
     pick it once and never change it.                                  */
  editions: [
    { year: 2026, date: "NOV 28, 2026", tag: "stranger-2026" }
    // { year: 2027, date: "NOV 27, 2027", tag: "stranger-2027" },
  ],

  /* THE ALBUM — photos live on Cloudinary (free account).
     cloudName    : shown at the top of your Cloudinary dashboard
     uploadPreset : the name of the UNSIGNED upload preset you create
     Leave both empty and the album says "not open yet".
     (README.md has the 5-minute setup.)                                */
  cloudinary: {
    cloudName: "sfipuk7z",
    uploadPreset: "stranger_2026"
  },

  /* true = thumbnails in black & white (full-size photo opens in colour) */
  gridGrayscale: true
};

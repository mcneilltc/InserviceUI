import moment from 'moment-timezone';

// Mirrors training-app-backend/app.ts's process.env.TZ pin. This app is
// single-region (Mecklenburg County, NC) and every bare date/time string it
// stores or parses — session dates, startTime/endTime, certification
// expirations — is written and read on the assumption that "local time"
// means America/New_York. Without this, a plain moment() call falls back to
// whatever timezone the browser's own device happens to be set to, which
// silently disagrees with the server the moment a user's device isn't on
// Eastern time (e.g. a manager confirming an "early close-out" from a phone
// still set to its home timezone while traveling). Importing this module
// anywhere patches the single shared `moment` instance the whole bundle
// uses, so every other file's plain `import moment from 'moment'` inherits
// this default too — see src/app/layout.tsx and src/pages/_app.js, the two
// entry points (App Router and legacy Pages Router) that import it for this
// side effect alone.
moment.tz.setDefault('America/New_York');

export default moment;

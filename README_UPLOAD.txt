FFL Cup 2026 — Player View v4

WHAT'S NEW
- Clickable player names/photos open an FFL Cup player profile.
- Career totals and year-by-year history are sourced from FFL Cup Stats.
- Live 2026 goals/assists/matches are combined with the public tournament feed.
- New Competition Info tab.
- Competition Info is designed to read from the new Competition Info backend Sheet tab.

GITHUB UPDATE
Upload/replace the contents of this folder in your FFL-cup-2026 repository:
- index.html
- styles.css
- public.js
- player-history.js
- config.js
- assets/ (keep the full folder)

You do NOT need to change the admin page for player profiles.

COMPETITION INFO BACKEND
The Competition Info Sheet tab already exists.
Fill in the Details column.
Then follow APPS_SCRIPT_COMPETITION_INFO_PATCH.txt once so the public site can receive those rows.
Do not replace your whole Code.gs because it contains your private admin PIN.

PLAYER HISTORY NAME MAPPING
- Wolves Anthony -> Anthony T historical record
- Eagles Simon -> Simon T historical record
- Dragons Raksa -> Chanraksa historical record
- Same-name historical records are used for Vu and Jason.

Player career figures are the supplied all-time stats through 2025. 2026 tournament figures display live from the tournament backend.

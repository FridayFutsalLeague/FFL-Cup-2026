# FFL Cup 2026 – MVP

## What this version includes
- Public mobile-first tournament centre
- Group A + Group B standings
- Fixtures and final results
- Goals + assists leaderboards
- Top two highlighted in each group
- Semi-final placeholders: A1 v B2 and B1 v A2
- Grand Final auto-populates after the semis
- Admin email/password login
- Admin final-score entry
- Per-player goals and assists entry from the paper scoresheet
- Penalty shootout fields for tied knockout games
- Real-time updates through Firebase Firestore

## Seeded teams
Group A
- Wolves: Simon, Anthony T, Tony, Rob, Martin, Cabe
- Bears: Chris, Bach, Vu, Alan, Nathan, Jarvis
- Eagles: Simon Tran, David, Nhan, Dali, Pete, Leo

Group B
- Cobras: Wes, Justin, Evan, Tai, Dipper, Cesar
- Lions: Sape, Tion, Hai, Jason, Rahul, Virack
- Dragons: Raksa, Netra, Richard, Anthony, Long, Bax

## Seeded schedule
30-minute group slots at 11:00, 11:30, 12:00, then repeat pairings at 12:30, 1:00 and 1:30.
Semi-finals: 2:30 PM on both courts.
Grand Final: 3:30 PM on Court 1.

## Firebase setup
1. Create a Firebase project at Firebase Console.
2. Add a Web App.
3. Paste its config into `firebase-config.js`.
4. Enable Firestore Database.
5. Publish the rules from `firestore.rules`.
6. Enable Authentication → Email/Password.
7. Create the admin user(s) manually in Authentication → Users.
8. Upload this folder to your GitHub Pages repo, e.g. `/fflcup/`.
9. Open `admin.html`, sign in and press **Initialize / Reset Tournament** once.

Public page: `/fflcup/index.html`
Admin page: `/fflcup/admin.html`

## Cup-day workflow
1. Match finishes.
2. Take the paper scoresheet.
3. Admin selects the match.
4. Enter the final score.
5. Enter player goals and assists.
6. Press **Save Final Result**.
7. Every player with the public page open receives the update automatically.

## Important
The reset button wipes all results and stats. Use it only before the tournament or when intentionally starting over.

## Good Version 2 additions
- Admin editing for teams and fixtures
- Your final tie-break rules, including head-to-head if required
- Team logos/colours and stronger FFL branding
- QR code landing screen
- Big-screen mode
- Final export/report

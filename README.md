# Bills Darts Predictor

Static HTML/JS/CSS site + Google Sheets backend via Apps Script. Ready for Netlify.

## 1. Google Sheet Setup

Sheet: https://docs.google.com/spreadsheets/d/1sMbwGymuC5pK1w8wVjNQTGtdMOV1NMYde6kIanjkv70/edit

1. Open the sheet → Extensions → Apps Script
2. Delete any existing code and paste the entire contents of `AppsScript.gs`
3. Save the project (name it "Darts Predictor")
4. In the script editor, choose `setupSheets` and click **Run** (not Debug). Allow permissions if asked. When it finishes, the log says the tabs are ready. Add player names in column A of Players.
5. In the **Players** tab, add the 32 player names in column A (starting at A2).
6. Deploy as Web App:
   - Deploy → New deployment
   - Type: Web app
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy
   - Copy the Web App URL (ends with `/exec`)

## 2. Website

1. Edit `config.js` and paste your `/exec` URL into `SCRIPT_URL`
2. Upload all files (`index.html`, `leaderboard.html`, `admin.html`, `results.html`, `styles.css`, `config.js`) to Netlify (drag & drop the folder, or connect a repo)

## How it works

### Admin (`admin.html`)
- Choose round + "First to" number
- Load players
- Add match pairs
- Submit → writes to **Matches** sheet and sets CurrentRound

### Predictions (`index.html`)
- First visit: enter Name + Email (saved in localStorage)
- If email already used, name is filled automatically
- Enter predicted scores for each match (must be valid first-to scoreline)
- Submit → stored in **Predictions** sheet

### Results (`results.html`)
- Load matches for a round
- Enter final scores (e.g. 5 and 2)
- Submit → updates **Matches** sheet, recalculates points, rebuilds **Leaderboard**

### Leaderboard (`leaderboard.html`)
- Shows everyone ranked by total points
- Points per round + total

## Scoring (done automatically in Apps Script)
- **5 points**: exact scoreline correct
- **2 points**: correct winner but wrong scoreline
- **0 points**: wrong winner

## Sheets created
- **Players** — list of names
- **Matches** — all matches + results
- **Predictions** — every prediction + points
- **Users** — email → name
- **Leaderboard** — auto-calculated
- **Config** — current round etc.

## Notes
- Predictions can be re-submitted (old ones for that round are replaced)
- Points update as soon as results are entered
- No authentication on admin pages (add a simple password if you want later)
- For the 2026/27 World Championship typical first-to values:
  - Last 32 / Last 16: often 4 or 5 depending on exact stage
  - QF: 5, SF: 6, Final: 7

Enjoy the darts!

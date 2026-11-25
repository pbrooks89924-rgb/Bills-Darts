/**
 * Google Apps Script for Bills Darts Predictor
 * Deploy as Web App: Execute as Me, Who has access: Anyone
 * Then put the /exec URL in the website config.js
 * 
 * Run setupSheets() once from the editor to create tabs and headers.
 */

const SHEET_NAMES = {
  PLAYERS: 'Players',
  MATCHES: 'Matches',
  PREDICTIONS: 'Predictions',
  USERS: 'Users',
  LEADERBOARD: 'Leaderboard',
  CONFIG: 'Config'
};

const ROUNDS = ['Last32', 'Last16', 'QuarterFinal', 'SemiFinal', 'Final'];

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ensure = (name) => ss.getSheetByName(name) || ss.insertSheet(name);

  const config = ensure(SHEET_NAMES.CONFIG);
  config.clear();
  config.getRange(1, 1, 5, 2).setValues([
    ['Key', 'Value'],
    ['CurrentRound', 'Last32'],
    ['ScriptURL', ''],
    ['SiteName', 'Bills Darts Predictor'],
    ['ScoringNote', '5 exact score, 2 correct winner, 0 wrong']
  ]);
  config.getRange(1, 1, 1, 2).setFontWeight('bold');

  const players = ensure(SHEET_NAMES.PLAYERS);
  if (players.getLastRow() === 0) {
    players.getRange(1, 1, 2, 1).setValues([['Name'], ['Example Player (delete me)']]);
    players.getRange(1, 1).setFontWeight('bold');
  }

  const matches = ensure(SHEET_NAMES.MATCHES);
  matches.clear();
  matches.getRange(1, 1, 1, 9).setValues([[
    'MatchID', 'Round', 'Player1', 'Player2', 'FirstTo', 'Score1', 'Score2', 'Winner', 'Completed'
  ]]).setFontWeight('bold');
  matches.setFrozenRows(1);

  const preds = ensure(SHEET_NAMES.PREDICTIONS);
  preds.clear();
  preds.getRange(1, 1, 1, 8).setValues([[
    'Timestamp', 'Email', 'Name', 'MatchID', 'PredScore1', 'PredScore2', 'Points', 'Round'
  ]]).setFontWeight('bold');
  preds.setFrozenRows(1);

  const users = ensure(SHEET_NAMES.USERS);
  users.clear();
  users.getRange(1, 1, 1, 2).setValues([['Email', 'Name']]).setFontWeight('bold');

  const lb = ensure(SHEET_NAMES.LEADERBOARD);
  lb.clear();
  const lbHeaders = ['Email', 'Name'].concat(ROUNDS).concat(['Total']);
  lb.getRange(1, 1, 1, lbHeaders.length).setValues([lbHeaders]).setFontWeight('bold');
  lb.setFrozenRows(1);

  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1 && sheet1.getLastRow() === 0) {
    ss.deleteSheet(sheet1);
  }

  SpreadsheetApp.flush();
  Logger.log('Sheets set up. Add player names in column A of Players.');
  return 'Sheets set up. Add player names in column A of Players.';
}

function doGet(e) {
  const action = e.parameter.action || 'matches';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    switch (action) {
      case 'players':
        return jsonResponse(getPlayers(ss));
      case 'matches':
        const round = e.parameter.round || getConfig(ss, 'CurrentRound') || 'Last32';
        return jsonResponse(getMatches(ss, round));
      case 'leaderboard':
        return jsonResponse(getLeaderboard(ss));
      case 'config':
        return jsonResponse({
          currentRound: getConfig(ss, 'CurrentRound'),
          rounds: ROUNDS
        });
      case 'user':
        const email = e.parameter.email;
        return jsonResponse(getUser(ss, email));
      default:
        return jsonResponse({ error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  try {
    switch (action) {
      case 'setupMatches':
        return jsonResponse(setupMatches(ss, data));
      case 'submitPredictions':
        return jsonResponse(submitPredictions(ss, data));
      case 'submitResults':
        return jsonResponse(submitResults(ss, data));
      case 'registerEntrant':
        return jsonResponse(registerEntrant(ss, data));
      case 'setCurrentRound':
        setConfig(ss, 'CurrentRound', data.round);
        return jsonResponse({ success: true, currentRound: data.round });
      default:
        return jsonResponse({ error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

// --- Helpers ---

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getConfig(ss, key) {
  const sheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

function setConfig(ss, key, value) {
  const sheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function getPlayers(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.PLAYERS);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const names = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat().filter(n => n);
  return names;
}

function getMatches(ss, round) {
  const sheet = ss.getSheetByName(SHEET_NAMES.MATCHES);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const matches = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === round) { // Round column
      const match = {};
      headers.forEach((h, idx) => match[h] = data[i][idx]);
      matches.push(match);
    }
  }
  return matches;
}

function getLeaderboard(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.LEADERBOARD);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    const row = {};
    headers.forEach((h, idx) => row[h] = data[i][idx]);
    rows.push(row);
  }
  // Sort by Total descending
  sortLeaderboard(rows);
  return rows;
}

function getUser(ss, email) {
  if (!email) return null;
  const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) return { email: data[i][0], name: data[i][1] };
  }
  return null;
}

function registerEntrant(ss, data) {
  const email = String(data.email || '').trim().toLowerCase();
  const name = String(data.name || '').trim();
  if (!email || !name) return { error: 'Name and email required' };
  const users = ss.getSheetByName(SHEET_NAMES.USERS);
  const userData = users.getDataRange().getValues();
  let exists = false;
  for (let i = 1; i < userData.length; i++) {
    if (String(userData[i][0]).toLowerCase() === email) {
      users.getRange(i + 1, 2).setValue(name);
      exists = true;
      break;
    }
  }
  if (!exists) users.appendRow([email, name]);
  rebuildLeaderboard(ss);
  return { success: true, email: email, name: name };
}

function sortLeaderboard(rows) {
  const scored = rows.some(function (row) {
    const total = row.Total !== undefined ? row.Total : row[row.length - 1];
    return Number(total) > 0;
  });
  rows.sort(function (a, b) {
    const aTotal = Number(a.Total !== undefined ? a.Total : a[a.length - 1]) || 0;
    const bTotal = Number(b.Total !== undefined ? b.Total : b[b.length - 1]) || 0;
    const aName = String(a.Name !== undefined ? a.Name : a[1] || '');
    const bName = String(b.Name !== undefined ? b.Name : b[1] || '');
    if (scored && aTotal !== bTotal) return bTotal - aTotal;
    return aName.localeCompare(bName);
  });
  return rows;
}

function setupMatches(ss, data) {
  const { round, firstTo, matches } = data; // matches: [{player1, player2}, ...]
  const sheet = ss.getSheetByName(SHEET_NAMES.MATCHES);
  // Remove existing matches for this round
  const existing = sheet.getDataRange().getValues();
  for (let i = existing.length - 1; i >= 1; i--) {
    if (existing[i][1] === round) {
      sheet.deleteRow(i + 1);
    }
  }
  // Add new
  matches.forEach((m, idx) => {
    const matchId = `${round}_${idx + 1}`;
    sheet.appendRow([matchId, round, m.player1, m.player2, firstTo, '', '', '', false]);
  });
  setConfig(ss, 'CurrentRound', round);
  return { success: true, count: matches.length, round };
}

function submitPredictions(ss, data) {
  const { email, name, predictions, round } = data; // predictions: [{matchId, score1, score2}, ...]
  // Save/update user
  const users = ss.getSheetByName(SHEET_NAMES.USERS);
  let userExists = false;
  const userData = users.getDataRange().getValues();
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] === email) {
      users.getRange(i + 1, 2).setValue(name);
      userExists = true;
      break;
    }
  }
  if (!userExists) {
    users.appendRow([email, name]);
  }
  
  // Remove previous predictions for this user + round
  const preds = ss.getSheetByName(SHEET_NAMES.PREDICTIONS);
  const predData = preds.getDataRange().getValues();
  for (let i = predData.length - 1; i >= 1; i--) {
    if (predData[i][1] === email && predData[i][7] === round) { // Email and Round
      preds.deleteRow(i + 1);
    }
  }
  
  // Add new predictions
  const timestamp = new Date();
  predictions.forEach(p => {
    preds.appendRow([timestamp, email, name, p.matchId, p.score1, p.score2, 0, round]);
  });
  
  // Recalculate points for this user/round (if results already in)
  recalculatePointsForRound(ss, round);
  rebuildLeaderboard(ss);
  
  return { success: true, message: 'Predictions submitted!' };
}

function submitResults(ss, data) {
  const { results } = data; // results: [{matchId, score1, score2}, ...]
  const matches = ss.getSheetByName(SHEET_NAMES.MATCHES);
  const matchData = matches.getDataRange().getValues();
  const headers = matchData[0];
  const idCol = headers.indexOf('MatchID');
  const s1Col = headers.indexOf('Score1');
  const s2Col = headers.indexOf('Score2');
  const winCol = headers.indexOf('Winner');
  const compCol = headers.indexOf('Completed');
  const p1Col = headers.indexOf('Player1');
  const p2Col = headers.indexOf('Player2');
  
  results.forEach(r => {
    for (let i = 1; i < matchData.length; i++) {
      if (matchData[i][idCol] === r.matchId) {
        const row = i + 1;
        matches.getRange(row, s1Col + 1).setValue(r.score1);
        matches.getRange(row, s2Col + 1).setValue(r.score2);
        const winner = r.score1 > r.score2 ? matchData[i][p1Col] : (r.score2 > r.score1 ? matchData[i][p2Col] : 'Draw');
        matches.getRange(row, winCol + 1).setValue(winner);
        matches.getRange(row, compCol + 1).setValue(true);
        break;
      }
    }
  });
  
  // Get round from first result
  let round = '';
  if (results.length > 0) {
    for (let i = 1; i < matchData.length; i++) {
      if (matchData[i][idCol] === results[0].matchId) {
        round = matchData[i][headers.indexOf('Round')];
        break;
      }
    }
  }
  if (round) {
    recalculatePointsForRound(ss, round);
    rebuildLeaderboard(ss);
  }
  
  return { success: true, message: 'Results submitted and points recalculated!' };
}

function recalculatePointsForRound(ss, round) {
  const matchesSheet = ss.getSheetByName(SHEET_NAMES.MATCHES);
  const predsSheet = ss.getSheetByName(SHEET_NAMES.PREDICTIONS);
  
  const matchData = matchesSheet.getDataRange().getValues();
  const matchMap = {};
  matchData.slice(1).forEach(row => {
    if (row[1] === round && row[8] === true) { // Completed
      matchMap[row[0]] = { score1: Number(row[5]), score2: Number(row[6]), player1: row[2], player2: row[3] };
    }
  });
  
  const predData = predsSheet.getDataRange().getValues();
  for (let i = 1; i < predData.length; i++) {
    if (predData[i][7] !== round) continue;
    const matchId = predData[i][3];
    const actual = matchMap[matchId];
    if (!actual) {
      predsSheet.getRange(i + 1, 7).setValue(0); // Points column
      continue;
    }
    const predS1 = Number(predData[i][4]);
    const predS2 = Number(predData[i][5]);
    let points = 0;
    if (predS1 === actual.score1 && predS2 === actual.score2) {
      points = 5;
    } else {
      const actualWinner = actual.score1 > actual.score2 ? 1 : 2;
      const predWinner = predS1 > predS2 ? 1 : 2;
      if (actualWinner === predWinner) points = 2;
    }
    predsSheet.getRange(i + 1, 7).setValue(points);
  }
}

function rebuildLeaderboard(ss) {
  const predsSheet = ss.getSheetByName(SHEET_NAMES.PREDICTIONS);
  const lbSheet = ss.getSheetByName(SHEET_NAMES.LEADERBOARD);
  const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
  
  // Clear leaderboard except headers
  if (lbSheet.getLastRow() > 1) {
    lbSheet.getRange(2, 1, lbSheet.getLastRow() - 1, lbSheet.getLastColumn()).clearContent();
  }
  
  const predData = predsSheet.getDataRange().getValues();
  const userScores = {}; // email -> {name, scores: {round: points}}
  
  for (let i = 1; i < predData.length; i++) {
    const email = predData[i][1];
    const name = predData[i][2];
    const round = predData[i][7];
    const points = Number(predData[i][6]) || 0;
    if (!userScores[email]) userScores[email] = { name, scores: {} };
    if (!userScores[email].scores[round]) userScores[email].scores[round] = 0;
    userScores[email].scores[round] += points;
  }
  
  // Also pull names from Users if needed
  const userData = usersSheet.getDataRange().getValues();
  userData.slice(1).forEach(row => {
    if (row[0] && !userScores[row[0]]) {
      userScores[row[0]] = { name: row[1], scores: {} };
    }
  });
  
  const rows = [];
  Object.keys(userScores).forEach(email => {
    const u = userScores[email];
    let total = 0;
    const roundPoints = ROUNDS.map(r => {
      const p = u.scores[r] || 0;
      total += p;
      return p;
    });
    rows.push([email, u.name].concat(roundPoints).concat([total]));
  });
  
  sortLeaderboard(rows);
  if (rows.length > 0) {
    lbSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

// Optional: call this manually if needed
function recalculateAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ROUNDS.forEach(r => recalculatePointsForRound(ss, r));
  rebuildLeaderboard(ss);
}

const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.resolve(__dirname, '..', 'reports');

function ensureReportsDir() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function buildReportFileName(commandName, batchId) {
  return `${batchId}-${commandName}.json`;
}

function writeReport(commandName, batchId, payload) {
  ensureReportsDir();

  const reportPath = path.join(REPORTS_DIR, buildReportFileName(commandName, batchId));
  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2));

  return reportPath;
}

function readReport(commandName, batchId) {
  const reportPath = path.join(REPORTS_DIR, buildReportFileName(commandName, batchId));
  if (!fs.existsSync(reportPath)) {
    return null;
  }

  return {
    path: reportPath,
    data: JSON.parse(fs.readFileSync(reportPath, 'utf8')),
  };
}

function listReportFiles(commandName) {
  ensureReportsDir();
  return fs
    .readdirSync(REPORTS_DIR)
    .filter((fileName) => fileName.endsWith(`-${commandName}.json`))
    .sort()
    .reverse();
}

function readLatestReport(commandName) {
  const [fileName] = listReportFiles(commandName);
  if (!fileName) {
    return null;
  }

  const reportPath = path.join(REPORTS_DIR, fileName);
  return {
    path: reportPath,
    data: JSON.parse(fs.readFileSync(reportPath, 'utf8')),
  };
}

module.exports = {
  REPORTS_DIR,
  readLatestReport,
  readReport,
  writeReport,
};

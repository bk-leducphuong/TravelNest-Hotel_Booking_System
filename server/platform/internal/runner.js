const path = require('path');
const { spawn } = require('child_process');

const ApiError = require('@utils/ApiError');

// platform/internal/runner.js -> the server root is two levels up.
const SERVER_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_OUTPUT_CHARS = 20000;

/** In-flight tasks keyed by task key, so the same task can't run twice. */
const runningTasks = new Map();

function trimOutput(value) {
  if (!value || value.length <= MAX_OUTPUT_CHARS) {
    return value;
  }

  return value.slice(value.length - MAX_OUTPUT_CHARS);
}

/**
 * Spawn a Node script as a child process, capturing stdout/stderr and enforcing
 * a timeout. Rejects with an ApiError on timeout, spawn failure or non-zero
 * exit; rejects with 409 if the same task is already running.
 */
function runScript(taskKey, scriptPath, args = [], options = {}) {
  if (runningTasks.has(taskKey)) {
    throw new ApiError(409, 'INTERNAL_TASK_RUNNING', `Task is already running: ${taskKey}`);
  }

  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const startedAt = new Date();
  const childArgs = [scriptPath, ...args];

  const taskPromise = new Promise((resolve, reject) => {
    const child = spawn(process.execPath, childArgs, {
      cwd: SERVER_ROOT,
      env: {
        ...process.env,
        ...(options.env || {}),
        NODE_ENV: process.env.NODE_ENV || 'development',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(
        new ApiError(504, 'INTERNAL_TASK_TIMEOUT', `Task timed out after ${timeoutMs}ms`, {
          task: taskKey,
        })
      );
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout = trimOutput(stdout + chunk.toString());
    });

    child.stderr.on('data', (chunk) => {
      stderr = trimOutput(stderr + chunk.toString());
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(
        new ApiError(500, 'INTERNAL_TASK_SPAWN_FAILED', `Failed to start task: ${taskKey}`, {
          message: error.message,
        })
      );
    });

    child.on('close', (code, signal) => {
      clearTimeout(timeout);

      const finishedAt = new Date();
      const result = {
        task: taskKey,
        script: scriptPath,
        args,
        exitCode: code,
        signal,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        stdout,
        stderr,
      };

      if (code !== 0) {
        reject(
          new ApiError(500, 'INTERNAL_TASK_FAILED', `Task failed: ${taskKey}`, {
            ...result,
          })
        );
        return;
      }

      resolve(result);
    });
  });

  runningTasks.set(taskKey, taskPromise);

  return taskPromise.finally(() => {
    runningTasks.delete(taskKey);
  });
}

module.exports = { runScript, runningTasks };

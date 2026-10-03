/**
 * Platform-wide statistics helpers for the /admin namespace.
 */

async function getPlatformStats(io) {
  const namespaces = ['/public', '/user', '/property', '/support', '/admin'];
  const stats = {
    totalConnections: 0,
    byNamespace: {},
  };

  for (const namespaceName of namespaces) {
    const namespace = io.of(namespaceName);
    const sockets = await namespace.fetchSockets();
    const count = sockets.length;

    stats.byNamespace[namespaceName] = count;
    stats.totalConnections += count;
  }

  return stats;
}

async function getActiveSessions(io) {
  const namespaces = ['/user', '/property', '/support', '/admin'];
  const sessions = [];

  for (const namespaceName of namespaces) {
    const namespace = io.of(namespaceName);
    const sockets = await namespace.fetchSockets();

    for (const socket of sockets) {
      if (socket.user) {
        sessions.push({
          namespace: namespaceName,
          userId: socket.user.id,
          name: `${socket.user.firstName} ${socket.user.lastName}`,
          roles: socket.user.roles,
          socketId: socket.id,
        });
      }
    }
  }

  return sessions;
}

module.exports = { getPlatformStats, getActiveSessions };

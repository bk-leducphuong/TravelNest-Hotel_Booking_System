/**
 * Room-membership helpers for the /property namespace.
 */

function getOnlineStaffInRoom(namespace, roomName) {
  const room = namespace.adapter.rooms.get(roomName);
  if (!room) return [];

  const onlineStaff = [];
  for (const socketId of room) {
    const socket = namespace.sockets.get(socketId);
    if (socket && socket.user) {
      onlineStaff.push({
        userId: socket.user.id,
        name: `${socket.user.firstName} ${socket.user.lastName}`,
        roles: socket.user.roles,
      });
    }
  }

  return onlineStaff;
}

module.exports = { getOnlineStaffInRoom };

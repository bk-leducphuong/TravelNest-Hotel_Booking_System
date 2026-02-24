const http = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const notificationService = require('@services/notification.service');

// Mock dependencies
jest.mock('@services/notification.service');
jest.mock('@config/logger.config', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock models
jest.mock('@models/index.js', () => ({
  Users: {
    findByPk: jest.fn(),
  },
  UserRoles: {},
  Roles: {},
  Permissions: {},
  RolePermissions: {},
  HotelUsers: {},
}));

const { Users } = require('@models/index.js');

describe('User Socket Controller Integration Tests', () => {
  let httpServer;
  let io;
  let clientSocket;
  let serverSocket;
  const TEST_PORT = 3001;

  // Mock user data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    status: 'active',
    roles: [
      {
        role: {
          id: 'role-1',
          name: 'user',
          description: 'Regular user',
          permissions: [
            {
              id: 'perm-1',
              name: 'booking.read',
              description: 'Read bookings',
            },
            {
              id: 'perm-2',
              name: 'notification.read',
              description: 'Read notifications',
            },
          ],
        },
      },
    ],
    hotel_roles: [],
    toJSON: function () {
      return {
        id: this.id,
        email: this.email,
        first_name: this.first_name,
        last_name: this.last_name,
        status: this.status,
      };
    },
  };

  beforeAll((done) => {
    // Create HTTP server
    httpServer = http.createServer();

    // Initialize Socket.IO
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Setup user namespace with authentication middleware
    const userNamespace = io.of('/user');

    // Mock authentication middleware
    userNamespace.use((socket, next) => {
      // Mock session
      socket.request.session = {
        user: {
          id: 'user-123',
        },
      };

      // Mock user data on socket
      socket.user = {
        id: 'user-123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['booking.read', 'notification.read'],
        hotelRoles: [],
      };

      next();
    });

    // Import and setup user controller
    const userController = require('@socket/controllers/user.controller');
    userNamespace.on('connection', (socket) => {
      serverSocket = socket;
      userController.handleConnection(userNamespace, socket);
    });

    httpServer.listen(TEST_PORT, () => {
      done();
    });
  });

  afterAll((done) => {
    io.close();
    httpServer.close();
    done();
  });

  beforeEach((done) => {
    jest.clearAllMocks();

    // Mock Users.findByPk
    Users.findByPk.mockResolvedValue(mockUser);

    // Create client connection
    clientSocket = Client(`http://localhost:${TEST_PORT}/user`, {
      transports: ['websocket'],
      forceNew: true,
    });

    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection', () => {
    it('should connect successfully', () => {
      expect(clientSocket.connected).toBe(true);
    });

    it('should join user personal room', (done) => {
      setTimeout(() => {
        expect(serverSocket.rooms.has('user_user-123')).toBe(true);
        done();
      }, 100);
    });
  });

  describe('Booking Events', () => {
    describe('bookings:subscribe', () => {
      it('should subscribe to booking updates', (done) => {
        const bookingId = 'booking-456';

        clientSocket.emit('bookings:subscribe', bookingId, (response) => {
          expect(response).toEqual({
            success: true,
            message: `Subscribed to booking ${bookingId}`,
          });

          // Verify socket joined the room
          setTimeout(() => {
            expect(serverSocket.rooms.has(`booking_${bookingId}`)).toBe(true);
            done();
          }, 50);
        });
      });

      it('should return error when booking ID is missing', (done) => {
        clientSocket.emit('bookings:subscribe', null, (response) => {
          expect(response).toEqual({
            success: false,
            message: 'Booking ID is required',
          });
          done();
        });
      });

      it('should return error when booking ID is undefined', (done) => {
        clientSocket.emit('bookings:subscribe', undefined, (response) => {
          expect(response).toEqual({
            success: false,
            message: 'Booking ID is required',
          });
          done();
        });
      });
    });

    describe('bookings:unsubscribe', () => {
      it('should unsubscribe from booking updates', (done) => {
        const bookingId = 'booking-789';

        // First subscribe
        clientSocket.emit('bookings:subscribe', bookingId, () => {
          // Then unsubscribe
          clientSocket.emit('bookings:unsubscribe', bookingId, (response) => {
            expect(response).toEqual({ success: true });

            // Verify socket left the room
            setTimeout(() => {
              expect(serverSocket.rooms.has(`booking_${bookingId}`)).toBe(
                false
              );
              done();
            }, 50);
          });
        });
      });
    });
  });

  // describe('Support Chat Events', () => {
  //   describe('support:joinChat', () => {
  //     it('should join support chat successfully', (done) => {
  //       const ticketId = 'ticket-123';
  //
  //       clientSocket.emit('support:joinChat', ticketId, (response) => {
  //         expect(response).toEqual({
  //           success: true,
  //           message: 'Joined support chat',
  //         });
  //
  //         setTimeout(() => {
  //           expect(serverSocket.rooms.has(`support_chat_${ticketId}`)).toBe(
  //             true
  //           );
  //           done();
  //         }, 50);
  //       });
  //     });
  //
  //     it('should return error when ticket ID is missing', (done) => {
  //       clientSocket.emit('support:joinChat', null, (response) => {
  //         expect(response).toEqual({
  //           success: false,
  //           message: 'Ticket ID is required',
  //         });
  //         done();
  //       });
  //     });
  //   });
  //
  //   describe('support:sendMessage', () => {
  //     it('should send support message successfully', (done) => {
  //       const ticketId = 'ticket-456';
  //       const message = 'I need help with my booking';
  //
  //       // Join chat first
  //       clientSocket.emit('support:joinChat', ticketId, () => {
  //         // Listen for message received event
  //         clientSocket.on('support:messageReceived', (data) => {
  //           expect(data).toMatchObject({
  //             ticketId,
  //             message,
  //             sender: {
  //               id: 'user-123',
  //               name: 'Test User',
  //               type: 'user',
  //             },
  //           });
  //           expect(data.timestamp).toBeInstanceOf(Date);
  //           done();
  //         });
  //
  //         // Send message
  //         clientSocket.emit(
  //           'support:sendMessage',
  //           { ticketId, message },
  //           (response) => {
  //             expect(response).toEqual({
  //               success: true,
  //               message: 'Message sent',
  //             });
  //           }
  //         );
  //       });
  //     });
  //
  //     it('should return error when ticket ID is missing', (done) => {
  //       clientSocket.emit(
  //         'support:sendMessage',
  //         { message: 'Help' },
  //         (response) => {
  //           expect(response).toEqual({
  //             success: false,
  //             message: 'Ticket ID and message are required',
  //           });
  //           done();
  //         }
  //       );
  //     });
  //
  //     it('should return error when message is missing', (done) => {
  //       clientSocket.emit(
  //         'support:sendMessage',
  //         { ticketId: 'ticket-123' },
  //         (response) => {
  //           expect(response).toEqual({
  //             success: false,
  //             message: 'Ticket ID and message are required',
  //           });
  //           done();
  //         }
  //       );
  //     });
  //   });
  //
  //   describe('support:typing', () => {
  //     it('should broadcast typing indicator', (done) => {
  //       const ticketId = 'ticket-789';
  //
  //       // Create second client to listen for typing
  //       const client2 = Client(`http://localhost:${TEST_PORT}/user`, {
  //         transports: ['websocket'],
  //       });
  //
  //       client2.on('connect', () => {
  //         // Both clients join same chat
  //         clientSocket.emit('support:joinChat', ticketId, () => {
  //           client2.emit('support:joinChat', ticketId, () => {
  //             // Client 2 listens for typing
  //             client2.on('support:userTyping', (data) => {
  //               expect(data).toEqual({
  //                 userId: 'user-123',
  //                 userName: 'Test User',
  //               });
  //               client2.disconnect();
  //               done();
  //             });
  //
  //             // Client 1 starts typing
  //             clientSocket.emit('support:typing', ticketId);
  //           });
  //         });
  //       });
  //     });
  //   });
  // });

  describe('Disconnect Event', () => {
    it('should handle disconnect gracefully', (done) => {
      // Listen for disconnect on server side
      serverSocket.once('disconnect', (reason) => {
        expect(reason).toBe('client namespace disconnect');
        done();
      });

      // Disconnect client
      clientSocket.disconnect();
    });
  });

  describe('Helper Functions', () => {
    describe('sendNotification', () => {
      it('should send notification to specific user', (done) => {
        const userController = require('@socket/controllers/user.controller');
        const userNamespace = io.of('/user');

        const notification = {
          id: 'notif-123',
          title: 'New Booking',
          message: 'Your booking has been confirmed',
        };

        clientSocket.on('notification:new', (data) => {
          expect(data).toEqual(notification);
          done();
        });

        userController.sendNotification(
          userNamespace,
          'user-123',
          notification
        );
      });
    });

    describe('sendBookingUpdate', () => {
      it('should send booking update to user and booking room', (done) => {
        const userController = require('@socket/controllers/user.controller');
        const userNamespace = io.of('/user');
        const bookingId = 'booking-999';

        const updateData = {
          bookingId,
          status: 'confirmed',
          updatedAt: new Date(),
        };

        // Subscribe to booking first
        clientSocket.emit('bookings:subscribe', bookingId, () => {
          clientSocket.on('booking:updated', (data) => {
            expect(data).toMatchObject({
              bookingId,
              status: 'confirmed',
            });
            done();
          });

          userController.sendBookingUpdate(
            userNamespace,
            'user-123',
            bookingId,
            updateData
          );
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle socket errors', (done) => {
      // This would normally be caught by error handler
      // Just verify the socket remains connected
      setTimeout(() => {
        expect(clientSocket.connected).toBe(true);
        done();
      }, 100);
    });

    it('should continue working after an error in one event handler', (done) => {
      // Send invalid data to trigger error
      clientSocket.emit('bookings:subscribe', null, (response) => {
        expect(response.success).toBe(false);

        // Now send valid request
        clientSocket.emit(
          'bookings:subscribe',
          'booking-valid',
          (response2) => {
            expect(response2.success).toBe(true);
            done();
          }
        );
      });
    });
  });

  describe('Multiple Clients', () => {
    it('should handle multiple clients subscribing to same booking', (done) => {
      const client2 = Client(`http://localhost:${TEST_PORT}/user`, {
        transports: ['websocket'],
      });

      client2.on('connect', () => {
        const bookingId = 'booking-shared';
        let receivedCount = 0;

        const checkDone = () => {
          receivedCount++;
          if (receivedCount === 2) {
            client2.disconnect();
            done();
          }
        };

        // Both clients subscribe
        clientSocket.emit('bookings:subscribe', bookingId, checkDone);
        client2.emit('bookings:subscribe', bookingId, checkDone);
      });
    });
  });

  describe('Room Management', () => {
    it('should maintain correct room memberships', (done) => {
      const booking1 = 'booking-001';
      const booking2 = 'booking-002';

      clientSocket.emit('bookings:subscribe', booking1, () => {
        clientSocket.emit('bookings:subscribe', booking2, () => {
          setTimeout(() => {
            expect(serverSocket.rooms.has(`booking_${booking1}`)).toBe(true);
            expect(serverSocket.rooms.has(`booking_${booking2}`)).toBe(true);
            expect(serverSocket.rooms.has('user_user-123')).toBe(true);

            clientSocket.emit('bookings:unsubscribe', booking1, () => {
              setTimeout(() => {
                expect(serverSocket.rooms.has(`booking_${booking1}`)).toBe(
                  false
                );
                expect(serverSocket.rooms.has(`booking_${booking2}`)).toBe(
                  true
                );
                done();
              }, 50);
            });
          }, 50);
        });
      });
    });
  });
});

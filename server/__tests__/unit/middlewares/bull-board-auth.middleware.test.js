const bullBoardAuth = require('@middlewares/bull-board-auth.middleware');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(authorization) {
  return {
    get: (header) => (header.toLowerCase() === 'authorization' ? authorization : undefined),
  };
}

describe('bull-board-auth.middleware', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns 404 when the dashboard is disabled', () => {
    delete process.env.ENABLE_BULL_BOARD;
    const res = makeRes();
    const next = jest.fn();

    bullBoardAuth(makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 503 when enabled without credentials', () => {
    process.env.ENABLE_BULL_BOARD = 'true';
    delete process.env.BULL_BOARD_USERNAME;
    delete process.env.BULL_BOARD_PASSWORD;
    const res = makeRes();

    bullBoardAuth(makeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('rejects a missing/incorrect basic auth header', () => {
    process.env.ENABLE_BULL_BOARD = 'true';
    process.env.BULL_BOARD_USERNAME = 'admin';
    process.env.BULL_BOARD_PASSWORD = 'secret';
    const res = makeRes();

    bullBoardAuth(
      makeReq('Basic ' + Buffer.from('admin:wrong').toString('base64')),
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.set).toHaveBeenCalledWith('WWW-Authenticate', expect.any(String));
  });

  it('calls next with valid basic auth', () => {
    process.env.ENABLE_BULL_BOARD = 'true';
    process.env.BULL_BOARD_USERNAME = 'admin';
    process.env.BULL_BOARD_PASSWORD = 'secret';
    const res = makeRes();
    const next = jest.fn();

    bullBoardAuth(makeReq('Basic ' + Buffer.from('admin:secret').toString('base64')), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

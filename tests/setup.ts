import { tracer } from 'dd-trace';

jest.mock('dd-trace', () => ({
  tracer: {
    startSpan: jest.fn(),
    scope: jest.fn(() => ({
      active: jest.fn(() => ({})),
      activate: jest.fn((span, fn) => fn()),
    })),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
}); 
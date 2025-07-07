import { TraceClass, TraceDecorator } from "../src/index";
import { tracer } from "dd-trace";

// O mock do dd-trace está em tests/setup.ts

describe("TraceClass", () => {
  let mockSpan: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSpan = {
      setTag: jest.fn(),
      finish: jest.fn(),
    };

    (tracer.startSpan as jest.Mock).mockReturnValue(mockSpan);
  });

  describe("Basic class tracing", () => {
    it("should apply tracing to all methods in the class", () => {
      @TraceClass({
        name: "user.service",
        tags: { service: "user-service" },
        includeResultAsTag: true,
      })
      class UserService {
        createUser(data: any) {
          return { id: 123, ...data };
        }

        updateUser(id: number, data: any) {
          return { id, ...data };
        }

        deleteUser(id: number) {
          return { deleted: true, id };
        }
      }

      const service = new UserService();

      // Test all methods
      service.createUser({ name: "John" });
      service.updateUser(123, { name: "Jane" });
      service.deleteUser(456);

      // Verify all methods were traced
      expect(tracer.startSpan).toHaveBeenCalledWith("user.service.createUser", {
        childOf: {},
        tags: { service: "user-service" },
      });

      expect(tracer.startSpan).toHaveBeenCalledWith("user.service.updateUser", {
        childOf: {},
        tags: { service: "user-service" },
      });

      expect(tracer.startSpan).toHaveBeenCalledWith("user.service.deleteUser", {
        childOf: {},
        tags: { service: "user-service" },
      });

      // Verify results were tagged
      expect(mockSpan.setTag).toHaveBeenCalledWith(
        "result",
        expect.stringContaining('"id":123')
      );
    });

    it("should use default naming when no name is provided", () => {
      @TraceClass({
        tags: { service: "test-service" },
      })
      class TestService {
        method1() {
          return "result1";
        }

        method2() {
          return "result2";
        }
      }

      const service = new TestService();
      service.method1();
      service.method2();

      expect(tracer.startSpan).toHaveBeenCalledWith("TestService.method1", {
        childOf: {},
        tags: { service: "test-service" },
      });

      expect(tracer.startSpan).toHaveBeenCalledWith("TestService.method2", {
        childOf: {},
        tags: { service: "test-service" },
      });
    });

    it("should not trace constructor", () => {
      @TraceClass({
        name: "test.service",
      })
      class TestService {
        constructor() {
          // Constructor should not be traced
        }

        method() {
          return "result";
        }
      }

      const service = new TestService();
      service.method();

      // Should only trace the method, not constructor
      expect(tracer.startSpan).toHaveBeenCalledTimes(1);
      expect(tracer.startSpan).toHaveBeenCalledWith("test.service.method", {
        childOf: {},
        tags: {},
      });
    });
  });

  describe("Combination with method decorators", () => {
    it("should allow method decorators to override class settings", () => {
      @TraceClass({
        name: "user.service",
        tags: { service: "user-service" },
        includeResultAsTag: true,
      })
      class UserService {
        // This method will use class settings
        createUser(data: any) {
          return { id: 123, ...data };
        }

        // This method will override class settings
        @TraceDecorator({
          name: "user.service.createWithParams",
          includeParamsAsTags: true,
          tags: { method: "createWithParams" },
        })
        createUserWithParams(data: any) {
          return { id: 456, ...data };
        }
      }

      const service = new UserService();

      service.createUser({ name: "John" });
      service.createUserWithParams({ name: "Jane" });

      // Class method should use class settings
      expect(tracer.startSpan).toHaveBeenCalledWith("user.service.createUser", {
        childOf: {},
        tags: { service: "user-service" },
      });

      // Method decorator should override class settings
      expect(tracer.startSpan).toHaveBeenCalledWith(
        "user.service.createWithParams",
        {
          childOf: {},
          tags: { method: "createWithParams" },
        }
      );

      // Method decorator should include parameters
      expect(mockSpan.setTag).toHaveBeenCalledWith("name", "Jane");
      expect(mockSpan.setTag).toHaveBeenCalledWith(
        "result",
        expect.stringContaining('"id":456')
      );
    });

    it("should preserve method decorator functionality", () => {
      @TraceClass({
        name: "api.service",
        tags: { service: "api-service" },
      })
      class ApiService {
        // Method with specific parameter tracing
        @TraceDecorator({
          includeParamsAsTags: true,
          objectFieldsToInclude: { 0: ["name", "email"] },
          excludeObjectFields: { 0: ["password"] },
        })
        processUser(userData: any) {
          return { processed: true, ...userData };
        }

        // Regular method using class settings
        getStatus() {
          return { status: "ok" };
        }
      }

      const service = new ApiService();

      service.processUser({
        name: "John",
        email: "john@example.com",
        password: "secret123",
      });

      service.getStatus();

      // Method decorator should work with parameter filtering
      expect(mockSpan.setTag).toHaveBeenCalledWith("name", "John");
      expect(mockSpan.setTag).toHaveBeenCalledWith("email", "john@example.com");
      expect(mockSpan.setTag).not.toHaveBeenCalledWith(
        "password",
        expect.anything()
      );

      // Class method should use class settings
      expect(tracer.startSpan).toHaveBeenCalledWith("api.service.getStatus", {
        childOf: {},
        tags: { service: "api-service" },
      });
    });
  });

  describe("Error handling", () => {
    it("should handle errors in class methods", () => {
      @TraceClass({
        name: "error.service",
      })
      class ErrorService {
        throwError() {
          throw new Error("Test error");
        }

        async throwAsyncError() {
          throw new Error("Async error");
        }
      }

      const service = new ErrorService();

      // Test synchronous error
      expect(() => service.throwError()).toThrow("Test error");
      expect(mockSpan.setTag).toHaveBeenCalledWith("error", true);
      expect(mockSpan.setTag).toHaveBeenCalledWith(
        "error.message",
        "Test error"
      );

      // Reset mocks
      jest.clearAllMocks();
      (tracer.startSpan as jest.Mock).mockReturnValue(mockSpan);

      // Test asynchronous error
      expect(service.throwAsyncError()).rejects.toThrow("Async error");
    });
  });

  describe("Async methods", () => {
    it("should handle async methods correctly", async () => {
      @TraceClass({
        name: "async.service",
        includeResultAsTag: true,
      })
      class AsyncService {
        async fetchData() {
          return { data: "test" };
        }

        async processData(data: any) {
          return { processed: data };
        }
      }

      const service = new AsyncService();

      await service.fetchData();
      await service.processData({ test: "value" });

      expect(tracer.startSpan).toHaveBeenCalledWith("async.service.fetchData", {
        childOf: {},
        tags: {},
      });

      expect(tracer.startSpan).toHaveBeenCalledWith(
        "async.service.processData",
        {
          childOf: {},
          tags: {},
        }
      );

      expect(mockSpan.setTag).toHaveBeenCalledWith(
        "result",
        expect.stringContaining('"data":"test"')
      );
    });
  });

  describe("Performance", () => {
    it("should not significantly impact performance", () => {
      @TraceClass({
        name: "perf.service",
      })
      class PerformanceService {
        fastMethod() {
          return "fast";
        }
      }

      const service = new PerformanceService();
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        service.fastMethod();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should execute in less than 100ms (very conservative)
      expect(duration).toBeLessThan(100);
    });
  });
});

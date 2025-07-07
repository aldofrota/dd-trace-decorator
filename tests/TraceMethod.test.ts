import { TraceMethod } from '../src/index';
import { tracer } from 'dd-trace';

describe('TraceMethod', () => {
  let mockSpan: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSpan = {
      setTag: jest.fn(),
      finish: jest.fn(),
    };
    
    (tracer.startSpan as jest.Mock).mockReturnValue(mockSpan);
  });

  describe('Basic configuration', () => {
    it('should create a span with default name when not specified', () => {
      class TestClass {
        @TraceMethod()
        testMethod() {
          return 'test';
        }
      }

      const instance = new TestClass();
      instance.testMethod();

      expect(tracer.startSpan).toHaveBeenCalledWith('TestClass.testMethod', {
        childOf: {},
        tags: {},
      });
    });

    it('should create a span with a custom name', () => {
      class TestClass {
        @TraceMethod({ name: 'custom.span.name' })
        testMethod() {
          return 'test';
        }
      }

      const instance = new TestClass();
      instance.testMethod();

      expect(tracer.startSpan).toHaveBeenCalledWith('custom.span.name', {
        childOf: {},
        tags: {},
      });
    });

    it('should add static tags', () => {
      class TestClass {
        @TraceMethod({ 
          tags: { 
            service: 'test-service',
            version: '1.0.0' 
          } 
        })
        testMethod() {
          return 'test';
        }
      }

      const instance = new TestClass();
      instance.testMethod();

      expect(tracer.startSpan).toHaveBeenCalledWith('TestClass.testMethod', {
        childOf: {},
        tags: { service: 'test-service', version: '1.0.0' },
      });
    });
  });

  describe('Parameter inclusion', () => {
    it('should include parameters as tags when includeParamsAsTags is true', () => {
      class TestClass {
        @TraceMethod({ includeParamsAsTags: true })
        testMethod(param1: string, param2: number) {
          return `${param1}-${param2}`;
        }
      }

      const instance = new TestClass();
      instance.testMethod('hello', 42);

      expect(mockSpan.setTag).toHaveBeenCalledWith('arg0', 'hello');
      expect(mockSpan.setTag).toHaveBeenCalledWith('arg1', 42);
    });

    it('should use custom names for arguments', () => {
      class TestClass {
        @TraceMethod({ 
          includeParamsAsTags: true,
          argsMap: ['message', 'count']
        })
        testMethod(param1: string, param2: number) {
          return `${param1}-${param2}`;
        }
      }

      const instance = new TestClass();
      instance.testMethod('hello', 42);

      expect(mockSpan.setTag).toHaveBeenCalledWith('message', 'hello');
      expect(mockSpan.setTag).toHaveBeenCalledWith('count', 42);
    });

    it('should use default name for single argument', () => {
      class TestClass {
        @TraceMethod({ 
          includeParamsAsTags: true,
          defaultParamName: 'data'
        })
        testMethod(data: string) {
          return data;
        }
      }

      const instance = new TestClass();
      instance.testMethod('hello');

      expect(mockSpan.setTag).toHaveBeenCalledWith('data', 'hello');
    });
  });

  describe('Specific argument filters', () => {
    it('should include only specific arguments', () => {
      class TestClass {
        @TraceMethod({ 
          includeParamsAsTags: true,
          includeSpecificArgs: [0, 2]
        })
        testMethod(param1: string, param2: number, param3: boolean) {
          return `${param1}-${param2}-${param3}`;
        }
      }

      const instance = new TestClass();
      instance.testMethod('hello', 42, true);

      expect(mockSpan.setTag).toHaveBeenCalledWith('arg0', 'hello');
      expect(mockSpan.setTag).toHaveBeenCalledWith('arg2', true);
      expect(mockSpan.setTag).not.toHaveBeenCalledWith('arg1', '42');
    });

    it('should include specific object fields', () => {
      class TestClass {
        @TraceMethod({ 
          includeParamsAsTags: true,
          objectFieldsToInclude: { 0: ['name', 'age'] }
        })
        testMethod(user: any) {
          return user.name;
        }
      }

      const instance = new TestClass();
      instance.testMethod({ name: 'John', age: 30, email: 'john@example.com' });

      expect(mockSpan.setTag).toHaveBeenCalledWith('name', 'John');
      expect(mockSpan.setTag).toHaveBeenCalledWith('age', 30);
      expect(mockSpan.setTag).not.toHaveBeenCalledWith('email', expect.anything());
    });

    it('should exclude specific object fields', () => {
      class TestClass {
        @TraceMethod({ 
          includeParamsAsTags: true,
          excludeObjectFields: { 0: ['password', 'secret'] }
        })
        testMethod(user: any) {
          return user.name;
        }
      }

      const instance = new TestClass();
      instance.testMethod({ 
        name: 'John', 
        age: 30, 
        password: 'secret123',
        secret: 'hidden'
      });

      expect(mockSpan.setTag).toHaveBeenCalledWith('name', 'John');
      expect(mockSpan.setTag).toHaveBeenCalledWith('age', 30);
      expect(mockSpan.setTag).not.toHaveBeenCalledWith('password', expect.anything());
      expect(mockSpan.setTag).not.toHaveBeenCalledWith('secret', expect.anything());
    });

    it('should ignore non-existent fields when specifying objectFieldsToInclude', () => {
      class TestClass {
        @TraceMethod({ 
          includeParamsAsTags: true,
          objectFieldsToInclude: { 0: ['name', 'age', 'email', 'phone'] }
        })
        testMethod(user: any) {
          return user.name;
        }
      }

      const instance = new TestClass();
      instance.testMethod({ name: 'John', age: 30 });

      // Should include existing fields
      expect(mockSpan.setTag).toHaveBeenCalledWith('name', 'John');
      expect(mockSpan.setTag).toHaveBeenCalledWith('age', 30);
      
      // Should NOT include non-existent fields
      expect(mockSpan.setTag).not.toHaveBeenCalledWith('email', expect.anything());
      expect(mockSpan.setTag).not.toHaveBeenCalledWith('phone', expect.anything());
      
      // Should NOT create empty tags for non-existent fields
      expect(mockSpan.setTag).not.toHaveBeenCalledWith('email', '');
      expect(mockSpan.setTag).not.toHaveBeenCalledWith('phone', undefined);
    });

    it('should handle mixed existing and non-existing fields in objectFieldsToInclude', () => {
      class TestClass {
        @TraceMethod({ 
          includeParamsAsTags: true,
          objectFieldsToInclude: { 0: ['id', 'name', 'email', 'role', 'department'] }
        })
        testMethod(user: any) {
          return user.name;
        }
      }

      const instance = new TestClass();
      instance.testMethod({ 
        id: 1, 
        name: 'John', 
        role: 'admin',
        // email and department don't exist
      });

      // Should include existing fields
      expect(mockSpan.setTag).toHaveBeenCalledWith('id', 1);
      expect(mockSpan.setTag).toHaveBeenCalledWith('name', 'John');
      expect(mockSpan.setTag).toHaveBeenCalledWith('role', 'admin');
      
      // Should NOT include non-existent fields
      expect(mockSpan.setTag).not.toHaveBeenCalledWith('email', expect.anything());
      expect(mockSpan.setTag).not.toHaveBeenCalledWith('department', expect.anything());
    });
  });

  describe('Result inclusion', () => {
    it('should include result as tag when includeResultAsTag is true', () => {
      class TestClass {
        @TraceMethod({ includeResultAsTag: true })
        testMethod() {
          return 'test result';
        }
      }

      const instance = new TestClass();
      instance.testMethod();

      expect(mockSpan.setTag).toHaveBeenCalledWith('result', 'test result');
    });

    it('should include Promise result', async () => {
      class TestClass {
        @TraceMethod({ includeResultAsTag: true })
        async testMethod() {
          return 'async result';
        }
      }

      const instance = new TestClass();
      await instance.testMethod();

      expect(mockSpan.setTag).toHaveBeenCalledWith('result', 'async result');
    });
  });

  describe('Error handling', () => {
    it('should capture and mark errors', () => {
      class TestClass {
        @TraceMethod()
        testMethod() {
          throw new Error('Test error');
        }
      }

      const instance = new TestClass();

      expect(() => instance.testMethod()).toThrow('Test error');
      expect(mockSpan.setTag).toHaveBeenCalledWith('error', true);
      expect(mockSpan.setTag).toHaveBeenCalledWith('error.message', 'Test error');
      expect(mockSpan.setTag).toHaveBeenCalledWith('error.type', 'Error');
    });

    it('should capture errors in Promises', async () => {
      class TestClass {
        @TraceMethod()
        async testMethod() {
          throw new Error('Async error');
        }
      }

      const instance = new TestClass();

      await expect(instance.testMethod()).rejects.toThrow('Async error');
      expect(mockSpan.setTag).toHaveBeenCalledWith('error', true);
      expect(mockSpan.setTag).toHaveBeenCalledWith('error.message', 'Async error');
    });
  });

  describe('Behavior without active span', () => {
    it('should execute method normally when there is no active span', () => {
      (tracer.scope as jest.Mock).mockReturnValue({
        active: jest.fn(() => null),
        activate: jest.fn((span, fn) => fn()),
      });

      class TestClass {
        @TraceMethod()
        testMethod() {
          return 'test';
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod();

      expect(result).toBe('test');
      expect(tracer.startSpan).not.toHaveBeenCalled();
      
      (tracer.scope as jest.Mock).mockReturnValue({
        active: jest.fn(() => ({})),
        activate: jest.fn((span, fn) => fn()),
      });
    });
  });

  describe('Safe serialization', () => {
    it('should serialize complex objects', () => {
      class TestClass {
        @TraceMethod({ includeParamsAsTags: true })
        testMethod(data: any) {
          return data;
        }
      }

      const complexObject = {
        name: 'John',
        age: 30,
        hobbies: ['reading', 'gaming'],
        address: {
          street: '123 Main St',
          city: 'New York'
        }
      };

      const instance = new TestClass();
      instance.testMethod(complexObject);

      expect(mockSpan.setTag).toHaveBeenCalledWith('name', 'John');
      expect(mockSpan.setTag).toHaveBeenCalledWith('age', 30);
      expect(mockSpan.setTag).toHaveBeenCalledWith('hobbies', '["reading","gaming"]');
    });

    it('should handle non-serializable objects', () => {
      class TestClass {
        @TraceMethod({ includeParamsAsTags: true })
        testMethod(data: any) {
          return data;
        }
      }

      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      const instance = new TestClass();
      instance.testMethod(circularObject);

      expect(mockSpan.setTag).toHaveBeenCalledWith('name', 'test');
      expect(mockSpan.setTag).toHaveBeenCalledWith('self', '[unserializable]');
    });
  });

  describe('Span finalization', () => {
    it('should finalize span after synchronous execution', () => {
      class TestClass {
        @TraceMethod()
        testMethod() {
          return 'test';
        }
      }

      const instance = new TestClass();
      instance.testMethod();

      expect(mockSpan.finish).toHaveBeenCalled();
    });

    it('should finalize span after asynchronous execution', async () => {
      class TestClass {
        @TraceMethod()
        async testMethod() {
          return 'test';
        }
      }

      const instance = new TestClass();
      await instance.testMethod();

      expect(mockSpan.finish).toHaveBeenCalled();
    });
  });
}); 
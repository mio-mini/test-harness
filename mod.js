export const isDeno = typeof Deno === "object";
export const isBrowser = typeof window !== "undefined" && !isDeno;

class AssertionError extends Error {}

const filename = () => {
  try {
    throw new "Antani"();
  } catch (e) {
    return e.stack.match(/[^/]+_test.js/)?.[0];
  }
};

const suite = {
  tests: new Map(),
  totalCount: 0,
  set() {
    let name = filename();

    if (!suite.tests.has(name)) {
      suite.tests.set(name, { failed: 0, passed: 0, count: 0, time: 0 });
    }

    suite.tests.get(name).count++;
    suite.totalCount++;
    return name;
  },

  get(testFile) {
    return suite.tests.get(testFile);
  },

  done(current) {
    --suite.totalCount;
    if (suite.loaded && !suite.totalCount) {
      let failed = 0;
      let passed = 0;
      let time = 0;

      for (let [_, t] of suite.tests.entries()) {
        time += t.time;
        failed += t.failed;
        passed += t.passed;
      }

      console.info(
        `%c${
          !failed ? "ok" : "FAILED"
        }%c | ${passed} passed | ${failed} failed | %c(${time} ms)`,
        failed ? "color:red" : "color:green",
        "color:black",
        "color:gray"
      );
    }
  },
};

onload = () => (suite.loaded = true);

export const test = isDeno
  ? Deno?.test
  : async function test(name, fn) {
      const testFile = suite.set();

      let time = Date.now();
      let errors = [],
        assertions = [];

      try {
        await fn();
      } catch (e) {
        if (e instanceof AssertionError) {
          assertions.push(e.message);
        } else {
          errors.push(e.message);
        }
      } finally {
        time = Date.now() - time;
      }
      const current = suite.get(testFile);
      if (current.failed + current.passed === 0) {
        console.log(
          `%crunning ${current.count} tests from ${testFile}`,
          "color:gray"
        );
      }

      current.time += time;

      if (assertions.length || errors.length) {
        current.failed++;
        console.info(
          `${name} ... %cFAILED %c(${time} ms)`,
          "color:red",
          "color:gray"
        );
        assertions.forEach(msg => console.assert(false, msg));
        errors.forEach(msg => console.assert(false, msg));
      } else {
        current.passed++;
        console.info(
          `${name} ... %cok %c(${time} ms)`,
          "color:green",
          "color:gray"
        );
      }

      suite.done(current);
    };

export const assert = isDeno
  ? await import("https://deno.land/std@0.210.0/assert/mod.ts").then(
      ({ assert, assertEquals, assertRejects }) => ({
        ok: assert,
        equal: assertEquals,
        reject: assertRejects,
      })
    )
  : {
      ok(value, message) {
        if (!value) {
          throw new AssertionError(`Expected ${value} `);
        }
      },
      equal(a, b, message) {
        if (a !== b) {
          throw new AssertionError(`Left: ${a}, Right: ${b} `);
        }
      },
      async reject(fn) {
        try {
          await fn();
          throw new AssertionError("Should have failed");
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
        }
      },
    };

if (isDeno) {
  globalThis.addEventListener("unhandledrejection", e => e.preventDefault());
}

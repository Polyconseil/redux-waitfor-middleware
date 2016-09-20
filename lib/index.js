'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createWaitForMiddleware;

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function createWaitForMiddleware() {
  var _this = this;

  /**
   * Array of actions recorded by the middleware since the last clean() :
   */
  var records = [];

  /**
   * List of Promises resolvers that are called each time an action is dispatched :
   */
  var waitedQueue = [];

  /**
   * Keep track of emitted promises so we can give them an id and find them in the waited list :
   * @type {number}
   */
  var emittedPromises = 0;

  /**
   * Remove a specific resolver from the waited queue :
   * @param id int
   */
  var removeResolver = function removeResolver(id) {
    waitedQueue.splice(waitedQueue.findIndex(function (resolver) {
      return resolver.id = id;
    }), 1);
  };

  /**
   * Match an array of actions against the list of recorded actions
   * If any of the required actions is not found, will return null
   */
  var findRecorded = function findRecorded(actions) {
    // Find records in the history matching the waited actions :
    var matches = [];

    actions.forEach(function (actionType) {
      var c = records.find(function (record) {
        return record.type && record.type === actionType;
      });
      if (c) matches.push(c);
    });

    // Checking every waited action was matched :
    if (actions.every(function (type) {
      return matches.find(function (match) {
        return match.type === type;
      });
    })) {
      return matches;
    }
    return null;
  };

  /**
   * Redux middleware function :
   */
  var middleware = function middleware() {
    return function (next) {
      return function (action) {
        records.push(action);
        waitedQueue.forEach(function (waited) {
          waited.resolver();
        });
        return next(action);
      };
    };
  };

  /**
   * Clear the recorded actions array AND the waited actions queue :
   */
  middleware.clean = function () {
    records = [];
    waitedQueue = [];
  };

  /**
   * Method exposed to allow waiting for a set of actions to be received.
   * Its returned Promise :
   * - resolves with the actions received (including payloads) if the required actions are found within timeout
   * - rejects otherwise (timeout elapsed && actions not found)
   * @param actions Array<string> Types of the waited actions
   * @param timeout int Timeout before failing in ms
   * @returns {Promise}
   */
  middleware.waitFor = function () {
    var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(actions) {
      var timeout = arguments.length <= 1 || arguments[1] === undefined ? 2000 : arguments[1];
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              emittedPromises++;
              return _context.abrupt('return', new Promise(function (resolve, reject) {
                // Match recorded actions with those we are waiting for :
                var matches = findRecorded(actions);

                // Resolving if the actions have all happened already :
                if (matches) {
                  // XXX .length ?
                  resolve(actions);
                } else {
                  (function () {
                    // Setting timeout for rejection :
                    setTimeout(function () {
                      reject(new Error('Redux Recorder : One of the following actions was not dispatched before specified timeout was elapsed\n[' + actions.toString() + ']'));
                    }, timeout);

                    // Keeping track of the resolver's id to be able to remove it when it succeeds
                    var id = emittedPromises;
                    var resolver = function resolver() {
                      var resolverMatches = findRecorded(actions);
                      if (resolverMatches) {
                        // XXX .length ?
                        removeResolver(id);
                        resolve(resolverMatches); // Resolving with the received actions
                      }
                    };

                    // Pushing the resolver for this waiter in the queue read by the middleware :
                    waitedQueue.push({
                      resolver: resolver,
                      id: id
                    });
                  })();
                }
              }));

            case 2:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, _this);
    }));

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }();

  return middleware;
}
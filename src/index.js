// @flow

export default function createWaitForMiddleware(verbose: bool) {
  if (verbose) {
    console.log('WaitForMiddleware - created'); // eslint-disable-line no-console
  }

  /**
   * Array of actions recorded by the middleware since the last clean() :
   */
  let records: Array<Object> = [];

  /**
   * List of Promises resolvers that are called each time an action is dispatched :
   */
  let waitedQueue: Array<{ resolver: (p: void) => void, id: number}> = [];

  /**
   * Keep track of emitted promises so we can give them an id and find them in the waited list :
   * @type {number}
   */
  let emittedPromises = 0;

  /**
   * Remove a specific resolver from the waited queue :
   * @param id int
   */
  const removeResolver = (id: number) => {
    waitedQueue.splice(waitedQueue.findIndex(resolver => {
      return resolver.id = id;
    }), 1);
  };

  /**
   * Match an array of actions against the list of recorded actions
   * If any of the required actions is not found, will return null
   */
  const findRecorded = (actions: Array<string>): ? Array<Object> => {
    // Find records in the history matching the waited actions :
    const matches = [];

    actions.forEach(actionType => {
      const c = (records.find(record => {
        return record.type && (record.type === actionType);
      }));
      if (c) matches.push(c);
    });

    // Checking every waited action was matched :
    if (actions.every(type => matches.find(match => match.type === type))) {
      return matches;
    }
    return null;
  };

  /**
   * Redux middleware function :
   */
  const middleware = () => (next: (action: Object) => Object) => (action: Object) => {
    if (verbose) {
      console.log(`WaitForMiddleware - Received action : ${action.type}`); // eslint-disable-line no-console
    }
    records.push(action);
    waitedQueue.forEach(waited => {
      waited.resolver();
    });
    return next(action);
  };

  /**
   * Clear the recorded actions array AND the waited actions queue :
   */
  middleware.clean = () => {
    records = [];
    waitedQueue = [];
  };

  /**
   * Clear the recorded actions array AND the waited actions queue :
   */
  middleware.getRecordedActions = () => {
    return this.records;
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
  middleware.waitFor = async(actions: Array<string>, timeout: number = 2000) => {
    emittedPromises++;
    return new Promise((resolve, reject) => {
      // Match recorded actions with those we are waiting for :
      const matches = findRecorded(actions);

      // Resolving if the actions have all happened already :
      if (matches) { // XXX .length ?
        resolve(actions);
      } else {
        // Setting timeout for rejection :
        setTimeout(() => {
          reject(new Error('Redux Recorder : One of the following actions was not dispatched before specified timeout was elapsed\n[' + actions.toString() + ']'));
        }, timeout);

        // Keeping track of the resolver's id to be able to remove it when it succeeds
        const id = emittedPromises;
        const resolver = () => {
          const resolverMatches = findRecorded(actions);
          if (resolverMatches) { // XXX .length ?
            removeResolver(id);
            resolve(resolverMatches); // Resolving with the received actions
          }
        };

        // Pushing the resolver for this waiter in the queue read by the middleware :
        waitedQueue.push({
          resolver,
          id,
        });
      }
    });
  };

  return middleware;
}

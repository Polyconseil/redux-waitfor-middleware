# redux-waitfor-middleware

Lightweight Redux middleware to wait for specific actions to be dispatched. Very useful for testing purposes.

## Installation

```
npm install redux-waitfor-middleware
```

## Usage

Inject Waitfor Middleware in your modules (or React components) to start recording actions.
Then, you can use it in tests to wait for a given action to be dispatched before a given delay.

```javascript
import createWaitForMiddleware from 'redux-waitfor-middleware';
import {createStore} from 'redux';
  
const reducers = [
  /* import your reducers */
];
const initialState = {
  /* Initial state store */
};

const waitForMiddleware = createWaitForMiddleware();

const store = applyMiddleware(waitForMiddleware)(createStore)(reducers, initialState);
```

The waitFor middleware has started recording ! You can then use its `waitFor` method to wait asynchronously for some actions to be dispatched :

```javascript
/**
* Allows to await FOO_ACTION and BAR_ACTION actions to be dispatched :
*/
async function requiredActionsDispatched() {
  await waitForMiddleware.waiFor([
    'FOO_ACTION',
    'BAR_ACTION'
  ]);
}
```

**Heads up !** If the actions have already been dispatched since the last call to `clean`, the method will immediately resolve with the payload of the actions found in its records.  

This kind of method is very useful in cases where you want to test that a part of your app that might take some time to respond, for example your back-end, replies accordingly.  
Check-list :
- [x] you are able to fire a call to the back end in your test (you may be achieving this by simulating UI interaction)
- [x] you are dispatching an action when a receiving a response from the back-end, whose payload is the content of the response

```javascript
describe('Potatoes list', () => {
  it('should load a list of 5 potatoes', async () => {
    // fire a request to the back-end, for example by simulating
    // a click on the "load potaotes" button
    
    // This line will throw an Error if the POTATOES_RECEIVED action is not dispatched
    // before 5000 ms, marking the test as failed :
    const potaoesActions = await waitForMiddleware.waitFor(['POTATOES_RECEIVED'], 5000);
    
    // If the action is dispatched, you will now be able to make assertions on its payload :
    
    // waitFor resolves on an array of matching actions, but we only wait for one action to be dispatched, hence this assertion :
    assert(potaoesActions.length === 1);
    const potatoesList = potaoesActions[0].potatoesList;
    assert(potatoesList.length === 5);
  });
});
```

## API

The object returned by the `createWaitForMiddleware` method exposes the following methods :

### `async waitFor(actions, timeout)`

Wait asynchronously for `actions` to be dispatched.  
**Heads up !** If the actions have already been dispatched since the last call to `clean`, the method will immediately resolve with the payload of the actions found in its records.   

- `actions: Array<String>` : Actions types you are waiting for.
- `timeout: number` : the timeout, in ms, after which waitFor will throw an Error. Default value : 2000.


### `clean()`

Cleans the recorded actions history. This allows to avoid side effects between several test cases (see "Heads up !" above).

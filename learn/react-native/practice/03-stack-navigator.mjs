// Lesson 03: a stack navigator is a list of screens. The last one is the screen you see.
// Each route is { name, params }.

export function createNavigator(initialName, initialParams = {}) {
  // keep the routes here, for example: let routes = [{ name: initialName, params: initialParams }];

  return {
    // Add a route on top. Always.
    push(name, params = {}) {
      // your code here
    },
    // Add a route only if the current route has a different name. If you are already
    // on that name, change nothing.
    navigate(name, params = {}) {
      // your code here
    },
    // Remove the top route. Never remove the last one.
    goBack() {
      // your code here
    },
    // Go back to the nearest earlier route with this name (look from the top).
    // If there is none, change nothing.
    popTo(name) {
      // your code here
    },
    // Keep only the first route.
    popToTop() {
      // your code here
    },
    // Swap the top route for a new one.
    replace(name, params = {}) {
      // your code here
    },
    // Merge new params into the current route's params.
    setParams(partial) {
      // your code here
    },
    // Return { index, routes }. Return copies, so the caller cannot change your list.
    getState() {
      // your code here
    },
    // Return the top route as { name, params }.
    getCurrent() {
      // your code here
    },
  };
}

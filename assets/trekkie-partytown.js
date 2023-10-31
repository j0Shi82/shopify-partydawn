function beforeScriptExecuteListener(evt) {
  if (node.getAttribute('type') === 'text/partytown') {
    evt.preventDefault();
  }
  node.removeEventListener('beforescriptexecute', beforeScriptExecuteListener);
}

(function () {
  try {
    var targetNode = document.getElementsByTagName('head')[0];
    var config = { attributes: true, childList: true, subtree: false };

    var callback = (mutationList, observer) => {
      for (var mutation of mutationList) {
        if (mutation.type === 'childList') {
          for (var addedNode of mutation.addedNodes) {
            if (
              addedNode.nodeType === 1 &&
              addedNode.tagName === 'SCRIPT' &&
              !addedNode.classList.contains('headobs-ignore') &&
              !addedNode.getAttribute('src') &&
              addedNode.classList.contains('analytics')
            ) {
              addedNode.type = 'text/partytown';
              addedNode.addEventListener('beforescriptexecute', beforeScriptExecuteListener);
            }

            if (
              addedNode.nodeType === 1 &&
              addedNode.tagName === 'SCRIPT' &&
              !addedNode.classList.contains('headobs-ignore') &&
              !addedNode.getAttribute('src') &&
              !addedNode.classList.contains('analytics') &&
              addedNode.textContent.includes('ShopifyAnalytics')
            ) {
              var firstScript = document.getElementsByTagName('script')[0];
              var newScript = document.createElement('script');
              newScript.type = 'text/javascript';
              newScript.classList.add('headobs-ignore');
              newScript.text = addedNode.textContent;
              firstScript.parentNode.insertBefore(newScript, firstScript);

              addedNode.type = 'text/partytown';
              addedNode.addEventListener('beforescriptexecute', beforeScriptExecuteListener);
            }
          }
        }
      }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
  } catch (e) {
    console.error(e);
  }
})();

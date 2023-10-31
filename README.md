# Partydawn

Example of Shopify's [Dawn theme](https://github.com/Shopify/dawn) working with [Partytown](https://partytown.builder.io/).

Currently included in this repo are four different ways of how to integrate Partytown:

- GTM (through Shopify's Web Pixel)
- Matomo (working without consent)
- Klaviyo (dynamically injected based on consent)
- Trekkie (altered Shopify's own tracking to work with Partytown)

## Usage

- Clone the repo
- Add your own account IDs to GTM, Matomo, and Klaviyo or delete the corresponding code snippets
- `shopify theme dev --store=YOUR_STORE`
- [Set up a partytown proxy worker and app proxy](https://github.com/edlaver/cloudflare-worker-partytown-shopify-app-proxy/tree/main)
  - Note: a skeleton app is fine for this because you really only need the proxy settings. [Using the CLI](https://shopify.dev/docs/apps/tools/cli#getting-started) is the easiest option
- Create a new Custom Web Pixel with the contents of `backend/pixel/gtm.js`
- Add the contents of `backend/checkout/additional.liquid` to `Settings-> Checkout -> Order Status Page Additional Scripts`

## Google Tag Manager

- `snippets/header-partytown-analytics.liquid`
- `snippets/global-partytown.liquid`
- `backend/pixel/gtm.js`

Shopify uses [Web Pixels](https://shopify.dev/docs/apps/marketing/pixels) to hook into [customer events](https://shopify.dev/docs/api/web-pixels-api/standard-events). Although Web Pixels are JavaScript snippets, you can't get Partytown to work because it's a sandboxed environment in an iframe without access to the top frame. To install the Tag Manager inside the Pixel I basically followed the [official documentation](https://help.shopify.com/en/manual/promoting-marketing/pixels/custom-pixels/gtm-tutorial), with the exception that we obvsiously don't want to load the GTM script directly in the sandbox.

Instead we inject the script as `text/partytown` in the regular page and create an event bridge between the Pixel and the main page using the sessionStorage that is available in the Pixel. We push events in the storage, pick them up on the main page, and forward them to Partytown:

``` js
// inside the Pixel
browser.sessionStorage.setItem(`pt_dl_` + inc++, JSON.stringify(data));

// on the main page
function isSessionStorageAvailable() {
  var test = 'test';
  try {
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

if (isSessionStorageAvailable()) {
  var inc = 0;
  window.setInterval(function () {
    while (sessionStorage.getItem('pt_dl_' + inc) !== null) {
      window.dataLayer.push(JSON.parse(sessionStorage.getItem('pt_dl_' + inc)));
      sessionStorage.removeItem('pt_dl_' + inc);
      inc++;
    }
  }, 1000);
}
```

If sessionStorage is not available the Pixel installs the GTM conventionally. This is also done on checkout pages which can't be directly controlled through the theme.

Web Pixel play nicely with the integrated consent. They follow the rules defined on `Sales Channels -> Online Store -> Preferences -> Customer Privacy`. Whenever it feels appropriate to hook into Shopify's customer events for a tracking purposes, this is the way to go.

## Matomo

- `snippets/global-partytown.liquid`
- `snippets/matomo-tracking.liquid`
- `backend/checkout/additional.liquid`

There might be tracking that you can run regardless of the consent. You can just add it as `text/partytown` and Partytown will pick it up. Please note that you need to add additional tracking inside `Settings-> Checkout -> Order Status Page Additional Scripts`. This enables you to track the checkout as well. Unfortnuately we can't use Pixels here because they only run when the user consents. There is no way to add Pixels based on the user consent. This also means you unfortunaly cannot track any checkout sub steps, just the conversion. But in most cases this should be fine.

## Klaviyo

- `snippets/global-partytown.liquid`
- `snippets/klaviyo-tracking.liquid`

There's also tracking that works outside Shopify's consumer events, but needs to respect user consent. Klaviyo is such an example. It's already [known](https://partytown.builder.io/common-services) to work with Partytown and can be integrated easily. You just have to use the [Customer Privacy API](https://shopify.dev/docs/api/consent-tracking) that Shopify offers.

```js
(async function () {
  function waitForCustomerPrivacy() {
    return new Promise(function (resolve) {
    var interval = setInterval(function () {
        if (window.Shopify && window.Shopify.customerPrivacy) {
        clearInterval(interval);
        resolve();
        }
    }, 100);
    });
  }

  await waitForCustomerPrivacy();

  if (window.Shopify.customerPrivacy.thirdPartyMarketingAllowed()) {
    startKl()
  } else {
    document.addEventListener("visitorConsentCollected", function(event) {
    if (event.detail.thirdPartyMarketingAllowed) {
        startKl()
    }
    });
  }
})();
```

Note that the functions expects another script to init the API as described [here](https://shopify.dev/docs/api/consent-tracking#loading-the-customer-privacy-api), but you can also do this yourself. Usually the consent integration / app takes care of it. For Klaviyo you need to follow the official [integration guide](https://help.klaviyo.com/hc/en-us/articles/115005080407), but don't use the App Embed.

Also remember to [inform Partytown](https://partytown.builder.io/partytown-scripts#dynamically-appending-scripts) that Klaviyo has been added:

```js
window.dispatchEvent(new CustomEvent('ptupdate'));
```

## Trekkie

- `snippets/global-partytown.liquid`
- `assets/trekkie-partytown.js`

Trekkie is Shopify's own tracking and gets loaded as part of the `content_for_header` blackbox. We can thankfully still manipulate inline scripts using a [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver). Changing the type to `text/partytown` will prevent script execution and the script will instead be processed by Partytown. You need to rewire a couple more inline scripts as shown in `assets/trekkie-partytown.js`. Any script containing `ShopifyAnalytics` needs to get added to the Partytown instance and remain on the main page. Otherwise the site starts to throw errors. I'm not 100% sure everything that Trekkie is supposed to do still works, so treat this one with caution.
# Partydawn

Example of Shopify's [Dawn theme](https://github.com/Shopify/dawn) working with [Partytown](https://partytown.builder.io/). Example site is up at https://partydawn.myshopify.com (password: partydawn).

Currently included in this repo are four different ways of how to integrate Partytown:

- GTM (through Shopify's Web Pixel)
- Matomo (working without consent)
- Klaviyo (dynamically injected based on consent)
- Trekkie (altered Shopify's own tracking to work with Partytown)
  - Official Google Analytics 4 Integration
  - Official Facebook Integration

## Usage

- Clone the repo
- Set up a Shopify development store with an app that manages cookie consent (the example uses Consentmo)
- `shopify theme dev --store=YOUR_STORE`
- [Set up a partytown proxy worker and app proxy](https://github.com/edlaver/cloudflare-worker-partytown-shopify-app-proxy/tree/main)
  - Note: a skeleton app is fine for this because you really only need the proxy settings. [Using the CLI](https://shopify.dev/docs/apps/tools/cli#getting-started) is the easiest option
- Create a new Custom Web Pixel with the contents of `backend/pixel/gtm.js`
- Add the contents of `backend/checkout/additional.liquid` to `Settings-> Checkout -> Order Status Page Additional Scripts`
- Connect Google Analytics using the [official integration](https://help.shopify.com/en/manual/reports-and-analytics/google-analytics/google-analytics-setup)
- Connect Facebook using the [official integration](https://help.shopify.com/en/manual/promoting-marketing/analyze-marketing/meta-pixel)
- Go to the `Theme Customizer -> Theme Settings -> Partydawn` and fill out the settings as needed

### Manually Open the Consent

When using Consentmo and want to test different settings with tracking, you can open your browser's developer console and invoke `showPreferences()`. It works differently with other cookie consent apps. I only mention this because adding a button to reopen consent is a premium feature within Consentmo and I was lazy enough not to add a button myself.

## Google Tag Manager

- `snippets/header-partytown-analytics.liquid`
- `snippets/global-partytown.liquid`
- `backend/pixel/gtm.js`

Shopify uses [Web Pixels](https://shopify.dev/docs/apps/marketing/pixels) to hook into [customer events](https://shopify.dev/docs/api/web-pixels-api/standard-events). Although Web Pixels are JavaScript snippets, you can't get Partytown to work because it's a sandboxed environment in an iframe without access to the top frame. To install the Tag Manager inside the Pixel I basically followed the [official documentation](https://help.shopify.com/en/manual/promoting-marketing/pixels/custom-pixels/gtm-tutorial), with the exception that we don't want to load the GTM script directly in the sandbox.

Instead we inject the script as `text/partytown` in the regular page and create an event bridge between the Pixel and the main page using the sessionStorage that is available in the Pixel. We push events in the storage, pick them up on the main page, and forward them to Partytown:

```js
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

If sessionStorage is not available the Pixel installs the GTM conventionally. This is also done on checkout pages which can't be directly controlled.

Web Pixel play nicely with the integrated consent. They follow the rules defined on `Sales Channels -> Online Store -> Preferences -> Customer Privacy`. Whenever it feels appropriate to hook into Shopify's customer events for tracking purposes, this is the way to go.

You can certainly also use `window.postMessage` to build an event bridge between the Web Pixel (iframe) and the top frame. But I chose sessionStorage since it's directly supported by the Web Pixel API.

## Matomo

- `snippets/global-partytown.liquid`
- `snippets/matomo-tracking.liquid`
- `backend/checkout/additional.liquid`

There might be tracking that you can run regardless of the consent. You can just add it as `text/partytown` and Partytown will pick it up. Please note that you need to add additional tracking inside `Settings-> Checkout -> Order Status Page Additional Scripts`. This enables you to track the checkout as well. Unfortunately we can't use Web Pixels here because they only run when the user consents. There is no way to add Pixels based on the user consent. This also means you unfortunately cannot track any checkout sub steps, just the conversion. But in most cases this should be fine.

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
    startKl();
  } else {
    document.addEventListener('visitorConsentCollected', function (event) {
      if (event.detail.thirdPartyMarketingAllowed) {
        startKl();
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

Trekkie is Shopify's own tracking engine and gets loaded as part of the `content_for_header` blackbox. We can thankfully still manipulate inline scripts using a [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver). Changing the type to `text/partytown` will prevent script execution and the script will instead be processed by Partytown. You need to rewire a couple more inline scripts as shown in `assets/trekkie-partytown.js`. Any script containing `ShopifyAnalytics` needs to get added to the Partytown instance and remain on the main page. Otherwise the site starts to throw errors.

Using the standard integrations for [Google Analytics](https://help.shopify.com/en/manual/reports-and-analytics/google-analytics/google-analytics-setup) and [Facebook](https://help.shopify.com/en/manual/promoting-marketing/analyze-marketing/meta-pixel) with "partytowned" Trekkie leads to the attached pixels also being loaded within a Web Worker. I haven't fully tested this method, so treat it with caution and confirm that the data is correctly being collected by the third partys vendors.

## Testing Improvements With Lighthouse

With the setup you can easily switch between Partytown and conventional tracking and compare the speed benefits. I installed a lot of app clutter on the shop because admittedly Dawn is pretty fast with and without tracking in its original version. In a usual production environment you will inevitably add apps and fill the store with JavaScript that you often cannot directly control. That's when Partytown might be able to give you a bit relief, because you start to see the usual issues.

| Tracking Type | Page | Performance | Link |
| ------------- | ---- | ----------: | ---- |
| Conventional | Index | **<font color="orange">86</font>** | [Click](https://googlechrome.github.io/lighthouse/viewer/?gist=da2124e116eb41a293b687b97c0101f2)
| Conventional | Collection | **<font color="orange">77</font>** | [Click](https://googlechrome.github.io/lighthouse/viewer/?gist=6b1eba2a68cc0b73cbc1939c19ec6773)
| Conventional | Product | **<font color="orange">77</font>** | [Click](https://googlechrome.github.io/lighthouse/viewer/?gist=64b8171fc30ed6079844588d3db99e42)
| Partytown | Index | **<font color="green">97</font>** | [Click](https://googlechrome.github.io/lighthouse/viewer/?gist=00acac7925677fba8980d90acee5f20c)
| Partytown | Collection | **<font color="green">97</font>** | [Click](https://googlechrome.github.io/lighthouse/viewer/?gist=db48fa9e3544e4e4ce9a603c3b4eece0)
| Partytown | Product | **<font color="green">92</font>** | [Click](https://googlechrome.github.io/lighthouse/viewer/?gist=dbd6f80051ee33d69a09e5b7053e8be5)

### Resources and Credits

- https://github.com/malipetek/shopify-partytown
- https://github.com/edlaver/cloudflare-worker-partytown-shopify-app-proxy/tree/main
- https://gist.github.com/montalvomiguelo/3a8da3b6db29091ecb4b04265a58bd3b

### A Word Of Caution

Please note that this is not the intended way of tracking in Shopify OS 2.0. Anything used here can break at any time if Shopify decides to change the way Trekkie or Web Pixels work. In a production environment you need to have a dev watching over your site or Partytown might cause more harm than good. Any theme should have a "kill switch" to return to conventional tracking in case something breaks.

Other than that: Have fun offloading your tracking scripts!
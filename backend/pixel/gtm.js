function isSessionStorageAvailable() {
  var test = 'test';
  try {
    browser.sessionStorage.setItem(test, test);
    browser.sessionStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

function isLocalStorageAvailable() {
  var test = 'test';
  try {
    browser.localStorage.setItem(test, test);
    browser.localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

function onCheckoutPage() {
  return init.context.document.location.pathname.indexOf('/checkout') === 0;
}

var inc = 0;
var sessionStorageAvailable = isSessionStorageAvailable();
var localStorageAvailable = isLocalStorageAvailable();
var isCheckout = onCheckoutPage();

(async function (w, d, s, l) {
  let gtmId = null;
  let partytownEnabled = false;
  try {
    gtmId = await browser.sessionStorage.getItem('partydawn_gtm_id');
    partytownEnabled = await browser.sessionStorage.getItem('partydawn_gtm_enabled');
  } catch (e) {
    gtmId = null;
    partytownEnabled = false;
  }
  if (!sessionStorageAvailable || isCheckout || partytownEnabled !== 'true') {
    w[l] = w[l] || [];
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var f = d.getElementsByTagName(s)[0],
      j = d.createElement(s),
      dl = l != 'dataLayer' ? '&l=' + l : '';
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + gtmId + dl;
    f.parentNode.insertBefore(j, f);
  }
})(window, document, 'script', 'dataLayer');

async function sendData(data) {
  let partytownEnabled = false;
  try {
    partytownEnabled = await browser.sessionStorage.getItem('partydawn_gtm_enabled');
  } catch (e) {
    partytownEnabled = false;
  }
  if (sessionStorageAvailable && !isCheckout && partytownEnabled === 'true') {
    browser.sessionStorage.setItem(`pt_dl_` + inc++, JSON.stringify(data));
  } else {
    window.dataLayer.push(data);
  }
}

analytics.subscribe('product_added_to_cart', (event) => {
  console.log('product_added_to_cart', event);
  sendData({
    event: 'product_added_to_cart',
    timestamp: event.timestamp,
    id: event.id,
    client_id: event.clientId,
    url: event.context.document.location.href,
    price: event.data.cartLine.merchandise.price.amount,
    currency: event.data.cartLine.merchandise.id,
    product_title: event.data.cartLine.merchandise.product.title,
    quantity: event.data.cartLine.quantity,
    total_cost: event.data.cartLine.cost.totalAmount.amount,
  });
});

analytics.subscribe('product_removed_from_cart', (event) => {
  console.log('product_removed_from_cart', event);
  sendData({
    event: 'product_removed_from_cart',
    timestamp: event.timestamp,
    id: event.id,
    client_id: event.clientId,
    url: event.context.document.location.href,
    price: event.data.cartLine.merchandise.price.amount,
    currency: event.data.cartLine.merchandise.id,
    product_title: event.data.cartLine.merchandise.product.title,
    quantity: event.data.cartLine.quantity,
    total_cost: event.data.cartLine.cost.totalAmount.amount,
  });
});

analytics.subscribe('cart_viewed', (event) => {
  console.log('cart_viewed', event);
  sendData({
    event: 'cart_viewed',
    timestamp: event.timestamp,
    id: event.id,
    client_id: event.clientId,
    url: event.context.document.location.href,
    total_cost: event.data.cart.cost.totalAmount.amount,
    quantity: event.data.cart.totalQuantity,
    cart_id: event.data.cart.id,
  });
});

analytics.subscribe('page_viewed', (event) => {
  console.log('page_viewed', event);
  sendData({
    event: 'page_viewed',
    timestamp: event.timestamp,
    id: event.id,
    client_id: event.clientId,
    url: event.context.document.location.href,
    page_title: event.context.document.title,
  });
});

analytics.subscribe('product_viewed', (event) => {
  console.log('product_viewed', event);
  sendData({
    event: 'product_viewed',
    timestamp: event.timestamp,
    id: event.id,
    client_id: event.clientId,
    url: event.context.document.location.href,
    product_id: event.data.productVariant.product.id,
    product_title: event.data.productVariant.title,
    product_sku: event.data.productVariant.sku,
  });
});

analytics.subscribe('checkout_address_info_submitted', (event) => {
  console.log('checkout_address_info_submitted', event);
  sendData({
    event: 'checkout_address_info_submitted',
    timestamp: event.timestamp,
    id: event.id,
    client_id: event.clientId,
    url: event.context.document.location.href,
    token: event.data.checkout.token,
    totalPrice: event.data.checkout.totalPrice,
    email: event.data.checkout.email,
  });
});

analytics.subscribe('checkout_completed', (event) => {
  console.log('checkout_completed', event);
  sendData({
    event: 'checkout_completed',
    timestamp: event.timestamp,
    id: event.id,
    client_id: event.clientId,
    url: event.context.document.location.href,
    token: event.data.checkout.token,
    totalPrice: event.data.checkout.totalPrice,
    email: event.data.checkout.email,
  });
});

analytics.subscribe('checkout_contact_info_submitted', (event) => {
  console.log('checkout_contact_info_submitted', event);
  sendData({
    event: 'checkout_contact_info_submitted',
    timestamp: event.timestamp,
    id: event.id,
    client_id: event.clientId,
    url: event.context.document.location.href,
    token: event.data.checkout.token,
    totalPrice: event.data.checkout.totalPrice,
    email: event.data.checkout.email,
  });
});

analytics.subscribe('checkout_shipping_info_submitted', (event) => {
  console.log('checkout_shipping_info_submitted', event);
  sendData({
    event: 'checkout_shipping_info_submitted',
    timestamp: event.timestamp,
    id: event.id,
    client_id: event.clientId,
    url: event.context.document.location.href,
    token: event.data.checkout.token,
    totalPrice: event.data.checkout.totalPrice,
    email: event.data.checkout.email,
  });
});

analytics.subscribe('checkout_started', (event) => {
  console.log('checkout_started', event);
  sendData({
    event: 'checkout_started',
    timestamp: event.timestamp,
    id: event.id,
    client_id: event.clientId,
    url: event.context.document.location.href,
    token: event.data.checkout.token,
    totalPrice: event.data.checkout.totalPrice,
    email: event.data.checkout.email,
  });
});

analytics.subscribe('collection_viewed', (event) => {
  console.log('collection_viewed', event);
  sendData({
    event: 'collection_viewed',
    timestamp: event.timestamp,
    id: event.id,
    client_id: event.clientId,
    url: event.context.document.location.href,
    collection_id: event.data.collection.id,
    title: event.data.collection.title,
  });
});

analytics.subscribe('payment_info_submitted', (event) => {
  console.log('payment_info_submitted', event);
  sendData({
    event: 'payment_info_submitted',
    timestamp: event.timestamp,
    id: event.id,
    client_id: event.clientId,
    url: event.context.document.location.href,
    token: event.data.checkout.token,
    totalPrice: event.data.checkout.totalPrice,
    email: event.data.checkout.email,
  });
});

analytics.subscribe('search_submitted', (event) => {
  console.log('search_submitted', event);
  sendData({
    event: 'search_submitted',
    timestamp: event.timestamp,
    id: event.id,
    client_id: event.clientId,
    url: event.context.document.location.href,
    query: event.data.searchResult.query.id,
    results: event.data.searchResult.productVariants.length,
  });
});

/**
 * AMWAL Payment Gateway SmartBox.js
 * Version: 1.1 (SIT Environment)
 *
 * This is the SmartBox.js integration file for AMWAL Payment Gateway
 * Source: https://test.amwalpg.com:7443/js/SmartBox.js?v=1.1 (UAT)
 *
 * IMPORTANT: For production, replace this file with:
 * https://checkout.amwalpg.com/js/SmartBox.js?v=1.1
 */

var SmartBoxDoamin;
(function () {
  window.SmartBox = window.SmartBox || {};
  SmartBox.Checkout = (function () {
    var configure = {};

    /**
     * Show SmartBox payment interface
     */
    function showSmartBox() {
      if (this.configure) {
        var url = GetSmartBoxUrl(this.configure, true, true, "/add-payment", true);

        var frameDiv = document.createElement("div");
        frameDiv.id = "frameDiv";
        frameDiv.style.display = "none";
        var framePaymentPage = document.createElement("iframe");
        framePaymentPage.id = "framePaymentPage";
        framePaymentPage.setAttribute("src", url);
        framePaymentPage.setAttribute("allowfullscreen", "");
        framePaymentPage.setAttribute("allow", "payment; camera; microphone");
        frameDiv.appendChild(framePaymentPage);
        document.body.appendChild(frameDiv);

        var styleElement = document.createElement("style");
        styleElement.innerHTML = `
        #frameDiv {
          width: 100% !important;
          height: 100dvh !important;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.35) !important;
          opacity: 1;
          z-index: 1000;
          pointer-events: auto;
          padding: 0 !important;
          margin: 0 !important;
        }
        #framePaymentPage {
          height: 100%;
          width: 100%;
          border: none !important;
          overflow: hidden !important;
          z-index: 999999 !important;
          filter: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
      `;

        document.head.appendChild(styleElement);
        document.getElementById("frameDiv").style.display = "block";
      } else {
        console.error('SmartBox configuration is missing');
      }
    }

    /**
     * Add Apple Pay button
     */
    function addPayWithApplePayButton() {
      if (this.configure) {
        var url = GetSmartBoxUrl(this.configure, true, true, "/add-payment-apple-pay", false);

        var applePayWarapperElement = document.getElementById(this.configure.ApplePayElementId) || null;
        if (applePayWarapperElement == null) {
          applePayWarapperElement = document.createElement("div");
          applePayWarapperElement.id = "defaultApplePayWarapperElementId";
          applePayWarapperElement.style.display = "none";
        }

        var framePaymentPage = document.createElement("iframe");
        framePaymentPage.id = "applePayFramePaymentPage";
        framePaymentPage.setAttribute("src", url);
        framePaymentPage.setAttribute("allowfullscreen", "");
        framePaymentPage.setAttribute("allow", "payment; camera; microphone");
        applePayWarapperElement.appendChild(framePaymentPage);

        var styleElement = document.createElement("style");
        var cssRules = `
        #${framePaymentPage.id} {
          height: 57px !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
        }
        `;
        styleElement.innerHTML = cssRules;
        document.head.appendChild(styleElement);
      } else {
        console.error('SmartBox configuration is missing');
      }
    }

    /**
     * Close SmartBox interface
     */
    function closeSmartBox() {
      var elem = document.getElementById("frameDiv");
      if (elem != null && elem.parentNode != null) {
        elem.parentNode.removeChild(elem);
      }
    }

    /**
     * Show payment page (redirect mode)
     */
    function showPaymentPage() {
      if (this.configure) {
        window.location = GetSmartBoxUrl(this.configure, true, true);
      } else {
        console.error('SmartBox configuration is missing');
      }
    }

    /**
     * Generate SmartBox URL with all parameters
     */
    function GetSmartBoxUrl(configure, hideCloseButton, isEnableReturnUrl, actionUrl = "/add-payment", showSpinner = true) {
      if (configure) {
        // Determine environment domain based on current host or configuration
        // This matches the environment where SmartBox.js is loaded from
        var currentScript = document.currentScript || document.querySelector('script[src*="SmartBox.js"]');

        if (currentScript && currentScript.src) {
          // Extract domain from the script source
          var scriptSrc = currentScript.src;
          if (scriptSrc.includes('checkout.amwalpg.com')) {
            SmartBoxDoamin = 'https://checkout.amwalpg.com';  // Production
          } else if (scriptSrc.includes(':19443')) {
            SmartBoxDoamin = 'https://test.amwalpg.com:19443';  // SIT
          } else if (scriptSrc.includes(':7443')) {
            SmartBoxDoamin = 'https://test.amwalpg.com:7443';   // UAT
          } else {
            SmartBoxDoamin = 'https://test.amwalpg.com:7443';   // Default to UAT
          }
        } else {
          // Fallback: Default to UAT environment
          SmartBoxDoamin = 'https://test.amwalpg.com:7443';
        }

        var paymentMethodFromSmartBox = null;
        var mId = 0;
        var tId = 0;
        var orderId = "";
        var amount = 0;
        var MerchantReference = "";
        var configPath = window.SmartBox.Checkout.configure;
        var secureHash = "";
        var currencyId = "";
        var languageId = "";
        var trxDateTime = "";
        var paymentViewType = "";
        var sessionToken = "";
        var requestSource = "";
        var returnUrl = "";
        var cancelUrl = "";
        var orderItems = [];
        var contactInfoType = "";
        var applePayButtonDisabled = "";
        var requiredBillingContactFields = [];
        var requiredShippingContactFields = [];

        // Extract configuration parameters
        if (typeof configPath.paymentMethodFromSmartBox !== "undefined") {
          paymentMethodFromSmartBox = configPath.paymentMethodFromSmartBox;
        }

        if (typeof configPath.OrderId !== "undefined" && configPath.OrderId !== null) {
          orderId = configPath.OrderId;
        }

        if (typeof configPath.MID !== "undefined" && configPath.MID !== null && !isNaN(configPath.MID)) {
          mId = configPath.MID;
        }

        if (typeof configPath.TID !== "undefined" && configPath.TID !== null && !isNaN(configPath.TID)) {
          tId = configPath.TID;
        }

        if (typeof configPath.OrderItems !== "undefined" && configPath.OrderItems !== null && Array.isArray(configPath.OrderItems)) {
          orderItems = configPath.OrderItems;
        }

        if (typeof configPath.RequiredBillingContactFields !== "undefined" && configPath.RequiredBillingContactFields !== null && Array.isArray(configPath.RequiredBillingContactFields)) {
          requiredBillingContactFields = configPath.RequiredBillingContactFields;
        }

        if (typeof configPath.RequiredShippingContactFields !== "undefined" && configPath.RequiredShippingContactFields !== null && Array.isArray(configPath.RequiredShippingContactFields)) {
          requiredShippingContactFields = configPath.RequiredShippingContactFields;
        }

        if (typeof configPath.AmountTrxn !== "undefined" && configPath.AmountTrxn !== null && !isNaN(configPath.AmountTrxn)) {
          amount = configPath.AmountTrxn;
        }

        if (typeof configPath.CurrencyId !== "undefined" && configPath.CurrencyId !== null && !isNaN(configPath.CurrencyId)) {
          currencyId = configPath.CurrencyId;
        }

        if (typeof configPath.LanguageId !== "undefined" && configPath.LanguageId !== null) {
          languageId = configPath.LanguageId;
        }

        if (typeof configPath.MerchantReference !== "undefined") {
          MerchantReference = configPath.MerchantReference;
        }

        if (typeof configPath.ApplePayButtonDisabled !== "undefined") {
          applePayButtonDisabled = configPath.ApplePayButtonDisabled;
        }

        if (typeof configPath.ReturnUrl !== "undefined" && configPath.ReturnUrl !== null) {
          returnUrl = configPath.ReturnUrl;
        }

        if (typeof configPath.CancelUrl !== "undefined" && configPath.CancelUrl !== null) {
          cancelUrl = configPath.CancelUrl;
        }

        if (typeof configPath.SecureHash !== "undefined") {
          secureHash = configPath.SecureHash;
        }

        if (typeof configPath.TrxDateTime !== "undefined") {
          trxDateTime = configPath.TrxDateTime;
        }

        if (typeof configPath.PaymentViewType !== "undefined") {
          paymentViewType = configPath.PaymentViewType;
        }

        if (typeof configPath.SessionToken !== "undefined") {
          sessionToken = configPath.SessionToken;
        }

        if (typeof configPath.RequestSource !== "undefined") {
          requestSource = configPath.RequestSource;
        }

        if (typeof configPath.ContactInfoType !== "undefined") {
          contactInfoType = configPath.ContactInfoType;
        }

        // Build query string
        var SmartBoxHostedQueryString = "/?";
        SmartBoxHostedQueryString += "MID=" + mId + "&";
        SmartBoxHostedQueryString += "MerchantReference=" + MerchantReference + "&";
        SmartBoxHostedQueryString += "Amount=" + amount + "&";
        SmartBoxHostedQueryString += "TID=" + tId + "&";
        SmartBoxHostedQueryString += "SecureHash=" + secureHash + "&";
        SmartBoxHostedQueryString += "Currency=" + currencyId + "&";
        SmartBoxHostedQueryString += "Language=" + languageId + "&";
        SmartBoxHostedQueryString += "RequestDateTime=" + trxDateTime + "&";
        SmartBoxHostedQueryString += "PaymentViewType=" + paymentViewType + "&";
        SmartBoxHostedQueryString += "SessionToken=" + sessionToken + "&";
        SmartBoxHostedQueryString += "RequestSource=" + requestSource + "&";
        SmartBoxHostedQueryString += "ReturnUrl=" + encodeURIComponent(returnUrl) + "&";
        SmartBoxHostedQueryString += "CancelUrl=" + encodeURIComponent(cancelUrl) + "&";
        SmartBoxHostedQueryString += "OrderItems=" + JSON.stringify(orderItems) + "&";
        SmartBoxHostedQueryString += "ShowSpinner=" + showSpinner + "&";
        SmartBoxHostedQueryString += "ContactInfoType=" + contactInfoType + "&";
        SmartBoxHostedQueryString += "ApplePayButtonDisabled=" + applePayButtonDisabled + "&";
        SmartBoxHostedQueryString += "RequiredBillingContactFields=" + JSON.stringify(requiredBillingContactFields) + "&";
        SmartBoxHostedQueryString += "RequiredShippingContactFields=" + JSON.stringify(requiredShippingContactFields) + "&";

        // Event listener for payment callbacks
        window.addEventListener("message", function (event) {
          var parser = document.createElement("a");
          parser.href = SmartBoxDoamin;

          if (event.data != null && event.data != "") {
            if (event.data.callback == "errorCallback" && this.SmartBox.Checkout.configure.errorCallback !== undefined) {
              this.SmartBox.Checkout.configure.errorCallback(event.data);
            } else if (event.data.callback == "completeCallback" && this.SmartBox.Checkout.configure.completeCallback !== undefined) {
              this.SmartBox.Checkout.configure.completeCallback(event.data);
            } else if (event.data.callback == "cancelCallback") {
              closeSmartBox();
              if (this.SmartBox.Checkout.configure?.cancelCallback != undefined) {
                this.SmartBox.Checkout.configure.cancelCallback();
              }
            } else if (event.data.callback == "isApplePayPageReadyCallback") {
              if (this.SmartBox.Checkout.configure.isApplePayPageReadyCallback !== undefined) {
                this.SmartBox.Checkout.configure.isApplePayPageReadyCallback(event.data);
              }
            } else if (event.data.callback == "applePayButtonClickedCallback") {
              if (this.SmartBox.Checkout.configure.applePayButtonClickedCallback !== undefined) {
                this.SmartBox.Checkout.configure.applePayButtonClickedCallback(event.data);
              }
            }
          }
        }, false);

        return SmartBoxDoamin + actionUrl + SmartBoxHostedQueryString;
      }

      return "";
    }

    /**
     * Get SmartBox URL without showing the interface
     */
    function getSmartBoxUrl() {
      if (this.configure) {
        return GetSmartBoxUrl(this.configure, false, false, "/add-payment", true);
      } else {
        return "";
      }
    }

    // Public interface
    return {
      showSmartBox: showSmartBox,
      addPayWithApplePayButton: addPayWithApplePayButton,
      closeSmartBox: closeSmartBox,
      configure: configure,
      showPaymentPage: showPaymentPage,
      getSmartBoxUrl: getSmartBoxUrl,
    };
  })();
})(window);

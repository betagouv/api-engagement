"use strict";
(window._apieng = window._apieng || {}),
  (window.apieng = window.apieng || {}),
  (function () {
    (window._apieng.cookieDomain = "www." === window.location.hostname.slice(0, 4) ? window.location.hostname.slice(4) : window.location.hostname),
      (window._apieng.eventHost = "https://api.api-engagement.beta.gouv.fr"),
      // Configuration
      (window._apieng.config = function (e) {
        window._apieng.accountId = e;
      }),
      // Impression tracking
      (window._apieng.getTrackers = function (e) {
        const elements = document.getElementsByName("tracker_counter");
        if (elements.length === 0)
          return document.querySelectorAll(`a[href*="${window._apieng.eventHost}"], a[href*="${window._apieng.eventHost.replace("https://", "http://")}"]`);

        return elements;
      }),
      (window._apieng.inView = function (e) {
        const rect = e.getBoundingClientRect();
        return (
          0 <= rect.top &&
          rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
          0 <= rect.left &&
          rect.left <= (window.innerWidth || document.documentElement.clientWidth)
        );
      }),
      (window._apieng.trackImpression = function (e) {
        if (!e) return;
        const visible = e.getAttribute("data-visible") || "false";
        const seen = e.getAttribute("data-seen") || "false";
        if (window._apieng.inView(e)) {
          if (e.tagName === "A") {
            const link = e.getAttribute("href").split("/");
            if (visible === "true" && seen !== "true") {
              e.setAttribute("data-seen", "true");
              const n = `/r/impression/${link[link.length - 2]}/${link[link.length - 1]}`,
                o = new URLSearchParams();
              o.append("tracker", "link");
              fetch(window._apieng.eventHost + n + "?" + o);
            } else e.setAttribute("data-visible", "true");
          } else {
            if (visible === "true" && seen !== "true") {
              e.setAttribute("data-seen", "true");
              if (e.getAttribute("data-id") && !(e.getAttribute("data-publisher") || window._apieng.accountId)) return;
              const n = `/r/impression/${e.getAttribute("data-id")}/${e.getAttribute("data-publisher") || window._apieng.accountId}`,
                o = new URLSearchParams();
              o.append("tracker", "pixel");
              if (e.getAttribute("data-source")) o.append("sourceId", e.getAttribute("data-source"));
              if (e.getAttribute("data-request")) o.append("requestId", e.getAttribute("data-request"));
              fetch(window._apieng.eventHost + n + "?" + o);
            } else e.setAttribute("data-visible", "true");
          }
        } else e.setAttribute("data-visible", "false");
      }),
      // Redirection tracking
      (window._apieng.getQueryParameter = function (e) {
        var n = window.location.href;
        e = e.replace(/[\[\]]/g, "\\$&");
        var i = new RegExp("[?&]" + e + "(=([^&#]*)|&|#|$)").exec(n);
        return i ? (i[2] ? decodeURIComponent(i[2].replace(/\+/g, " ")) : "") : null;
      }),
      (window._apieng.setCookieValue = function (e, n) {
        var i = new Date(),
          o = new Date(i.getTime() + 2592e6);
        document.cookie = e + "=" + n + "; expires=" + o.toGMTString() + "; path=/;domain=" + window._apieng.cookieDomain + ";SameSite=lax;Secure";
      }),
      (window._apieng.getCookieValue = function (e) {
        for (var n = e + "=", i = decodeURIComponent(document.cookie).split(";"), o = 0; o < i.length; o++) {
          for (var a = i[o]; " " == a.charAt(0); ) a = a.substring(1);
          if (0 == a.indexOf(n) && a.substring(n.length, a.length).length !== 0) return a.substring(n.length, a.length);
        }
        return null;
      }),
      // Application
      (window._apieng.trackApplication = function (m) {
        let e = window._apieng.getQueryParameter("apiengagement_id");
        if ((null != e && window._apieng.setCookieValue("apiengagement", e), e || (e = window._apieng.getCookieValue("apiengagement")), console.log("trackApplication: ", e), !e))
          return;
        const n = "/r/apply",
          o = new URLSearchParams();
        if (e) o.append("view", e);
        if (window.location.href) o.append("url", window.location.href);
        if (window._apieng.accountId) o.append("publisher", window._apieng.accountId);
        if (m) o.append("mission", m);
        fetch(window._apieng.eventHost + n + "?" + o);
      }),
      // Account
      (window._apieng.trackAccount = function (m) {
        let e = window._apieng.getQueryParameter("apiengagement_id");
        if ((null != e && window._apieng.setCookieValue("apiengagement", e), e || (e = window._apieng.getCookieValue("apiengagement")), console.log("trackAccount: ", e), !e))
          return;
        const n = "/r/account",
          o = new URLSearchParams();
        if (e) o.append("view", e);
        if (window.location.href) o.append("url", window.location.href);
        if (window._apieng.accountId) o.append("publisher", window._apieng.accountId);
        if (m) o.append("mission", m);
        fetch(window._apieng.eventHost + n + "?" + o);
      }),
      (window.apieng.q = window.apieng.q || []);

    for (let e = 0; e < window.apieng.q.length; e++) {
      const n = window.apieng.q[e];
      window._apieng[n[0]](n[1], n[2], n[3]);
    }
    window.setInterval(() => {
      const elements = window._apieng.getTrackers();
      elements.forEach((e) => window._apieng.trackImpression(e));
    }, 750);

    window.apieng = function () {
      window._apieng[arguments[0]](arguments[1], arguments[2], arguments[3]);
    };
    let e = window._apieng.getQueryParameter("apiengagement_id");
    null != e && window._apieng.setCookieValue("apiengagement", e);
  })();

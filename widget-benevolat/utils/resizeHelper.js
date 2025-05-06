/**
 * Iframe dynamic height management
 * Send the height of the iframe to the parent window
 */

var sendHeightToParent = function () {
  if (typeof window === "undefined") return;

  try {
    var height = document.body.scrollHeight;
    window.parent.postMessage(
      {
        type: "resize",
        height: height,
        source: "api-engagement-widget",
      },
      "*",
    );
  } catch (error) {
    console.error("Erreur lors de l'envoi de la hauteur à la page parente:", error);
  }
};

var setupResizeObserver = function () {
  if (typeof window === "undefined") return;

  var observer = new MutationObserver(function () {
    sendHeightToParent();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  window.addEventListener("load", sendHeightToParent);

  window.addEventListener("load", function () {
    var images = document.querySelectorAll("img");
    images.forEach(function (img) {
      if (img.complete) {
        sendHeightToParent();
      } else {
        img.addEventListener("load", sendHeightToParent);
      }
    });
  });

  window.addEventListener("resize", sendHeightToParent);

  var interval = setInterval(sendHeightToParent, 1000);

  return function () {
    observer.disconnect();
    clearInterval(interval);
    window.removeEventListener("load", sendHeightToParent);
    window.removeEventListener("resize", sendHeightToParent);
  };
};

module.exports = {
  sendHeightToParent: sendHeightToParent,
  setupResizeObserver: setupResizeObserver,
};

/**
 * Iframe dynamic height management
 * Send the height of the iframe to the parent window
 */

const sendHeightToParent = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const height = document.body.scrollHeight;
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

const setupResizeObserver = (): (() => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const observer = new MutationObserver(() => {
    sendHeightToParent();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  window.addEventListener("load", sendHeightToParent);

  window.addEventListener("load", () => {
    const images = document.querySelectorAll("img");
    images.forEach((img) => {
      if (img.complete) {
        sendHeightToParent();
      } else {
        img.addEventListener("load", sendHeightToParent);
      }
    });
  });

  window.addEventListener("resize", sendHeightToParent);

  const interval = setInterval(sendHeightToParent, 1000);

  return () => {
    observer.disconnect();
    clearInterval(interval);
    window.removeEventListener("load", sendHeightToParent);
    window.removeEventListener("resize", sendHeightToParent);
  };
};

export default {
  sendHeightToParent,
  setupResizeObserver,
};

(function () {
  // get local storage request id

  function iv(e) {
    const rect = e.getBoundingClientRect();
    return (
      0 <= rect.top &&
      rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
      0 <= rect.left &&
      rect.left <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
  function v(e) {
    if (!e) return;
    const visible = e.getAttribute("data-visible") || "false";
    const seen = e.getAttribute("data-seen") || "false";
    const id = e.getAttribute("data-id");
    if (iv(e)) {
      if (visible !== "false" && seen !== id) {
        e.setAttribute("data-seen", id);
        const publisherId = e.getAttribute("data-publisher");
        const sourceId = e.getAttribute("data-source");
        const requestId = e.getAttribute("data-request");
        console.log("id", id, "publisherId", publisherId, "sourceId", sourceId, "requestId", requestId);
        if (!id && !publisherId) return;
        fetch(`https://api.api-engagement.beta.gouv.fr/r/impression/${id}/${publisherId}${sourceId ? `?sourceId=${sourceId}` : ""}${requestId ? `&requestId=${requestId}` : ""}`);
      } else e.setAttribute("data-visible", "true");
    } else e.setAttribute("data-visible", "false");
  }
  function c() {
    const elements = document.getElementsByName("tracker_counter");
    elements.forEach((e) => v(e));
  }
  window.setInterval(c, 750);
})();

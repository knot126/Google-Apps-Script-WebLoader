// NOTE: You don't need this file!!!

const OLD_FIXUP_SCRIPT = `<script>
  function __getRealLocation() {
    var l = null;
    
    google.script.url.getLocation(function(location) {
      l = location;
    });

    return l;
  }

  function __getHostFromUrlString(url) {
    var tmp = document.createElement('a');
    tmp.href = url;
    return tmp.host;
  }

  function __getVistingUrl() {
    return (new URLSearchParams(__getRealLocation().search)).get("url");
  }

  async function __fixupElement(e, attr, url) {
    // Find URL for the real content
    if (url.indexOf("//") >= 0) {
      // we should be okay
    }
    else if (url.startsWith("/")) {
      // relative to domain, need to do hacky shit
      url = __getHostFromUrlString(__getVistingUrl()) + "/" + url;
    }
    else {
      // just append it; it should work
      url = __getVistingUrl() + url;
    }

    // Fetch the content
    let result = await fetch(__getRealLocation().path + "?url=" + url + "&json=1");

    if (!result) { console.log("Did not fetch: ", url); return; }

    // Parse the result
    result = JSON.parse(result);

    // Set attribute to inline data
    e.setAttribute(attr, "data:" + result["headers"]["Content-Type"] + ";base64," + btoa(result["content"]));
  }

  function __fixup() {
    let e = document.getElementsByTagName("*");
    for (let i = 0; i < e.length; i++) {
      let current = e[i];
      let val = current.getAttribute("src");
      if (val) {
        __fixupElement(current, "src", val);
      }
    }
  }

  __fixup();
</script>`;
